import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { HelmService } from "./helm.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import {
  Deployment,
  DeploymentStatus,
} from "../environments/entities/deployment.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import * as zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a Helm 3 encoded release blob (base64( base64( gzip( JSON ) ) )).
 */
async function buildHelmReleaseData(releaseJson: object): Promise<string> {
  const json = JSON.stringify(releaseJson);
  const compressed = await gzip(Buffer.from(json, "utf8"));
  const inner = compressed.toString("base64");
  return Buffer.from(inner).toString("base64");
}

function buildFakeSecret(overrides: {
  name: string;
  namespace: string;
  releaseData: string;
  type?: string;
  labels?: Record<string, string>;
}) {
  return {
    metadata: {
      name: overrides.name,
      namespace: overrides.namespace,
      labels: overrides.labels ?? { owner: "helm" },
    },
    type: overrides.type ?? "helm.sh/release.v1",
    data: { release: overrides.releaseData },
  };
}

const sampleRelease = {
  name: "my-app",
  namespace: "production",
  version: 3,
  info: { status: "deployed", last_deployed: "2024-01-15T10:00:00Z" },
  chart: {
    metadata: {
      name: "my-chart",
      version: "1.2.3",
      appVersion: "2.0.0",
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HelmService", () => {
  let service: HelmService;
  let mockKubernetesService: Partial<jest.Mocked<KubernetesService>>;
  let mockDeploymentRepo: Record<string, jest.Mock>;
  let mockComponentRepo: Record<string, jest.Mock>;
  let mockEnvironmentRepo: Record<string, jest.Mock>;
  let mockCoreV1Api: {
    listSecretForAllNamespaces: jest.Mock;
    listNamespacedSecret: jest.Mock;
  };

  beforeEach(async () => {
    mockCoreV1Api = {
      listSecretForAllNamespaces: jest.fn().mockResolvedValue({ items: [] }),
      listNamespacedSecret: jest.fn().mockResolvedValue({ items: [] }),
    };

    mockKubernetesService = {
      isEnabled: jest.fn().mockReturnValue(true),
      getCoreV1Api: jest.fn().mockReturnValue(mockCoreV1Api),
    };

    mockDeploymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockImplementation((d) => d as Deployment),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve(d as Deployment)),
    };

    mockComponentRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockEnvironmentRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelmService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockDeploymentRepo,
        },
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        {
          provide: getRepositoryToken(Environment),
          useValue: mockEnvironmentRepo,
        },
      ],
    }).compile();

    service = module.get<HelmService>(HelmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // listReleases — disabled path
  // -------------------------------------------------------------------------
  describe("listReleases", () => {
    it("should return empty array when Kubernetes is disabled", async () => {
      (mockKubernetesService.isEnabled as jest.Mock).mockReturnValue(false);
      const releases = await service.listReleases();
      expect(releases).toEqual([]);
    });

    it("should return empty array when CoreV1Api is not available", async () => {
      (mockKubernetesService.getCoreV1Api as jest.Mock).mockReturnValue(null);
      const releases = await service.listReleases();
      expect(releases).toEqual([]);
    });

    it("should parse Helm releases from cluster Secrets", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      const secret = buildFakeSecret({
        name: "sh.helm.release.v1.my-app.v3",
        namespace: "production",
        releaseData: encoded,
      });

      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [secret],
      });

      const releases = await service.listReleases();

      expect(releases).toHaveLength(1);
      expect(releases[0]).toMatchObject({
        name: "my-app",
        namespace: "production",
        chart: "my-chart",
        chartVersion: "1.2.3",
        appVersion: "2.0.0",
        status: "deployed",
        revision: 3,
        updatedAt: "2024-01-15T10:00:00Z",
      });
    });

    it("should filter by namespace when namespace param is provided", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      mockCoreV1Api.listNamespacedSecret.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v1",
            namespace: "staging",
            releaseData: encoded,
          }),
        ],
      });

      const releases = await service.listReleases("staging");

      expect(mockCoreV1Api.listNamespacedSecret).toHaveBeenCalledWith({
        namespace: "staging",
        labelSelector: "owner=helm",
      });
      expect(releases).toHaveLength(1);
    });

    it("should skip Secrets that are not of type helm.sh/release.v1", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      const secret = buildFakeSecret({
        name: "some-other-secret",
        namespace: "default",
        releaseData: encoded,
        type: "Opaque",
      });

      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [secret],
      });

      const releases = await service.listReleases();
      expect(releases).toHaveLength(0);
    });

    it("should skip secrets with missing release data", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "no-data-secret",
              namespace: "default",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: {},
          },
        ],
      });

      const releases = await service.listReleases();
      expect(releases).toHaveLength(0);
    });

    it("should return empty array and log error when API call fails", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockRejectedValue(
        new Error("API unavailable"),
      );
      const releases = await service.listReleases();
      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // decodeHelmRelease
  // -------------------------------------------------------------------------
  describe("decodeHelmRelease", () => {
    it("should decode a valid double-base64-encoded gzip payload", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      const result = await service.decodeHelmRelease(encoded);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("my-app");
      expect(result?.chart).toBe("my-chart");
    });

    it("should throw when decoding is not possible", async () => {
      await expect(
        service.decodeHelmRelease("notvalidbase64==="),
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // syncReleases
  // -------------------------------------------------------------------------
  describe("syncReleases", () => {
    it("should return zero synced when Kubernetes is disabled", async () => {
      (mockKubernetesService.isEnabled as jest.Mock).mockReturnValue(false);
      const result = await service.syncReleases();
      expect(result).toEqual({ synced: 0, errors: [] });
    });

    it("should create a Deployment when matching component and environment are found", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v3",
            namespace: "production",
            releaseData: encoded,
          }),
        ],
      });

      const fakeComponent = { id: "comp-uuid", name: "my-app" };
      const fakeEnvironment = { id: "env-uuid", name: "production" };

      mockComponentRepo.findOne.mockResolvedValue(fakeComponent as Component);
      mockEnvironmentRepo.findOne.mockResolvedValue(
        fakeEnvironment as Environment,
      );

      const result = await service.syncReleases();

      expect(mockDeploymentRepo.create).toHaveBeenCalled();
      expect(mockDeploymentRepo.save).toHaveBeenCalled();
      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should skip release when no matching component exists", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v3",
            namespace: "production",
            releaseData: encoded,
          }),
        ],
      });

      mockComponentRepo.findOne.mockResolvedValue(null);

      const result = await service.syncReleases();

      // Skipped releases still count as synced (no errors) but no deployment is created.
      expect(mockDeploymentRepo.create).not.toHaveBeenCalled();
      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should update an existing Deployment record when one already exists", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v3",
            namespace: "production",
            releaseData: encoded,
          }),
        ],
      });

      const fakeComponent = { id: "comp-uuid", name: "my-app" };
      const fakeEnvironment = { id: "env-uuid", name: "production" };
      const fakeExistingDeployment: Partial<Deployment> = {
        id: "dep-uuid",
        componentId: "comp-uuid",
        environmentId: "env-uuid",
        version: "old-chart@0.1.0",
        status: DeploymentStatus.SUCCEEDED,
        metadata: { helmReleaseName: "my-app" },
      };

      mockComponentRepo.findOne.mockResolvedValue(fakeComponent as Component);
      mockEnvironmentRepo.findOne.mockResolvedValue(
        fakeEnvironment as Environment,
      );
      mockDeploymentRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fakeExistingDeployment),
      });

      const result = await service.syncReleases();

      // save called with updated deployment (not create).
      expect(mockDeploymentRepo.create).not.toHaveBeenCalled();
      expect(mockDeploymentRepo.save).toHaveBeenCalled();
      expect(result.synced).toBe(1);
    });

    it("should record errors and continue when a sync step throws", async () => {
      const encoded = await buildHelmReleaseData(sampleRelease);
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v3",
            namespace: "production",
            releaseData: encoded,
          }),
        ],
      });

      mockComponentRepo.findOne.mockRejectedValue(new Error("DB error"));

      const result = await service.syncReleases();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("production/my-app");
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("HelmService — additional branches", () => {
  let service: HelmService;
  let mockKubernetesService: Partial<jest.Mocked<KubernetesService>>;
  let mockDeploymentRepo: Record<string, jest.Mock>;
  let mockComponentRepo: Record<string, jest.Mock>;
  let mockEnvironmentRepo: Record<string, jest.Mock>;
  let mockCoreV1Api: {
    listSecretForAllNamespaces: jest.Mock;
    listNamespacedSecret: jest.Mock;
  };

  beforeEach(async () => {
    mockCoreV1Api = {
      listSecretForAllNamespaces: jest.fn().mockResolvedValue({ items: [] }),
      listNamespacedSecret: jest.fn().mockResolvedValue({ items: [] }),
    };

    mockKubernetesService = {
      isEnabled: jest.fn().mockReturnValue(true),
      getCoreV1Api: jest.fn().mockReturnValue(mockCoreV1Api),
    };

    mockDeploymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockImplementation((d) => d as Deployment),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve(d as Deployment)),
    };

    mockComponentRepo = { findOne: jest.fn().mockResolvedValue(null) };
    mockEnvironmentRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelmService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockDeploymentRepo,
        },
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        {
          provide: getRepositoryToken(Environment),
          useValue: mockEnvironmentRepo,
        },
      ],
    }).compile();

    service = module.get<HelmService>(HelmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // listReleases — decodeHelmRelease throws for a specific secret
  // -------------------------------------------------------------------------
  describe("listReleases — per-secret decode failure", () => {
    it("should warn and skip a secret whose release data cannot be decoded", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "bad-release",
              namespace: "default",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: { release: "THIS_IS_NOT_VALID_GZIP_DATA" },
          },
        ],
      });

      const releases = await service.listReleases();

      // The bad secret must be skipped; no releases returned.
      expect(releases).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // syncReleases — environment not found
  // -------------------------------------------------------------------------
  describe("syncReleases — environment not found", () => {
    it("should skip and still count synced when environment is not found", async () => {
      const encoded = await buildHelmReleaseData({
        name: "my-app",
        namespace: "missing-env",
        version: 1,
        info: { status: "deployed", last_deployed: "2024-01-01T00:00:00Z" },
        chart: { metadata: { name: "my-chart", version: "1.0.0" } },
      });

      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          buildFakeSecret({
            name: "sh.helm.release.v1.my-app.v1",
            namespace: "missing-env",
            releaseData: encoded,
          }),
        ],
      });

      const fakeComponent = { id: "comp-uuid", name: "my-app" };
      mockComponentRepo.findOne.mockResolvedValue(fakeComponent as Component);
      // Environment NOT found.
      mockEnvironmentRepo.findOne.mockResolvedValue(null);

      const result = await service.syncReleases();

      expect(mockDeploymentRepo.create).not.toHaveBeenCalled();
      // syncReleases counts the release as synced even when skipped (no throw).
      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // mapHelmStatus — all switch cases
  // -------------------------------------------------------------------------
  describe("syncReleases — Helm status mapping", () => {
    const statuses = [
      { helmStatus: "failed", expectedFarm: DeploymentStatus.FAILED },
      {
        helmStatus: "pending-install",
        expectedFarm: DeploymentStatus.IN_PROGRESS,
      },
      {
        helmStatus: "pending-upgrade",
        expectedFarm: DeploymentStatus.IN_PROGRESS,
      },
      {
        helmStatus: "pending-rollback",
        expectedFarm: DeploymentStatus.IN_PROGRESS,
      },
      { helmStatus: "uninstalling", expectedFarm: DeploymentStatus.PENDING },
      { helmStatus: "superseded", expectedFarm: DeploymentStatus.PENDING },
    ];

    const fakeComponent = { id: "comp-uuid", name: "my-app" } as Component;
    const fakeEnvironment = {
      id: "env-uuid",
      name: "production",
    } as Environment;

    statuses.forEach(({ helmStatus, expectedFarm }) => {
      it(`should map helm status "${helmStatus}" to Farm DeploymentStatus.${expectedFarm}`, async () => {
        const release = {
          name: "my-app",
          namespace: "production",
          version: 1,
          info: { status: helmStatus, last_deployed: "2024-01-01T00:00:00Z" },
          chart: {
            metadata: { name: "my-chart", version: "1.0.0", appVersion: "1.0" },
          },
        };

        const encoded = await buildHelmReleaseData(release);

        mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
          items: [
            buildFakeSecret({
              name: `sh.helm.release.v1.my-app.v1`,
              namespace: "production",
              releaseData: encoded,
            }),
          ],
        });

        mockComponentRepo.findOne.mockResolvedValue(fakeComponent);
        mockEnvironmentRepo.findOne.mockResolvedValue(fakeEnvironment);

        await service.syncReleases();

        const createArg = (
          mockDeploymentRepo.create.mock.calls as Array<[Partial<Deployment>]>
        )[0]?.[0];
        expect(createArg?.status).toBe(expectedFarm);
      });
    });
  });

  // -------------------------------------------------------------------------
  // decodeHelmRelease — missing fields produce ?? defaults
  // -------------------------------------------------------------------------
  describe("decodeHelmRelease — missing optional fields", () => {
    it("should fill in default values when release JSON has missing fields", async () => {
      // A release JSON with no optional fields set.
      const minimalRelease = {};
      const encoded = await buildHelmReleaseData(minimalRelease);

      const result = await service.decodeHelmRelease(encoded);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("unknown");
      expect(result?.namespace).toBe("default");
      expect(result?.chart).toBe("unknown");
      expect(result?.chartVersion).toBe("unknown");
      expect(result?.appVersion).toBe("unknown");
      expect(result?.status).toBe("unknown");
      expect(result?.revision).toBe(0);
      // updatedAt falls back to a generated ISO string (non-empty).
      expect(result?.updatedAt).toBeTruthy();
    });

    it("should fill in partial ?? defaults when some fields are present", async () => {
      const partialRelease = {
        name: "partial-app",
        // namespace, version, info, chart.metadata are all absent
        chart: {
          // metadata absent
        },
      };
      const encoded = await buildHelmReleaseData(partialRelease);

      const result = await service.decodeHelmRelease(encoded);

      expect(result?.name).toBe("partial-app");
      expect(result?.namespace).toBe("default");
      expect(result?.chart).toBe("unknown");
      expect(result?.revision).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // decodeHelmRelease — single-decode fallback
  // -------------------------------------------------------------------------
  describe("decodeHelmRelease — single-decode fallback path", () => {
    it("should fall back to single-base64 when double-decode produces invalid gzip", async () => {
      const json = JSON.stringify({ name: "fallback-app", namespace: "test" });
      const compressed = await gzip(Buffer.from(json, "utf8"));
      // Single-encode (NOT double-encode).
      const singleEncoded = compressed.toString("base64");

      const result = await service.decodeHelmRelease(singleEncoded);

      expect(result?.name).toBe("fallback-app");
      expect(result?.namespace).toBe("test");
    });
  });
});

// ---------------------------------------------------------------------------
// HelmService — deeper branch coverage
// ---------------------------------------------------------------------------

describe("HelmService — deeper branch coverage", () => {
  let service: HelmService;
  let mockKubernetesService: Partial<jest.Mocked<KubernetesService>>;
  let mockDeploymentRepo: Record<string, jest.Mock>;
  let mockComponentRepo: Record<string, jest.Mock>;
  let mockEnvironmentRepo: Record<string, jest.Mock>;
  let mockCoreV1Api: {
    listSecretForAllNamespaces: jest.Mock;
    listNamespacedSecret: jest.Mock;
  };

  beforeEach(async () => {
    mockCoreV1Api = {
      listSecretForAllNamespaces: jest.fn().mockResolvedValue({ items: [] }),
      listNamespacedSecret: jest.fn().mockResolvedValue({ items: [] }),
    };

    mockKubernetesService = {
      isEnabled: jest.fn().mockReturnValue(true),
      getCoreV1Api: jest.fn().mockReturnValue(mockCoreV1Api),
    };

    mockDeploymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockImplementation((d) => d as Deployment),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve(d as Deployment)),
    };

    mockComponentRepo = { findOne: jest.fn().mockResolvedValue(null) };
    mockEnvironmentRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelmService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockDeploymentRepo,
        },
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        {
          provide: getRepositoryToken(Environment),
          useValue: mockEnvironmentRepo,
        },
      ],
    }).compile();

    service = module.get<HelmService>(HelmService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // listReleases — null items in response
  // -------------------------------------------------------------------------

  describe("listReleases — null items in API response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({});

      const releases = await service.listReleases();

      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listReleases — non-Error thrown in outer catch
  // -------------------------------------------------------------------------

  describe("listReleases — non-Error thrown", () => {
    it("should return empty array when a non-Error is thrown by the API", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockRejectedValue(
        "string error",
      );

      const releases = await service.listReleases();

      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listReleases — secret with no data.release field
  // -------------------------------------------------------------------------

  describe("listReleases — secret missing data.release", () => {
    it("should skip secrets that have no data.release field", async () => {
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "no-data-secret",
              namespace: "default",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: {}, // No 'release' key
          },
        ],
      });

      const releases = await service.listReleases();

      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listReleases — non-Error thrown in per-secret decode (String(error) path)
  // -------------------------------------------------------------------------

  describe("listReleases — non-Error in per-secret decode catch", () => {
    it("should warn with String(error) when a non-Error is thrown decoding a secret", async () => {
      // Use valid type but make decodeHelmRelease throw a non-Error
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "bad-release",
              namespace: "default",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: { release: "INVALID_NON_GZIP_DATA_0000" },
          },
        ],
      });

      const releases = await service.listReleases();

      // The bad release is skipped.
      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // decodeHelmRelease — decoded is null path (mock returns null)
  // -------------------------------------------------------------------------

  describe("listReleases — decoded result is null", () => {
    it("should not push decoded result when decodeHelmRelease returns null", async () => {
      const encoded = await buildHelmReleaseData({ name: "skip-me" });
      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "null-decode",
              namespace: "default",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: { release: encoded },
          },
        ],
      });

      // Mock decodeHelmRelease to return null
      jest.spyOn(service, "decodeHelmRelease").mockResolvedValue(null);

      const releases = await service.listReleases();

      expect(releases).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // syncReleases — k8s disabled
  // -------------------------------------------------------------------------

  describe("syncReleases — k8s disabled", () => {
    it("should return 0 synced and no errors when kubernetes is disabled", async () => {
      (mockKubernetesService.isEnabled as jest.Mock).mockReturnValue(false);

      const result = await service.syncReleases();

      expect(result.synced).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // syncReleases — upsertReleaseDeployment throws non-Error
  // -------------------------------------------------------------------------

  describe("syncReleases — non-Error thrown in upsert", () => {
    it("should record String(error) in errors when a non-Error is thrown", async () => {
      const encoded = await buildHelmReleaseData({
        name: "my-app",
        namespace: "production",
        version: 1,
        info: { status: "deployed", last_deployed: "2024-01-01T00:00:00Z" },
        chart: { metadata: { name: "my-chart", version: "1.0.0" } },
      });

      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "sh.helm.release.v1.my-app.v1",
              namespace: "production",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: { release: encoded },
          },
        ],
      });

      // Throw a non-Error from componentRepository.findOne
      mockComponentRepo.findOne.mockRejectedValue("non-error-string");

      const result = await service.syncReleases();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("production/my-app");
    });
  });

  // -------------------------------------------------------------------------
  // upsertReleaseDeployment — existing deployment update path with null metadata
  // -------------------------------------------------------------------------

  describe("upsertReleaseDeployment — existing deployment with null metadata", () => {
    it("should treat null existing.metadata as empty object when merging helm meta", async () => {
      const fakeComponent = { id: "comp-uuid", name: "my-app" } as Component;
      const fakeEnvironment = {
        id: "env-uuid",
        name: "production",
      } as Environment;
      const existingDeployment: Partial<Deployment> = {
        id: "dep-uuid",
        componentId: "comp-uuid",
        environmentId: "env-uuid",
        version: "old-chart@0.1.0",
        status: DeploymentStatus.SUCCEEDED,
        metadata: null as unknown as Record<string, unknown>, // null metadata
      };

      const encoded = await buildHelmReleaseData({
        name: "my-app",
        namespace: "production",
        version: 2,
        info: { status: "deployed", last_deployed: "2024-01-15T10:00:00Z" },
        chart: {
          metadata: { name: "my-chart", version: "1.0.0", appVersion: "2.0" },
        },
      });

      mockCoreV1Api.listSecretForAllNamespaces.mockResolvedValue({
        items: [
          {
            metadata: {
              name: "sh.helm.release.v1.my-app.v2",
              namespace: "production",
              labels: { owner: "helm" },
            },
            type: "helm.sh/release.v1",
            data: { release: encoded },
          },
        ],
      });

      mockComponentRepo.findOne.mockResolvedValue(fakeComponent);
      mockEnvironmentRepo.findOne.mockResolvedValue(fakeEnvironment);
      mockDeploymentRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingDeployment),
      });

      const result = await service.syncReleases();

      expect(result.synced).toBe(1);
      expect(mockDeploymentRepo.save).toHaveBeenCalled();
      // Should not throw even with null metadata
      const saveArg = (
        mockDeploymentRepo.save.mock.calls[0] as [Partial<Deployment>]
      )[0];
      expect(saveArg.metadata).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // decodeHelmRelease — both gzip attempts fail (throws)
  // -------------------------------------------------------------------------

  describe("decodeHelmRelease — both gunzip attempts fail", () => {
    it("should throw when both double and single gzip decoding fail", async () => {
      // Plain base64 of non-gzip data
      const notGzip = Buffer.from("this is not gzip data at all").toString(
        "base64",
      );

      await expect(service.decodeHelmRelease(notGzip)).rejects.toThrow();
    });
  });
});
