import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AzureDevOpsService } from "./azure-devops.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

describe("AzureDevOpsService", () => {
  let service: AzureDevOpsService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentialService = {
    findByType: jest.fn(),
    decrypt: jest.fn(),
  };

  const encryptedCredential = {
    id: "cred-2",
    orgId: "org-1",
    type: IntegrationType.AZURE_DEVOPS,
    encryptedValue: "encrypted-blob",
    name: "ado-cred",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureDevOpsService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
        {
          provide: CircuitBreakerService,
          useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
        },
      ],
    }).compile();

    service = module.get<AzureDevOpsService>(AzureDevOpsService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listPipelines()", () => {
    it("throws NotFoundException when credential is not found", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.listPipelines("org-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCredentialService.findByType).toHaveBeenCalledWith(
        "org-1",
        IntegrationType.AZURE_DEVOPS,
      );
    });

    it("returns mapped pipeline runs on success", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "ado-token",
          organization: "my-org",
          project: "my-project",
        }),
      );

      const mockRun = {
        id: 10,
        buildNumber: "20240101.1",
        status: "completed",
        result: "succeeded",
        startTime: "2024-01-01T00:00:00Z",
        finishTime: "2024-01-01T01:00:00Z",
        queueTime: "2024-01-01T00:00:00Z",
        definition: { id: 5, name: "Build Pipeline" },
      };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ value: [mockRun] }),
      });

      const result = await service.listPipelines("org-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 10,
        name: "Build Pipeline",
        state: "completed",
        result: "succeeded",
        pipeline: { id: 5, name: "Build Pipeline" },
      });
    });

    it("returns empty array when Azure DevOps API returns non-ok status", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "ado-token",
          organization: "my-org",
          project: "my-project",
        }),
      );

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await service.listPipelines("org-1");

      expect(result).toEqual([]);
    });

    it("uses Basic auth with empty username and token as password", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "my-pat",
          organization: "my-org",
          project: "my-project",
        }),
      );

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ value: [] }),
      });

      await service.listPipelines("org-1");

      const expectedAuth = "Basic " + Buffer.from(":my-pat").toString("base64");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "dev.azure.com/my-org/my-project/_apis/build/builds",
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }) as unknown,
        }),
      );
    });

    it("returns empty array when API response has no value property", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "ado-token",
          organization: "my-org",
          project: "my-project",
        }),
      );

      // Response with no value field — exercises the `data.value ?? []` right branch.
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await service.listPipelines("org-1");
      expect(result).toEqual([]);
    });

    it("falls back to default values when pipeline run fields are missing", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "ado-token",
          organization: "my-org",
          project: "my-project",
        }),
      );

      // Build entry with missing fields to exercise fallback branches.
      const sparseRun = { id: 5 };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ value: [sparseRun] }),
      });

      const result = await service.listPipelines("org-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 5,
        name: "",
        state: "unknown",
        result: null,
        createdDate: "",
        finishedDate: null,
      });
    });
  });
});
