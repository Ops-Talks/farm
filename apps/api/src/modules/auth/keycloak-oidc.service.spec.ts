import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { KeycloakOidcService } from "./keycloak-oidc.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "../integrations/entities/integration-credential.entity";
import { AuthService } from "./auth.service";

// ---------------------------------------------------------------------------
// Mock passport-openidconnect so the module loads in Jest (CJS mode).
// We capture the verify callback to exercise it directly in tests.
// ---------------------------------------------------------------------------

let capturedVerifyCallback: ((...args: unknown[]) => unknown) | undefined;

jest.mock("passport-openidconnect", () => {
  const MockStrategy = jest
    .fn()
    .mockImplementation(
      (_options: unknown, verify: (...args: unknown[]) => unknown) => {
        capturedVerifyCallback = verify;
        return { name: "keycloak" };
      },
    );
  return MockStrategy;
});

// ---------------------------------------------------------------------------
// Helper: build an AES-256-GCM encrypted credential matching the service.
// ---------------------------------------------------------------------------

function buildEncryptedValue(payload: object, jwtSecret: string): string {
  const key = crypto.createHash("sha256").update(jwtSecret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const JWT_SECRET = "super-secret-key-change-me-in-production";

const mockKeycloakPayload = {
  keycloakUrl: "https://keycloak.example.com",
  realm: "myrealm",
  clientId: "farm-client",
  clientSecret: "s3cr3t",
};

const validEncryptedValue = buildEncryptedValue(
  mockKeycloakPayload,
  JWT_SECRET,
);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("KeycloakOidcService", () => {
  let service: KeycloakOidcService;
  let mockCredentialRepo: { findOne: jest.Mock };
  let mockAuthService: { findOrCreateOAuthUser: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    capturedVerifyCallback = undefined;

    mockCredentialRepo = { findOne: jest.fn() };
    mockAuthService = { findOrCreateOAuthUser: jest.fn() };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "auth.jwtSecret") return JWT_SECRET;
        if (key === "app.url") return "http://localhost:3000";
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakOidcService,
        {
          provide: getRepositoryToken(IntegrationCredential),
          useValue: mockCredentialRepo,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KeycloakOidcService>(KeycloakOidcService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Constructor — jwtSecret fallback
  // ---------------------------------------------------------------------------

  describe("constructor — jwtSecret resolution", () => {
    it("uses the default key when configService returns null for auth.jwtSecret", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "auth.jwtSecret") return null;
        if (key === "app.url") return "http://localhost:3000";
        return undefined;
      });

      // Rebuild service with the updated configService.
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KeycloakOidcService,
          {
            provide: getRepositoryToken(IntegrationCredential),
            useValue: mockCredentialRepo,
          },
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<KeycloakOidcService>(KeycloakOidcService);

      // Service should still be created; encryption key derived from default secret.
      expect(svc).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getStrategyForOrg — no credential
  // ---------------------------------------------------------------------------

  describe("getStrategyForOrg — no credential stored", () => {
    it("returns null when no Keycloak credential exists for the org", async () => {
      mockCredentialRepo.findOne.mockResolvedValue(null);

      const strategy = await service.getStrategyForOrg("org-no-cred");

      expect(strategy).toBeNull();
      expect(mockCredentialRepo.findOne).toHaveBeenCalledWith({
        where: { orgId: "org-no-cred", type: IntegrationType.KEYCLOAK },
        order: { createdAt: "DESC" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getStrategyForOrg — decrypt error
  // ---------------------------------------------------------------------------

  describe("getStrategyForOrg — decryption fails", () => {
    it("returns null when the stored credential cannot be decrypted", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: "not-valid-base64-gcm-data",
      });

      const strategy = await service.getStrategyForOrg("org-1");

      expect(strategy).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getStrategyForOrg — happy path (strategy returned)
  // ---------------------------------------------------------------------------

  describe("getStrategyForOrg — valid credential", () => {
    it("returns a Strategy instance when the credential is valid", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      const strategy = await service.getStrategyForOrg("org-1");

      expect(strategy).not.toBeNull();
      expect(capturedVerifyCallback).toBeDefined();
    });

    it("builds callbackURL from app.url when configured", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      // Verify the Strategy mock was called (which internally uses app.url).
      await service.getStrategyForOrg("org-1");
      const StrategyMock = jest.requireMock(
        "passport-openidconnect",
      ) as unknown as jest.Mock;
      const callArgs = StrategyMock.mock.calls.at(-1) as [
        { callbackURL: string },
        unknown,
      ];
      expect(callArgs[0].callbackURL).toContain(
        "http://localhost:3000/api/v1/auth/keycloak/callback",
      );
    });

    it("builds callbackURL from port when app.url is not configured", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "auth.jwtSecret") return JWT_SECRET;
        if (key === "app.url") return ""; // falsy → fall back to port
        if (key === "port") return 4000;
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KeycloakOidcService,
          {
            provide: getRepositoryToken(IntegrationCredential),
            useValue: mockCredentialRepo,
          },
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<KeycloakOidcService>(KeycloakOidcService);

      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-2",
        orgId: "org-2",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      await svc.getStrategyForOrg("org-2");

      const StrategyMock = jest.requireMock(
        "passport-openidconnect",
      ) as unknown as jest.Mock;
      const callArgs = StrategyMock.mock.calls.at(-1) as [
        { callbackURL: string },
        unknown,
      ];
      expect(callArgs[0].callbackURL).toContain("localhost:4000");
    });

    it("defaults to port 3000 when neither app.url nor port are configured", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "auth.jwtSecret") return JWT_SECRET;
        return undefined; // app.url and port both undefined
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KeycloakOidcService,
          {
            provide: getRepositoryToken(IntegrationCredential),
            useValue: mockCredentialRepo,
          },
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<KeycloakOidcService>(KeycloakOidcService);

      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-3",
        orgId: "org-3",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      await svc.getStrategyForOrg("org-3");

      const StrategyMock = jest.requireMock(
        "passport-openidconnect",
      ) as unknown as jest.Mock;
      const callArgs = StrategyMock.mock.calls.at(-1) as [
        { callbackURL: string },
        unknown,
      ];
      expect(callArgs[0].callbackURL).toContain("localhost:3000");
    });
  });

  // ---------------------------------------------------------------------------
  // Verify callback — success path
  // ---------------------------------------------------------------------------

  describe("verify callback — success path", () => {
    it("calls done(null, user) when findOrCreateOAuthUser resolves", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      const mockUser = { id: "user-1", email: "alice@example.com" };
      mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
        user: mockUser,
        token: "jwt",
        refreshToken: "refresh",
      });

      await service.getStrategyForOrg("org-1");

      expect(capturedVerifyCallback).toBeDefined();

      const done = jest.fn();
      const profile = {
        id: "keycloak-id-1",
        emails: [{ value: "alice@example.com" }],
        displayName: "Alice",
      };

      await capturedVerifyCallback!("issuer", profile, done);

      // Allow the promise to settle.
      await new Promise<void>((r) => setImmediate(r));

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        "keycloak",
        "keycloak-id-1",
        { email: "alice@example.com", displayName: "Alice" },
      );
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it("derives email from profile id when emails array is absent", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
        user: { id: "user-2" },
        token: "jwt",
        refreshToken: "refresh",
      });

      await service.getStrategyForOrg("org-1");

      const done = jest.fn();
      const profile = {
        id: "bare-id",
        emails: undefined,
        displayName: undefined,
      };

      await capturedVerifyCallback!("issuer", profile, done);
      await new Promise<void>((r) => setImmediate(r));

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        "keycloak",
        "bare-id",
        {
          email: "bare-id@keycloak.oauth",
          displayName: "bare-id",
        },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Verify callback — error path
  // ---------------------------------------------------------------------------

  describe("verify callback — error path", () => {
    it("calls done(error) when findOrCreateOAuthUser rejects with an Error", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      const thrownError = new Error("DB connection lost");
      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(thrownError);

      await service.getStrategyForOrg("org-1");

      const done = jest.fn();
      const profile = {
        id: "keycloak-id-2",
        emails: [{ value: "bob@example.com" }],
        displayName: "Bob",
      };

      await capturedVerifyCallback!("issuer", profile, done);
      await new Promise<void>((r) => setImmediate(r));

      expect(done).toHaveBeenCalledWith(thrownError);
    });

    it("wraps a non-Error rejection in a new Error before calling done", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        type: IntegrationType.KEYCLOAK,
        encryptedValue: validEncryptedValue,
      });

      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(
        "string error value",
      );

      await service.getStrategyForOrg("org-1");

      const done = jest.fn();
      const profile = {
        id: "kc-id",
        emails: [{ value: "c@example.com" }],
        displayName: "C",
      };

      await capturedVerifyCallback!("issuer", profile, done);
      await new Promise<void>((r) => setImmediate(r));

      const doneArg = (done.mock.calls[0] as [unknown])[0];
      expect(doneArg).toBeInstanceOf(Error);
      expect((doneArg as Error).message).toBe("string error value");
    });
  });
});
