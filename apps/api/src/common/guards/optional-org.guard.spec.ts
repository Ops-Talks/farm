import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { OptionalOrgGuard } from "./optional-org.guard";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";

describe("OptionalOrgGuard", () => {
  let guard: OptionalOrgGuard;
  let mockUserOrgRepo: { findOne: jest.Mock };

  const userId = "user-uuid-1";
  const orgId = "org-uuid-1";

  function createMockContext(options: {
    headers?: Record<string, string>;
    user?: { userId: string } | null | undefined;
    noUser?: boolean;
  }): ExecutionContext & { req: Record<string, unknown> } {
    const req: Record<string, unknown> = {
      headers: options.headers ?? {},
    };
    // Only assign `user` when explicitly provided; omit it entirely when
    // noUser is true so req.user is undefined (simulates an unauthenticated
    // request where JwtAuthGuard did not run or rejected).
    if (!options.noUser) {
      req.user = options.user !== undefined ? options.user : { userId };
    }
    return {
      req,
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext & { req: Record<string, unknown> };
  }

  beforeEach(() => {
    mockUserOrgRepo = { findOne: jest.fn() };
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockUserOrgRepo),
    };
    guard = new OptionalOrgGuard(mockDataSource as unknown as DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("allows access and leaves organizationId undefined when header is absent", async () => {
    const ctx = createMockContext({ headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.req["organizationId"]).toBeUndefined();
    expect(mockUserOrgRepo.findOne).not.toHaveBeenCalled();
  });

  it("allows access and leaves organizationId undefined when user is not authenticated", async () => {
    const ctx = createMockContext({
      headers: { "x-organization-id": orgId },
      noUser: true,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.req["organizationId"]).toBeUndefined();
    expect(mockUserOrgRepo.findOne).not.toHaveBeenCalled();
  });

  it("allows access and leaves organizationId undefined when user is null", async () => {
    const ctx = createMockContext({
      headers: { "x-organization-id": orgId },
      user: null,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.req["organizationId"]).toBeUndefined();
    expect(mockUserOrgRepo.findOne).not.toHaveBeenCalled();
  });

  it("sets organizationId and orgRole when header is present and membership is valid", async () => {
    const membership: Partial<UserOrganization> = {
      id: "m-1",
      userId,
      organizationId: orgId,
      role: "member" as UserOrganization["role"],
    };
    mockUserOrgRepo.findOne.mockResolvedValueOnce(membership);

    const ctx = createMockContext({ headers: { "x-organization-id": orgId } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(ctx.req["organizationId"]).toBe(orgId);
    expect(ctx.req["orgRole"]).toBe("member");
    expect(mockUserOrgRepo.findOne).toHaveBeenCalledWith({
      where: { userId, organizationId: orgId },
    });
  });

  it("throws ForbiddenException with ORG_STALE_MEMBERSHIP when user is not a member", async () => {
    mockUserOrgRepo.findOne.mockResolvedValueOnce(null);

    const ctx = createMockContext({ headers: { "x-organization-id": orgId } });
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
});
