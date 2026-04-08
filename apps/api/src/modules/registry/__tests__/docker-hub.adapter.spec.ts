import { ConfigService } from '@nestjs/config';
import { DockerHubAdapter } from '../adapters/docker-hub.adapter';
import { RegistryType } from '../enums/registry-type.enum';

describe('DockerHubAdapter', () => {
  let adapter: DockerHubAdapter;
  let configService: ConfigService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentials = JSON.stringify({
    username: 'testuser',
    password: 'testpassword',
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'registry.credentials') return mockCredentials;
        if (key === 'registry.url') return '';
        return '';
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
      json: () => Promise.resolve({ token: 'mock-token' }),
    };
    const mocked = jest
      .fn()
      .mockResolvedValueOnce(loginResponse);
    for (const r of responses) {
      mocked.mockResolvedValueOnce(r);
    }
    globalThis.fetch = mocked as unknown as typeof globalThis.fetch;
  }

  it('should have type DOCKER_HUB', () => {
    expect(adapter.type).toBe(RegistryType.DOCKER_HUB);
  });

  describe('listRepositories()', () => {
    it('should authenticate and return repositories', async () => {
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                name: 'my-app',
                namespace: 'testuser',
                description: 'My application',
              },
            ],
          }),
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([
        { name: 'my-app', uri: 'testuser/my-app', description: 'My application' },
      ]);
    });

    it('should return empty array when no repositories exist', async () => {
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it('should cache the auth token and not re-authenticate on subsequent calls', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });

      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      await adapter.listRepositories();
      await adapter.listRepositories();

      // Login should only be called once (first call)
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should refresh token on 401 and retry', async () => {
      const fetchMock = jest.fn()
        // First login
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'old-token' }),
        })
        // First request returns 401
        .mockResolvedValueOnce({ ok: false, status: 401 })
        // Re-authentication
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'new-token' }),
        })
        // Retry request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [{ name: 'my-app', namespace: 'testuser' }] }),
        });

      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('listTags()', () => {
    it('should return tags for a repository', async () => {
      const pushedAt = '2024-01-01T00:00:00Z';
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                name: 'latest',
                digest: 'sha256:abc',
                last_pushed: pushedAt,
                full_size: 1024,
              },
            ],
          }),
      });

      const result = await adapter.listTags('testuser/my-app');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        tag: 'latest',
        digest: 'sha256:abc',
        sizeBytes: 1024,
      });
      expect(result[0].pushedAt).toEqual(new Date(pushedAt));
    });

    it('should return empty array when no tags exist', async () => {
      mockFetchWithLogin({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const result = await adapter.listTags('testuser/my-app');

      expect(result).toEqual([]);
    });
  });

  describe('getManifest()', () => {
    it('should return manifest for a specific tag', async () => {
      const pushedAt = '2024-01-01T00:00:00Z';
      mockFetchWithLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'v1.0',
            digest: 'sha256:abc',
            last_pushed: pushedAt,
            full_size: 2048,
          }),
      });

      const result = await adapter.getManifest('testuser/my-app', 'v1.0');

      expect(result).toMatchObject({
        digest: 'sha256:abc',
        mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
        sizeBytes: 2048,
        tags: ['v1.0'],
      });
    });
  });

  describe('getScanResults()', () => {
    it('should always return UNSUPPORTED', async () => {
      const result = await adapter.getScanResults('testuser/my-app', 'latest');

      expect(result).toEqual({ status: 'UNSUPPORTED', vulnerabilities: [] });
    });
  });
});
