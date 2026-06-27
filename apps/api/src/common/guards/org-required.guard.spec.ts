import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";
import { OrgRequiredGuard } from "./org-required.guard";
import { ORG_REQUIRED_KEY } from "../decorators/org-required.decorator";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";

describe("OrgRequiredGuard", () => {
  let guard: OrgRequiredGuard;
  let reflector: Reflector;
  let mockUserOrgRepo: { findOne: jest.Mock };

  const userId = "user-uuid-1";
  const orgId = "org-uuid-1";

  function createMockContext(options: {
    headers?: Record<string, string>;
    user?: { userId: string } | null;
    existingOrgId?: string;
  }): ExecutionContext {
    const req: Record<string, unknown> = {
      headers: options.headers ?? {},
      user: options.user !== undefined ? options.user : { userId },
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    mockUserOrgRepo = { findOne: jest.fn() };
    guard = new OrgRequiredGuard(
      reflector,
      mockUserOrgRepo as unknown as Repository<UserOrganization>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("allows access when @OrgRequired() is not present on the route", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockUserOrgRepo.findOne).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when X-Organization-Id header is absent", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createMockContext({ headers: {}, user: { userId } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "X-Organization-Id header is required for this endpoint",
    );
  });

  it("throws ForbiddenException when req.user is absent", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createMockContext({
      headers: { "x-organization-id": orgId },
      user: null,
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "Authentication required for this endpoint",
    );
  });

  it("throws ForbiddenException with ORG_STALE_MEMBERSHIP errorCode when user is not a member of the org", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    mockUserOrgRepo.findOne.mockResolvedValue(null);
    const ctx = createMockContext({
      headers: { "x-organization-id": orgId },
      user: { userId },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    let thrownError: ForbiddenException | undefined;
    try {
      await guard.canActivate(ctx);
    } catch (e) {
      thrownError = e as ForbiddenException;
    }
    expect(thrownError).toBeInstanceOf(ForbiddenException);
    const response = thrownError!.getResponse() as Record<string, unknown>;
    expect(response.message).toBe("Not a member of this organization");
    expect(response.errorCode).toBe("ORG_STALE_MEMBERSHIP");
    expect(mockUserOrgRepo.findOne).toHaveBeenCalledWith({
      where: { userId, organizationId: orgId },
    });
  });

  it("allows access and sets req.organizationId when membership is valid", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const membership: Partial<UserOrganization> = {
      id: "membership-1",
      userId,
      organizationId: orgId,
      role: "member" as UserOrganization["role"],
    };
    mockUserOrgRepo.findOne.mockResolvedValue(membership);

    const req = {
      headers: { "x-organization-id": orgId },
      user: { userId },
    };
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req).toHaveProperty("organizationId", orgId);
    expect(req).toHaveProperty("orgRole", "member");
    expect(mockUserOrgRepo.findOne).toHaveBeenCalledWith({
      where: { userId, organizationId: orgId },
    });
  });

  it("queries the repository with correct userId and organizationId", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    mockUserOrgRepo.findOne.mockResolvedValue(null);

    const customUserId = "user-abc-123";
    const customOrgId = "org-xyz-456";
    const ctx = createMockContext({
      headers: { "x-organization-id": customOrgId },
      user: { userId: customUserId },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockUserOrgRepo.findOne).toHaveBeenCalledWith({
      where: { userId: customUserId, organizationId: customOrgId },
    });
  });

  it("verifies ORG_REQUIRED_KEY constant value matches the decorator key", () => {
    expect(ORG_REQUIRED_KEY).toBe("orgRequired");
  });
});
