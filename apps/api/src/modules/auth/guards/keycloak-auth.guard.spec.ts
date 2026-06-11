import { ExecutionContext } from "@nestjs/common";
import { KeycloakDynamicGuard } from "./keycloak-auth.guard";
import { KeycloakOidcService } from "../keycloak-oidc.service";

jest.mock("passport", () => {
  const mockAuthFn = jest.fn();
  return {
    use: jest.fn(),
    unuse: jest.fn(),
    authenticate: jest.fn(() => mockAuthFn),
  };
});

const mockKeycloakOidcService = {
  getStrategyForOrg: jest.fn(),
};

function buildContext(query: Record<string, string>): ExecutionContext {
  const mockRes = { redirect: jest.fn() };
  const mockReq = { query, session: {} };
  return {
    switchToHttp: () => ({
      getRequest: () => mockReq,
      getResponse: () => mockRes,
      getNext: () => jest.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe("KeycloakDynamicGuard", () => {
  let guard: KeycloakDynamicGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new KeycloakDynamicGuard(
      mockKeycloakOidcService as unknown as KeycloakOidcService,
    );
  });

  it("redirects when orgId is missing", async () => {
    const ctx = buildContext({});
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as { redirect: jest.Mock };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith(
      "/?error=keycloak_not_configured",
    );
  });

  it("redirects when strategy is not found", async () => {
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(null);
    const ctx = buildContext({ orgId: "org-1" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as { redirect: jest.Mock };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith(
      "/?error=keycloak_not_configured",
    );
  });

  it("registers strategy and calls passport.authenticate", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passport = require("passport") as {
      use: jest.Mock;
      authenticate: jest.Mock;
      unuse: jest.Mock;
    };

    const mockStrategy = { name: "mock" };
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);
    passport.authenticate.mockImplementation(
      () => (__: unknown, ___: unknown, next: (err?: unknown) => void) => {
        next();
      },
    );

    const ctx = buildContext({ orgId: "org-1" });

    const result = await guard.canActivate(ctx);

    expect(passport.use).toHaveBeenCalledWith(
      "keycloak-dynamic-org-1",
      mockStrategy,
    );
    expect(passport.authenticate).toHaveBeenCalledWith(
      "keycloak-dynamic-org-1",
      { scope: ["openid", "email", "profile"] },
    );
    expect(passport.unuse).toHaveBeenCalledWith("keycloak-dynamic-org-1");
    expect(result).toBe(true);
  });

  it("rejects when passport.authenticate calls back with error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passport = require("passport") as {
      use: jest.Mock;
      authenticate: jest.Mock;
      unuse: jest.Mock;
    };

    const mockStrategy = { name: "mock" };
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);
    passport.authenticate.mockImplementation(
      () => (__: unknown, ___: unknown, next: (err?: unknown) => void) => {
        next(new Error("auth failed"));
      },
    );

    const ctx = buildContext({ orgId: "org-1" });

    await expect(guard.canActivate(ctx)).rejects.toThrow("auth failed");
  });
});
