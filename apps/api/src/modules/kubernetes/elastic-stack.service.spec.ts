import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ElasticStackService } from "./elastic-stack.service";
import { KubernetesService } from "./kubernetes.service";

// ---------------------------------------------------------------------------
// Shared mock objects
// All jest.fn() references are cleared in beforeEach via jest.clearAllMocks()
// so individual tests receive a clean slate without leaked state.
// ---------------------------------------------------------------------------

const mockCustomObjectsApi = {
  listClusterCustomObject: jest.fn(),
  listNamespacedCustomObject: jest.fn(),
};

const mockAppsV1Api = {
  listDaemonSetForAllNamespaces: jest.fn(),
  listNamespacedDaemonSet: jest.fn(),
  listDeploymentForAllNamespaces: jest.fn(),
  listNamespacedDeployment: jest.fn(),
};

const mockKubernetesService = {
  getCustomObjectsApi: jest.fn(),
  getAppsV1Api: jest.fn(),
  isEnabled: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function fakeEckEsItem(overrides: {
  name?: string;
  namespace?: string;
  version?: string;
  health?: string;
  availableNodes?: number;
}) {
  return {
    metadata: {
      name: overrides.name ?? "my-es",
      namespace: overrides.namespace ?? "elastic",
    },
    spec: { version: overrides.version ?? "8.12.0" },
    status: {
      health: overrides.health ?? "green",
      availableNodes: overrides.availableNodes ?? 3,
    },
  };
}

function fakeEckGenericItem(overrides: {
  name?: string;
  namespace?: string;
  version?: string;
  health?: string;
}) {
  return {
    metadata: {
      name: overrides.name ?? "my-resource",
      namespace: overrides.namespace ?? "elastic",
    },
    spec: { version: overrides.version },
    status: { health: overrides.health ?? "green" },
  };
}

function fakeEckLogstashItem(overrides: {
  name?: string;
  namespace?: string;
  count?: number;
  availableNodes?: number;
}) {
  return {
    metadata: {
      name: overrides.name ?? "my-logstash",
      namespace: overrides.namespace ?? "elastic",
    },
    spec: { count: overrides.count ?? 3 },
    status: { availableNodes: overrides.availableNodes ?? 2 },
  };
}

function fakeDaemonSet(overrides: {
  name?: string;
  namespace?: string;
  desired?: number;
  ready?: number;
  configMapName?: string;
}) {
  const volumes = overrides.configMapName
    ? [{ name: "config", configMap: { name: overrides.configMapName } }]
    : [];

  return {
    metadata: {
      name: overrides.name ?? "my-ds",
      namespace: overrides.namespace ?? "logging",
    },
    status: {
      desiredNumberScheduled: overrides.desired ?? 3,
      numberReady: overrides.ready ?? 3,
    },
    spec: { template: { spec: { volumes } } },
  };
}

function fakeDeployment(overrides: {
  name?: string;
  namespace?: string;
  replicas?: number;
  readyReplicas?: number;
  configMapName?: string;
}) {
  const volumes = overrides.configMapName
    ? [{ name: "config", configMap: { name: overrides.configMapName } }]
    : [];

  return {
    metadata: {
      name: overrides.name ?? "logstash",
      namespace: overrides.namespace ?? "logging",
    },
    spec: {
      replicas: overrides.replicas ?? 2,
      template: { spec: { volumes } },
    },
    status: { readyReplicas: overrides.readyReplicas ?? 1 },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ElasticStackService", () => {
  let service: ElasticStackService;

  // Capture and restore globalThis.fetch around every test so fetch mocks
  // do not leak across test boundaries.
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticStackService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ElasticStackService>(ElasticStackService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // getEckElasticsearch
  // -------------------------------------------------------------------------

  describe("getEckElasticsearch", () => {
    it("FARM-ST386: returns mapped result with source=eck, correct nodeCount, and health=green", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [fakeEckEsItem({ health: "green", availableNodes: 3 })],
      });

      const result = await service.getEckElasticsearch();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "my-es",
        namespace: "elastic",
        health: "green",
        version: "8.12.0",
        nodeCount: 3,
        source: "eck",
      });
    });

    it("FARM-ST387: returns empty array without throwing when CRD is not installed (404)", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue({
        statusCode: 404,
      });

      await expect(service.getEckElasticsearch()).resolves.toEqual([]);
    });

    it("returns empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(service.getEckElasticsearch()).resolves.toEqual([]);
    });

    it("uses listNamespacedCustomObject and returns correct mapping when namespace is provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          fakeEckEsItem({
            name: "ns-es",
            namespace: "elastic",
            health: "yellow",
            availableNodes: 1,
          }),
        ],
      });

      const result = await service.getEckElasticsearch("elastic");

      expect(
        mockCustomObjectsApi.listNamespacedCustomObject,
      ).toHaveBeenCalledWith(expect.objectContaining({ namespace: "elastic" }));
      expect(result[0].health).toBe("yellow");
      expect(result[0].nodeCount).toBe(1);
    });

    it("normalizes unrecognized health values to 'unknown'", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [fakeEckEsItem({ health: "initializing" })],
      });

      const result = await service.getEckElasticsearch();

      expect(result[0].health).toBe("unknown");
    });

    it("returns empty array on a generic network error", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("connection refused"),
      );

      await expect(service.getEckElasticsearch()).resolves.toEqual([]);
    });

    it("returns safe defaults for an item missing status, spec, and metadata.namespace", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // listNamespacedCustomObject is called when a namespace is provided
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-es" } }],
      });

      const result = await service.getEckElasticsearch("elastic");

      expect(result[0].namespace).toBe("elastic");
      expect(result[0].health).toBe("unknown");
      expect(result[0].version).toBe("");
      expect(result[0].nodeCount).toBe(0);
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({});

      await expect(service.getEckElasticsearch()).resolves.toEqual([]);
    });

    it("uses empty string namespace when both item.metadata.namespace and namespace param are absent", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-es" } }],
      });

      const result = await service.getEckElasticsearch();

      expect(result[0].namespace).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // getEckKibana
  // -------------------------------------------------------------------------

  describe("getEckKibana", () => {
    it("returns Kibana descriptor with available=true when health is green", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          fakeEckGenericItem({
            name: "my-kibana",
            health: "green",
            version: "8.12.0",
          }),
        ],
      });

      const result = await service.getEckKibana();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "my-kibana",
        namespace: "elastic",
        available: true,
        version: "8.12.0",
        source: "eck",
      });
    });

    it("returns available=false when status is missing from the CR", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "my-kibana", namespace: "elastic" },
            spec: {},
            // status intentionally omitted to simulate missing health field
          },
        ],
      });

      const result = await service.getEckKibana();

      expect(result[0].available).toBe(false);
    });

    it("returns empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(service.getEckKibana()).resolves.toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("timeout"),
      );

      await expect(service.getEckKibana()).resolves.toEqual([]);
    });

    it("returns empty array when the API rejects with a non-Error reason", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        "network failure",
      );

      await expect(service.getEckKibana()).resolves.toEqual([]);
    });

    it("uses listNamespacedCustomObject when namespace is provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [fakeEckGenericItem({ name: "ns-kibana", health: "green" })],
      });

      await service.getEckKibana("elastic");

      expect(
        mockCustomObjectsApi.listNamespacedCustomObject,
      ).toHaveBeenCalledWith(expect.objectContaining({ namespace: "elastic" }));
    });

    it("returns safe defaults for an item missing status and spec", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-kibana" } }],
      });

      const result = await service.getEckKibana("elastic");

      expect(result[0].available).toBe(false);
      expect(result[0].namespace).toBe("elastic");
      expect(result[0].version).toBeUndefined();
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({});

      await expect(service.getEckKibana()).resolves.toEqual([]);
    });

    it("uses empty string namespace when both item.metadata.namespace and namespace param are absent", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-kibana" } }],
      });

      const result = await service.getEckKibana();

      expect(result[0].namespace).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // getEckBeats
  // -------------------------------------------------------------------------

  describe("getEckBeats", () => {
    it("returns Beat descriptor with available=true when health is green", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          fakeEckGenericItem({
            name: "my-beat",
            health: "green",
            version: "8.12.0",
          }),
        ],
      });

      const result = await service.getEckBeats();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "my-beat",
        namespace: "elastic",
        available: true,
        source: "eck",
      });
    });

    it("returns empty array when CRD is absent (404)", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue({
        statusCode: 404,
      });

      await expect(service.getEckBeats()).resolves.toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("timeout"),
      );

      await expect(service.getEckBeats()).resolves.toEqual([]);
    });

    it("returns empty array when the API rejects with a non-Error reason", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        "network failure",
      );

      await expect(service.getEckBeats()).resolves.toEqual([]);
    });

    it("returns empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(service.getEckBeats()).resolves.toEqual([]);
    });

    it("returns available=false when Beat health is not green", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [fakeEckGenericItem({ health: "red" })],
      });

      const result = await service.getEckBeats();

      expect(result[0].available).toBe(false);
    });

    it("uses listNamespacedCustomObject when namespace is provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [fakeEckGenericItem({ name: "ns-beat", health: "green" })],
      });

      await service.getEckBeats("elastic");

      expect(
        mockCustomObjectsApi.listNamespacedCustomObject,
      ).toHaveBeenCalledWith(expect.objectContaining({ namespace: "elastic" }));
    });

    it("returns safe defaults for an item missing status and spec", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-beat" } }],
      });

      const result = await service.getEckBeats("elastic");

      expect(result[0].available).toBe(false);
      expect(result[0].namespace).toBe("elastic");
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({});

      await expect(service.getEckBeats()).resolves.toEqual([]);
    });

    it("uses empty string namespace when both item.metadata.namespace and namespace param are absent", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-beat" } }],
      });

      const result = await service.getEckBeats();

      expect(result[0].namespace).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // getEckLogstash
  // -------------------------------------------------------------------------

  describe("getEckLogstash", () => {
    it("returns Logstash descriptor with desiredReplicas=3 and readyReplicas=2", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [fakeEckLogstashItem({ count: 3, availableNodes: 2 })],
      });

      const result = await service.getEckLogstash();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "my-logstash",
        namespace: "elastic",
        desiredReplicas: 3,
        readyReplicas: 2,
        source: "eck",
      });
    });

    it("returns empty array when CRD is absent (404)", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue({
        statusCode: 404,
      });

      await expect(service.getEckLogstash()).resolves.toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("timeout"),
      );

      await expect(service.getEckLogstash()).resolves.toEqual([]);
    });

    it("returns empty array when the API rejects with a non-Error reason", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        "network failure",
      );

      await expect(service.getEckLogstash()).resolves.toEqual([]);
    });

    it("returns empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(service.getEckLogstash()).resolves.toEqual([]);
    });

    it("uses listNamespacedCustomObject and returns correct mapping when namespace is provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [fakeEckLogstashItem({ count: 1, availableNodes: 1 })],
      });

      await service.getEckLogstash("elastic");

      expect(
        mockCustomObjectsApi.listNamespacedCustomObject,
      ).toHaveBeenCalledWith(expect.objectContaining({ namespace: "elastic" }));
    });

    it("returns safe defaults for an item missing status, spec, and metadata.namespace", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-logstash" } }],
      });

      const result = await service.getEckLogstash("elastic");

      expect(result[0].namespace).toBe("elastic");
      expect(result[0].desiredReplicas).toBe(0);
      expect(result[0].readyReplicas).toBe(0);
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({});

      await expect(service.getEckLogstash()).resolves.toEqual([]);
    });

    it("uses empty string namespace when both item.metadata.namespace and namespace param are absent", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [{ metadata: { name: "bare-logstash" } }],
      });

      const result = await service.getEckLogstash();

      expect(result[0].namespace).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // getFluentBit
  // -------------------------------------------------------------------------

  describe("getFluentBit", () => {
    it("FARM-ST388: DaemonSet with 3 desired and 2 ready nodes → notReadyNodes is 1", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // First label selector returns the DaemonSet; second returns empty to
      // isolate this test from the deduplication behaviour.
      mockAppsV1Api.listDaemonSetForAllNamespaces
        .mockResolvedValueOnce({
          items: [
            fakeDaemonSet({
              name: "fluent-bit",
              namespace: "logging",
              desired: 3,
              ready: 2,
            }),
          ],
        })
        .mockResolvedValueOnce({ items: [] });

      const result = await service.getFluentBit();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "fluent-bit",
        namespace: "logging",
        desiredNodes: 3,
        readyNodes: 2,
        notReadyNodes: 1,
        source: "helm",
      });
    });

    it("FARM-ST389: no DaemonSets found → returns empty array without throwing", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
        items: [],
      });

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });

    it("deduplicates the same DaemonSet returned by both label-selector queries", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      const ds = fakeDaemonSet({ name: "fluent-bit", namespace: "logging" });
      // Both calls return the identical DaemonSet — dedup must yield exactly 1.
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
        items: [ds],
      });

      const result = await service.getFluentBit();

      expect(result).toHaveLength(1);
    });

    it("populates configMapRef from the first ConfigMap volume in the pod spec", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces
        .mockResolvedValueOnce({
          items: [fakeDaemonSet({ configMapName: "fluent-bit-config" })],
        })
        .mockResolvedValueOnce({ items: [] });

      const result = await service.getFluentBit();

      expect(result[0].configMapRef).toBe("fluent-bit-config");
    });

    it("returns empty array when AppsV1Api is null", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });

    it("continues and returns results when one of the two label-selector queries rejects", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces
        .mockRejectedValueOnce(new Error("label query failed"))
        .mockResolvedValueOnce({
          items: [fakeDaemonSet({ name: "fluent-bit", namespace: "logging" })],
        });

      const result = await service.getFluentBit();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("fluent-bit");
    });

    it("uses listNamespacedDaemonSet when namespace is provided", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listNamespacedDaemonSet.mockResolvedValue({ items: [] });

      await service.getFluentBit("logging");

      expect(mockAppsV1Api.listNamespacedDaemonSet).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "logging" }),
      );
    });

    it("returns safe defaults for a DaemonSet missing metadata and status", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // Item has no metadata.name, no metadata.namespace, and no status — all
      // optional-chaining / null-coalescing fallback paths must be covered.
      mockAppsV1Api.listDaemonSetForAllNamespaces
        .mockResolvedValueOnce({
          items: [{ spec: { template: { spec: { volumes: [] } } } }],
        })
        .mockResolvedValueOnce({ items: [] });

      const result = await service.getFluentBit();

      expect(result[0].name).toBe("");
      expect(result[0].namespace).toBe("");
      expect(result[0].desiredNodes).toBe(0);
      expect(result[0].readyNodes).toBe(0);
    });

    it("handles a list response whose items field is undefined", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // outcome.value.items is undefined → falls back to []
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({});

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });

    it("handles a label query rejection whose reason is a plain string", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // Reject with a non-Error value to cover the String(reason) branch
      mockAppsV1Api.listDaemonSetForAllNamespaces
        .mockRejectedValueOnce("plain string reason")
        .mockResolvedValueOnce({ items: [] });

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });

    it("catches unexpected synchronous errors and returns empty array", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // A fulfilled outcome whose .items getter throws causes an exception
      // inside the for-loop that is caught by the outer try/catch block.
      // This approach works with Istanbul's async instrumentation because the
      // exception occurs after the await Promise.allSettled(...) resolves.
      const throwingResult = Object.defineProperty({}, "items", {
        get() {
          throw new Error("items access failure");
        },
        enumerable: true,
      });
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue(
        throwingResult,
      );

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });

    it("returns empty array when the outer catch receives a non-Error", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // A getter that throws a plain string (non-Error) exercises the
      // String(error) branch of the outer catch block.
      const throwingResult = Object.defineProperty({}, "items", {
        get() {
          const reason: unknown = "items non-error failure";
          throw reason;
        },
        enumerable: true,
      });
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue(
        throwingResult,
      );

      await expect(service.getFluentBit()).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getFluentd
  // -------------------------------------------------------------------------

  describe("getFluentd", () => {
    it("maps a Fluentd DaemonSet with correct fields and source=helm", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
        items: [
          fakeDaemonSet({
            name: "fluentd",
            namespace: "logging",
            desired: 2,
            ready: 2,
          }),
        ],
      });

      const result = await service.getFluentd();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "fluentd",
        namespace: "logging",
        desiredNodes: 2,
        readyNodes: 2,
        notReadyNodes: 0,
        source: "helm",
      });
    });

    it("returns empty array when Kubernetes is unavailable (API throws)", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockRejectedValue(
        new Error("connection refused"),
      );

      await expect(service.getFluentd()).resolves.toEqual([]);
    });

    it("returns empty array when AppsV1Api is null", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);

      await expect(service.getFluentd()).resolves.toEqual([]);
    });

    it("populates configMapRef when a ConfigMap volume is present", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
        items: [fakeDaemonSet({ configMapName: "fluentd-config" })],
      });

      const result = await service.getFluentd();

      expect(result[0].configMapRef).toBe("fluentd-config");
    });

    it("uses listNamespacedDaemonSet when namespace is provided", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listNamespacedDaemonSet.mockResolvedValue({ items: [] });

      await service.getFluentd("logging");

      expect(mockAppsV1Api.listNamespacedDaemonSet).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "logging" }),
      );
    });

    it("returns safe defaults for a DaemonSet missing metadata, status, and spec", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // Bare item: no metadata.name, no metadata.namespace, no status, no spec.
      // Covers all optional-chaining / null-coalescing fallback paths including
      // ds.spec?.template?.spec?.volumes ?? [] inside extractConfigMapRef.
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({
        items: [{}],
      });

      const result = await service.getFluentd();

      expect(result[0].name).toBe("");
      expect(result[0].namespace).toBe("");
      expect(result[0].desiredNodes).toBe(0);
      expect(result[0].readyNodes).toBe(0);
      expect(result[0].configMapRef).toBeUndefined();
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockResolvedValue({});

      await expect(service.getFluentd()).resolves.toEqual([]);
    });

    it("returns empty array when the API rejects with a non-Error reason", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDaemonSetForAllNamespaces.mockRejectedValue(
        "connection refused",
      );

      await expect(service.getFluentd()).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getLogstashDeployment
  // -------------------------------------------------------------------------

  describe("getLogstashDeployment", () => {
    it("maps a Deployment with readyReplicas=1 and desiredReplicas=2", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [fakeDeployment({ replicas: 2, readyReplicas: 1 })],
      });

      const result = await service.getLogstashDeployment();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "logstash",
        namespace: "logging",
        desiredReplicas: 2,
        readyReplicas: 1,
        source: "helm",
      });
    });

    it("populates configMapRef when the Deployment references a ConfigMap volume", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [fakeDeployment({ configMapName: "logstash-config" })],
      });

      const result = await service.getLogstashDeployment();

      expect(result[0].configMapRef).toBe("logstash-config");
    });

    it("returns empty array when AppsV1Api is null", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);

      await expect(service.getLogstashDeployment()).resolves.toEqual([]);
    });

    it("returns empty array on API error", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDeploymentForAllNamespaces.mockRejectedValue(
        new Error("timeout"),
      );

      await expect(service.getLogstashDeployment()).resolves.toEqual([]);
    });

    it("uses listNamespacedDeployment when namespace is provided", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listNamespacedDeployment.mockResolvedValue({ items: [] });

      await service.getLogstashDeployment("logging");

      expect(mockAppsV1Api.listNamespacedDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "logging" }),
      );
    });

    it("returns safe defaults for a Deployment missing metadata, status, and spec", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      // Bare item: no metadata, no spec.replicas, no status.readyReplicas, no volumes.
      // Covers all optional-chaining / null-coalescing fallback paths including
      // dep.spec?.template?.spec?.volumes ?? [] inside extractConfigMapRefFromDeployment.
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [{}],
      });

      const result = await service.getLogstashDeployment();

      expect(result[0].name).toBe("");
      expect(result[0].namespace).toBe("");
      expect(result[0].desiredReplicas).toBe(0);
      expect(result[0].readyReplicas).toBe(0);
      expect(result[0].configMapRef).toBeUndefined();
    });

    it("returns empty array when the API response contains no items field", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({});

      await expect(service.getLogstashDeployment()).resolves.toEqual([]);
    });

    it("returns empty array when the API rejects with a non-Error reason", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockAppsV1Api.listDeploymentForAllNamespaces.mockRejectedValue(
        "connection refused",
      );

      await expect(service.getLogstashDeployment()).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getExternalElasticsearch
  // -------------------------------------------------------------------------

  describe("getExternalElasticsearch", () => {
    it("FARM-ST390: returns { reachable: false } without throwing when ELASTICSEARCH_URL is not set", async () => {
      mockConfigService.get.mockReturnValue("");

      await expect(service.getExternalElasticsearch()).resolves.toEqual({
        reachable: false,
      });
    });

    it("returns { reachable: false } when ConfigService returns undefined", async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(service.getExternalElasticsearch()).resolves.toEqual({
        reachable: false,
      });
    });

    it("FARM-ST391: returns { reachable: true, clusterHealth: 'yellow' } when cluster health responds with status=yellow", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "yellow" }),
      }) as typeof fetch;

      const result = await service.getExternalElasticsearch();

      expect(result).toEqual({ reachable: true, clusterHealth: "yellow" });
    });

    it("returns { reachable: true, clusterHealth: 'green' } when cluster health responds with status=green", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "green" }),
      }) as typeof fetch;

      const result = await service.getExternalElasticsearch();

      expect(result).toEqual({ reachable: true, clusterHealth: "green" });
    });

    it("returns { reachable: false } when fetch throws a network error", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error("network timeout")) as typeof fetch;

      await expect(service.getExternalElasticsearch()).resolves.toEqual({
        reachable: false,
      });
    });

    it("returns { reachable: false } when the response status is not ok (503)", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as typeof fetch;

      await expect(service.getExternalElasticsearch()).resolves.toEqual({
        reachable: false,
      });
    });

    it("returns { reachable: false } when the request is aborted by AbortSignal", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(
          new DOMException("The operation was aborted.", "AbortError"),
        ) as typeof fetch;

      await expect(service.getExternalElasticsearch()).resolves.toEqual({
        reachable: false,
      });
    });

    it("returns { reachable: true, clusterHealth: 'red' } when cluster health responds with status=red", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "red" }),
      }) as typeof fetch;

      const result = await service.getExternalElasticsearch();

      expect(result).toEqual({ reachable: true, clusterHealth: "red" });
    });

    it("returns { reachable: true, clusterHealth: undefined } when status is an unrecognised value", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "initializing" }),
      }) as typeof fetch;

      const result = await service.getExternalElasticsearch();

      expect(result).toEqual({ reachable: true, clusterHealth: undefined });
    });

    it("returns { reachable: true, clusterHealth: undefined } when the response body has no status field", async () => {
      mockConfigService.get.mockReturnValue("http://es:9200");
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as typeof fetch;

      const result = await service.getExternalElasticsearch();

      // body.status is undefined → rawStatus = "" → clusterHealth = undefined
      expect(result).toEqual({ reachable: true, clusterHealth: undefined });
    });
  });

  // -------------------------------------------------------------------------
  // getAll
  // -------------------------------------------------------------------------

  describe("getAll", () => {
    it("returns a complete ElasticStackResult with eck, inCluster, and external keys", async () => {
      const esData = [
        {
          name: "my-es",
          namespace: "elastic",
          health: "green" as const,
          version: "8.12.0",
          nodeCount: 3,
          source: "eck" as const,
        },
      ];

      jest.spyOn(service, "getEckElasticsearch").mockResolvedValue(esData);
      jest.spyOn(service, "getEckKibana").mockResolvedValue([]);
      jest.spyOn(service, "getEckLogstash").mockResolvedValue([]);
      jest.spyOn(service, "getEckBeats").mockResolvedValue([]);
      jest.spyOn(service, "getFluentBit").mockResolvedValue([]);
      jest.spyOn(service, "getFluentd").mockResolvedValue([]);
      jest.spyOn(service, "getLogstashDeployment").mockResolvedValue([]);
      jest
        .spyOn(service, "getExternalElasticsearch")
        .mockResolvedValue({ reachable: false });

      const result = await service.getAll();

      expect(result).toMatchObject({
        eck: { elasticsearch: esData, kibana: [], logstash: [], beats: [] },
        inCluster: { fluentBit: [], fluentd: [], logstash: [] },
        external: { reachable: false },
      });
    });

    it("returns safe empty defaults for sub-results that reject without propagating errors", async () => {
      jest
        .spyOn(service, "getEckElasticsearch")
        .mockRejectedValue(new Error("ES failed"));
      jest.spyOn(service, "getEckKibana").mockResolvedValue([]);
      jest.spyOn(service, "getEckLogstash").mockResolvedValue([]);
      jest.spyOn(service, "getEckBeats").mockResolvedValue([]);
      jest
        .spyOn(service, "getFluentBit")
        .mockRejectedValue(new Error("FluentBit failed"));
      jest.spyOn(service, "getFluentd").mockResolvedValue([]);
      jest.spyOn(service, "getLogstashDeployment").mockResolvedValue([]);
      jest
        .spyOn(service, "getExternalElasticsearch")
        .mockRejectedValue(new Error("external failed"));

      const result = await service.getAll();

      // Failed sub-results fall back to empty / unreachable defaults.
      expect(result.eck.elasticsearch).toEqual([]);
      expect(result.inCluster.fluentBit).toEqual([]);
      expect(result.external).toEqual({ reachable: false });
      // Successfully resolved sub-results are preserved.
      expect(result.eck.kibana).toEqual([]);
    });

    it("forwards the namespace argument to all ECK and in-cluster sub-methods", async () => {
      const spyEs = jest
        .spyOn(service, "getEckElasticsearch")
        .mockResolvedValue([]);
      const spyKibana = jest
        .spyOn(service, "getEckKibana")
        .mockResolvedValue([]);
      const spyEckLogstash = jest
        .spyOn(service, "getEckLogstash")
        .mockResolvedValue([]);
      const spyBeats = jest.spyOn(service, "getEckBeats").mockResolvedValue([]);
      const spyFluentBit = jest
        .spyOn(service, "getFluentBit")
        .mockResolvedValue([]);
      const spyFluentd = jest
        .spyOn(service, "getFluentd")
        .mockResolvedValue([]);
      const spyHelmLogstash = jest
        .spyOn(service, "getLogstashDeployment")
        .mockResolvedValue([]);
      jest
        .spyOn(service, "getExternalElasticsearch")
        .mockResolvedValue({ reachable: false });

      await service.getAll("my-namespace");

      expect(spyEs).toHaveBeenCalledWith("my-namespace");
      expect(spyKibana).toHaveBeenCalledWith("my-namespace");
      expect(spyEckLogstash).toHaveBeenCalledWith("my-namespace");
      expect(spyBeats).toHaveBeenCalledWith("my-namespace");
      expect(spyFluentBit).toHaveBeenCalledWith("my-namespace");
      expect(spyFluentd).toHaveBeenCalledWith("my-namespace");
      expect(spyHelmLogstash).toHaveBeenCalledWith("my-namespace");
    });

    it("returns safe empty defaults when every sub-method rejects", async () => {
      const err = new Error("everything failed");
      jest.spyOn(service, "getEckElasticsearch").mockRejectedValue(err);
      jest.spyOn(service, "getEckKibana").mockRejectedValue(err);
      jest.spyOn(service, "getEckLogstash").mockRejectedValue(err);
      jest.spyOn(service, "getEckBeats").mockRejectedValue(err);
      jest.spyOn(service, "getFluentBit").mockRejectedValue(err);
      jest.spyOn(service, "getFluentd").mockRejectedValue(err);
      jest.spyOn(service, "getLogstashDeployment").mockRejectedValue(err);
      jest.spyOn(service, "getExternalElasticsearch").mockRejectedValue(err);

      const result = await service.getAll();

      expect(result.eck.elasticsearch).toEqual([]);
      expect(result.eck.kibana).toEqual([]);
      expect(result.eck.logstash).toEqual([]);
      expect(result.eck.beats).toEqual([]);
      expect(result.inCluster.fluentBit).toEqual([]);
      expect(result.inCluster.fluentd).toEqual([]);
      expect(result.inCluster.logstash).toEqual([]);
      expect(result.external).toEqual({ reachable: false });
    });
  });
});
