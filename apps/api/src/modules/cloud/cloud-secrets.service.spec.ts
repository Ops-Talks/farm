import { Test, TestingModule } from "@nestjs/testing";
import { CloudSecretsService } from "./cloud-secrets.service";
import { AwsService } from "./aws/aws.service";
import { GcpService } from "./gcp/gcp.service";
import { AzureService } from "./azure/azure.service";

const ORG_ID = "org-uuid-secrets";

const mockAwsService = { resolveSecret: jest.fn() };
const mockGcpService = { resolveSecret: jest.fn() };
const mockAzureService = { resolveSecret: jest.fn() };

describe("CloudSecretsService", () => {
  let service: CloudSecretsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudSecretsService,
        { provide: AwsService, useValue: mockAwsService },
        { provide: GcpService, useValue: mockGcpService },
        { provide: AzureService, useValue: mockAzureService },
      ],
    }).compile();

    service = module.get<CloudSecretsService>(CloudSecretsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // isSecretRef
  // ---------------------------------------------------------------------------
  describe("isSecretRef", () => {
    it("should return true for AWS ARN", () => {
      expect(
        service.isSecretRef(
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
        ),
      ).toBe(true);
    });

    it("should return true for GCP ref", () => {
      expect(
        service.isSecretRef(
          "gcp:projects/my-project/secrets/my-secret/versions/latest",
        ),
      ).toBe(true);
    });

    it("should return true for Azure ref", () => {
      expect(
        service.isSecretRef("azure:https://my-vault.vault.azure.net:my-secret"),
      ).toBe(true);
    });

    it("should return false for plain strings", () => {
      expect(service.isSecretRef("just-a-value")).toBe(false);
      expect(service.isSecretRef("https://example.com")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // resolve
  // ---------------------------------------------------------------------------
  describe("resolve", () => {
    it("should delegate to AwsService for AWS ARNs", async () => {
      mockAwsService.resolveSecret.mockResolvedValue("aws-secret-value");

      const result = await service.resolve(
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
        ORG_ID,
      );

      expect(result).toBe("aws-secret-value");
      expect(mockAwsService.resolveSecret).toHaveBeenCalledWith(
        ORG_ID,
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
      );
    });

    it("should delegate to GcpService for GCP refs", async () => {
      mockGcpService.resolveSecret.mockResolvedValue("gcp-secret-value");

      const result = await service.resolve(
        "gcp:projects/my-project/secrets/my-secret/versions/latest",
        ORG_ID,
      );

      expect(result).toBe("gcp-secret-value");
      expect(mockGcpService.resolveSecret).toHaveBeenCalledWith(
        ORG_ID,
        "gcp:projects/my-project/secrets/my-secret/versions/latest",
      );
    });

    it("should delegate to AzureService for Azure refs", async () => {
      mockAzureService.resolveSecret.mockResolvedValue("azure-secret-value");

      const result = await service.resolve(
        "azure:https://my-vault.vault.azure.net:my-secret",
        ORG_ID,
      );

      expect(result).toBe("azure-secret-value");
      expect(mockAzureService.resolveSecret).toHaveBeenCalledWith(
        ORG_ID,
        "https://my-vault.vault.azure.net",
        "my-secret",
      );
    });

    it("should delegate to AzureService for Azure refs with a port in the vault URL", async () => {
      mockAzureService.resolveSecret.mockResolvedValue("azure-port-secret");

      const result = await service.resolve(
        "azure:https://localhost:8443:my-secret",
        ORG_ID,
      );

      expect(result).toBe("azure-port-secret");
      expect(mockAzureService.resolveSecret).toHaveBeenCalledWith(
        ORG_ID,
        "https://localhost:8443",
        "my-secret",
      );
    });

    it("should throw for unsupported ref format", async () => {
      await expect(
        service.resolve("http://not-a-secret-ref.com", ORG_ID),
      ).rejects.toThrow("Unsupported secret ref format");
    });

    it("should throw when AWS service is unavailable", async () => {
      const moduleNoAws: TestingModule = await Test.createTestingModule({
        providers: [CloudSecretsService],
      }).compile();
      const svcNoAws =
        moduleNoAws.get<CloudSecretsService>(CloudSecretsService);

      await expect(
        svcNoAws.resolve(
          "arn:aws:secretsmanager:us-east-1:123:secret:s",
          ORG_ID,
        ),
      ).rejects.toThrow("AWS service not available");
    });
  });

  // ---------------------------------------------------------------------------
  // resolveConfigSecrets
  // ---------------------------------------------------------------------------
  describe("resolveConfigSecrets", () => {
    it("should resolve secret refs within a config object", async () => {
      mockAwsService.resolveSecret.mockResolvedValue("resolved-secret");

      const config = {
        image: "my-image:latest",
        dbPassword:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-pw",
        port: 5432,
      };

      const result = await service.resolveConfigSecrets(
        config as Record<string, unknown>,
        ORG_ID,
      );

      expect(result["image"]).toBe("my-image:latest");
      expect(result["dbPassword"]).toBe("resolved-secret");
      expect(result["port"]).toBe(5432);
    });

    it("should leave non-secret values unchanged", async () => {
      const config = { engine: "aws-ecs", cluster: "my-cluster" };

      const result = await service.resolveConfigSecrets(config, ORG_ID);

      expect(result).toEqual(config);
    });

    it("should log a warning and leave value unchanged when resolution fails", async () => {
      mockAwsService.resolveSecret.mockRejectedValue(
        new Error("Access denied"),
      );

      const config = {
        secret: "arn:aws:secretsmanager:us-east-1:123456789012:secret:bad",
      };

      // Should not throw; it swallows errors and logs them.
      const result = await service.resolveConfigSecrets(
        config as Record<string, unknown>,
        ORG_ID,
      );

      expect(result["secret"]).toBe(
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:bad",
      );
    });
  });
});
