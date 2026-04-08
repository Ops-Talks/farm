import { ConfigService } from "@nestjs/config";
import {
  ECRClient,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
} from "@aws-sdk/client-ecr";
import { EcrAdapter } from "../adapters/ecr.adapter";
import { RegistryType } from "../enums/registry-type.enum";

jest.mock("@aws-sdk/client-ecr");

const MockedECRClient = ECRClient as jest.MockedClass<typeof ECRClient>;

describe("EcrAdapter", () => {
  let adapter: EcrAdapter;
  let mockSend: jest.Mock;
  let configService: ConfigService;

  beforeEach(() => {
    mockSend = jest.fn();
    MockedECRClient.mockImplementation(
      () =>
        ({
          send: mockSend,
        }) as unknown as ECRClient,
    );

    configService = {
      get: jest.fn((key: string) => {
        if (key === "registry.credentials") {
          return JSON.stringify({
            accessKeyId: "test-key",
            secretAccessKey: "test-secret",
            region: "us-east-1",
          });
        }
        if (key === "registry.url") return "123456789";
        return "";
      }),
    } as unknown as ConfigService;

    adapter = new EcrAdapter(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should have type ECR", () => {
    expect(adapter.type).toBe(RegistryType.ECR);
  });

  describe("listRepositories()", () => {
    it("should return repositories from ECR", async () => {
      mockSend.mockResolvedValueOnce({
        repositories: [
          {
            repositoryName: "my-app",
            repositoryUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-app",
          },
        ],
        nextToken: undefined,
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([
        { name: "my-app", uri: "123.dkr.ecr.us-east-1.amazonaws.com/my-app" },
      ]);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeRepositoriesCommand),
      );
    });

    it("should paginate through all repositories", async () => {
      mockSend
        .mockResolvedValueOnce({
          repositories: [{ repositoryName: "repo-1", repositoryUri: "uri-1" }],
          nextToken: "token-1",
        })
        .mockResolvedValueOnce({
          repositories: [{ repositoryName: "repo-2", repositoryUri: "uri-2" }],
          nextToken: undefined,
        });

      const result = await adapter.listRepositories();

      expect(result).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when no repositories exist", async () => {
      mockSend.mockResolvedValueOnce({
        repositories: [],
        nextToken: undefined,
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });
  });

  describe("listTags()", () => {
    it("should return tags from ECR", async () => {
      const pushedAt = new Date("2024-01-01");
      mockSend.mockResolvedValueOnce({
        imageDetails: [
          {
            imageTags: ["latest"],
            imageDigest: "sha256:abc",
            imageSizeInBytes: 1024,
            imagePushedAt: pushedAt,
          },
        ],
      });

      const result = await adapter.listTags("my-app");

      expect(result).toEqual([
        { tag: "latest", digest: "sha256:abc", sizeBytes: 1024, pushedAt },
      ]);
      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeImagesCommand));
    });

    it("should return empty array when no images exist", async () => {
      mockSend.mockResolvedValueOnce({ imageDetails: [] });

      const result = await adapter.listTags("my-app");

      expect(result).toEqual([]);
    });
  });

  describe("getManifest()", () => {
    it("should return manifest for a specific tag", async () => {
      const pushedAt = new Date("2024-01-01");
      mockSend.mockResolvedValueOnce({
        imageDetails: [
          {
            imageDigest: "sha256:abc",
            artifactMediaType: "application/vnd.oci.image.manifest.v1+json",
            imageSizeInBytes: 2048,
            imagePushedAt: pushedAt,
            imageTags: ["v1.0"],
          },
        ],
      });

      const result = await adapter.getManifest("my-app", "v1.0");

      expect(result).toEqual({
        digest: "sha256:abc",
        mediaType: "application/vnd.oci.image.manifest.v1+json",
        sizeBytes: 2048,
        pushedAt,
        tags: ["v1.0"],
      });
    });

    it("should throw when image is not found", async () => {
      mockSend.mockResolvedValueOnce({ imageDetails: [] });

      await expect(
        adapter.getManifest("my-app", "nonexistent"),
      ).rejects.toThrow();
    });
  });

  describe("getScanResults()", () => {
    it("should return COMPLETE scan results", async () => {
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "COMPLETE" },
        imageScanFindings: {
          findings: [
            {
              name: "CVE-2021-1234",
              severity: "HIGH",
              description: "Test vulnerability",
              attributes: [
                { key: "package_name", value: "openssl" },
                { key: "package_version", value: "1.0.2" },
              ],
            },
          ],
        },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result.status).toBe("COMPLETE");
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0]).toMatchObject({
        cveId: "CVE-2021-1234",
        severity: "HIGH",
        packageName: "openssl",
        installedVersion: "1.0.2",
      });
    });

    it("should return PENDING when scan is in progress", async () => {
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "IN_PROGRESS" },
        imageScanFindings: { findings: [] },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "PENDING", vulnerabilities: [] });
    });

    it("should return FAILED when scan failed", async () => {
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "FAILED" },
        imageScanFindings: { findings: [] },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "FAILED", vulnerabilities: [] });
    });

    it("should return UNSUPPORTED on RegistryNotFoundException", async () => {
      const err = new Error("not found");
      (err as unknown as { name: string }).name = "RegistryNotFoundException";
      mockSend.mockRejectedValueOnce(err);

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "UNSUPPORTED", vulnerabilities: [] });
    });

    it("should return UNSUPPORTED on ImageNotFoundException", async () => {
      const err = new Error("image not found");
      (err as unknown as { name: string }).name = "ImageNotFoundException";
      mockSend.mockRejectedValueOnce(err);

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "UNSUPPORTED", vulnerabilities: [] });
    });

    it("should re-throw unexpected errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Network error"));

      await expect(adapter.getScanResults("my-app", "latest")).rejects.toThrow(
        "Network error",
      );
    });
  });
});
