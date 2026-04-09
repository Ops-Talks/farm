import { ConfigService } from "@nestjs/config";
import { GoogleAuth } from "google-auth-library";
import { GcrAdapter } from "../adapters/gcr.adapter";
import { RegistryType } from "../enums/registry-type.enum";

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: jest.fn().mockResolvedValue("mock-gcp-token"),
  })),
}));

describe("GcrAdapter", () => {
  let adapter: GcrAdapter;
  let configService: ConfigService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentials = JSON.stringify({
    project_id: "my-project",
    type: "service_account",
    client_email: "test@my-project.iam.gserviceaccount.com",
    private_key: "fake-key",
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "registry.credentials") return mockCredentials;
        if (key === "registry.url") return "us-central1";
        return "";
      }),
    } as unknown as ConfigService;

    adapter = new GcrAdapter(configService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should have type GCR", () => {
    expect(adapter.type).toBe(RegistryType.GCR);
  });

  describe("constructor branch coverage", () => {
    it("should use empty defaults when registry.credentials and registry.url return null", () => {
      // Covers: L80 (?? ""), L81 (?? "us-central1"), L84 (falsy → skip JSON parse)
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials") return null;
          if (key === "registry.url") return null;
          return null;
        }),
      } as unknown as ConfigService;

      expect(() => new GcrAdapter(cs)).not.toThrow();
    });

    it("should use empty projectId when credentials JSON has no project_id field", () => {
      // Covers: L92 (parsed.project_id ?? "")
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials")
            return JSON.stringify({ type: "service_account" });
          if (key === "registry.url") return "us-central1";
          return "";
        }),
      } as unknown as ConfigService;

      expect(() => new GcrAdapter(cs)).not.toThrow();
    });

    it("should log error and continue when credentials JSON is invalid", () => {
      // Covers: constructor try/catch — invalid JSON triggers logger.error
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials") return "not-valid-json{{{";
          if (key === "registry.url") return "us-central1";
          return "";
        }),
      } as unknown as ConfigService;

      expect(() => new GcrAdapter(cs)).not.toThrow();
    });
  });

  describe("listRepositories()", () => {
    it("should return repositories from Artifact Registry", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            repositories: [
              {
                name: "projects/my-project/locations/us-central1/repositories/my-repo",
                format: "DOCKER",
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([
        {
          name: "my-repo",
          uri: "projects/my-project/locations/us-central1/repositories/my-repo",
          description: undefined,
        },
      ]);
    });

    it("should return empty array when no repositories exist", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it("should throw on HTTP error", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      }) as unknown as typeof globalThis.fetch;

      await expect(adapter.listRepositories()).rejects.toThrow();
    });

    it("should handle missing repositories field in API response", async () => {
      // Covers: L135 (data.repositories ?? [])
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it("should use empty string description when repository description is undefined", async () => {
      // Covers: L139 (r.description ?? undefined)
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            repositories: [
              {
                name: "projects/my-project/locations/us-central1/repositories/my-repo",
                format: "DOCKER",
                description: undefined,
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result[0].description).toBeUndefined();
    });

    it("should return empty string token when getAccessToken returns null", async () => {
      // Covers: L104 (token ?? "")
      (GoogleAuth as jest.Mock).mockImplementationOnce(() => ({
        getAccessToken: jest.fn().mockResolvedValueOnce(null),
      }));

      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });
  });

  describe("listTags()", () => {
    it("should return tags for a repository", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tags: [
              {
                name: "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/tags/latest",
                version: "sha256:abc",
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags(
        "projects/my-project/locations/us-central1/repositories/my-repo",
      );

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("latest");
      expect(result[0].digest).toBe("sha256:abc");
    });

    it("should return empty array when no tags exist", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags(
        "projects/my-project/locations/us-central1/repositories/my-repo",
      );

      expect(result).toEqual([]);
    });

    it("should handle missing tags field in API response", async () => {
      // Covers: L154 (data.tags ?? [])
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags(
        "projects/my-project/locations/us-central1/repositories/my-repo",
      );

      expect(result).toEqual([]);
    });

    it("should return undefined digest when version field is absent", async () => {
      // Covers: L156 (t.version ?? undefined)
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tags: [
              {
                name: "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/tags/v1.0",
                version: null,
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags(
        "projects/my-project/locations/us-central1/repositories/my-repo",
      );

      expect(result[0].digest).toBeUndefined();
    });
  });

  describe("getManifest()", () => {
    it("should return manifest for a specific version", async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc",
            createTime: "2024-01-01T00:00:00Z",
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest(
        "projects/my-project/locations/us-central1/repositories/my-repo",
        "sha256:abc",
      );

      expect(result.digest).toBe(
        "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc",
      );
      expect(result.tags).toContain("sha256:abc");
    });

    it("should return undefined pushedAt when createTime is absent", async () => {
      // Covers: L172 (createTime falsy → undefined)
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc",
            createTime: null,
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest(
        "projects/my-project/locations/us-central1/repositories/my-repo",
        "sha256:abc",
      );

      expect(result.pushedAt).toBeUndefined();
    });

    it("should use explicit mediaType when metadata provides one", async () => {
      // Covers: L170 left side (data.metadata?.mediaType is defined)
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc",
            createTime: "2024-01-01T00:00:00Z",
            metadata: {
              mediaType: "application/vnd.docker.distribution.manifest.v2+json",
            },
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest(
        "projects/my-project/locations/us-central1/repositories/my-repo",
        "sha256:abc",
      );

      expect(result.mediaType).toBe(
        "application/vnd.docker.distribution.manifest.v2+json",
      );
    });
  });

  describe("getScanResults()", () => {
    it("should always return UNSUPPORTED", async () => {
      const result = await adapter.getScanResults("my-repo", "latest");

      expect(result).toEqual({ status: "UNSUPPORTED", vulnerabilities: [] });
    });
  });
});
