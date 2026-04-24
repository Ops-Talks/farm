import { ConfigService } from "@nestjs/config";
import { DockerHubAdapter } from "../adapters/docker-hub.adapter";
import { RegistryType } from "../enums/registry-type.enum";

describe("DockerHubAdapter", () => {
  let adapter: DockerHubAdapter;
  let configService: ConfigService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentials = JSON.stringify({
    username: "testuser",
    password: "testpassword",
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "registry.credentials") return mockCredentials;
        if (key === "registry.url") return "";
        return "";
      }),
    } as unknown as ConfigService;

    adapter = new DockerHubAdapter(configService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  /**
   * Helper that mocks fetch to first respond with the login token, then
   * with subsequent response(s).
   */
  function mockFetchWithLogin(...responses: object[]): void {
    const loginResponse = {
      ok: true,
      json: () => Promise.resolve({ token: "mock-token" }),
    };
    const mocked = jest.fn().mockResolvedValueOnce(loginResponse);
    for (const r of responses) {
      mocked.mockResolvedValueOnce(r);
    }
    globalThis.fetch = mocked;
  }

  it("should have type DOCKER_HUB", () => {
    expect(adapter.type).toBe(RegistryType.DOCKER_HUB);
  });

  describe("constructor branch coverage", () => {
    it("should use default credentials when registry.credentials config returns null", () => {
      // Covers: L97 (?? ""), L98 (falsy → default creds)
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials") return null;
          if (key === "registry.url") return "https://hub.docker.com";
          return null;
        }),
      } as unknown as ConfigService;

      const newAdapter = new DockerHubAdapter(cs);

      expect(newAdapter.type).toBe(RegistryType.DOCKER_HUB);
    });

    it("should use default credentials when registry.credentials is empty string", () => {
      // Covers: L98 (falsy "" → default creds)
      const cs = {
        get: jest.fn((key: string) => {
          if (key === "registry.credentials") return "";
          if (key === "registry.url") return "https://hub.docker.com";
          return "";
        }),
      } as unknown as ConfigService;

      const newAdapter = new DockerHubAdapter(cs);

      expect(newAdapter.type).toBe(RegistryType.DOCKER_HUB);
    });
  });

  describe("listRepositories()", () => {
    it("should authenticate and return repositories", async () => {
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                name: "my-app",
                namespace: "testuser",
                description: "My application",
              },
            ],
          }),
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([
        {
          name: "my-app",
          uri: "testuser/my-app",
          description: "My application",
        },
      ]);
    });

    it("should return empty array when no repositories exist", async () => {
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it("should cache the auth token and not re-authenticate on subsequent calls", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "mock-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      globalThis.fetch = fetchMock;

      await adapter.listRepositories();
      await adapter.listRepositories();

      // Login should only be called once (first call)
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("should refresh token on 401 and retry", async () => {
      const fetchMock = jest
        .fn()
        // First login
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "old-token" }),
        })
        // First request returns 401
        .mockResolvedValueOnce({ ok: false, status: 401 })
        // Re-authentication
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "new-token" }),
        })
        // Retry request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [{ name: "my-app", namespace: "testuser" }],
            }),
        });

      globalThis.fetch = fetchMock;

      const result = await adapter.listRepositories();

      expect(result).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("should throw when Docker Hub authentication fails", async () => {
      // Covers: L120 (if (!response.ok) true branch in authenticate())
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(adapter.listRepositories()).rejects.toThrow(
        "Docker Hub authentication failed: HTTP 403",
      );
    });

    it("should throw when API request fails with non-401 status", async () => {
      // Covers: L158 (if (!response.ok) true branch in fetchJson())
      mockFetchWithLogin({
        ok: false,
        status: 500,
      });

      await expect(adapter.listRepositories()).rejects.toThrow(
        "Docker Hub request failed: HTTP 500",
      );
    });

    it("should use empty Authorization header when token is null after login", async () => {
      // Covers: L135 (this.authToken ?? "")
      globalThis.fetch = jest
        .fn()
        // Login returns null token
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: null }),
        })
        // Subsequent API call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it("should handle null results field in repositories response", async () => {
      // Covers: L174 (data.results ?? [])
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: null }),
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });
  });

  describe("listTags()", () => {
    it("should return tags for a repository", async () => {
      const pushedAt = "2024-01-01T00:00:00Z";
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                name: "latest",
                digest: "sha256:abc",
                last_pushed: pushedAt,
                full_size: 1024,
              },
            ],
          }),
      });

      const result = await adapter.listTags("testuser/my-app");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        tag: "latest",
        digest: "sha256:abc",
        sizeBytes: 1024,
      });
      expect(result[0].pushedAt).toEqual(new Date(pushedAt));
    });

    it("should return empty array when no tags exist", async () => {
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.listTags("testuser/my-app");

      expect(result).toEqual([]);
    });

    it("should handle null results field in tags response", async () => {
      // Covers: L193 (data.results ?? [])
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: null }),
      });

      const result = await adapter.listTags("testuser/my-app");

      expect(result).toEqual([]);
    });

    it("should use undefined fallbacks when tag fields are null", async () => {
      // Covers: L195 (t.digest ?? undefined), L196 (last_pushed falsy → undefined),
      //         L197 (t.full_size ?? undefined)
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                name: "latest",
                digest: null,
                last_pushed: null,
                full_size: null,
              },
            ],
          }),
      });

      const result = await adapter.listTags("testuser/my-app");

      expect(result[0]).toEqual({
        tag: "latest",
        digest: undefined,
        pushedAt: undefined,
        sizeBytes: undefined,
      });
    });
  });

  describe("getManifest()", () => {
    it("should return manifest for a specific tag", async () => {
      const pushedAt = "2024-01-01T00:00:00Z";
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "v1.0",
            digest: "sha256:abc",
            last_pushed: pushedAt,
            full_size: 2048,
          }),
      });

      const result = await adapter.getManifest("testuser/my-app", "v1.0");

      expect(result).toMatchObject({
        digest: "sha256:abc",
        mediaType: "application/vnd.docker.distribution.manifest.v2+json",
        sizeBytes: 2048,
        tags: ["v1.0"],
      });
    });

    it("should fall back to images[0].digest when top-level digest is null", async () => {
      // Covers: L209 second branch (data.images?.[0]?.digest)
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "v1.0",
            digest: null,
            last_pushed: "2024-01-01T00:00:00Z",
            full_size: 1024,
            images: [{ digest: "sha256:fallback", os: "linux" }],
          }),
      });

      const result = await adapter.getManifest("testuser/my-app", "v1.0");

      expect(result.digest).toBe("sha256:fallback");
    });

    it("should use empty string digest when both digest and images are unavailable", async () => {
      // Covers: L209 third branch ("" fallback), L211 (full_size ?? undefined),
      //         L212 (last_pushed falsy → undefined)
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "v1.0",
            digest: null,
            last_pushed: null,
            full_size: null,
            images: [],
          }),
      });

      const result = await adapter.getManifest("testuser/my-app", "v1.0");

      expect(result.digest).toBe("");
      expect(result.sizeBytes).toBeUndefined();
      expect(result.pushedAt).toBeUndefined();
    });

    it("should use empty string digest when digest is null and images field is absent", async () => {
      // Covers: L209 — images is undefined so ?.[0] is undefined
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "v1.0",
            digest: null,
            images: undefined,
          }),
      });

      const result = await adapter.getManifest("testuser/my-app", "v1.0");

      expect(result.digest).toBe("");
    });
  });

  describe("getScanResults()", () => {
    it("should always return UNSUPPORTED", async () => {
      const result = await adapter.getScanResults("testuser/my-app", "latest");

      expect(result).toEqual({ status: "UNSUPPORTED", vulnerabilities: [] });
    });
  });
});
