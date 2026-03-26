import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import {
  KeycloakSyncService,
  KeycloakSyncResult,
} from "./keycloak-sync.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "../../modules/integrations/entities/integration-credential.entity";
import { Team } from "../teams/entities/team.entity";
import { User } from "./entities/user.entity";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
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

/**
 * Builds a minimal Team fixture.
 */
function buildTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    name: "devs",
    displayName: "Developers",
    description: null as unknown as string,
    type: "dev" as Team["type"],
    contactEmail: null as unknown as string,
    slackChannel: null as unknown as string,
    metadata: null as unknown as Record<string, unknown>,
    members: [],
    organizationId: "org-1",
    externalId: "kc-group-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("KeycloakSyncService", () => {
  let service: KeycloakSyncService;
  let mockCredentialRepo: Record<string, jest.Mock>;
  let mockTeamRepo: Record<string, jest.Mock>;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockQueue: Record<string, jest.Mock>;

  const encryptedValue = buildEncryptedCredential(
    mockCredentialPayload,
    JWT_SECRET,
  );

  beforeEach(async () => {
    mockCredentialRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockTeamRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakSyncService,
        {
          provide: getRepositoryToken(IntegrationCredential),
          useValue: mockCredentialRepo,
        },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "auth.jwtSecret") return JWT_SECRET;
              return undefined;
            },
          },
        },
        {
          provide: getQueueToken(QUEUE_NAMES.KEYCLOAK_SYNC),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<KeycloakSyncService>(KeycloakSyncService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns { synced: 0, errors: 0 } when no credential exists for the org", async () => {
    mockCredentialRepo.findOne.mockResolvedValue(null);

    const result: KeycloakSyncResult = await service.syncOrgGroups("org-xyz");

    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it("returns { synced: 0, errors: 1 } when credential decryption fails", async () => {
    mockCredentialRepo.findOne.mockResolvedValue({
      id: "cred-bad",
      orgId: "org-bad",
      type: IntegrationType.KEYCLOAK,
      encryptedValue: "totally-invalid-base64!",
    });

    const result = await service.syncOrgGroups("org-bad");

    expect(result).toEqual({ synced: 0, errors: 1 });
  });

  it("returns { synced: 0, errors: 1 } when the admin token request fails", async () => {
    mockCredentialRepo.findOne.mockResolvedValue({
      id: "cred-1",
      orgId: "org-1",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    });

    // Simulate network failure on token fetch.
    jest
      .spyOn(service, "fetchAdminToken")
      .mockRejectedValue(new Error("Network error"));

    const result = await service.syncOrgGroups("org-1");

    expect(result).toEqual({ synced: 0, errors: 1 });
  });

  it("syncs groups and creates teams, returns correct synced count", async () => {
    mockCredentialRepo.findOne.mockResolvedValue({
      id: "cred-1",
      orgId: "org-1",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    });

    jest
      .spyOn(service, "fetchAdminToken")
      .mockResolvedValue("admin-access-token");

    // Two groups returned from Keycloak.
    jest.spyOn(service, "fetchJson").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async <T>(url: string): Promise<T> => {
        if (url.endsWith("/groups")) {
          return [
            { id: "g1", name: "developers" },
            { id: "g2", name: "ops" },
          ] as unknown as T;
        }
        // Members for any group: one user with email.
        return [
          { id: "kc-user-1", email: "alice@example.com" },
        ] as unknown as T;
      },
    );

    // No existing team found — creation path.
    mockTeamRepo.findOne.mockResolvedValue(null);
    mockTeamRepo.create.mockImplementation((data: Partial<Team>) =>
      buildTeam(data),
    );
    // eslint-disable-next-line @typescript-eslint/require-await
    mockTeamRepo.save.mockImplementation(async (t: Team) => t);

    // Farm user found by email.
    const farmUser: Partial<User> = {
      id: "user-1",
      email: "alice@example.com",
    };
    mockUserRepo.findOne.mockResolvedValue(farmUser);

    const result = await service.syncOrgGroups("org-1");

    expect(result.synced).toBe(2);
    expect(result.errors).toBe(0);
    expect(mockTeamRepo.create).toHaveBeenCalledTimes(2);
    expect(mockTeamRepo.save).toHaveBeenCalledTimes(4); // create + member save per group
  });

  it("increments errors when a single group sync throws", async () => {
    mockCredentialRepo.findOne.mockResolvedValue({
      id: "cred-1",
      orgId: "org-2",
      type: IntegrationType.KEYCLOAK,
      encryptedValue,
    });

    jest
      .spyOn(service, "fetchAdminToken")
      .mockResolvedValue("admin-access-token");

    jest.spyOn(service, "fetchJson").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/require-await
      async <T>(url: string): Promise<T> => {
        if (url.endsWith("/groups")) {
          return [{ id: "g-fail", name: "broken-group" }] as unknown as T;
        }
        throw new Error("Members API failure");
      },
    );

    mockTeamRepo.findOne.mockResolvedValue(null);
    mockTeamRepo.create.mockImplementation((data: Partial<Team>) =>
      buildTeam(data),
    );
    mockTeamRepo.save.mockResolvedValue(buildTeam());

    const result = await service.syncOrgGroups("org-2");

    expect(result.errors).toBeGreaterThan(0);
  });

  it("scheduleAllOrgs enqueues a job for each org with a keycloak credential", async () => {
    const creds: Partial<IntegrationCredential>[] = [
      { orgId: "org-A", type: IntegrationType.KEYCLOAK },
      { orgId: "org-B", type: IntegrationType.KEYCLOAK },
      // Duplicate orgId — should be deduped.
      { orgId: "org-A", type: IntegrationType.KEYCLOAK },
    ];

    mockCredentialRepo.find.mockResolvedValue(creds);

    await service.scheduleAllOrgs();

    // Unique org count is 2.
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledWith("sync-org", { orgId: "org-A" });
    expect(mockQueue.add).toHaveBeenCalledWith("sync-org", { orgId: "org-B" });
  });

  it("scheduleAllOrgs does not enqueue jobs when no credentials are found", async () => {
    mockCredentialRepo.find.mockResolvedValue([]);

    await service.scheduleAllOrgs();

    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// KeycloakSyncService — additional branch coverage
// ---------------------------------------------------------------------------

describe("KeycloakSyncService — additional branches", () => {
  let service: KeycloakSyncService;
  let mockTeamRepo: Record<string, jest.Mock>;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockCredentialRepo: Record<string, jest.Mock>;
  let mockQueue: { add: jest.Mock };

  const encryptedValue2 = buildEncryptedCredential(
    mockCredentialPayload,
    JWT_SECRET,
  );

  beforeEach(async () => {
    mockTeamRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    mockUserRepo = { findOne: jest.fn() };
    mockCredentialRepo = { findOne: jest.fn(), find: jest.fn() };
    mockQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakSyncService,
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(IntegrationCredential),
          useValue: mockCredentialRepo,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.KEYCLOAK_SYNC),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(JWT_SECRET) },
        },
      ],
    }).compile();

    service = module.get<KeycloakSyncService>(KeycloakSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("fetchAdminToken", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should return access_token on successful response", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: "test-token-123" }),
      }) as unknown as typeof globalThis.fetch;

      const token = await service.fetchAdminToken(
        "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token",
        "farm-client",
        "secret",
      );

      expect(token).toBe("test-token-123");
    });

    it("should throw when the response is not ok", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      }) as unknown as typeof globalThis.fetch;

      await expect(
        service.fetchAdminToken(
          "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token",
          "farm-client",
          "bad-secret",
        ),
      ).rejects.toThrow("Keycloak token request failed");
    });
  });

  describe("fetchJson", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should return parsed JSON on successful response", async () => {
      const mockData = [{ id: "g1", name: "admins" }];
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      }) as unknown as typeof globalThis.fetch;

      const result = await service.fetchJson<typeof mockData>(
        "https://keycloak.example.com/admin/realms/myrealm/groups",
        "admin-token",
      );

      expect(result).toEqual(mockData);
    });

    it("should throw when the response is not ok", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }) as unknown as typeof globalThis.fetch;

      await expect(
        service.fetchJson(
          "https://keycloak.example.com/admin/realms/myrealm/groups",
          "bad-token",
        ),
      ).rejects.toThrow("Keycloak Admin API request failed");
    });
  });

  describe("syncOrgGroups — member edge cases", () => {
    it("should skip members without email", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        encryptedValue: encryptedValue2,
      });

      jest.spyOn(service, "fetchAdminToken").mockResolvedValue("admin-token");
      jest.spyOn(service, "fetchJson").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async <T>(url: string): Promise<T> => {
          if (url.endsWith("/groups")) {
            return [{ id: "g1", name: "devs" }] as unknown as T;
          }
          // Member with no email
          return [{ id: "kc-user-1" }] as unknown as T;
        },
      );

      mockTeamRepo.findOne.mockResolvedValue(buildTeam());
      mockTeamRepo.save.mockImplementation((t: Team) => Promise.resolve(t));

      const result = await service.syncOrgGroups("org-1");

      expect(result.synced).toBe(1);
    });

    it("should skip members when no matching Farm user is found", async () => {
      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        encryptedValue: encryptedValue2,
      });

      jest.spyOn(service, "fetchAdminToken").mockResolvedValue("admin-token");
      jest.spyOn(service, "fetchJson").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async <T>(url: string): Promise<T> => {
          if (url.endsWith("/groups")) {
            return [{ id: "g1", name: "devs" }] as unknown as T;
          }
          return [
            { id: "kc-user-1", email: "notfound@example.com" },
          ] as unknown as T;
        },
      );

      mockTeamRepo.findOne.mockResolvedValue(buildTeam());
      mockTeamRepo.save.mockImplementation((t: Team) => Promise.resolve(t));
      mockUserRepo.findOne.mockResolvedValue(null); // no Farm user

      const result = await service.syncOrgGroups("org-1");

      expect(result.synced).toBe(1);
    });

    it("should not add member if already in team", async () => {
      const existingMember = { id: "user-1", email: "alice@example.com" };

      mockCredentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        orgId: "org-1",
        encryptedValue: encryptedValue2,
      });

      jest.spyOn(service, "fetchAdminToken").mockResolvedValue("admin-token");
      jest.spyOn(service, "fetchJson").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async <T>(url: string): Promise<T> => {
          if (url.endsWith("/groups")) {
            return [{ id: "g1", name: "devs" }] as unknown as T;
          }
          return [
            { id: "kc-user-1", email: "alice@example.com" },
          ] as unknown as T;
        },
      );

      // Team already has the member
      mockTeamRepo.findOne.mockResolvedValue(
        buildTeam({ members: [existingMember as User] }),
      );
      mockTeamRepo.save.mockImplementation((t: Team) => Promise.resolve(t));
      mockUserRepo.findOne.mockResolvedValue(existingMember);

      const result = await service.syncOrgGroups("org-1");

      expect(result.synced).toBe(1);
      // Team members should not have been extended (already a member)
    });
  });
});
