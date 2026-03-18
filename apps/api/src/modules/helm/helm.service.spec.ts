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

      expect(mockCoreV1Api.listNamespacedSecret).toHaveBeenCalledWith(
        "staging",
        undefined,
        undefined,
        undefined,
        undefined,
        "owner=helm",
      );
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
