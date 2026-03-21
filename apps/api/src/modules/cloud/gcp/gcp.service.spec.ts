import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { GcpService } from "./gcp.service";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";

// ---------------------------------------------------------------------------
// Mock google-auth-library — factory must not reference outer const variables
// because jest.mock() is hoisted above const declarations.
// ---------------------------------------------------------------------------
jest.mock("google-auth-library", () => {
  const mockGetAccessToken = jest.fn().mockResolvedValue("mock-token");
  const MockGoogleAuth = jest.fn().mockImplementation(() => ({
    getAccessToken: mockGetAccessToken,
  }));
  (
    MockGoogleAuth as unknown as { _mockGetAccessToken: jest.Mock }
  )._mockGetAccessToken = mockGetAccessToken;
  return { GoogleAuth: MockGoogleAuth };
});

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { GoogleAuth } from "google-auth-library";
import axios from "axios";

const mockAxiosGet = axios.get as jest.Mock;
const mockAxiosPatch = axios.patch as jest.Mock;
const MockGoogleAuth = GoogleAuth as jest.Mock;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const ORG_ID = "org-uuid-gcp";
const CREDENTIAL_PAYLOAD = JSON.stringify({
  serviceAccountJson: JSON.stringify({
    type: "service_account",
    project_id: "my-project",
  }),
  projectId: "my-project",
});

const mockCredentialService = {
  findByType: jest.fn(),
  decrypt: jest.fn(),
};

describe("GcpService", () => {
  let service: GcpService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcpService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<GcpService>(GcpService);
    mockCredentialService.findByType.mockResolvedValue({
      encryptedValue: "enc",
      type: IntegrationType.GCP_SERVICE_ACCOUNT,
    });
    mockCredentialService.decrypt.mockReturnValue(CREDENTIAL_PAYLOAD);
    MockGoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue("mock-token"),
    }));
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
    it("should return resources filtered by farm_component label", async () => {
      mockAxiosGet.mockResolvedValue({
        status: 200,
        data: {
          assets: [
            {
              name: "projects/my-project/global/cloudRunServices/my-svc",
              assetType: "run.googleapis.com/Service",
              resource: {
                data: {
                  name: "my-svc",
                  location: "us-central1",
                  labels: { farm_component: "my-comp" },
                },
              },
            },
            {
              name: "projects/my-project/global/cloudRunServices/untagged-svc",
              assetType: "run.googleapis.com/Service",
              resource: {
                data: {
                  name: "untagged-svc",
                  location: "us-central1",
                  labels: {},
                },
              },
            },
          ],
        },
      });

      const result = await service.discoverResources(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe("gcp");
      expect(result[0].linkedComponentId).toBe("my-comp");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("should return empty array when API throws", async () => {
      mockAxiosGet.mockRejectedValue(new Error("API error"));

      const result = await service.discoverResources(ORG_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getMonthlyCost
  // ---------------------------------------------------------------------------
  describe("getMonthlyCost", () => {
    it("should return placeholder cost entry when billing API is accessible", async () => {
      mockAxiosGet.mockResolvedValue({
        status: 200,
        data: { services: [{ displayName: "Cloud Run" }] },
      });

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toHaveLength(1);
      expect(result[0].environment).toBe("default");
    });

    it("should return empty array when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });

    it("should return empty array when API throws", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Billing API error"));

      const result = await service.getMonthlyCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // deployToCloudRun
  // ---------------------------------------------------------------------------
  describe("deployToCloudRun", () => {
    it("should return success when Cloud Run PATCH succeeds", async () => {
      mockAxiosPatch.mockResolvedValue({
        data: { name: "projects/p/operations/op-123" },
      });

      const result = await service.deployToCloudRun(ORG_ID, {
        service: "my-service",
        region: "us-central1",
        image: "gcr.io/my-project/my-image:latest",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("my-service");
    });

    it("should return failure when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.deployToCloudRun(ORG_ID, {
        service: "svc",
        region: "us-central1",
        image: "img:latest",
      });

      expect(result.success).toBe(false);
    });

    it("should return failure when API throws", async () => {
      mockAxiosPatch.mockRejectedValue(new Error("Service not found"));

      const result = await service.deployToCloudRun(ORG_ID, {
        service: "svc",
        region: "us-central1",
        image: "img:latest",
      });

      expect(result.success).toBe(false);
      expect(result.output).toContain("Service not found");
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSecret
  // ---------------------------------------------------------------------------
  describe("resolveSecret", () => {
    it("should return decoded secret value", async () => {
      const secretValue = "my-secret-value";
      const encoded = Buffer.from(secretValue).toString("base64");
      mockAxiosGet.mockResolvedValue({
        data: { payload: { data: encoded } },
      });

      const result = await service.resolveSecret(
        ORG_ID,
        "gcp:projects/my-project/secrets/my-secret/versions/latest",
      );

      expect(result).toBe(secretValue);
    });

    it("should strip gcp: prefix from the ref path", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { payload: { data: Buffer.from("val").toString("base64") } },
      });

      await service.resolveSecret(
        ORG_ID,
        "gcp:projects/my-project/secrets/my-secret/versions/1",
      );

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining("projects/my-project/secrets/my-secret"),
        expect.anything(),
      );
    });

    it("should throw when credentials are not configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(
        service.resolveSecret(
          ORG_ID,
          "gcp:projects/my-project/secrets/my-secret/versions/1",
        ),
      ).rejects.toThrow("not configured");
    });

    it("should throw when ref does not start with gcp:projects/", async () => {
      await expect(
        service.resolveSecret(ORG_ID, "gcp:my-project/secrets/s/versions/1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when ref has wrong number of path segments", async () => {
      await expect(
        service.resolveSecret(
          ORG_ID,
          "gcp:projects/my-project/secrets/my-secret/versions",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when project ID contains dots (dot-segment traversal)", async () => {
      await expect(
        service.resolveSecret(
          ORG_ID,
          "gcp:projects/../secrets/my-secret/versions/latest",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when secret name contains dots", async () => {
      await expect(
        service.resolveSecret(
          ORG_ID,
          "gcp:projects/my-project/secrets/my.secret/versions/latest",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when version is not a number or 'latest'", async () => {
      await expect(
        service.resolveSecret(
          ORG_ID,
          "gcp:projects/my-project/secrets/my-secret/versions/v1.2",
        ),
      ).rejects.toThrow(BadRequestException);
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
  });
});
