import { ExecutionContext } from "@nestjs/common";
import { KeycloakCallbackGuard } from "./keycloak-callback.guard";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import { AuthService } from "../auth.service";

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

const mockAuthService = {
  findOrCreateOAuthUser: jest.fn(),
};

function buildContext(session?: Record<string, string>): ExecutionContext {
  const mockRes = {
    redirect: jest.fn(),
    json: jest.fn(),
  };
  const mockReq = { session: session ?? {} };
  return {
    switchToHttp: () => ({
      getRequest: () => mockReq,
      getResponse: () => mockRes,
      getNext: () => jest.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe("KeycloakCallbackGuard", () => {
  let guard: KeycloakCallbackGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new KeycloakCallbackGuard(
      mockKeycloakOidcService as unknown as KeycloakOidcService,
      mockAuthService as unknown as AuthService,
    );
  });

  it("redirects when session has no keycloakOrgId", async () => {
    const ctx = buildContext({});
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as {
      redirect: jest.Mock;
    };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith(
      "/?error=keycloak_not_configured",
    );
  });

  it("redirects when strategy is not found", async () => {
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(null);
    const ctx = buildContext({ keycloakOrgId: "org-1" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as {
      redirect: jest.Mock;
    };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith(
      "/?error=keycloak_not_configured",
    );
  });

  it("redirects when passport authenticate returns error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passport = require("passport") as {
      use: jest.Mock;
      authenticate: jest.Mock;
      unuse: jest.Mock;
    };

    const mockStrategy = { name: "mock" };
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);
    passport.authenticate.mockImplementation(
      (
        _strategy: unknown,
        _opts: unknown,
        callback: (err: unknown, user: unknown) => void,
      ) => {
        return () => {
          callback(new Error("Auth failed"), false);
        };
      },
    );

    const ctx = buildContext({ keycloakOrgId: "org-1" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as {
      redirect: jest.Mock;
    };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith("/?error=keycloak_auth_failed");
  });

  it("redirects when passport authenticate returns no user", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passport = require("passport") as {
      use: jest.Mock;
      authenticate: jest.Mock;
      unuse: jest.Mock;
    };

    const mockStrategy = { name: "mock" };
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);
    passport.authenticate.mockImplementation(
      (
        _strategy: unknown,
        _opts: unknown,
        callback: (err: unknown, user: unknown) => void,
      ) => {
        return () => {
          callback(null, false);
        };
      },
    );

    const ctx = buildContext({ keycloakOrgId: "org-1" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as {
      redirect: jest.Mock;
    };

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(res.redirect).toHaveBeenCalledWith("/?error=keycloak_auth_failed");
  });

  it("returns user token on successful authentication", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passport = require("passport") as {
      use: jest.Mock;
      authenticate: jest.Mock;
      unuse: jest.Mock;
    };

    const mockUser = {
      oauthProviderId: "kc-123",
      email: "kc@test.com",
      displayName: "KC User",
    };
    const mockResult = {
      user: mockUser,
      token: "kc-token",
      refreshToken: "kc-rt",
    };
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockResult);

    const mockStrategy = { name: "mock" };
    mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);
    passport.authenticate.mockImplementation(
      (
        _strategy: unknown,
        _opts: unknown,
        callback: (err: unknown, user: unknown) => void,
      ) => {
        return () => {
          callback(null, mockUser);
        };
      },
    );

    const ctx = buildContext({ keycloakOrgId: "org-1" });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as {
      redirect: jest.Mock;
      json: jest.Mock;
    };

    const result = await guard.canActivate(ctx);

    await new Promise((r) => setTimeout(r, 20));
    expect(result).toBe(true);
    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "keycloak",
      "kc-123",
      { email: "kc@test.com", displayName: "KC User" },
    );
    expect(res.json).toHaveBeenCalledWith({
      user: mockUser,
      token: "kc-token",
      refreshToken: "kc-rt",
    });
  });
});
