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
