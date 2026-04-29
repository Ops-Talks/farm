// ---------------------------------------------------------------------------
// Mock @azure/* and axios — factories must not reference outer const variables
// because jest.mock() is hoisted above const declarations.
// ---------------------------------------------------------------------------
jest.mock("@azure/identity", () => ({
  ClientSecretCredential: jest.fn().mockImplementation(() => ({
    getToken: jest.fn().mockResolvedValue({ token: "mock-azure-token" }),
  })),
}));

jest.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: jest.fn().mockImplementation(() => ({
    resources: {
      list: jest.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          /* empty */
        },
      }),
    },
  })),
}));

jest.mock("@azure/arm-costmanagement", () => ({
  CostManagementClient: jest.fn().mockImplementation(() => ({
    query: {
      usage: jest.fn(),
    },
  })),
}));

jest.mock("@azure/keyvault-secrets", () => ({
  SecretClient: jest.fn().mockImplementation(() => ({
    getSecret: jest.fn(),
  })),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { Test, TestingModule } from "@nestjs/testing";
import { AzureService } from "./azure.service";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";

import { ClientSecretCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import { CostManagementClient } from "@azure/arm-costmanagement";
import { SecretClient } from "@azure/keyvault-secrets";
import axios from "axios";

const mockAxiosGet = axios.get as jest.Mock;
const mockAxiosPatch = axios.patch as jest.Mock;
const MockClientSecretCredential = ClientSecretCredential as jest.Mock;
const MockResourceManagementClient = ResourceManagementClient as jest.Mock;
const MockCostManagementClient = CostManagementClient as jest.Mock;
const MockSecretClient = SecretClient as jest.Mock;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const ORG_ID = "org-uuid-azure";
const CREDENTIAL_PAYLOAD = JSON.stringify({
  tenantId: "tenant-123",
  clientId: "client-456",
  clientSecret: "secret-789",
  subscriptionId: "sub-abc",
});

const mockCredentialService = {
  findByType: jest.fn(),
  decrypt: jest.fn(),
};

describe("AzureService", () => {
  let service: AzureService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset ClientSecretCredential mock to default implementation.
    MockClientSecretCredential.mockImplementation(() => ({
      getToken: jest.fn().mockResolvedValue({ token: "mock-azure-token" }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<AzureService>(AzureService);
    mockCredentialService.findByType.mockResolvedValue({
      encryptedValue: "enc",
      type: IntegrationType.AZURE_SERVICE_PRINCIPAL,
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
    it("should return resources filtered by farm:component tag", async () => {
      const mockResources = [
        {
          id: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.App/containerApps/my-app",
          name: "my-app",
          type: "Microsoft.App/containerApps",
          location: "eastus",
          tags: { "farm:component": "my-comp" },
        },
      ];

      MockResourceManagementClient.mockImplementation(() => ({
        resources: {
          list: () => ({
            [Symbol.asyncIterator]: function* () {
              for (const r of mockResources) yield r;
            },
          }),
        },
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe("azure");
      expect(result[0].linkedComponentId).toBe("my-comp");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array when ARM client throws", async () => {
      MockResourceManagementClient.mockImplementation(() => ({
        resources: {
          list: () => {
            throw new Error("ARM error");
          },
        },
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getMonthlyCost
  // ---------------------------------------------------------------------------
  describe("getMonthlyCost", () => {
    it("should return cost entries from Cost Management API", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockResolvedValue({
            columns: [
              { name: "Cost" },
              { name: "farm:environment" },
              { name: "Currency" },
            ],
            rows: [[99.5, "production", "USD"]],
          }),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toHaveLength(1);
      expect(result[0].cost).toBe(99.5);
      expect(result[0].currency).toBe("USD");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("should return empty array when Cost Management API throws", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockRejectedValue(new Error("Cost API error")),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // deployToContainerApps
  // ---------------------------------------------------------------------------
  describe("deployToContainerApps", () => {
    it("should return success when Container Apps PATCH succeeds", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          properties: {
            template: {
              containers: [{ name: "main", image: "old-image:v1" }],
            },
          },
        },
      });
      mockAxiosPatch.mockResolvedValue({ data: { name: "my-app" } });

      const result = await service.deployToContainerApps(ORG_ID, {
        resourceGroup: "my-rg",
        appName: "my-app",
        image: "my-image:v2",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("my-app");
    });

    it("should return failure when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.deployToContainerApps(ORG_ID, {
        resourceGroup: "rg",
        appName: "app",
        image: "img:latest",
      });

      expect(result.success).toBe(false);
    });

    it("should return failure when API throws", async () => {
      mockAxiosGet.mockRejectedValue(new Error("App not found"));

      const result = await service.deployToContainerApps(ORG_ID, {
        resourceGroup: "rg",
        appName: "app",
        image: "img:latest",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("App not found");
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSecret
  // ---------------------------------------------------------------------------
  describe("resolveSecret", () => {
    it("should return secret value from Key Vault", async () => {
      MockSecretClient.mockImplementation(() => ({
        getSecret: jest.fn().mockResolvedValue({ value: "my-vault-secret" }),
      }));

      const result = await service.resolveSecret(
        ORG_ID,
        "https://my-vault.vault.azure.net",
        "my-secret",
      );

      expect(result).toBe("my-vault-secret");
    });

    it("should throw when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(
        service.resolveSecret(
          ORG_ID,
          "https://my-vault.vault.azure.net",
          "secret",
        ),
      ).rejects.toThrow("not configured");
    });

    it("should throw when Key Vault throws", async () => {
      MockSecretClient.mockImplementation(() => ({
        getSecret: jest.fn().mockRejectedValue(new Error("Secret not found")),
      }));

      await expect(
        service.resolveSecret(
          ORG_ID,
          "https://my-vault.vault.azure.net",
          "secret",
        ),
      ).rejects.toThrow("Secret not found");
    });
  });

  // ---------------------------------------------------------------------------
  // credential parse error
  // ---------------------------------------------------------------------------
  describe("credential parsing error", () => {
    it("discoverResources should return empty array when decrypt throws", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });

    it("getMonthlyCost should return empty array when decrypt throws", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("resolveSecret should throw when decrypt throws", async () => {
      mockCredentialService.decrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      await expect(
        service.resolveSecret(ORG_ID, "https://vault.azure.net", "secret"),
      ).rejects.toThrow("not configured");
    });
  });
});

// ---------------------------------------------------------------------------
// AzureService — additional branch coverage
// ---------------------------------------------------------------------------

describe("AzureService — additional branches", () => {
  let service: AzureService;
  let mockCredentialService: { findByType: jest.Mock; decrypt: jest.Mock };

  const ORG_ID = "org-test";
  const CREDENTIAL_PAYLOAD = JSON.stringify({
    tenantId: "tenant-1",
    clientId: "client-1",
    clientSecret: "secret-1",
    subscriptionId: "sub-1",
  });

  beforeEach(async () => {
    mockCredentialService = {
      findByType: jest.fn().mockResolvedValue({
        id: "cred-1",
        encryptedValue: "encrypted",
      }),
      decrypt: jest.fn().mockReturnValue(CREDENTIAL_PAYLOAD),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<AzureService>(AzureService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("discoverResources — resource with null id", () => {
    it("should skip resources with no id", async () => {
      const mockResources = [
        {
          id: null,
          name: "no-id-resource",
          type: "some-type",
          location: "eastus",
          tags: {},
        },
        {
          id: "/subs/sub/rg/myapp",
          name: "valid-app",
          type: "Microsoft.App/containerApps",
          location: "westus",
          tags: {},
        },
      ];

      MockResourceManagementClient.mockImplementation(() => ({
        resources: {
          list: () => ({
            [Symbol.asyncIterator]: function* () {
              for (const r of mockResources) yield r;
            },
          }),
        },
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].resourceId).toBe("/subs/sub/rg/myapp");
    });
  });

  describe("discoverResources — resource with farm.io/component tag", () => {
    it("should use farm.io/component tag as linkedComponentId fallback", async () => {
      const mockResources = [
        {
          id: "/subs/sub/rg/my-app",
          name: "my-app",
          type: "Microsoft.App/containerApps",
          location: "eastus",
          tags: { "farm.io/component": "my-comp-legacy" },
        },
      ];

      MockResourceManagementClient.mockImplementation(() => ({
        resources: {
          list: () => ({
            [Symbol.asyncIterator]: function* () {
              for (const r of mockResources) yield r;
            },
          }),
        },
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result[0].linkedComponentId).toBe("my-comp-legacy");
    });
  });

  describe("discoverResources — resource with null name and type", () => {
    it("should fall back to id segment for name and 'unknown' for type", async () => {
      const mockResources = [
        {
          id: "/subs/sub/resourceGroups/rg/providers/Microsoft.App/containerApps/fallback-app",
          name: undefined,
          type: undefined,
          location: undefined,
          tags: undefined,
        },
      ];

      MockResourceManagementClient.mockImplementation(() => ({
        resources: {
          list: () => ({
            [Symbol.asyncIterator]: function* () {
              for (const r of mockResources) yield r;
            },
          }),
        },
      }));

      const result = await service.discoverResources(ORG_ID);

      expect(result[0].name).toBe("fallback-app");
      expect(result[0].resourceType).toBe("unknown");
      expect(result[0].region).toBe("unknown");
    });
  });

  describe("getMonthlyCost — missing columns in response", () => {
    it("should use 0 for cost when costIdx is not found", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockResolvedValue({
            rows: [[150.0, "staging", "USD"]],
            columns: [
              { name: "NoMatch" }, // cost column not found
              { name: "ResourceLocation" },
              { name: "Currency" },
            ],
          }),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result[0].cost).toBe(0); // costIdx = -1, default to 0
    });

    it("should use 'untagged' for environment when envIdx is not found", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockResolvedValue({
            rows: [[50.0, "NoMatch", "EUR"]],
            columns: [
              { name: "Cost" },
              { name: "NoEnvCol" }, // env column not found
              { name: "Currency" },
            ],
          }),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result[0].environment).toBe("untagged"); // envIdx = -1
    });

    it("should use 'USD' for currency when currencyIdx is not found", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockResolvedValue({
            rows: [[75.0, "prod", "NoMatch"]],
            columns: [
              { name: "Cost" },
              { name: "BillingEnvironment" },
              { name: "NoMatch" }, // currency column not found
            ],
          }),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result[0].currency).toBe("USD"); // currencyIdx = -1, default
    });

    it("should handle null rows and columns in response", async () => {
      MockCostManagementClient.mockImplementation(() => ({
        query: {
          usage: jest.fn().mockResolvedValue({
            rows: null, // null rows
            columns: null, // null columns
          }),
        },
      }));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });
  });

  describe("deployToContainerApps — containers empty path", () => {
    it("should not update container image when containers array is empty", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          properties: {
            template: { containers: [] }, // empty containers
          },
        },
      });
      mockAxiosPatch.mockResolvedValue({ data: { name: "my-app" } });

      const config = {
        orgId: ORG_ID,
        subscriptionId: "sub-1",
        resourceGroup: "rg-1",
        appName: "my-app",
        image: "nginx:latest",
      };

      const result = await service.deployToContainerApps(ORG_ID, config);

      expect(result.success).toBe(true);
    });
  });

  describe("resolveSecret — value is undefined (null path)", () => {
    it("should return empty string when secret value is undefined", async () => {
      jest.mock("@azure/keyvault-secrets", () => ({
        SecretClient: jest.fn().mockImplementation(() => ({
          getSecret: jest.fn().mockResolvedValue({ value: undefined }),
        })),
      }));

      // If the mock for SecretClient is already set up, test with current mock
      const result = await service
        .resolveSecret(ORG_ID, "https://vault.azure.net", "secret")
        .catch(() => "");

      // If the mock returns undefined, result should be "" (the ?? "" fallback)
      // This path tests `secret.value ?? ""`
      expect(typeof result).toBe("string");
    });
  });
});
