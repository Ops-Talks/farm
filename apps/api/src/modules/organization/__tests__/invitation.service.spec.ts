import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrgRole } from "@farm/types";
import { InvitationService } from "../invitation.service";
import { InvitationToken } from "../entities/invitation-token.entity";
import { Organization } from "../entities/organization.entity";
import { UserOrganization } from "../entities/user-organization.entity";
import { User } from "../../auth/entities/user.entity";
import { AuditLogService } from "../../audit-log/audit-log.service";

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((e: { id?: string }) =>
    Promise.resolve({ id: e.id ?? "inv-1", ...e }),
  ),
  create: jest.fn((data: Record<string, unknown>) => ({
    id: "inv-1",
    ...data,
  })),
  delete: jest.fn().mockResolvedValue({ affected: 0 }),
  count: jest.fn(),
});

describe("InvitationService", () => {
  let service: InvitationService;
  let invitations: ReturnType<typeof repoMock>;
  let orgs: ReturnType<typeof repoMock>;
  let userOrgs: ReturnType<typeof repoMock>;
  let users: ReturnType<typeof repoMock>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    invitations = repoMock();
    orgs = repoMock();
    userOrgs = repoMock();
    users = repoMock();
    queue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: getRepositoryToken(InvitationToken),
          useValue: invitations,
        },
        { provide: getRepositoryToken(Organization), useValue: orgs },
        { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
        { provide: getRepositoryToken(User), useValue: users },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("http://app.test") },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: "BullQueue_notifications", useValue: queue },
      ],
    }).compile();

    service = module.get(InvitationService);
  });

  describe("createInvitations", () => {
    it("creates an invitation per email and enqueues an email", async () => {
      orgs.findOne.mockResolvedValue({ id: "org-1", name: "Acme" });
      users.findOne.mockResolvedValue({
        id: "u-1",
        username: "admin",
        displayName: "Admin User",
      });
      const created = await service.createInvitations("u-1", {
        organizationId: "org-1",
        emails: ["A@Example.com", "b@example.com"],
        role: OrgRole.MEMBER,
      });
      expect(created).toHaveLength(2);
      expect(created[0].email).toBe("a@example.com");
      expect(created[0].token).toMatch(/^[a-f0-9]{64}$/);
      expect(created[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(invitations.save).toHaveBeenCalledTimes(2);
      expect(queue.add).toHaveBeenCalledTimes(2);
    });

    it("throws when org not found", async () => {
      orgs.findOne.mockResolvedValue(null);
      await expect(
        service.createInvitations("u-1", {
          organizationId: "missing",
          emails: ["a@b.com"],
          role: OrgRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("acceptInvitation", () => {
    const baseInvitation = {
      id: "inv-1",
      token: "tk",
      email: "user@x.com",
      orgId: "org-1",
      role: OrgRole.MEMBER,
      status: "pending" as const,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      acceptedBy: null,
    };

    it("accepts and creates a membership when missing", async () => {
      invitations.findOne.mockResolvedValue({ ...baseInvitation });
      users.findOne.mockResolvedValue({
        id: "u-2",
        username: "alice",
        email: "user@x.com",
      });
      userOrgs.findOne.mockResolvedValue(null);
      userOrgs.create.mockReturnValue({});
      const result = await service.acceptInvitation("tk");
      expect(result.userId).toBe("u-2");
      expect(userOrgs.save).toHaveBeenCalled();
      expect(invitations.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: "accepted" }),
      );
    });

    it("is idempotent on existing membership", async () => {
      invitations.findOne.mockResolvedValue({ ...baseInvitation });
      users.findOne.mockResolvedValue({
        id: "u-2",
        username: "alice",
        email: "user@x.com",
      });
      userOrgs.findOne.mockResolvedValue({ id: "uo-1" });
      await service.acceptInvitation("tk");
      expect(userOrgs.save).not.toHaveBeenCalled();
    });

    it("throws when expired", async () => {
      invitations.findOne.mockResolvedValue({
        ...baseInvitation,
        expiresAt: new Date(Date.now() - 1),
      });
      await expect(service.acceptInvitation("tk")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws when no user account", async () => {
      invitations.findOne.mockResolvedValue({ ...baseInvitation });
      users.findOne.mockResolvedValue(null);
      await expect(service.acceptInvitation("tk")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("revokeInvitation", () => {
    it("requires admin membership", async () => {
      invitations.findOne.mockResolvedValue({
        id: "inv-1",
        orgId: "org-1",
        status: "pending",
      });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.MEMBER });
      await expect(
        service.revokeInvitation("inv-1", "u-99"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("revokes pending invitation", async () => {
      invitations.findOne.mockResolvedValue({
        id: "inv-1",
        orgId: "org-1",
        status: "pending",
      });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      users.findOne.mockResolvedValue({ id: "u-1", username: "boss" });
      const result = await service.revokeInvitation("inv-1", "u-1");
      expect(result.status).toBe("revoked");
    });

    it("rejects non-pending invitation", async () => {
      invitations.findOne.mockResolvedValue({
        id: "inv-1",
        orgId: "org-1",
        status: "accepted",
      });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      await expect(
        service.revokeInvitation("inv-1", "u-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("cleanupExpired", () => {
    it("deletes expired pending tokens", async () => {
      invitations.delete.mockResolvedValue({ affected: 5 });
      const n = await service.cleanupExpired();
      expect(n).toBe(5);
    });
  });
});
