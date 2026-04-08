import { ConfigService } from '@nestjs/config';
import { HarborAdapter } from '../adapters/harbor.adapter';
import { RegistryType } from '../enums/registry-type.enum';

describe('HarborAdapter', () => {
  let adapter: HarborAdapter;
  let configService: ConfigService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentials = JSON.stringify({
    username: 'admin',
    password: 'Harbor12345',
  });
  const mockBaseUrl = 'https://harbor.example.com';

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'registry.credentials') return mockCredentials;
        if (key === 'registry.url') return mockBaseUrl;
        return '';
      }),
    } as unknown as ConfigService;

    adapter = new HarborAdapter(configService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  /**
   * Helper to build a successful mock fetch response.
   */
  function okResponse(data: unknown): object {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    };
  }

  /**
   * Helper to build a failed mock fetch response.
   */
  function errResponse(status = 500): object {
    return { ok: false, status };
  }

  it('should have type HARBOR', () => {
    expect(adapter.type).toBe(RegistryType.HARBOR);
  });

  // ---------------------------------------------------------------------------
  // listRepositories
  // ---------------------------------------------------------------------------

  describe('listRepositories()', () => {
    it('should list projects then repos and return mapped RepositoryDto array', async () => {
      const fetchMock = jest
        .fn()
        // projects
        .mockResolvedValueOnce(okResponse([{ name: 'library', project_id: 1 }]))
        // repos for library
        .mockResolvedValueOnce(
          okResponse([
            { name: 'library/nginx', description: 'Nginx image' },
            { name: 'library/redis' },
          ]),
        );
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await adapter.listRepositories();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          name: 'library/nginx',
          uri: 'harbor.example.com/library/nginx',
          description: 'Nginx image',
        },
        {
          name: 'library/redis',
          uri: 'harbor.example.com/library/redis',
          description: undefined,
        },
      ]);
    });

    it('should propagate fetch error from projects endpoint', async () => {
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(errResponse(403)) as unknown as typeof globalThis.fetch;

      await expect(adapter.listRepositories()).rejects.toThrow(
        'Harbor request failed: HTTP 403',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // listTags
  // ---------------------------------------------------------------------------

  describe('listTags()', () => {
    it('should split project/repo and return tags from artifacts', async () => {
      const pushTime = '2024-06-01T12:00:00Z';
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse([
          {
            digest: 'sha256:abcdef',
            size: 4096,
            push_time: pushTime,
            tags: [{ name: 'latest' }, { name: 'v1.0' }],
          },
        ]),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags('library/nginx');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        tag: 'latest',
        digest: 'sha256:abcdef',
        sizeBytes: 4096,
      });
      expect(result[0].pushedAt).toEqual(new Date(pushTime));
      expect(result[1].tag).toBe('v1.0');
    });

    it('should fall back to digest-based tag when artifact has no tags', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse([
          {
            digest: 'sha256:deadbeef1234',
            // no tags array
          },
        ]),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.listTags('library/nginx');

      expect(result).toHaveLength(1);
      // digest.substring(7, 19) = 'deadbeef1234'
      expect(result[0].tag).toBe('deadbeef1234');
      expect(result[0].digest).toBe('sha256:deadbeef1234');
    });
  });

  // ---------------------------------------------------------------------------
  // getManifest
  // ---------------------------------------------------------------------------

  describe('getManifest()', () => {
    it('should return ManifestDto from artifact response', async () => {
      const pushTime = '2024-07-15T08:30:00Z';
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse({
          digest: 'sha256:cafebabe',
          media_type: 'application/vnd.oci.image.manifest.v1+json',
          size: 8192,
          push_time: pushTime,
          tags: [{ name: 'stable' }],
        }),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest('library/nginx', 'stable');

      expect(result).toEqual({
        digest: 'sha256:cafebabe',
        mediaType: 'application/vnd.oci.image.manifest.v1+json',
        sizeBytes: 8192,
        pushedAt: new Date(pushTime),
        tags: ['stable'],
      });
    });

    it('should use default media type when media_type is absent', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse({
          digest: 'sha256:00112233',
          tags: [],
        }),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.getManifest('library/nginx', 'latest');

      expect(result.mediaType).toBe(
        'application/vnd.docker.distribution.manifest.v2+json',
      );
      expect(result.tags).toEqual([]);
      expect(result.pushedAt).toBeUndefined();
      expect(result.sizeBytes).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getScanResults
  // ---------------------------------------------------------------------------

  describe('getScanResults()', () => {
    it('should parse vuln report, map severity, and return COMPLETE', async () => {
      const report = {
        'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0': {
          vulnerabilities: [
            {
              id: 'CVE-2023-1234',
              severity: 'High',
              package: 'openssl',
              version: '1.1.1',
              fix_version: '1.1.2',
              description: 'A vulnerability',
            },
            {
              id: 'CVE-2023-5678',
              severity: 'CRITICAL',
              package: 'curl',
            },
            {
              id: 'CVE-2023-9999',
              severity: 'negligible',
              package: 'bash',
            },
          ],
        },
      };

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(okResponse(report)) as unknown as typeof globalThis.fetch;

      const result = await adapter.getScanResults('library/nginx', 'latest');

      expect(result.status).toBe('COMPLETE');
      expect(result.vulnerabilities).toHaveLength(3);
      expect(result.vulnerabilities[0]).toMatchObject({
        cveId: 'CVE-2023-1234',
        severity: 'HIGH',
        packageName: 'openssl',
        installedVersion: '1.1.1',
        fixedVersion: '1.1.2',
        description: 'A vulnerability',
      });
      expect(result.vulnerabilities[1].severity).toBe('CRITICAL');
      expect(result.vulnerabilities[2].severity).toBe('INFORMATIONAL');
    });

    it('should return PENDING when vulnerabilities key is absent', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse({
          'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0': {
            scan_status: 'Running',
            // no vulnerabilities key
          },
        }),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.getScanResults('library/nginx', 'latest');

      expect(result).toEqual({ status: 'PENDING', vulnerabilities: [] });
    });

    it('should return FAILED on fetch error', async () => {
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(errResponse(404)) as unknown as typeof globalThis.fetch;

      const result = await adapter.getScanResults('library/nginx', 'missing');

      expect(result).toEqual({ status: 'FAILED', vulnerabilities: [] });
    });
  });

  // ---------------------------------------------------------------------------
  // listReplicationPolicies
  // ---------------------------------------------------------------------------

  describe('listReplicationPolicies()', () => {
    it('should return mapped policies with last execution status', async () => {
      const fetchMock = jest
        .fn()
        // policies
        .mockResolvedValueOnce(
          okResponse([
            {
              id: 1,
              name: 'push-to-ecr',
              src_registry: { name: 'local-harbor', url: 'https://harbor.example.com' },
              dest_registry: { name: 'ecr-prod', url: 'https://ecr.example.com' },
              filters: [
                { type: 'name', value: 'library/**' },
                { type: 'tag', value: 'latest' },
              ],
              trigger: { type: 'scheduled' },
              enabled: true,
            },
          ]),
        )
        // executions for policy 1
        .mockResolvedValueOnce(okResponse([{ status: 'succeed' }]));

      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await adapter.listReplicationPolicies();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'push-to-ecr',
        srcRegistry: 'local-harbor',
        destRegistry: 'ecr-prod',
        filters: ['library/**'],
        triggerType: 'scheduled',
        enabled: true,
        lastExecutionStatus: 'succeed',
      });
    });

    it('should handle missing execution history gracefully and set lastExecutionStatus to null', async () => {
      const fetchMock = jest
        .fn()
        // policies
        .mockResolvedValueOnce(
          okResponse([
            {
              id: 2,
              name: 'backup-policy',
              src_registry: null,
              dest_registry: { url: 'https://backup.example.com' },
              filters: [],
              trigger: null,
              enabled: false,
            },
          ]),
        )
        // executions endpoint fails
        .mockResolvedValueOnce(errResponse(500));

      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await adapter.listReplicationPolicies();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 2,
        name: 'backup-policy',
        srcRegistry: 'local',
        destRegistry: 'https://backup.example.com',
        filters: [],
        triggerType: 'manual',
        enabled: false,
        lastExecutionStatus: null,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // mapSeverity (tested via getScanResults public method)
  // ---------------------------------------------------------------------------

  describe('mapSeverity edge cases', () => {
    it('should map NEGLIGIBLE to INFORMATIONAL', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse({
          'report/v1': {
            vulnerabilities: [{ id: 'CVE-X', severity: 'NEGLIGIBLE', package: 'pkg' }],
          },
        }),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.getScanResults('proj/repo', 'tag');

      expect(result.vulnerabilities[0].severity).toBe('INFORMATIONAL');
    });

    it('should map unknown severity to UNDEFINED', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce(
        okResponse({
          'report/v1': {
            vulnerabilities: [{ id: 'CVE-Y', severity: 'EXOTIC', package: 'pkg' }],
          },
        }),
      ) as unknown as typeof globalThis.fetch;

      const result = await adapter.getScanResults('proj/repo', 'tag');

      expect(result.vulnerabilities[0].severity).toBe('UNDEFINED');
    });
  });
});
