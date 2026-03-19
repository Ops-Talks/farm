import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import { AuthService } from "../auth.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "../../integrations/entities/integration-credential.entity";
import * as crypto from "crypto";

/**
 * Builds an AES-256-GCM encrypted payload matching IntegrationCredentialService.
 */
function buildEncryptedCredential(payload: object, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

const JWT_SECRET = "super-secret-key-change-me-in-production";

const mockCredentialPayload = {
  keycloakUrl: "https://keycloak.example.com",
  realm: "myrealm",
  clientId: "farm-client",
  clientSecret: "s3cr3t",
};

describe("KeycloakOidcService", () => {
  let service: KeycloakOidcService;
  let mockCredentialRepo: Record<string, jest.Mock>;
  let mockAuthService: Record<string, jest.Mock>;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockCredentialRepo = {
      findOne: jest.fn(),
    };

    mockAuthService = {
      findOrCreateOAuthUser: jest.fn().mockResolvedValue({
        user: { id: "user-1", email: "alice@example.com" },
        token: "jwt-token",
        refreshToken: "refresh-token",
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "auth.jwtSecret") return JWT_SECRET;
        if (key === "app.url") return "http://localhost:3000";
        if (key === "port") return 3000;
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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns null when no Keycloak credential exists for the org", async () => {
    mockCredentialRepo.findOne.mockResolvedValue(null);

    const strategy = await service.getStrategyForOrg("org-uuid-1");

    expect(strategy).toBeNull();
    expect(mockCredentialRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          orgId: "org-uuid-1",
          type: IntegrationType.KEYCLOAK,
        }),
      }),
    );
  });

  it("returns a Strategy instance when a valid credential exists", async () => {
    const encryptedValue = buildEncryptedCredential(
      mockCredentialPayload,
      JWT_SECRET,
    );

    const credential: Partial<IntegrationCredential> = {
      id: "cred-1",
      orgId: "org-uuid-1",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    };

    mockCredentialRepo.findOne.mockResolvedValue(credential);

    const strategy = await service.getStrategyForOrg("org-uuid-1");

    expect(strategy).not.toBeNull();
    expect(typeof strategy).toBe("object");
  });

  it("returns null when the encrypted credential cannot be decrypted", async () => {
    const credential: Partial<IntegrationCredential> = {
      id: "cred-2",
      orgId: "org-uuid-2",
      type: IntegrationType.KEYCLOAK,
      encryptedValue: "not-valid-base64-ciphertext",
    };

    mockCredentialRepo.findOne.mockResolvedValue(credential);

    const strategy = await service.getStrategyForOrg("org-uuid-2");

    expect(strategy).toBeNull();
  });

  it("returns null when the decrypted value is not valid JSON", async () => {
    // Encrypt a plain string that is not a JSON object.
    const key = crypto.createHash("sha256").update(JWT_SECRET).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update("not-json", "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const badEncrypted = Buffer.concat([iv, tag, ciphertext]).toString(
      "base64",
    );

    const credential: Partial<IntegrationCredential> = {
      id: "cred-3",
      orgId: "org-uuid-3",
      type: IntegrationType.KEYCLOAK,
      encryptedValue: badEncrypted,
    };

    mockCredentialRepo.findOne.mockResolvedValue(credential);

    const strategy = await service.getStrategyForOrg("org-uuid-3");

    // JSON.parse("not-json") throws, so the service should return null.
    expect(strategy).toBeNull();
  });

  it("validate callback invokes findOrCreateOAuthUser with keycloak provider", async () => {
    const encryptedValue = buildEncryptedCredential(
      mockCredentialPayload,
      JWT_SECRET,
    );

    const credential: Partial<IntegrationCredential> = {
      id: "cred-4",
      orgId: "org-uuid-4",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    };

    mockCredentialRepo.findOne.mockResolvedValue(credential);

    const strategy = await service.getStrategyForOrg("org-uuid-4");
    expect(strategy).not.toBeNull();

    // Extract the verify callback by casting to access the internal property.
    // passport-openidconnect stores the callback as _verify.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const verify = (strategy as any)._verify as (
      issuer: string,
      profile: Record<string, unknown>,
      done: (err: Error | null, user?: unknown) => void,
    ) => void;

    const doneMock = jest.fn();
    const profile: Record<string, unknown> = {
      id: "keycloak-user-123",
      emails: [{ value: "alice@example.com" }],
      displayName: "Alice",
    };

    await new Promise<void>((resolve) => {
      verify(
        "https://keycloak.example.com/realms/myrealm",
        profile,
        (err, user) => {
          doneMock(err, user);
          resolve();
        },
      );
    });

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "keycloak",
      "keycloak-user-123",

      expect.objectContaining({
        email: "alice@example.com",
        displayName: "Alice",
      }),
    );
    expect(doneMock).toHaveBeenCalledWith(null, expect.anything());
  });

  it("validate callback calls done with error when findOrCreateOAuthUser rejects", async () => {
    const encryptedValue = buildEncryptedCredential(
      mockCredentialPayload,
      JWT_SECRET,
    );

    const credential: Partial<IntegrationCredential> = {
      id: "cred-5",
      orgId: "org-uuid-5",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    };

    mockCredentialRepo.findOne.mockResolvedValue(credential);

    const authError = new Error("Database failure");
    mockAuthService.findOrCreateOAuthUser.mockRejectedValue(authError);

    const strategy = await service.getStrategyForOrg("org-uuid-5");
    expect(strategy).not.toBeNull();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const verify = (strategy as any)._verify as (
      issuer: string,
      profile: Record<string, unknown>,
      done: (err: Error | null, user?: unknown) => void,
    ) => void;

    const doneMock = jest.fn();
    const profile: Record<string, unknown> = {
      id: "keycloak-user-err",
      emails: [{ value: "error@example.com" }],
      displayName: "Error User",
    };

    await new Promise<void>((resolve) => {
      verify(
        "https://keycloak.example.com/realms/myrealm",
        profile,
        (err, user) => {
          doneMock(err, user);
          resolve();
        },
      );
    });

    expect(doneMock).toHaveBeenCalledWith(authError, undefined);
  });
});
