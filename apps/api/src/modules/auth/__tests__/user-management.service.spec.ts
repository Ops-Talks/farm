import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { OrgRole } from "@farm/types";
import { UserManagementService } from "../user-management.service";
import { User } from "../entities/user.entity";
import { PasswordReset } from "../entities/password-reset.entity";
import { Organization } from "../../organization/entities/organization.entity";
import { UserOrganization } from "../../organization/entities/user-organization.entity";
import { AuditLogService } from "../../audit-log/audit-log.service";

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  save: jest.fn((e: unknown) => Promise.resolve(e)),
  create: jest.fn((d: unknown) => d),
  delete: jest.fn().mockResolvedValue({ affected: 0 }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(0),
});

describe("UserManagementService", () => {
  let service: UserManagementService;
  let users: ReturnType<typeof repoMock>;
  let resets: ReturnType<typeof repoMock>;
  let orgs: ReturnType<typeof repoMock>;
  let userOrgs: ReturnType<typeof repoMock>;
  let queue: { add: jest.Mock };

  const platformAdmin = {
    userId: "admin-1",
    username: "admin",
    roles: ["admin"],
  };
  const orgAdmin = {
    userId: "oa-1",
    username: "orgadmin",
    roles: ["user"],
  };

  beforeEach(async () => {
    users = repoMock();
    resets = repoMock();
    orgs = repoMock();
    userOrgs = repoMock();
    queue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(PasswordReset), useValue: resets },
        { provide: getRepositoryToken(Organization), useValue: orgs },
        { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => (k === "smtp.host" ? "" : "http://x")),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: "BullQueue_notifications", useValue: queue },
      ],
    }).compile();

    service = module.get(UserManagementService);
  });

  describe("listUsers", () => {
    it("rejects users without permissions", async () => {
      userOrgs.find.mockResolvedValue([]);
      await expect(service.listUsers(orgAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("returns paginated users for platform admin", async () => {
      users.findAndCount.mockResolvedValue([
        [
          {
            id: "u",
            username: "u",
            email: "u@x",
            displayName: "U",
            roles: ["user"],
            suspended: false,
            lastLogin: null,
            createdAt: new Date(),
          },
        ],
        1,
      ]);
      userOrgs.find.mockResolvedValue([]);
      const out = await service.listUsers(platformAdmin);
      expect(out.total).toBe(1);
      expect(out.users[0].username).toBe("u");
    });
  });

  describe("setSuspended", () => {
    it("requires platform admin", async () => {
      userOrgs.find.mockResolvedValue([]);
      await expect(
        service.setSuspended(orgAdmin, "x", true),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
    it("blocks self-suspend", async () => {
      await expect(
        service.setSuspended(platformAdmin, platformAdmin.userId, true),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it("suspends another user", async () => {
      users.findOne.mockResolvedValue({
        id: "x",
        suspended: false,
        refreshToken: "r",
      });
      const u = await service.setSuspended(platformAdmin, "x", true);
      expect(u.suspended).toBe(true);
      expect(u.refreshToken).toBeNull();
    });
  });

  describe("resetPassword", () => {
    it("returns the temp password as fallback when SMTP disabled", async () => {
      users.findOne.mockResolvedValue({
        id: "x",
        username: "tgt",
        email: "tgt@x",
      });
      const out = await service.resetPassword(platformAdmin, "x");
      expect(out.fallback).toBe(true);
      expect(out.tempPassword).toMatch(/^[A-Za-z0-9+/]{12}$/);
      expect(resets.save).toHaveBeenCalled();
      expect(users.update).toHaveBeenCalled();
    });
    it("requires platform admin", async () => {
      await expect(service.resetPassword(orgAdmin, "x")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("updateRole", () => {
    it("blocks demoting last OWNER (self)", async () => {
      userOrgs.findOne.mockResolvedValueOnce({
        userId: platformAdmin.userId,
        organizationId: "o",
        role: OrgRole.OWNER,
      });
      userOrgs.findOne.mockResolvedValueOnce({
        userId: platformAdmin.userId,
        organizationId: "o",
        role: OrgRole.OWNER,
      });
      userOrgs.count.mockResolvedValue(1);
      await expect(
        service.updateRole(
          platformAdmin,
          platformAdmin.userId,
          "o",
          OrgRole.MEMBER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("updates membership role", async () => {
      userOrgs.findOne.mockResolvedValueOnce({
        userId: platformAdmin.userId,
        organizationId: "o",
        role: OrgRole.OWNER,
      });
      userOrgs.findOne.mockResolvedValueOnce({
        id: "uo",
        userId: "tgt",
        organizationId: "o",
        role: OrgRole.MEMBER,
      });
      const updated = await service.updateRole(
        platformAdmin,
        "tgt",
        "o",
        OrgRole.ADMIN,
      );
      expect(updated.role).toBe(OrgRole.ADMIN);
    });
  });

  describe("deleteUser", () => {
    it("blocks self-delete", async () => {
      await expect(
        service.deleteUser(platformAdmin, platformAdmin.userId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it("blocks deleting last OWNER globally", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.find.mockResolvedValue([
        { organizationId: "o-1", role: OrgRole.OWNER },
      ]);
      userOrgs.count.mockResolvedValue(1);
      await expect(
        service.deleteUser(platformAdmin, "x"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it("deletes user globally when not last owner", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.find.mockResolvedValue([]);
      await service.deleteUser(platformAdmin, "x");
      expect(users.delete).toHaveBeenCalledWith({ id: "x" });
    });
  });
});
