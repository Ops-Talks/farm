import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";
import { KeycloakSyncProcessor } from "./keycloak-sync.processor";
import {
  KeycloakSyncService,
  KeycloakSyncJobData,
  KeycloakSyncResult,
} from "./keycloak-sync.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildJob(data: KeycloakSyncJobData): Job<KeycloakSyncJobData> {
  return { data } as Job<KeycloakSyncJobData>;
}

function buildResult(
  overrides: Partial<KeycloakSyncResult> = {},
): KeycloakSyncResult {
  return {
    orgId: "org-uuid-1",
    synced: 3,
    errors: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KeycloakSyncProcessor", () => {
  let processor: KeycloakSyncProcessor;
  let mockKeycloakSyncService: { syncOrgGroups: jest.Mock };

  beforeEach(async () => {
    mockKeycloakSyncService = {
      syncOrgGroups: jest.fn().mockResolvedValue(buildResult()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakSyncProcessor,
        { provide: KeycloakSyncService, useValue: mockKeycloakSyncService },
      ],
    }).compile();

    processor = module.get<KeycloakSyncProcessor>(KeycloakSyncProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Successful sync
  // ---------------------------------------------------------------------------

  describe("process", () => {
    it("should call syncOrgGroups with the orgId from the job", async () => {
      await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockKeycloakSyncService.syncOrgGroups).toHaveBeenCalledWith(
        "org-uuid-1",
      );
    });

    it("should return the result from syncOrgGroups", async () => {
      const expected = buildResult({ synced: 5, errors: 0 });
      mockKeycloakSyncService.syncOrgGroups.mockResolvedValue(expected);

      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(result).toEqual(expected);
    });

    it("should pass through when synced count is zero", async () => {
      mockKeycloakSyncService.syncOrgGroups.mockResolvedValue(
        buildResult({ synced: 0, errors: 0 }),
      );

      const result = await processor.process(buildJob({ orgId: "org-uuid-2" }));

      expect(result.synced).toBe(0);
      expect(result.errors).toBe(0);
    });

    it("should return result even when errors occurred during sync", async () => {
      mockKeycloakSyncService.syncOrgGroups.mockResolvedValue(
        buildResult({ synced: 2, errors: 1 }),
      );

      const result = await processor.process(buildJob({ orgId: "org-uuid-3" }));

      expect(result.synced).toBe(2);
      expect(result.errors).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Error propagation
  // ---------------------------------------------------------------------------

  describe("when syncOrgGroups throws", () => {
    it("should propagate the error to BullMQ", async () => {
      mockKeycloakSyncService.syncOrgGroups.mockRejectedValue(
        new Error("Keycloak unreachable"),
      );

      await expect(
        processor.process(buildJob({ orgId: "org-uuid-1" })),
      ).rejects.toThrow("Keycloak unreachable");
    });
  });
});
