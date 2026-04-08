import { ConfigService } from '@nestjs/config';
import { GcrAdapter } from '../adapters/gcr.adapter';
import { RegistryType } from '../enums/registry-type.enum';

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: jest.fn().mockResolvedValue('mock-gcp-token'),
  })),
}));

describe('GcrAdapter', () => {
  let adapter: GcrAdapter;
  let configService: ConfigService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentials = JSON.stringify({
    project_id: 'my-project',
    type: 'service_account',
    client_email: 'test@my-project.iam.gserviceaccount.com',
    private_key: 'fake-key',
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'registry.credentials') return mockCredentials;
        if (key === 'registry.url') return 'us-central1';
        return '';
      }),
    } as unknown as ConfigService;

    adapter = new GcrAdapter(configService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should have type GCR', () => {
    expect(adapter.type).toBe(RegistryType.GCR);
  });

  describe('listRepositories()', () => {
    it('should return repositories from Artifact Registry', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            repositories: [
              {
                name: 'projects/my-project/locations/us-central1/repositories/my-repo',
                format: 'DOCKER',
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([
        {
          name: 'my-repo',
          uri: 'projects/my-project/locations/us-central1/repositories/my-repo',
          description: undefined,
        },
      ]);
    });

    it('should return empty array when no repositories exist', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ repositories: [] }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(result).toEqual([]);
    });

    it('should throw on HTTP error', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      }) as unknown as typeof globalThis.fetch;

      await expect(adapter.listRepositories()).rejects.toThrow();
    });
  });

  describe('listTags()', () => {
    it('should return tags for a repository', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tags: [
              {
                name: 'projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/tags/latest',
                version: 'sha256:abc',
              },
            ],
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags(
        'projects/my-project/locations/us-central1/repositories/my-repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('latest');
      expect(result[0].digest).toBe('sha256:abc');
    });

    it('should return empty array when no tags exist', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags('projects/my-project/locations/us-central1/repositories/my-repo');

      expect(result).toEqual([]);
    });
  });

  describe('getManifest()', () => {
    it('should return manifest for a specific version', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc',
            createTime: '2024-01-01T00:00:00Z',
          }),
      }) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest(
        'projects/my-project/locations/us-central1/repositories/my-repo',
        'sha256:abc',
      );

      expect(result.digest).toBe(
        'projects/my-project/locations/us-central1/repositories/my-repo/packages/my-app/versions/sha256:abc',
      );
      expect(result.tags).toContain('sha256:abc');
    });
  });

  describe('getScanResults()', () => {
    it('should always return UNSUPPORTED', async () => {
      const result = await adapter.getScanResults('my-repo', 'latest');

      expect(result).toEqual({ status: 'UNSUPPORTED', vulnerabilities: [] });
    });
  });
});
