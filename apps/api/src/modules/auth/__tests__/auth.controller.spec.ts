// Mock the passport module so passport.use and passport.authenticate
// can be configured per-test without spying on non-configurable properties.
jest.mock("passport", () => ({
  use: jest.fn(),
  authenticate: jest.fn(),
}));
import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import { QUEUE_NAMES } from "../../../common/queues/queue-names";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginDto } from "../dto/login.dto";
import { OrgRequiredGuard } from "../../../common/guards/org-required.guard";
import { PermissionGuard } from "../../../common/guards/permission.guard";

/**
 * Builds a minimal fake JWT string whose payload can be base64url-decoded by
 * the refresh endpoint without actual signature verification.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesignature`;
}

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findOrCreateOAuthUser: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
};

const mockKeycloakOidcService = {
  getStrategyForOrg: jest.fn(),
};

const mockKeycloakSyncQueue = {
  add: jest.fn(),
};

describe("AuthController", () => {
  let controller: AuthController;
  let service: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: KeycloakOidcService,
          useValue: mockKeycloakOidcService,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.KEYCLOAK_SYNC),
          useValue: mockKeycloakSyncQueue,
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("register should return user", async () => {
    const dto: RegisterUserDto = {
      username: "u",
      email: "e",
      password: "p",
      displayName: "u",
    };
    service.register.mockResolvedValue({ id: "1", ...dto });
    expect(await controller.register(dto)).toEqual({ id: "1", ...dto });
  });

  it("login should return token and user", async () => {
    const dto: LoginDto = { username: "u", password: "p" };
    const serviceResult = {
      user: { id: "1", username: "u" },
      token: "t",
      refreshToken: "rt",
    };
    service.login.mockResolvedValue(serviceResult);
    const mockRes = { cookie: jest.fn() };
    const result = await controller.login(dto, mockRes as never);
    expect(result).toEqual({
      message: "Login successful",
      user: serviceResult.user,
    });
    expect(mockRes.cookie).toHaveBeenCalledWith(
      "access_token",
      "t",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "rt",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("findAll should return users", async () => {
    service.findAll.mockResolvedValue([{ id: "1" }]);
    expect(await controller.findAll()).toEqual([{ id: "1" }]);
  });

  describe("getProfile", () => {
    it("should return the user profile for the authenticated user", async () => {
      const mockUser = {
        id: "u1",
        username: "alice",
        email: "alice@example.com",
      };
      service.getProfile.mockResolvedValue(mockUser);

      const mockReq = { user: { userId: "u1" } };
      const result = await controller.getProfile(mockReq as never);

      expect(result).toEqual(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith("u1");
    });
  });

  describe("updateProfile", () => {
    it("should update and return the user profile", async () => {
      const mockUser = {
        id: "u1",
        username: "alice",
        email: "new@example.com",
      };
      service.updateProfile.mockResolvedValue(mockUser);

      const mockReq = { user: { userId: "u1" } };
      const dto = { email: "new@example.com", firstName: "Alice" };
      const result = await controller.updateProfile(mockReq as never, dto);

      expect(result).toEqual(mockUser);
      expect(service.updateProfile).toHaveBeenCalledWith("u1", dto);
    });
  });

  describe("changePassword", () => {
    it("should call authService.changePassword with user id and dto", async () => {
      service.changePassword.mockResolvedValue(undefined);

      const mockReq = { user: { userId: "u1" } };
      const dto = {
        currentPassword: "old",
        newPassword: "new123456",
        confirmPassword: "new123456",
      };
      await controller.changePassword(mockReq as never, dto);

      expect(service.changePassword).toHaveBeenCalledWith("u1", dto);
    });
  });

  describe("refresh", () => {
    it("should rotate tokens via cookies when refresh token cookie is present", async () => {
      const serviceResult = {
        token: "new-access",
        refreshToken: "new-refresh",
      };
      service.refresh.mockResolvedValue(serviceResult);

      const mockReq = {
        cookies: {
          refresh_token: "old-rt",
        },
      };
      const mockRes = { cookie: jest.fn() };

      const result = await controller.refresh(
        {},
        mockReq as never,
        mockRes as never,
      );

      expect(service.refresh).toHaveBeenCalledWith("old-rt");
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "access_token",
        "new-access",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "new-refresh",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ message: "Token refreshed" });
    });

    it("should throw UnauthorizedException when refresh token is absent", async () => {
      const mockReq = { cookies: {} };
      const mockRes = { cookie: jest.fn() };
      await expect(
        controller.refresh({}, mockReq as never, mockRes as never),
      ).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("should clear both auth cookies and return a message", async () => {
      mockAuthService.logout = jest.fn().mockResolvedValue(undefined);
      const mockReq = { cookies: { refresh_token: "some-rt" } };
      const mockRes = { clearCookie: jest.fn() };
      const result = await controller.logout(
        mockReq as never,
        mockRes as never,
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "access_token",
        expect.objectContaining({ path: "/" }),
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "refresh_token",
        expect.objectContaining({ path: "/api/v1/auth/refresh" }),
      );
      expect(result).toEqual({ message: "Logged out successfully" });
    });
  });

  describe("githubCallback", () => {
    it("should call findOrCreateOAuthUser and return json with token", async () => {
      const mockResult = {
        user: { id: "u1" },
        token: "tok",
        refreshToken: "rt",
      };
      service.findOrCreateOAuthUser.mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          oauthProviderId: "gh-123",
          email: "e@test.com",
          displayName: "Test",
          username: "test",
        },
      };
      const mockRes = { json: jest.fn() };

      await controller.githubCallback(mockReq as never, mockRes as never);

      expect(service.findOrCreateOAuthUser).toHaveBeenCalledWith(
        "github",
        "gh-123",
        expect.objectContaining({ email: "e@test.com" }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockResult.user,
        token: "tok",
        refreshToken: "rt",
      });
    });
  });

  describe("googleCallback", () => {
    it("should call findOrCreateOAuthUser and return json with token", async () => {
      const mockResult = {
        user: { id: "u2" },
        token: "tok2",
        refreshToken: "rt2",
      };
      service.findOrCreateOAuthUser.mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          oauthProviderId: "gg-456",
          email: "g@test.com",
          displayName: "Google User",
        },
      };
      const mockRes = { json: jest.fn() };

      await controller.googleCallback(mockReq as never, mockRes as never);

      expect(service.findOrCreateOAuthUser).toHaveBeenCalledWith(
        "google",
        "gg-456",
        expect.objectContaining({ email: "g@test.com" }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockResult.user,
        token: "tok2",
        refreshToken: "rt2",
      });
    });
  });

  describe("keycloakAuth", () => {
    it("should redirect to error page when orgId is missing", async () => {
      const mockRes = { redirect: jest.fn() };
      await controller.keycloakAuth(
        "",
        {} as never,
        mockRes as never,
        jest.fn(),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "/?error=keycloak_not_configured",
      );
    });

    it("should redirect to error page when strategy is not found", async () => {
      mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(null);
      const mockRes = { redirect: jest.fn() };
      await controller.keycloakAuth(
        "org-1",
        {} as never,
        mockRes as never,
        jest.fn(),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "/?error=keycloak_not_configured",
      );
    });

    it("should use passport when strategy is found", async () => {
      const mockStrategy = {};
      mockKeycloakOidcService.getStrategyForOrg.mockResolvedValue(mockStrategy);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const passportMock = require("passport") as {
        use: jest.Mock;
        authenticate: jest.Mock;
      };
      const mockAuthFn = jest.fn();
      passportMock.authenticate.mockReturnValue(mockAuthFn);

      const mockReq = { session: {} } as never;
      const mockRes = { redirect: jest.fn() } as never;
      const mockNext = jest.fn();

      await controller.keycloakAuth("org-1", mockReq, mockRes, mockNext);

      expect(passportMock.use).toHaveBeenCalledWith(
        "keycloak-dynamic",
        mockStrategy,
      );
      expect(passportMock.authenticate).toHaveBeenCalledWith(
        "keycloak-dynamic",
        {
          scope: ["openid", "email", "profile"],
        },
      );
      expect(mockAuthFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });

  describe("keycloakCallback", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const passportMock = require("passport") as { authenticate: jest.Mock };

    beforeEach(() => {
      passportMock.authenticate.mockReset();
    });

    it("should redirect on authentication error", async () => {
      passportMock.authenticate.mockImplementation(
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

      const mockRes = { redirect: jest.fn(), json: jest.fn() };
      await controller.keycloakCallback(
        {} as never,
        mockRes as never,
        jest.fn(),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "/?error=keycloak_auth_failed",
      );
    });

    it("should redirect when user is falsy", async () => {
      passportMock.authenticate.mockImplementation(
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

      const mockRes = { redirect: jest.fn(), json: jest.fn() };
      await controller.keycloakCallback(
        {} as never,
        mockRes as never,
        jest.fn(),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "/?error=keycloak_auth_failed",
      );
    });

    it("should return user token on successful keycloak authentication", async () => {
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

      passportMock.authenticate.mockImplementation(
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

      const mockRes = { redirect: jest.fn(), json: jest.fn() };
      await controller.keycloakCallback(
        {} as never,
        mockRes as never,
        jest.fn(),
      );

      // Wait for the .then() promise chain in the controller to resolve.
      await new Promise((r) => setTimeout(r, 20));
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser,
        token: "kc-token",
        refreshToken: "kc-rt",
      });
    });
  });

  describe("triggerKeycloakSync", () => {
    it("should enqueue a sync job and return queued=true", async () => {
      mockKeycloakSyncQueue.add.mockResolvedValue({});
      const result = await controller.triggerKeycloakSync("org-1");
      expect(result).toEqual({ queued: true });
      expect(mockKeycloakSyncQueue.add).toHaveBeenCalledWith("sync-org", {
        orgId: "org-1",
      });
    });

    it("should return queued=true even when keycloakSyncQueue is null", async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: KeycloakOidcService, useValue: mockKeycloakOidcService },
          // Queue is intentionally omitted to simulate null optional dependency.
        ],
      })
        .overrideGuard(OrgRequiredGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const ctrl = module.get<AuthController>(AuthController);
      const result = await ctrl.triggerKeycloakSync("org-no-queue");
      expect(result).toEqual({ queued: true });
    });
  });
});

// ---------------------------------------------------------------------------
// FARM-S313 / FARM-S314 — LDAP login and providers endpoint
// These tests run in an isolated module that provides ConfigService.
// ---------------------------------------------------------------------------

describe("AuthController — LDAP and providers (with ConfigService)", () => {
  let controller: AuthController;
  let mockConfig: { get: jest.Mock };
  let localMockAuthService: typeof mockAuthService & {
    generateTokensForUser: jest.Mock;
  };

  beforeEach(async () => {
    mockConfig = { get: jest.fn().mockReturnValue("") };

    localMockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      findAll: jest.fn(),
      findOrCreateOAuthUser: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      generateTokensForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: localMockAuthService },
        { provide: KeycloakOidcService, useValue: mockKeycloakOidcService },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getQueueToken(QUEUE_NAMES.KEYCLOAK_SYNC),
          useValue: mockKeycloakSyncQueue,
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe("getProviders", () => {
    it('should return ["local", "keycloak"] when no OAuth env vars are set', () => {
      mockConfig.get.mockReturnValue("");
      const result = controller.getProviders();
      expect(result.providers).toEqual(["local", "keycloak"]);
    });

    it('should include "github" when GITHUB client ID is configured', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "oauth.github.clientId") return "gh-client-id";
        return "";
      });
      const result = controller.getProviders();
      expect(result.providers).toContain("github");
      expect(result.providers).not.toContain("google");
      expect(result.providers).not.toContain("ldap");
    });

    it('should include "google" and "ldap" when those are configured', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "oauth.google.clientId") return "goog-client-id";
        if (key === "ldap.url") return "ldap://localhost:389";
        return "";
      });
      const result = controller.getProviders();
      expect(result.providers).toContain("google");
      expect(result.providers).toContain("ldap");
      expect(result.providers).not.toContain("github");
    });
  });

  describe("ldapLogin", () => {
    it("should return generateTokensForUser result when LDAP is configured", async () => {
      const mockUser = {
        id: "u1",
        username: "jdoe",
        email: "jdoe@ldap.local",
      };
      const tokenResult = {
        user: mockUser,
        token: "ldap-jwt",
        refreshToken: "ldap-rt",
      };
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "ldap.url") return "ldap://localhost:389";
        return "";
      });
      localMockAuthService.generateTokensForUser.mockResolvedValue(tokenResult);

      const req = { user: mockUser } as never;
      const result = await controller.ldapLogin(req);

      expect(localMockAuthService.generateTokensForUser).toHaveBeenCalledWith(
        mockUser,
      );
      expect(result).toEqual(tokenResult);
    });
  });
});
