import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PermissionGuard } from "./permission.guard";
import { OrgRole, Permission } from "@farm/types";

function buildContext(
  permission: Permission | undefined,
  orgRole: OrgRole | undefined,
): ExecutionContext {
  const handler = jest.fn();
  const ctx = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ orgRole }),
    }),
  } as unknown as ExecutionContext;
  return ctx;
}

describe("PermissionGuard", () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionGuard, Reflector],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it("allows access when no permission is required", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = buildContext(undefined, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws ForbiddenException when orgRole is not set", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_WRITE);
    const ctx = buildContext(Permission.CATALOG_WRITE, undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException with ORG_CONTEXT_MISSING errorCode when orgRole missing", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_WRITE);
    const ctx = buildContext(Permission.CATALOG_WRITE, undefined);
    try {
      guard.canActivate(ctx);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const response = (err as ForbiddenException).getResponse() as Record<
        string,
        string
      >;
      expect(response.errorCode).toBe("ORG_CONTEXT_MISSING");
    }
  });

  it("allows OWNER to perform catalog:write", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_WRITE);
    const ctx = buildContext(Permission.CATALOG_WRITE, OrgRole.OWNER);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows ADMIN to perform catalog:delete", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_DELETE);
    const ctx = buildContext(Permission.CATALOG_DELETE, OrgRole.ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows MEMBER to perform catalog:write", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_WRITE);
    const ctx = buildContext(Permission.CATALOG_WRITE, OrgRole.MEMBER);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies MEMBER from performing catalog:delete", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.CATALOG_DELETE);
    const ctx = buildContext(Permission.CATALOG_DELETE, OrgRole.MEMBER);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("denies VIEWER from performing any permission", () => {
    const perms = Object.values(Permission);
    perms.forEach((perm) => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(perm);
      const ctx = buildContext(perm, OrgRole.VIEWER);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  it("throws ForbiddenException with INSUFFICIENT_PERMISSIONS errorCode on denial", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.ORG_MANAGE);
    const ctx = buildContext(Permission.ORG_MANAGE, OrgRole.ADMIN);
    try {
      guard.canActivate(ctx);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const response = (err as ForbiddenException).getResponse() as Record<
        string,
        string
      >;
      expect(response.errorCode).toBe("INSUFFICIENT_PERMISSIONS");
    }
  });

  it("denies ADMIN from performing org:manage", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.ORG_MANAGE);
    const ctx = buildContext(Permission.ORG_MANAGE, OrgRole.ADMIN);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("allows OWNER to perform org:manage", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(Permission.ORG_MANAGE);
    const ctx = buildContext(Permission.ORG_MANAGE, OrgRole.OWNER);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
