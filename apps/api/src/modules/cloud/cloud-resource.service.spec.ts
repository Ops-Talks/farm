import { Test, TestingModule } from "@nestjs/testing";
import { CloudResourceService } from "./cloud-resource.service";
import { AwsService } from "./aws/aws.service";
import { GcpService } from "./gcp/gcp.service";
import { AzureService } from "./azure/azure.service";
import { CloudResource } from "./interfaces/cloud-resource.interface";

const ORG_ID = "org-uuid-resource";

const makeResource = (
  provider: "aws" | "gcp" | "azure",
  id: string,
): CloudResource => ({
  provider,
  resourceId: id,
  resourceType: `${provider}:service`,
  name: `resource-${id}`,
  region: "us-east-1",
  tags: { "farm:component": "my-comp" },
  linkedComponentId: "my-comp",
});

const mockAwsService = {
  discoverResources: jest.fn(),
  getMonthlyCost: jest.fn(),
  resolveSecret: jest.fn(),
};
const mockGcpService = {
  discoverResources: jest.fn(),
  getMonthlyCost: jest.fn(),
  resolveSecret: jest.fn(),
};
const mockAzureService = {
  discoverResources: jest.fn(),
  getMonthlyCost: jest.fn(),
  resolveSecret: jest.fn(),
};

describe("CloudResourceService", () => {
  let service: CloudResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudResourceService,
        { provide: AwsService, useValue: mockAwsService },
        { provide: GcpService, useValue: mockGcpService },
        { provide: AzureService, useValue: mockAzureService },
      ],
    }).compile();

    service = module.get<CloudResourceService>(CloudResourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // discoverAll
  // ---------------------------------------------------------------------------
  describe("discoverAll", () => {
    it("should aggregate resources from all providers", async () => {
      mockAwsService.discoverResources.mockResolvedValue([
        makeResource("aws", "arn:1"),
      ]);
      mockGcpService.discoverResources.mockResolvedValue([
        makeResource("gcp", "gcp-id-1"),
      ]);
      mockAzureService.discoverResources.mockResolvedValue([
        makeResource("azure", "/sub/rg/app-1"),
      ]);

      const result = await service.discoverAll(ORG_ID);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.provider)).toEqual(
        expect.arrayContaining(["aws", "gcp", "azure"]),
      );
    });

    it("should still return results when one provider fails", async () => {
      mockAwsService.discoverResources.mockResolvedValue([
        makeResource("aws", "arn:1"),
      ]);
      mockGcpService.discoverResources.mockRejectedValue(new Error("GCP down"));
      mockAzureService.discoverResources.mockResolvedValue([]);

      const result = await service.discoverAll(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe("aws");
    });
  });

  // ---------------------------------------------------------------------------
  // discoverByProvider
  // ---------------------------------------------------------------------------
  describe("discoverByProvider", () => {
    it("should delegate to AwsService for aws", async () => {
      mockAwsService.discoverResources.mockResolvedValue([
        makeResource("aws", "arn:1"),
      ]);

      const result = await service.discoverByProvider(ORG_ID, "aws");

      expect(result).toHaveLength(1);
      expect(mockAwsService.discoverResources).toHaveBeenCalledWith(ORG_ID);
    });

    it("should delegate to GcpService for gcp", async () => {
      mockGcpService.discoverResources.mockResolvedValue([]);

      await service.discoverByProvider(ORG_ID, "gcp");

      expect(mockGcpService.discoverResources).toHaveBeenCalledWith(ORG_ID);
    });

    it("should delegate to AzureService for azure", async () => {
      mockAzureService.discoverResources.mockResolvedValue([]);

      await service.discoverByProvider(ORG_ID, "azure");

      expect(mockAzureService.discoverResources).toHaveBeenCalledWith(ORG_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // getAggregatedCost
  // ---------------------------------------------------------------------------
  describe("getAggregatedCost", () => {
    it("should aggregate cost from all providers", async () => {
      mockAwsService.getMonthlyCost.mockResolvedValue([
        { environment: "prod", cost: 100, currency: "USD" },
      ]);
      mockGcpService.getMonthlyCost.mockResolvedValue([
        { environment: "prod", cost: 50, currency: "USD" },
      ]);
      mockAzureService.getMonthlyCost.mockResolvedValue([]);

      const result = await service.getAggregatedCost(ORG_ID, 30);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.provider === "aws")?.entries).toHaveLength(1);
      expect(result.find((r) => r.provider === "gcp")?.entries).toHaveLength(1);
    });

    it("should skip providers that return empty cost arrays", async () => {
      mockAwsService.getMonthlyCost.mockResolvedValue([]);
      mockGcpService.getMonthlyCost.mockResolvedValue([]);
      mockAzureService.getMonthlyCost.mockResolvedValue([]);

      const result = await service.getAggregatedCost(ORG_ID, 30);

      expect(result).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSecret
  // ---------------------------------------------------------------------------
  describe("resolveSecret", () => {
    it("should delegate to AWS for ARN refs", async () => {
      mockAwsService.resolveSecret.mockResolvedValue("aws-value");

      const result = await service.resolveSecret(
        "arn:aws:secretsmanager:us-east-1:123:secret:my-secret",
        ORG_ID,
      );

      expect(result).toBe("aws-value");
      expect(mockAwsService.resolveSecret).toHaveBeenCalled();
    });

    it("should delegate to GCP for gcp: refs", async () => {
      mockGcpService.resolveSecret.mockResolvedValue("gcp-value");

      const result = await service.resolveSecret(
        "gcp:projects/p/secrets/s/versions/1",
        ORG_ID,
      );

      expect(result).toBe("gcp-value");
      expect(mockGcpService.resolveSecret).toHaveBeenCalled();
    });

    it("should delegate to Azure for azure: refs", async () => {
      mockAzureService.resolveSecret.mockResolvedValue("azure-value");

      const result = await service.resolveSecret(
        "azure:https://my-vault.vault.azure.net:my-secret",
        ORG_ID,
      );

      expect(result).toBe("azure-value");
    });

    it("should throw for unsupported ref format", async () => {
      await expect(
        service.resolveSecret("http://unsupported.example.com/secret", ORG_ID),
      ).rejects.toThrow("Unsupported secret ref format");
    });
  });

  // ---------------------------------------------------------------------------
  // listConnectedProviders
  // ---------------------------------------------------------------------------
  describe("listConnectedProviders", () => {
    it("should return all providers when all calls succeed", async () => {
      mockAwsService.discoverResources.mockResolvedValue([]);
      mockGcpService.discoverResources.mockResolvedValue([]);
      mockAzureService.discoverResources.mockResolvedValue([]);

      const result = await service.listConnectedProviders(ORG_ID);

      expect(result).toEqual(expect.arrayContaining(["aws", "gcp", "azure"]));
    });

    it("should omit providers that throw during discovery check", async () => {
      mockAwsService.discoverResources.mockResolvedValue([]);
      mockGcpService.discoverResources.mockRejectedValue(
        new Error("GCP error"),
      );
      mockAzureService.discoverResources.mockResolvedValue([]);

      const result = await service.listConnectedProviders(ORG_ID);

      expect(result).toContain("aws");
      expect(result).toContain("azure");
      expect(result).not.toContain("gcp");
    });

    it("should return empty array when all providers fail", async () => {
      mockAwsService.discoverResources.mockRejectedValue(new Error("err"));
      mockGcpService.discoverResources.mockRejectedValue(new Error("err"));
      mockAzureService.discoverResources.mockRejectedValue(new Error("err"));

      const result = await service.listConnectedProviders(ORG_ID);

      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// CloudResourceService — additional branch coverage
// ---------------------------------------------------------------------------

describe("CloudResourceService — without optional providers", () => {
  let service: CloudResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudResourceService,
        // No AWS, GCP, or Azure providers — all optional
      ],
    }).compile();

    service = module.get<CloudResourceService>(CloudResourceService);
  });

  describe("discoverAll — no providers", () => {
    it("should return empty array when no providers are configured", async () => {
      const result = await service.discoverAll("org-1");
      expect(result).toEqual([]);
    });
  });

  describe("discoverByProvider — no providers", () => {
    it("should return empty array for aws when awsService is absent", async () => {
      const result = await service.discoverByProvider("org-1", "aws");
      expect(result).toEqual([]);
    });

    it("should return empty array for gcp when gcpService is absent", async () => {
      const result = await service.discoverByProvider("org-1", "gcp");
      expect(result).toEqual([]);
    });

    it("should return empty array for azure when azureService is absent", async () => {
      const result = await service.discoverByProvider("org-1", "azure");
      expect(result).toEqual([]);
    });

    it("should return empty array for unknown provider (default case)", async () => {
      const result = await service.discoverByProvider("org-1", "aws" as never);
      expect(result).toEqual([]);
    });
  });

  describe("getAggregatedCost — no providers", () => {
    it("should return empty array when no providers are configured", async () => {
      const result = await service.getAggregatedCost("org-1", 30);
      expect(result).toEqual([]);
    });
  });

  describe("resolveSecret — no providers", () => {
    it("should throw when awsService is absent for ARN refs", async () => {
      await expect(
        service.resolveSecret(
          "arn:aws:secretsmanager:us-east-1:123:secret:my-secret",
          "org-1",
        ),
      ).rejects.toThrow("AWS service not available");
    });

    it("should throw when gcpService is absent for gcp: refs", async () => {
      await expect(
        service.resolveSecret("gcp:my-secret/1", "org-1"),
      ).rejects.toThrow("GCP service not available");
    });

    it("should throw when azureService is absent for azure: refs", async () => {
      await expect(
        service.resolveSecret(
          "azure:https://my-vault.vault.azure.net:my-secret",
          "org-1",
        ),
      ).rejects.toThrow("Azure service not available");
    });
  });

  describe("listConnectedProviders — no providers", () => {
    it("should return empty array when no providers are configured", async () => {
      const result = await service.listConnectedProviders("org-1");
      expect(result).toEqual([]);
    });
  });
});

describe("CloudResourceService — cost with rejected providers", () => {
  let service: CloudResourceService;
  let mockAwsService: {
    getMonthlyCost: jest.Mock;
    discoverResources: jest.Mock;
  };
  let mockGcpService: {
    getMonthlyCost: jest.Mock;
    discoverResources: jest.Mock;
  };
  let mockAzureService: {
    getMonthlyCost: jest.Mock;
    discoverResources: jest.Mock;
  };

  beforeEach(async () => {
    mockAwsService = {
      getMonthlyCost: jest.fn(),
      discoverResources: jest.fn(),
    };
    mockGcpService = {
      getMonthlyCost: jest.fn(),
      discoverResources: jest.fn(),
    };
    mockAzureService = {
      getMonthlyCost: jest.fn(),
      discoverResources: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudResourceService,
        { provide: AwsService, useValue: mockAwsService },
        { provide: GcpService, useValue: mockGcpService },
        { provide: AzureService, useValue: mockAzureService },
      ],
    }).compile();

    service = module.get<CloudResourceService>(CloudResourceService);
  });

  describe("getAggregatedCost — rejected providers", () => {
    it("should log error when AWS cost fetch rejects", async () => {
      mockAwsService.getMonthlyCost.mockRejectedValue(new Error("AWS err"));
      mockGcpService.getMonthlyCost.mockResolvedValue([]);
      mockAzureService.getMonthlyCost.mockResolvedValue([]);

      const result = await service.getAggregatedCost("org-1", 30);
      expect(result).toEqual([]);
    });

    it("should log error when GCP cost fetch rejects", async () => {
      mockAwsService.getMonthlyCost.mockResolvedValue([]);
      mockGcpService.getMonthlyCost.mockRejectedValue(new Error("GCP err"));
      mockAzureService.getMonthlyCost.mockResolvedValue([]);

      const result = await service.getAggregatedCost("org-1", 30);
      expect(result).toEqual([]);
    });

    it("should log error when Azure cost fetch rejects", async () => {
      mockAwsService.getMonthlyCost.mockResolvedValue([]);
      mockGcpService.getMonthlyCost.mockResolvedValue([]);
      mockAzureService.getMonthlyCost.mockRejectedValue(new Error("Azure err"));

      const result = await service.getAggregatedCost("org-1", 30);
      expect(result).toEqual([]);
    });
  });
});
