import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { OrgRole } from "@farm/types";
import { UserManagementController } from "../user-management.controller";
import { UserManagementService } from "../user-management.service";
import { AuditLogService } from "../../audit-log/audit-log.service";

const mockUser = {
  userId: "admin-1",
  username: "admin",
  roles: ["admin"],
};

const mockReq = { user: mockUser } as never;

const makeView = (overrides = {}) => ({
  id: "u-1",
  username: "alice",
  email: "alice@example.com",
  displayName: "Alice",
  roles: ["user"],
  suspended: false,
  lastLogin: null,
  createdAt: new Date(),
  orgMemberships: [],
  ...overrides,
});

describe("UserManagementController", () => {
  let controller: UserManagementController;
  let svc: jest.Mocked<UserManagementService>;
  let auditLog: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    svc = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      updateRole: jest.fn(),
      setSuspended: jest.fn(),
      resetPassword: jest.fn(),
      deleteUser: jest.fn(),
      isPlatformAdmin: jest.fn(),
      getAdminOrgIds: jest.fn(),
    } as unknown as jest.Mocked<UserManagementService>;

    auditLog = {
      findAll: jest.fn().mockResolvedValue([]),
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [
        { provide: UserManagementService, useValue: svc },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    controller = module.get(UserManagementController);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // GET /users
  // ---------------------------------------------------------------------------

  describe("list", () => {
    it("returns paginated list without filters", async () => {
      const result = { users: [makeView()], total: 1, page: 1, pageSize: 25 };
      svc.listUsers.mockResolvedValue(result);

      const out = await controller.list(mockReq);

      expect(svc.listUsers).toHaveBeenCalledWith(mockUser, {
        orgId: undefined,
        search: undefined,
        role: undefined,
        page: undefined,
        pageSize: undefined,
      });
      expect(out.total).toBe(1);
    });

    it("passes parsed page and pageSize to service", async () => {
      svc.listUsers.mockResolvedValue({
        users: [],
        total: 0,
        page: 2,
        pageSize: 10,
      });

      await controller.list(
        mockReq,
        "org-1",
        "alice",
        OrgRole.ADMIN,
        "2",
        "10",
      );

      expect(svc.listUsers).toHaveBeenCalledWith(mockUser, {
        orgId: "org-1",
        search: "alice",
        role: OrgRole.ADMIN,
        page: 2,
        pageSize: 10,
      });
    });

    it("propagates ForbiddenException", async () => {
      svc.listUsers.mockRejectedValue(new ForbiddenException());
      await expect(controller.list(mockReq)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /users/:id
  // ---------------------------------------------------------------------------

  describe("getOne", () => {
    it("returns the user view", async () => {
      const view = makeView();
      svc.getUser.mockResolvedValue(view);

      const out = await controller.getOne("u-1", mockReq);

      expect(svc.getUser).toHaveBeenCalledWith(mockUser, "u-1");
      expect(out.id).toBe("u-1");
    });

    it("propagates NotFoundException", async () => {
      svc.getUser.mockRejectedValue(new NotFoundException());
      await expect(
        controller.getOne("missing", mockReq),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /users/:id/role
  // ---------------------------------------------------------------------------

  describe("updateRole", () => {
    it("returns reshaped role response", async () => {
      svc.updateRole.mockResolvedValue({
        id: "uo-1",
        userId: "u-1",
        organizationId: "org-1",
        role: OrgRole.ADMIN,
      } as never);

      const out = await controller.updateRole(
        "u-1",
        { orgId: "org-1", role: OrgRole.ADMIN },
        mockReq,
      );

      expect(out).toEqual({
        userId: "u-1",
        orgId: "org-1",
        role: OrgRole.ADMIN,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /users/:id/suspend
  // ---------------------------------------------------------------------------

  describe("suspend", () => {
    it("suspends a user and returns id + suspended", async () => {
      svc.setSuspended.mockResolvedValue({
        id: "u-1",
        suspended: true,
      } as never);

      const out = await controller.suspend("u-1", { suspended: true }, mockReq);

      expect(svc.setSuspended).toHaveBeenCalledWith(mockUser, "u-1", true);
      expect(out).toEqual({ id: "u-1", suspended: true });
    });

    it("activates a user (suspended: false)", async () => {
      svc.setSuspended.mockResolvedValue({
        id: "u-1",
        suspended: false,
      } as never);

      const out = await controller.suspend(
        "u-1",
        { suspended: false },
        mockReq,
      );

      expect(out.suspended).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /users/:id/reset-password
  // ---------------------------------------------------------------------------

  describe("resetPassword", () => {
    it("returns expiry with temp password when SMTP disabled (fallback)", async () => {
      const expiresAt = new Date();
      svc.resetPassword.mockResolvedValue({
        tempPasswordExpiresAt: expiresAt,
        tempPassword: "Abc123XY",
        fallback: true,
      });

      const out = await controller.resetPassword("u-1", mockReq);

      expect(svc.resetPassword).toHaveBeenCalledWith(mockUser, "u-1");
      expect(out.fallback).toBe(true);
      expect(out.tempPassword).toBe("Abc123XY");
    });

    it("returns only expiry when SMTP is enabled", async () => {
      const expiresAt = new Date();
      svc.resetPassword.mockResolvedValue({ tempPasswordExpiresAt: expiresAt });

      const out = await controller.resetPassword("u-1", mockReq);

      expect(out.tempPassword).toBeUndefined();
      expect(out.fallback).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /users/:id
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("calls deleteUser without orgId for global delete", async () => {
      svc.deleteUser.mockResolvedValue(undefined);

      await controller.remove("u-1", mockReq);

      expect(svc.deleteUser).toHaveBeenCalledWith(mockUser, "u-1", undefined);
    });

    it("calls deleteUser with orgId for org-scoped removal", async () => {
      svc.deleteUser.mockResolvedValue(undefined);

      await controller.remove("u-1", mockReq, "org-1");

      expect(svc.deleteUser).toHaveBeenCalledWith(mockUser, "u-1", "org-1");
    });

    it("propagates ForbiddenException", async () => {
      svc.deleteUser.mockRejectedValue(new ForbiddenException());
      await expect(controller.remove("u-1", mockReq)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /users/:id/audit-trail
  // ---------------------------------------------------------------------------

  describe("auditTrail", () => {
    it("returns entries from audit log when available", async () => {
      const entries = [{ id: "e1" }];
      svc.getUser.mockResolvedValue(makeView());
      auditLog.findAll.mockResolvedValue(entries as never);

      const out = await controller.auditTrail("u-1", mockReq);

      expect(svc.getUser).toHaveBeenCalledWith(mockUser, "u-1");
      expect(auditLog.findAll).toHaveBeenCalledWith({
        resourceType: "User",
        resourceId: "u-1",
        limit: 200,
      });
      expect(out).toEqual(entries);
    });

    it("returns empty array when auditLog is not injected", async () => {
      // Re-build without auditLog provider
      const module2: TestingModule = await Test.createTestingModule({
        controllers: [UserManagementController],
        providers: [{ provide: UserManagementService, useValue: svc }],
      }).compile();

      const ctrl2 = module2.get(UserManagementController);
      svc.getUser.mockResolvedValue(makeView());

      const out = await ctrl2.auditTrail("u-1", mockReq);
      expect(out).toEqual([]);
    });
  });
});
