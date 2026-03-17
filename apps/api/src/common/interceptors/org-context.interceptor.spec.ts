import { Test, TestingModule } from "@nestjs/testing";
import {
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { of } from "rxjs";
import { OrgContextInterceptor } from "./org-context.interceptor";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";

describe("OrgContextInterceptor", () => {
  let interceptor: OrgContextInterceptor;

  const mockUserOrgRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgContextInterceptor,
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: mockUserOrgRepository,
        },
      ],
    }).compile();

    interceptor = module.get<OrgContextInterceptor>(OrgContextInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Builds a minimal ExecutionContext from a partial request object.
   */
  function buildContext(req: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext;
  }

  const nextHandler: CallHandler = { handle: () => of(null) };

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("sets organizationId to undefined and calls next when header is absent", async () => {
    const req: Record<string, unknown> = {
      headers: {},
      user: { userId: "user-1", username: "alice", roles: [] },
    };
    const context = buildContext(req);

    const result$ = await interceptor.intercept(context, nextHandler);
    await new Promise<void>((resolve) =>
      result$.subscribe({ complete: resolve }),
    );

    expect(req["organizationId"]).toBeUndefined();
    expect(mockUserOrgRepository.findOne).not.toHaveBeenCalled();
  });

  it("sets organizationId to undefined and calls next when user is unauthenticated", async () => {
    const req: Record<string, unknown> = {
      headers: { "x-organization-id": "org-abc" },
      user: undefined,
    };
    const context = buildContext(req);

    const result$ = await interceptor.intercept(context, nextHandler);
    await new Promise<void>((resolve) =>
      result$.subscribe({ complete: resolve }),
    );

    expect(req["organizationId"]).toBeUndefined();
    expect(mockUserOrgRepository.findOne).not.toHaveBeenCalled();
  });

  it("attaches organizationId to request when header is present and membership is found", async () => {
    const req: Record<string, unknown> = {
      headers: { "x-organization-id": "org-abc" },
      user: { userId: "user-1", username: "alice", roles: [] },
    };
    const context = buildContext(req);

    const membership = {
      id: "m-1",
      userId: "user-1",
      organizationId: "org-abc",
    };
    mockUserOrgRepository.findOne.mockResolvedValueOnce(membership);

    const result$ = await interceptor.intercept(context, nextHandler);
    await new Promise<void>((resolve) =>
      result$.subscribe({ complete: resolve }),
    );

    expect(mockUserOrgRepository.findOne).toHaveBeenCalledWith({
      where: { userId: "user-1", organizationId: "org-abc" },
    });
    expect(req["organizationId"]).toBe("org-abc");
  });

  it("throws ForbiddenException when header is present but user is not a member", async () => {
    const req: Record<string, unknown> = {
      headers: { "x-organization-id": "org-xyz" },
      user: { userId: "user-2", username: "bob", roles: [] },
    };
    const context = buildContext(req);

    mockUserOrgRepository.findOne.mockResolvedValueOnce(null);

    await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow(
      new ForbiddenException("Not a member of this organization"),
    );

    expect(mockUserOrgRepository.findOne).toHaveBeenCalledWith({
      where: { userId: "user-2", organizationId: "org-xyz" },
    });
  });
});
