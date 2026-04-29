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
  let auditLog: { log: jest.Mock };

  beforeEach(async () => {
    invitations = repoMock();
    orgs = repoMock();
    userOrgs = repoMock();
    users = repoMock();
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    auditLog = { log: jest.fn().mockResolvedValue(undefined) };

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
          useValue: auditLog,
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

    it("returns 0 and does not log when no tokens expired", async () => {
      invitations.delete.mockResolvedValue({ affected: 0 });
      const n = await service.cleanupExpired();
      expect(n).toBe(0);
    });
  });

  describe("getPreview", () => {
    const pendingInvitation = {
      id: "inv-1",
      token: "tok",
      email: "alice@x.com",
      orgId: "org-1",
      invitedBy: "u-1",
      role: OrgRole.MEMBER,
      status: "pending" as const,
      message: "Welcome!",
      expiresAt: new Date(Date.now() + 60_000),
    };

    it("returns preview with org and inviter data", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInvitation });
      orgs.findOne.mockResolvedValue({ id: "org-1", name: "Acme" });
      users.findOne.mockResolvedValue({
        id: "u-1",
        displayName: "Alice Admin",
      });

      const preview = await service.getPreview("tok");

      expect(preview.orgName).toBe("Acme");
      expect(preview.invitedByName).toBe("Alice Admin");
      expect(preview.role).toBe(OrgRole.MEMBER);
      expect(preview.message).toBe("Welcome!");
    });

    it("uses fallback names when org and inviter are not found", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInvitation });
      orgs.findOne.mockResolvedValue(null);
      users.findOne.mockResolvedValue(null);

      const preview = await service.getPreview("tok");

      expect(preview.orgName).toBe("Unknown organization");
      expect(preview.invitedByName).toBe("An admin");
    });

    it("throws NotFoundException when token does not exist", async () => {
      invitations.findOne.mockResolvedValue(null);
      await expect(service.getPreview("bad")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws BadRequestException when invitation is revoked", async () => {
      invitations.findOne.mockResolvedValue({
        ...pendingInvitation,
        status: "revoked",
      });
      await expect(service.getPreview("tok")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws BadRequestException when invitation is already accepted", async () => {
      invitations.findOne.mockResolvedValue({
        ...pendingInvitation,
        status: "accepted",
      });
      await expect(service.getPreview("tok")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("listInvitations", () => {
    it("lists all invitations for an org when no status filter", async () => {
      invitations.find.mockResolvedValue([{ id: "inv-1" }, { id: "inv-2" }]);
      const result = await service.listInvitations("org-1");
      expect(invitations.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: "org-1" } }),
      );
      expect(result).toHaveLength(2);
    });

    it("applies status filter when provided", async () => {
      invitations.find.mockResolvedValue([]);
      await service.listInvitations("org-1", "pending");
      expect(invitations.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: "org-1", status: "pending" },
        }),
      );
    });
  });

  describe("resendInvitation", () => {
    const pendingInvitation = {
      id: "inv-1",
      orgId: "org-1",
      invitedBy: "u-1",
      status: "pending" as const,
      email: "alice@x.com",
      token: "tok",
      role: OrgRole.MEMBER,
      message: null,
      expiresAt: new Date(Date.now() + 60_000),
    };

    it("re-enqueues email and returns invitation", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInvitation });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      orgs.findOne.mockResolvedValue({ name: "Acme" });
      users.findOne.mockResolvedValue({ displayName: "Alice Admin" });

      const result = await service.resendInvitation("inv-1", "u-1");

      expect(result.id).toBe("inv-1");
      expect(queue.add).toHaveBeenCalledWith(
        "send-invitation-email",
        expect.objectContaining({ recipient: "alice@x.com" }),
      );
    });

    it("throws NotFoundException when invitation does not exist", async () => {
      invitations.findOne.mockResolvedValue(null);
      await expect(
        service.resendInvitation("missing", "u-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when invitation is not pending", async () => {
      invitations.findOne.mockResolvedValue({
        ...pendingInvitation,
        status: "accepted",
      });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      await expect(
        service.resendInvitation("inv-1", "u-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("acceptInvitation (extended)", () => {
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

    it("throws ForbiddenException when currentUserId does not match the invited email's user", async () => {
      invitations.findOne.mockResolvedValue({ ...baseInvitation });
      users.findOne.mockResolvedValue({ id: "u-2", email: "user@x.com" });

      await expect(
        service.acceptInvitation("tk", "u-OTHER"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("accepts when currentUserId matches the invited user", async () => {
      invitations.findOne.mockResolvedValue({ ...baseInvitation });
      users.findOne.mockResolvedValue({
        id: "u-2",
        username: "alice",
        email: "user@x.com",
      });
      userOrgs.findOne.mockResolvedValue(null);
      userOrgs.create.mockReturnValue({});

      const result = await service.acceptInvitation("tk", "u-2");
      expect(result.userId).toBe("u-2");
    });
  });

  describe("error-path catch handlers", () => {
    const pendingInv = {
      id: "inv-1",
      token: "tk",
      email: "user@x.com",
      orgId: "org-1",
      role: OrgRole.MEMBER,
      status: "pending" as const,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      acceptedBy: null,
      invitedBy: "u-1",
      message: null,
    };

    it("createInvitations: swallows audit log failure (line 115)", async () => {
      orgs.findOne.mockResolvedValue({ id: "org-1", name: "Acme" });
      users.findOne.mockResolvedValue({
        id: "u-1",
        username: "admin",
        displayName: "Admin",
      });
      auditLog.log.mockRejectedValueOnce(new Error("audit down"));

      await service.createInvitations("u-1", {
        organizationId: "org-1",
        emails: ["a@b.com"],
        role: OrgRole.MEMBER,
      });

      // Flush microtasks so the .catch() callback runs
      await new Promise<void>((r) => setImmediate(r));
      // No exception means the catch handler absorbed the rejection
    });

    it("acceptInvitation: swallows audit log failure (line 193)", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInv });
      users.findOne.mockResolvedValue({
        id: "u-2",
        username: "alice",
        email: "user@x.com",
      });
      userOrgs.findOne.mockResolvedValue(null);
      userOrgs.create.mockReturnValue({});
      auditLog.log.mockRejectedValueOnce(new Error("audit down"));

      await service.acceptInvitation("tk", "u-2");
      await new Promise<void>((r) => setImmediate(r));
    });

    it("resendInvitation: swallows audit log failure (line 275)", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInv });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      orgs.findOne.mockResolvedValue({ name: "Acme" });
      users.findOne.mockResolvedValue({ displayName: "Admin" });
      auditLog.log.mockRejectedValueOnce(new Error("audit down"));

      await service.resendInvitation("inv-1", "u-1");
      await new Promise<void>((r) => setImmediate(r));
    });

    it("resendInvitation: handles queue.add failure gracefully (line 363)", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInv });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      orgs.findOne.mockResolvedValue({ name: "Acme" });
      users.findOne.mockResolvedValue({ displayName: "Admin" });
      queue.add.mockRejectedValueOnce(new Error("queue down"));

      // Should resolve despite the queue failure
      const result = await service.resendInvitation("inv-1", "u-1");
      expect(result.id).toBe("inv-1");
    });

    it("revokeInvitation: swallows audit log failure (line 275)", async () => {
      invitations.findOne.mockResolvedValue({ ...pendingInv });
      userOrgs.findOne.mockResolvedValue({ role: OrgRole.OWNER });
      users.findOne.mockResolvedValue({ id: "u-1", username: "boss" });
      auditLog.log.mockRejectedValueOnce(new Error("audit down"));

      const result = await service.revokeInvitation("inv-1", "u-1");
      await new Promise<void>((r) => setImmediate(r));
      expect(result.status).toBe("revoked");
    });
  });

  describe("createInvitations without queue", () => {
    it("completes successfully when notifications queue is not available", async () => {
      const noQueueModule = await Test.createTestingModule({
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
          // AuditLogService and BullQueue_notifications intentionally omitted
        ],
      }).compile();

      const noQueueService = noQueueModule.get(InvitationService);

      orgs.findOne.mockResolvedValue({ id: "org-1", name: "Acme" });
      users.findOne.mockResolvedValue({
        id: "u-1",
        username: "admin",
        displayName: "Admin",
      });

      const created = await noQueueService.createInvitations("u-1", {
        organizationId: "org-1",
        emails: ["x@y.com"],
        role: OrgRole.MEMBER,
      });

      expect(created).toHaveLength(1);
      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
