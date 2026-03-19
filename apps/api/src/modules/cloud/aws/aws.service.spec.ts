import { Test, TestingModule } from "@nestjs/testing";
import { AwsService } from "./aws.service";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";

// ---------------------------------------------------------------------------
// Mock all @aws-sdk/* modules using inline jest.fn() factories.
// Variables declared with const cannot be referenced inside jest.mock()
// factories because jest.mock() is hoisted above const declarations.
// ---------------------------------------------------------------------------
jest.mock("@aws-sdk/client-resource-groups-tagging-api", () => ({
  ResourceGroupsTaggingAPIClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetResourcesCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-cost-explorer", () => ({
  CostExplorerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetCostAndUsageCommand: jest.fn(),
  GroupDefinitionType: { TAG: "TAG" },
}));

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-ecs", () => ({
  ECSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  UpdateServiceCommand: jest.fn(),
  DescribeServicesCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  UpdateFunctionCodeCommand: jest.fn(),
}));

// Now import the mocked modules so we can access and control the send fns.
import { ResourceGroupsTaggingAPIClient } from "@aws-sdk/client-resource-groups-tagging-api";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { ECSClient } from "@aws-sdk/client-ecs";
import { LambdaClient } from "@aws-sdk/client-lambda";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const ORG_ID = "org-uuid-aws";
const CREDENTIAL_PAYLOAD = JSON.stringify({
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "secret",
  region: "us-east-1",
});

const mockCredentialService = {
  findByType: jest.fn(),
  decrypt: jest.fn(),
};

describe("AwsService", () => {
  let service: AwsService;

  beforeEach(async () => {
    // Clear all mock state between tests.
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
    mockCredentialService.findByType.mockResolvedValue({
      encryptedValue: "encrypted-aws-creds",
      type: IntegrationType.AWS_IAM_ROLE,
    });
    mockCredentialService.decrypt.mockReturnValue(CREDENTIAL_PAYLOAD);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // discoverResources
  // ---------------------------------------------------------------------------
  describe("discoverResources", () => {
    it("should return resources when credentials are configured", async () => {
      const sendMock = jest.fn().mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: "arn:aws:ecs:us-east-1:123:service/cluster/my-svc",
            Tags: [
              { Key: "farm:component", Value: "my-component" },
              { Key: "farm:environment", Value: "prod" },
            ],
          },
        ],
        PaginationToken: undefined,
      });
      (ResourceGroupsTaggingAPIClient as jest.Mock).mockImplementation(() => ({
        send: sendMock,
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].provider).toBe("aws");
      expect(result[0].linkedComponentId).toBe("my-component");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array when SDK throws", async () => {
      (ResourceGroupsTaggingAPIClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error("Access denied")),
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });

    it("should deduplicate resources found by multiple tag keys", async () => {
      const sameArn = "arn:aws:ecs:us-east-1:123:service/cluster/svc";
      const sendMock = jest.fn().mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: sameArn,
            Tags: [{ Key: "farm:component", Value: "comp" }],
          },
        ],
      });
      (ResourceGroupsTaggingAPIClient as jest.Mock).mockImplementation(() => ({
        send: sendMock,
      }));

      const result = await service.discoverResources(ORG_ID);

      // Two tag key calls but result should be deduplicated.
      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getMonthlyCost
  // ---------------------------------------------------------------------------
  describe("getMonthlyCost", () => {
    it("should return cost entries when credentials are configured", async () => {
      (CostExplorerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({
          ResultsByTime: [
            {
              Groups: [
                {
                  Keys: ["farm:environment$production"],
                  Metrics: {
                    UnblendedCost: { Amount: "123.45", Unit: "USD" },
                  },
                },
              ],
            },
          ],
        }),
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toHaveLength(1);
      expect(result[0].environment).toBe("production");
      expect(result[0].cost).toBe(123.45);
      expect(result[0].currency).toBe("USD");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("should return empty array when SDK throws", async () => {
      (CostExplorerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error("Service unavailable")),
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // deployToEcs
  // ---------------------------------------------------------------------------
  describe("deployToEcs", () => {
    it("should return success when deployment succeeds", async () => {
      (ECSClient as jest.Mock).mockImplementation(() => ({
        send: jest
          .fn()
          .mockResolvedValueOnce({}) // UpdateServiceCommand
          .mockResolvedValueOnce({ services: [{ status: "ACTIVE" }] }), // DescribeServicesCommand
      }));

      const result = await service.deployToEcs(ORG_ID, {
        cluster: "my-cluster",
        service: "my-service",
        image: "my-image:latest",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("my-service");
    });

    it("should return failure when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.deployToEcs(ORG_ID, {
        cluster: "c",
        service: "s",
        image: "i",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("not configured");
    });

    it("should return failure when SDK throws", async () => {
      (ECSClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error("Cluster not found")),
      }));

      const result = await service.deployToEcs(ORG_ID, {
        cluster: "c",
        service: "s",
        image: "i",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("Cluster not found");
    });
  });

  // ---------------------------------------------------------------------------
  // deployToLambda
  // ---------------------------------------------------------------------------
  describe("deployToLambda", () => {
    it("should return success when deployment succeeds", async () => {
      (LambdaClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({ Version: "5" }),
      }));

      const result = await service.deployToLambda(ORG_ID, {
        functionName: "my-lambda",
        imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-image:latest",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("my-lambda");
    });

    it("should return failure when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.deployToLambda(ORG_ID, {
        functionName: "fn",
      });

      expect(result.success).toBe(false);
    });

    it("should return failure when SDK throws", async () => {
      (LambdaClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockRejectedValue(new Error("Function not found")),
      }));

      const result = await service.deployToLambda(ORG_ID, {
        functionName: "fn",
        imageUri: "img:latest",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("Function not found");
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSecret
  // ---------------------------------------------------------------------------
  describe("resolveSecret", () => {
    it("should return the secret string value", async () => {
      (SecretsManagerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({ SecretString: "my-super-secret" }),
      }));

      const value = await service.resolveSecret(
        ORG_ID,
        "arn:aws:secretsmanager:us-east-1:123:secret:my-secret",
      );

      expect(value).toBe("my-super-secret");
    });

    it("should throw when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(
        service.resolveSecret(
          ORG_ID,
          "arn:aws:secretsmanager:us-east-1:123:secret:s",
        ),
      ).rejects.toThrow("not configured");
    });

    it("should throw when SDK throws", async () => {
      (SecretsManagerClient as jest.Mock).mockImplementation(() => ({
        send: jest
          .fn()
          .mockRejectedValue(new Error("ResourceNotFoundException")),
      }));

      await expect(
        service.resolveSecret(
          ORG_ID,
          "arn:aws:secretsmanager:us-east-1:123:secret:s",
        ),
      ).rejects.toThrow("ResourceNotFoundException");
    });

    it("should return empty string when SecretString is absent", async () => {
      (SecretsManagerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({ SecretString: undefined }),
      }));

      const value = await service.resolveSecret(
        ORG_ID,
        "arn:aws:secretsmanager:us-east-1:123:secret:my-secret",
      );

      expect(value).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // edge cases — cost grouping
  // ---------------------------------------------------------------------------
  describe("getMonthlyCost edge cases", () => {
    it("should use 'untagged' when environment tag is empty", async () => {
      (CostExplorerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({
          ResultsByTime: [
            {
              Groups: [
                {
                  Keys: [""],
                  Metrics: { UnblendedCost: { Amount: "10", Unit: "USD" } },
                },
              ],
            },
          ],
        }),
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result[0].environment).toBe("untagged");
    });

    it("should handle missing Groups in ResultsByTime", async () => {
      (CostExplorerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({
          ResultsByTime: [{ Groups: undefined }],
        }),
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("should handle tag value without farm:environment$ prefix", async () => {
      (CostExplorerClient as jest.Mock).mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({
          ResultsByTime: [
            {
              Groups: [
                {
                  Keys: ["production"],
                  Metrics: { UnblendedCost: { Amount: "50", Unit: "USD" } },
                },
              ],
            },
          ],
        }),
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result[0].environment).toBe("production");
    });
  });

  // ---------------------------------------------------------------------------
  // edge cases — ECS without service in response
  // ---------------------------------------------------------------------------
  describe("deployToEcs edge cases", () => {
    it("should use 'unknown' status when services array is empty", async () => {
      (ECSClient as jest.Mock).mockImplementation(() => ({
        send: jest
          .fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ services: [] }),
      }));

      const result = await service.deployToEcs(ORG_ID, {
        cluster: "c",
        service: "s",
        image: "i",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("unknown");
    });
  });

  // ---------------------------------------------------------------------------
  // credential parse error
  // ---------------------------------------------------------------------------
  describe("credential parsing error", () => {
    it("discoverResources should return empty array when decrypt fails", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });

    it("getMonthlyCost should return empty array when decrypt fails", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("deployToEcs should return failure when decrypt fails", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.deployToEcs(ORG_ID, {
        cluster: "c",
        service: "s",
        image: "i",
      });

      expect(result.success).toBe(false);
    });
  });
});
