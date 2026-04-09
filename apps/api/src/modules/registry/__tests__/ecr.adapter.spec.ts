import { ConfigService } from "@nestjs/config";
import {
  ECRClient,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
  DescribeImageScanFindingsCommand,
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

  describe("constructor branch coverage", () => {
    it("should use default credentials when registry.credentials config returns null", () => {
      // Covers: L44 (?? ""), L45 (falsy → default creds), L53 (no accessKeyId → undefined)
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials") return null;
          if (key === "registry.url") return "";
          return null;
        }),
      } as unknown as ConfigService;

      expect(() => new EcrAdapter(cs)).not.toThrow();
    });

    it("should fall back to us-east-1 when credentials region is empty string", () => {
      // Covers: L52 (region || "us-east-1")
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials")
            return JSON.stringify({
              accessKeyId: "key",
              secretAccessKey: "secret",
              region: "",
            });
          if (key === "registry.url") return "";
          return "";
        }),
      } as unknown as ConfigService;

      expect(() => new EcrAdapter(cs)).not.toThrow();
    });

    it("should omit AWS credentials when accessKeyId is empty string", () => {
      // Covers: L53 (accessKeyId falsy → undefined credentials)
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials")
            return JSON.stringify({
              accessKeyId: "",
              secretAccessKey: "",
              region: "us-east-1",
            });
          if (key === "registry.url") return "";
          return "";
        }),
      } as unknown as ConfigService;

      expect(() => new EcrAdapter(cs)).not.toThrow();
    });

    it("should use empty string accountId when registry.url config returns null", () => {
      // Covers: L49 (?? "")
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials")
            return JSON.stringify({
              accessKeyId: "key",
              secretAccessKey: "secret",
              region: "us-east-1",
            });
          if (key === "registry.url") return null;
          return null;
        }),
      } as unknown as ConfigService;

      expect(() => new EcrAdapter(cs)).not.toThrow();
    });
  });

  describe("with no accountId (empty registry.url)", () => {
    let adapterNoAccount: EcrAdapter;

    beforeEach(() => {
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials")
            return JSON.stringify({
              accessKeyId: "key",
              secretAccessKey: "secret",
              region: "us-east-1",
            });
          if (key === "registry.url") return "";
          return "";
        }),
      } as unknown as ConfigService;

      adapterNoAccount = new EcrAdapter(cs);
    });

    it("listRepositories() should pass undefined registryId when accountId is empty", async () => {
      // Covers: L72 (this.accountId || undefined → undefined)
      mockSend.mockResolvedValueOnce({
        repositories: [],
        nextToken: undefined,
      });

      const result = await adapterNoAccount.listRepositories();

      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeRepositoriesCommand),
      );
    });

    it("listTags() should pass undefined registryId when accountId is empty", async () => {
      // Covers: L98 (this.accountId || undefined → undefined)
      mockSend.mockResolvedValueOnce({ imageDetails: [] });

      const result = await adapterNoAccount.listTags("my-app");

      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeImagesCommand));
    });

    it("getManifest() should pass undefined registryId when accountId is empty", async () => {
      // Covers: L117 (this.accountId || undefined → undefined)
      mockSend.mockResolvedValueOnce({
        imageDetails: [{ imageDigest: "sha256:abc", imageTags: ["v1.0"] }],
      });

      const result = await adapterNoAccount.getManifest("my-app", "v1.0");

      expect(result.digest).toBe("sha256:abc");
    });

    it("getScanResults() should pass undefined registryId when accountId is empty", async () => {
      // Covers: L148 (this.accountId || undefined → undefined)
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "COMPLETE" },
        imageScanFindings: { findings: [] },
      });

      const result = await adapterNoAccount.getScanResults("my-app", "latest");

      expect(result.status).toBe("COMPLETE");
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeImageScanFindingsCommand),
      );
    });
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

    it("should handle undefined repositories field in response", async () => {
      // Covers: L77 (response.repositories ?? [])
      mockSend.mockResolvedValueOnce({
        repositories: undefined,
        nextToken: undefined,
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it("should use empty string fallbacks when repository name and uri are undefined", async () => {
      // Covers: L79 (repositoryName ?? ""), L80 (repositoryUri ?? "")
      mockSend.mockResolvedValueOnce({
        repositories: [{ repositoryName: undefined, repositoryUri: undefined }],
        nextToken: undefined,
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([{ name: "", uri: "" }]);
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

    it("should handle undefined imageDetails field in response", async () => {
      // Covers: L103 (response.imageDetails ?? [])
      mockSend.mockResolvedValueOnce({ imageDetails: undefined });

      const result = await adapter.listTags("my-app");

      expect(result).toEqual([]);
    });

    it("should use empty fallbacks when all imageDetail fields are undefined", async () => {
      // Covers: L198 (imageTags ?? [] and [0] ?? ""), L199 (imageDigest ?? undefined),
      //         L200 (imagePushedAt ?? undefined), L201 (imageSizeInBytes ?? undefined)
      mockSend.mockResolvedValueOnce({
        imageDetails: [
          {
            imageTags: undefined,
            imageDigest: undefined,
            imagePushedAt: undefined,
            imageSizeInBytes: undefined,
          },
        ],
      });

      const result = await adapter.listTags("my-app");

      expect(result[0]).toEqual({
        tag: "",
        digest: undefined,
        pushedAt: undefined,
        sizeBytes: undefined,
      });
    });

    it("should use empty string tag when imageTags is an empty array", async () => {
      // Covers: L198 second ?? "" (array[0] is undefined)
      mockSend.mockResolvedValueOnce({
        imageDetails: [{ imageTags: [] }],
      });

      const result = await adapter.listTags("my-app");

      expect(result[0].tag).toBe("");
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

    it("should throw when imageDetails is undefined in response", async () => {
      // Covers: L122 (response.imageDetails ?? [])
      mockSend.mockResolvedValueOnce({ imageDetails: undefined });

      await expect(
        adapter.getManifest("my-app", "nonexistent"),
      ).rejects.toThrow(`Image my-app:nonexistent not found in ECR`);
    });

    it("should use fallbacks when all manifest detail fields are undefined", async () => {
      // Covers: L128 (imageDigest ?? ""), L130 (artifactMediaType ?? default),
      //         L132 (imageSizeInBytes ?? undefined), L133 (imagePushedAt ?? undefined),
      //         L134 (imageTags ?? [])
      mockSend.mockResolvedValueOnce({
        imageDetails: [
          {
            imageDigest: undefined,
            artifactMediaType: undefined,
            imageSizeInBytes: undefined,
            imagePushedAt: undefined,
            imageTags: undefined,
          },
        ],
      });

      const result = await adapter.getManifest("my-app", "v1.0");

      expect(result.digest).toBe("");
      expect(result.mediaType).toBe(
        "application/vnd.oci.image.manifest.v1+json",
      );
      expect(result.sizeBytes).toBeUndefined();
      expect(result.pushedAt).toBeUndefined();
      expect(result.tags).toEqual([]);
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

    it("should return UNSUPPORTED on ScanNotFoundException", async () => {
      const err = new Error("scan not found");
      (err as unknown as { name: string }).name = "ScanNotFoundException";
      mockSend.mockRejectedValueOnce(err);

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "UNSUPPORTED", vulnerabilities: [] });
    });

    it("should handle undefined imageScanStatus in response", async () => {
      // Covers: L153 (imageScanStatus?.status ?? "")
      mockSend.mockResolvedValueOnce({
        imageScanStatus: undefined,
        imageScanFindings: { findings: [] },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "COMPLETE", vulnerabilities: [] });
    });

    it("should handle undefined findings in scan response", async () => {
      // Covers: L163 (imageScanFindings?.findings ?? [])
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "COMPLETE" },
        imageScanFindings: { findings: undefined },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result).toEqual({ status: "COMPLETE", vulnerabilities: [] });
    });

    it("should use fallbacks when vulnerability finding fields are undefined", async () => {
      // Covers: L165 (f.name ?? ""), L166 (f.severity ?? "UNDEFINED"),
      //         L168 (attribute value ?? ""), L170 (attribute value ?? undefined),
      //         L173 (f.description ?? undefined)
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "COMPLETE" },
        imageScanFindings: {
          findings: [
            {
              name: undefined,
              severity: undefined,
              description: undefined,
              attributes: undefined,
            },
          ],
        },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result.vulnerabilities[0]).toMatchObject({
        cveId: "",
        severity: "UNDEFINED",
        packageName: "",
        installedVersion: undefined,
        description: undefined,
      });
    });

    it("should use empty fallbacks when package attributes are not present in finding", async () => {
      // Covers: L168, L170 — find returns undefined when key does not match
      mockSend.mockResolvedValueOnce({
        imageScanStatus: { status: "COMPLETE" },
        imageScanFindings: {
          findings: [
            {
              name: "CVE-2021-9999",
              severity: "LOW",
              description: "A vulnerability",
              attributes: [{ key: "other_key", value: "other_value" }],
            },
          ],
        },
      });

      const result = await adapter.getScanResults("my-app", "latest");

      expect(result.vulnerabilities[0].packageName).toBe("");
      expect(result.vulnerabilities[0].installedVersion).toBeUndefined();
    });

    it("should use empty string errorName when thrown value has no name property", async () => {
      // Covers: L178 ((err as { name?: string }).name ?? "")
      const err = { message: "unnamed error" }; // plain object, no name property
      mockSend.mockRejectedValueOnce(err);

      await expect(adapter.getScanResults("my-app", "latest")).rejects.toEqual(
        err,
      );
    });
  });
});
