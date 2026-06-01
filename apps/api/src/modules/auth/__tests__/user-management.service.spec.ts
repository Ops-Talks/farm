import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
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
    it("throws NotFoundException when user does not exist", async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.deleteUser(platformAdmin, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
    it("throws ForbiddenException for global delete by non-platform-admin", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.find.mockResolvedValue([]);
      await expect(service.deleteUser(orgAdmin, "x")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
    it("removes org membership (org-scoped delete by org admin)", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      // assertOrgAdmin: actor is platform admin so passes regardless
      userOrgs.findOne
        .mockResolvedValueOnce(null) // assertOrgAdmin: no membership but isPlatformAdmin overrides
        .mockResolvedValueOnce({
          id: "uo-99",
          userId: "x",
          organizationId: "o-1",
          role: OrgRole.MEMBER,
        });
      await service.deleteUser(platformAdmin, "x", "o-1");
      expect(userOrgs.delete).toHaveBeenCalledWith({ id: "uo-99" });
    });
    it("throws NotFoundException when org membership not found (org-scoped)", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.findOne
        .mockResolvedValueOnce(null) // assertOrgAdmin (platform admin override)
        .mockResolvedValueOnce(null); // membership check
      await expect(
        service.deleteUser(platformAdmin, "x", "o-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
    it("throws BadRequestException when removing last OWNER from org (org-scoped)", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.findOne
        .mockResolvedValueOnce(null) // assertOrgAdmin
        .mockResolvedValueOnce({
          id: "uo-99",
          userId: "x",
          organizationId: "o-1",
          role: OrgRole.OWNER,
        });
      userOrgs.count.mockResolvedValue(1);
      await expect(
        service.deleteUser(platformAdmin, "x", "o-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it("allows deletion when org has multiple owners (org-scoped)", async () => {
      users.findOne.mockResolvedValue({ id: "x" });
      userOrgs.findOne
        .mockResolvedValueOnce(null) // assertOrgAdmin
        .mockResolvedValueOnce({
          id: "uo-99",
          userId: "x",
          organizationId: "o-1",
          role: OrgRole.OWNER,
        });
      userOrgs.count.mockResolvedValue(2);
      await service.deleteUser(platformAdmin, "x", "o-1");
      expect(userOrgs.delete).toHaveBeenCalledWith({ id: "uo-99" });
    });
  });

  describe("getAdminOrgIds", () => {
    it("returns org ids where actor is ADMIN or OWNER", async () => {
      userOrgs.find.mockResolvedValue([
        { userId: "oa-1", organizationId: "o-1", role: OrgRole.ADMIN },
        { userId: "oa-1", organizationId: "o-2", role: OrgRole.OWNER },
        { userId: "oa-1", organizationId: "o-3", role: OrgRole.MEMBER },
      ]);
      const ids = await service.getAdminOrgIds(orgAdmin);
      expect(ids).toEqual(["o-1", "o-2"]);
      expect(ids).not.toContain("o-3");
    });
  });

  describe("listUsers (extended)", () => {
    it("filters users by orgId for org admin", async () => {
      userOrgs.find
        .mockResolvedValueOnce([{ organizationId: "o-1", role: OrgRole.ADMIN }]) // getAdminOrgIds
        .mockResolvedValueOnce([{ userId: "u-2" }]); // fetch members of orgId
      users.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.listUsers(orgAdmin, { orgId: "o-1" });
      expect(result.total).toBe(0);
    });

    it("throws ForbiddenException when org admin requests an org they do not manage", async () => {
      userOrgs.find.mockResolvedValueOnce([
        { organizationId: "o-1", role: OrgRole.ADMIN },
      ]);
      await expect(
        service.listUsers(orgAdmin, { orgId: "o-other" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns empty result when orgId has no members", async () => {
      userOrgs.find
        .mockResolvedValueOnce([{ organizationId: "o-1", role: OrgRole.ADMIN }]) // getAdminOrgIds
        .mockResolvedValueOnce([]); // no members
      const result = await service.listUsers(orgAdmin, { orgId: "o-1" });
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("scopes users to admin org ids when no orgId specified (org admin)", async () => {
      userOrgs.find
        .mockResolvedValueOnce([{ organizationId: "o-1", role: OrgRole.ADMIN }]) // getAdminOrgIds
        .mockResolvedValueOnce([{ userId: "u-5" }]); // cross-org members
      users.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(orgAdmin);
      expect(users.findAndCount).toHaveBeenCalled();
    });

    it("applies search filter to query", async () => {
      userOrgs.find.mockResolvedValue([]);
      users.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(platformAdmin, { search: "alice" });
      const call = (
        users.findAndCount.mock.calls[0] as [Record<string, unknown>]
      )[0];
      expect(JSON.stringify(call["where"])).toContain("alice");
    });

    it("applies role filter post-query", async () => {
      const user1 = {
        id: "u-1",
        username: "a",
        email: "a@x",
        displayName: "A",
        roles: ["user"],
        suspended: false,
        lastLogin: null,
        createdAt: new Date(),
      };
      users.findAndCount.mockResolvedValue([[user1], 1]);
      userOrgs.find
        .mockResolvedValueOnce([]) // getAdminOrgIds
        .mockResolvedValueOnce([{ userId: "u-1", role: OrgRole.ADMIN }]); // role filter
      const result = await service.listUsers(platformAdmin, {
        role: OrgRole.ADMIN,
      });
      expect(result.users).toHaveLength(1);
    });
  });

  describe("getUser (extended)", () => {
    it("returns view for platform admin", async () => {
      users.findOne.mockResolvedValue({
        id: "u-1",
        username: "alice",
        email: "a@x",
        displayName: "A",
        roles: ["user"],
        suspended: false,
        lastLogin: null,
        createdAt: new Date(),
      });
      userOrgs.find.mockResolvedValue([]);
      orgs.find.mockResolvedValue([]);

      const view = await service.getUser(platformAdmin, "u-1");
      expect(view.id).toBe("u-1");
    });

    it("throws NotFoundException when user missing", async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.getUser(platformAdmin, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when org admin has no admin orgs", async () => {
      users.findOne.mockResolvedValue({ id: "u-1" });
      userOrgs.find.mockResolvedValue([]);
      await expect(service.getUser(orgAdmin, "u-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("throws ForbiddenException when org admin has no overlapping membership", async () => {
      users.findOne.mockResolvedValue({ id: "u-1" });
      userOrgs.find
        .mockResolvedValueOnce([{ organizationId: "o-1", role: OrgRole.ADMIN }]) // getAdminOrgIds
        .mockResolvedValueOnce([{ organizationId: "o-other" }]); // target user memberships
      await expect(service.getUser(orgAdmin, "u-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("returns view when org admin has overlapping membership", async () => {
      users.findOne.mockResolvedValue({
        id: "u-1",
        username: "u",
        email: "u@x",
        displayName: "U",
        roles: ["user"],
        suspended: false,
        lastLogin: null,
        createdAt: new Date(),
      });
      userOrgs.find
        .mockResolvedValueOnce([{ organizationId: "o-1", role: OrgRole.ADMIN }]) // getAdminOrgIds
        .mockResolvedValueOnce([{ organizationId: "o-1" }]) // target user memberships (overlap)
        .mockResolvedValueOnce([
          { organizationId: "o-1", role: OrgRole.MEMBER },
        ]); // toView memberships
      orgs.find.mockResolvedValue([{ id: "o-1", slug: "acme", name: "Acme" }]);
      const view = await service.getUser(orgAdmin, "u-1");
      expect(view.id).toBe("u-1");
    });
  });

  describe("setSuspended (extended)", () => {
    it("activates a user (suspended: false) without clearing refreshToken", async () => {
      users.findOne.mockResolvedValue({
        id: "x",
        suspended: true,
        refreshToken: "tok",
      });
      const u = await service.setSuspended(platformAdmin, "x", false);
      expect(u.suspended).toBe(false);
      expect((u as unknown as Record<string, unknown>)["refreshToken"]).toBe(
        "tok",
      );
    });

    it("throws NotFoundException when user does not exist", async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.setSuspended(platformAdmin, "x", true),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateRole (extended)", () => {
    it("throws NotFoundException when target has no membership", async () => {
      userOrgs.findOne
        .mockResolvedValueOnce({
          userId: platformAdmin.userId,
          organizationId: "o",
          role: OrgRole.OWNER,
        }) // assertOrgAdmin
        .mockResolvedValueOnce(null); // target membership
      await expect(
        service.updateRole(platformAdmin, "tgt", "o", OrgRole.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("allows demotion when there are multiple owners", async () => {
      userOrgs.findOne
        .mockResolvedValueOnce({
          userId: platformAdmin.userId,
          organizationId: "o",
          role: OrgRole.OWNER,
        }) // assertOrgAdmin
        .mockResolvedValueOnce({
          id: "uo",
          userId: platformAdmin.userId,
          organizationId: "o",
          role: OrgRole.OWNER,
        }); // target membership
      userOrgs.count.mockResolvedValue(2);
      const result = await service.updateRole(
        platformAdmin,
        platformAdmin.userId,
        "o",
        OrgRole.ADMIN,
      );
      expect(result.role).toBe(OrgRole.ADMIN);
    });
  });

  describe("resetPassword (extended)", () => {
    it("returns only expiry (no tempPassword) when SMTP is enabled", async () => {
      users.findOne.mockResolvedValue({
        id: "x",
        username: "tgt",
        email: "tgt@x",
      });

      // Re-build module with smtp.host configured
      const mod2 = await Test.createTestingModule({
        providers: [
          UserManagementService,
          { provide: getRepositoryToken(User), useValue: users },
          { provide: getRepositoryToken(PasswordReset), useValue: resets },
          { provide: getRepositoryToken(Organization), useValue: orgs },
          { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((k: string) => {
                if (k === "smtp.host") return "smtp.example.com";
                return "http://x";
              }),
            },
          },
          {
            provide: AuditLogService,
            useValue: { log: jest.fn().mockResolvedValue(undefined) },
          },
          { provide: "BullQueue_notifications", useValue: queue },
        ],
      }).compile();

      const smtpService = mod2.get(UserManagementService);
      const out = await smtpService.resetPassword(platformAdmin, "x");
      expect(out.fallback).toBeUndefined();
      expect(out.tempPassword).toBeUndefined();
      expect(out.tempPasswordExpiresAt).toBeInstanceOf(Date);
    });

    it("logs a warning when queue.add throws (graceful degradation)", async () => {
      users.findOne.mockResolvedValue({
        id: "x",
        username: "tgt",
        email: "tgt@x",
      });
      queue.add.mockRejectedValueOnce(new Error("queue down"));

      // Re-build module with smtp.host and queue
      const mod2 = await Test.createTestingModule({
        providers: [
          UserManagementService,
          { provide: getRepositoryToken(User), useValue: users },
          { provide: getRepositoryToken(PasswordReset), useValue: resets },
          { provide: getRepositoryToken(Organization), useValue: orgs },
          { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((k: string) =>
                k === "smtp.host" ? "smtp.example.com" : "http://x",
              ),
            },
          },
          {
            provide: AuditLogService,
            useValue: { log: jest.fn().mockResolvedValue(undefined) },
          },
          { provide: "BullQueue_notifications", useValue: queue },
        ],
      }).compile();

      const smtpService = mod2.get(UserManagementService);
      // Should not throw even when queue fails
      await expect(
        smtpService.resetPassword(platformAdmin, "x"),
      ).resolves.toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 56 — createUser
  // ---------------------------------------------------------------------------

  describe("createUser", () => {
    const newUserDto = {
      username: "newuser",
      email: "new@example.com",
      displayName: "New User",
    };

    const savedUser = {
      id: "new-u-1",
      username: "newuser",
      email: "new@example.com",
      displayName: "New User",
      roles: ["user"],
      suspended: false,
      lastLogin: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      // No existing user by default
      users.findOne.mockResolvedValue(null);
      // create() returns the input; save() returns savedUser
      users.create.mockReturnValue(savedUser);
      users.save.mockResolvedValue(savedUser);
      // toView: userOrgs.find returns [], orgs.find returns []
      userOrgs.find.mockResolvedValue([]);
      orgs.find.mockResolvedValue([]);
    });

    it("(1) platform admin creates user globally → returns ManagedUserView", async () => {
      const result = await service.createUser(platformAdmin, newUserDto);
      expect(result.username).toBe("newuser");
      expect(result.email).toBe("new@example.com");
      expect(result.id).toBe("new-u-1");
    });

    it("(2) platform admin with platformAdmin:true → user.roles includes 'admin'", async () => {
      users.create.mockReturnValue({ ...savedUser, roles: ["user", "admin"] });
      users.save.mockResolvedValue({ ...savedUser, roles: ["user", "admin"] });

      await service.createUser(platformAdmin, {
        ...newUserDto,
        platformAdmin: true,
      });

      const createCall = users.create.mock.calls[0][0] as { roles: string[] };
      expect(createCall.roles).toContain("admin");
    });

    it("(3) org admin with matching orgId → success, UserOrganization saved", async () => {
      // assertOrgAdmin: findOne returns membership for org admin
      userOrgs.findOne.mockResolvedValueOnce({
        userId: orgAdmin.userId,
        organizationId: "org-1",
        role: OrgRole.ADMIN,
      });
      // org existence check
      orgs.findOne.mockResolvedValueOnce({ id: "org-1", name: "Acme" });

      await service.createUser(orgAdmin, {
        ...newUserDto,
        orgId: "org-1",
        orgRole: OrgRole.MEMBER,
      });

      expect(userOrgs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          role: OrgRole.MEMBER,
        }),
      );
    });

    it("(4) org admin with non-matching orgId → 403 ForbiddenException", async () => {
      // assertOrgAdmin: findOne returns null (not a member)
      userOrgs.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createUser(orgAdmin, { ...newUserDto, orgId: "other-org" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("(5) org admin with no orgId → 403 ForbiddenException", async () => {
      await expect(service.createUser(orgAdmin, newUserDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("(6) non-admin with platformAdmin:true → 403 ForbiddenException", async () => {
      // orgAdmin passes assertOrgAdmin for their org...
      userOrgs.findOne.mockResolvedValueOnce({
        userId: orgAdmin.userId,
        organizationId: "org-1",
        role: OrgRole.ADMIN,
      });

      await expect(
        service.createUser(orgAdmin, {
          ...newUserDto,
          orgId: "org-1",
          platformAdmin: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("(7) duplicate username → 409 ConflictException", async () => {
      users.findOne.mockResolvedValueOnce({
        id: "existing",
        username: "newuser",
      });

      await expect(
        service.createUser(platformAdmin, newUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it("(8) duplicate email → 409 ConflictException", async () => {
      users.findOne.mockResolvedValueOnce({
        id: "existing",
        email: "new@example.com",
      });

      await expect(
        service.createUser(platformAdmin, newUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it("(9) SMTP unavailable → tempPassword present in response", async () => {
      // Default ConfigService mock returns '' for smtp.host
      const result = await service.createUser(platformAdmin, newUserDto);
      expect(result.tempPassword).toBeDefined();
      expect(typeof result.tempPassword).toBe("string");
      expect(result.tempPassword!.length).toBeGreaterThan(0);
    });

    it("(10) SMTP available + queue → tempPassword absent, notification enqueued", async () => {
      const mod2 = await Test.createTestingModule({
        providers: [
          UserManagementService,
          { provide: getRepositoryToken(User), useValue: users },
          { provide: getRepositoryToken(PasswordReset), useValue: resets },
          { provide: getRepositoryToken(Organization), useValue: orgs },
          { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((k: string) =>
                k === "smtp.host" ? "smtp.example.com" : "http://x",
              ),
            },
          },
          {
            provide: AuditLogService,
            useValue: { log: jest.fn().mockResolvedValue(undefined) },
          },
          { provide: "BullQueue_notifications", useValue: queue },
        ],
      }).compile();

      const smtpService = mod2.get(UserManagementService);
      const result = await smtpService.createUser(platformAdmin, newUserDto);

      expect(result.tempPassword).toBeUndefined();
      expect(queue.add).toHaveBeenCalledWith(
        "send-welcome-email",
        expect.objectContaining({
          type: "email",
          recipient: "new@example.com",
        }),
      );
    });

    it("(11) audit log USER_CREATED emitted", async () => {
      const auditSpy = jest.fn().mockResolvedValue(undefined);
      const mod2 = await Test.createTestingModule({
        providers: [
          UserManagementService,
          { provide: getRepositoryToken(User), useValue: users },
          { provide: getRepositoryToken(PasswordReset), useValue: resets },
          { provide: getRepositoryToken(Organization), useValue: orgs },
          { provide: getRepositoryToken(UserOrganization), useValue: userOrgs },
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => "") },
          },
          {
            provide: AuditLogService,
            useValue: { log: auditSpy },
          },
          { provide: "BullQueue_notifications", useValue: queue },
        ],
      }).compile();

      await mod2
        .get(UserManagementService)
        .createUser(platformAdmin, newUserDto);

      await new Promise((r) => setTimeout(r, 10));
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_CREATED" }),
      );
    });
  });
});
