import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { OrgRolesGuard } from "./org-roles.guard";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";

describe("OrgRolesGuard", () => {
  let guard: OrgRolesGuard;
  let reflector: Reflector;
  let userOrgRepo: { findOne: jest.Mock };

  const userId = "user-uuid-1";
  const organizationId = "org-uuid-1";

  function createMockContext(options: {
    user?: { userId: string; username: string; roles: string[] };
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: options.user,
          params: options.params ?? {},
          body: options.body ?? {},
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function mockMembership(role: OrgRole): Partial<UserOrganization> {
    return {
      id: "membership-uuid-1",
      userId,
      organizationId,
      role,
    };
  }

  beforeEach(() => {
    reflector = new Reflector();
    userOrgRepo = { findOne: jest.fn() };
    guard = new OrgRolesGuard(
      reflector,
      userOrgRepo as unknown as import("typeorm").Repository<UserOrganization>,
    );
  });

  it("should allow access when no org roles are required", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("should deny access when user is not authenticated", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([OrgRole.MEMBER]);

    const ctx = createMockContext({
      user: undefined,
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it("should throw ForbiddenException when organizationId is not present", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([OrgRole.MEMBER]);

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("should throw ForbiddenException when user is not a member of the organization", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([OrgRole.MEMBER]);
    userOrgRepo.findOne.mockResolvedValue(null);

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("should allow OWNER to access OWNER-required endpoints", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([OrgRole.OWNER]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.OWNER));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("should allow OWNER to access ADMIN-required endpoints", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([OrgRole.ADMIN]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.OWNER));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("should deny MEMBER access to ADMIN-required endpoints", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([OrgRole.ADMIN]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.MEMBER));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("should deny ADMIN access to OWNER-required endpoints", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([OrgRole.OWNER]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.ADMIN));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("should resolve organizationId from request body when not in params", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([OrgRole.MEMBER]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.MEMBER));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: {},
      body: { organizationId },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("should use string role values for lookup (e.g. 'admin')", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    userOrgRepo.findOne.mockResolvedValue(mockMembership(OrgRole.ADMIN));

    const ctx = createMockContext({
      user: { userId, username: "u", roles: [] },
      params: { id: organizationId },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
