import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ThanosService } from "./thanos.service";
import { KubernetesService } from "./kubernetes.service";

// ---------------------------------------------------------------------------
// Shared mock objects
// All jest.fn() references are cleared in beforeEach via jest.clearAllMocks().
// ---------------------------------------------------------------------------

const mockCustomObjectsApi = {
  listClusterCustomObject: jest.fn(),
  listNamespacedCustomObject: jest.fn(),
};

const mockAppsV1Api = {
  listDeploymentForAllNamespaces: jest.fn(),
  listNamespacedDeployment: jest.fn(),
  listStatefulSetForAllNamespaces: jest.fn(),
  listNamespacedStatefulSet: jest.fn(),
};

const mockCoreV1Api = {
  listPodForAllNamespaces: jest.fn(),
  listNamespacedPod: jest.fn(),
};

const mockKubernetesService = {
  getCustomObjectsApi: jest.fn(),
  getAppsV1Api: jest.fn(),
  getCoreV1Api: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Returns a minimal ThanosQuery-style custom resource item. */
function fakeThanosItem(overrides: {
  name?: string;
  namespace?: string;
  conditions?: Array<{ type: string; status: string }>;
  availableReplicas?: number;
}) {
  return {
    metadata: {
      name: overrides.name ?? "thanos-query",
      namespace: overrides.namespace ?? "monitoring",
    },
    status: {
      conditions: overrides.conditions ?? [
        { type: "Available", status: "True" },
      ],
      availableReplicas: overrides.availableReplicas,
    },
  };
}

/** Returns a minimal Deployment/StatefulSet workload item. */
function fakeWorkload(overrides: {
  name?: string;
  namespace?: string;
  readyReplicas?: number;
  desiredReplicas?: number;
}) {
  return {
    metadata: {
      name: overrides.name ?? "thanos-query",
      namespace: overrides.namespace ?? "monitoring",
    },
    spec: { replicas: overrides.desiredReplicas ?? 1 },
    status: { readyReplicas: overrides.readyReplicas ?? 1 },
  };
}

/** Returns a pod item with an optional thanos-sidecar container. */
function fakePod(overrides: {
  name?: string;
  namespace?: string;
  hasSidecar?: boolean;
  phase?: string;
}) {
  const containers = overrides.hasSidecar
    ? [{ name: "prometheus" }, { name: "thanos-sidecar" }]
    : [{ name: "prometheus" }];
  return {
    metadata: {
      name: overrides.name ?? "prometheus-0",
      namespace: overrides.namespace ?? "monitoring",
    },
    spec: { containers },
    status: { phase: overrides.phase ?? "Running" },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ThanosService", () => {
  let service: ThanosService;

  // Capture and restore globalThis.fetch around every test so fetch mocks
  // do not leak across test boundaries.
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;

    // Default: Kubernetes API is not available
    mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
    mockKubernetesService.getAppsV1Api.mockReturnValue(null);
    mockKubernetesService.getCoreV1Api.mockReturnValue(null);
    mockConfigService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThanosService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ThanosService>(ThanosService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // getThanosOperatorComponents
  // -------------------------------------------------------------------------

  describe("getThanosOperatorComponents", () => {
    it("FARM-ST392: ThanosQuery CR present → maps to type querier, source operator, ready true", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);

      // The first CRD type (thanosqueries) returns one item; all others return empty.
      mockCustomObjectsApi.listClusterCustomObject.mockImplementation(
        ({ plural }: { plural: string }) => {
          if (plural === "thanosqueries") {
            return Promise.resolve({ items: [fakeThanosItem({})] });
          }
          return Promise.resolve({ items: [] });
        },
      );

      mockCoreV1Api.listPodForAllNamespaces.mockResolvedValue({ items: [] });

      const result = await service.getThanosOperatorComponents();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "thanos-query",
        namespace: "monitoring",
        type: "querier",
        ready: true,
        source: "operator",
      });
    });

    it("FARM-ST393: CRD absent (404) → returns empty array without throwing", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);

      // Simulate 404 from the API for all CRD types
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue({
        response: { statusCode: 404 },
      });

      await expect(service.getThanosOperatorComponents()).resolves.toEqual([]);
    });

    it("returns empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(service.getThanosOperatorComponents()).resolves.toEqual([]);
    });

    it("marks item as ready=false when no Available/Ready condition is True and availableReplicas is 0", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);

      mockCustomObjectsApi.listClusterCustomObject.mockImplementation(
        ({ plural }: { plural: string }) => {
          if (plural === "thanosqueries") {
            return Promise.resolve({
              items: [
                fakeThanosItem({
                  conditions: [{ type: "Available", status: "False" }],
                  availableReplicas: 0,
                }),
              ],
            });
          }
          return Promise.resolve({ items: [] });
        },
      );

      const result = await service.getThanosOperatorComponents();

      expect(result[0].ready).toBe(false);
    });

    it("marks item as ready=true when availableReplicas > 0 and no matching condition", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);

      mockCustomObjectsApi.listClusterCustomObject.mockImplementation(
        ({ plural }: { plural: string }) => {
          if (plural === "thanosqueries") {
            return Promise.resolve({
              items: [
                fakeThanosItem({
                  conditions: [],
                  availableReplicas: 2,
                }),
              ],
            });
          }
          return Promise.resolve({ items: [] });
        },
      );

      const result = await service.getThanosOperatorComponents();

      expect(result[0].ready).toBe(true);
    });

    it("uses listNamespacedCustomObject when namespace is provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);

      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [fakeThanosItem({ namespace: "monitoring" })],
      });
      mockCoreV1Api.listNamespacedPod.mockResolvedValue({ items: [] });

      await service.getThanosOperatorComponents("monitoring");

      expect(
        mockCustomObjectsApi.listNamespacedCustomObject,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "monitoring" }),
      );
    });

    it("detects thanos-sidecar containers in Prometheus pods and adds them as source=operator, type=sidecar", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [],
      });

      mockCoreV1Api.listPodForAllNamespaces.mockResolvedValue({
        items: [fakePod({ hasSidecar: true, phase: "Running" })],
      });

      const result = await service.getThanosOperatorComponents();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "sidecar",
        ready: true,
        source: "operator",
      });
    });

    it("skips Prometheus pods that do not have a thanos-sidecar container", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [],
      });
      mockCoreV1Api.listPodForAllNamespaces.mockResolvedValue({
        items: [fakePod({ hasSidecar: false })],
      });

      const result = await service.getThanosOperatorComponents();

      expect(result).toHaveLength(0);
    });

    it("tolerates a generic error from CRD listing without throwing", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);

      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("cluster unreachable"),
      );

      await expect(service.getThanosOperatorComponents()).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getThanosLabelBased
  // -------------------------------------------------------------------------

  describe("getThanosLabelBased", () => {
    it("returns empty array when AppsV1Api is not available", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);

      await expect(service.getThanosLabelBased()).resolves.toEqual([]);
    });

    it("maps a thanos-query Deployment to a label component with type=querier, source=helm", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);

      mockAppsV1Api.listDeploymentForAllNamespaces.mockImplementation(
        ({ labelSelector }: { labelSelector: string }) => {
          if (labelSelector.includes("thanos-query")) {
            return Promise.resolve({
              items: [fakeWorkload({ readyReplicas: 2, desiredReplicas: 2 })],
            });
          }
          return Promise.resolve({ items: [] });
        },
      );
      mockAppsV1Api.listStatefulSetForAllNamespaces.mockResolvedValue({
        items: [],
      });

      const result = await service.getThanosLabelBased();

      const querier = result.find((c) => c.type === "querier");
      expect(querier).toBeDefined();
      expect(querier).toMatchObject({
        type: "querier",
        source: "helm",
        readyReplicas: 2,
        desiredReplicas: 2,
      });
    });

    it("deduplicates workloads that appear in both Deployment and StatefulSet lists", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);

      const workload = fakeWorkload({
        name: "thanos-storegateway",
        namespace: "monitoring",
      });

      mockAppsV1Api.listDeploymentForAllNamespaces.mockImplementation(
        ({ labelSelector }: { labelSelector: string }) => {
          if (labelSelector.includes("thanos-storegateway")) {
            return Promise.resolve({ items: [workload] });
          }
          return Promise.resolve({ items: [] });
        },
      );
      mockAppsV1Api.listStatefulSetForAllNamespaces.mockImplementation(
        ({ labelSelector }: { labelSelector: string }) => {
          if (labelSelector.includes("thanos-storegateway")) {
            return Promise.resolve({ items: [workload] });
          }
          return Promise.resolve({ items: [] });
        },
      );

      const result = await service.getThanosLabelBased();

      const storeComponents = result.filter((c) => c.type === "store-gateway");
      expect(storeComponents).toHaveLength(1);
    });

    it("uses listNamespacedDeployment and listNamespacedStatefulSet when namespace is provided", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);

      mockAppsV1Api.listNamespacedDeployment.mockResolvedValue({ items: [] });
      mockAppsV1Api.listNamespacedStatefulSet.mockResolvedValue({ items: [] });

      await service.getThanosLabelBased("monitoring");

      expect(mockAppsV1Api.listNamespacedDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "monitoring" }),
      );
      expect(mockAppsV1Api.listNamespacedStatefulSet).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "monitoring" }),
      );
    });

    it("returns empty array and does not throw when the API rejects with a generic error", async () => {
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);

      mockAppsV1Api.listDeploymentForAllNamespaces.mockRejectedValue(
        new Error("permission denied"),
      );
      mockAppsV1Api.listStatefulSetForAllNamespaces.mockRejectedValue(
        new Error("permission denied"),
      );

      await expect(service.getThanosLabelBased()).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // detectMetricsBackend
  // -------------------------------------------------------------------------

  describe("detectMetricsBackend", () => {
    it("returns { type: 'unknown' } when no prometheus.url is configured", async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "unknown",
      });
    });

    it("FARM-ST394: X-Thanos-* header present → returns { type: 'thanos', multiCluster: true }", async () => {
      mockConfigService.get.mockReturnValue("http://prometheus:9090");

      const mockHeaders = new Headers({ "x-thanos-trace-id": "abc123" });
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        headers: mockHeaders,
        text: jest.fn().mockResolvedValue(""),
      }) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "thanos",
        multiCluster: true,
      });
    });

    it("FARM-ST395: no Thanos headers, /ready returns plain Prometheus body → { type: 'prometheus' }", async () => {
      mockConfigService.get.mockReturnValue("http://prometheus:9090");

      const emptyHeaders = new Headers();
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue(""),
        })
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue("Prometheus Server is Ready."),
        }) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "prometheus",
      });
    });

    it("detects Mimir backend when /ready body contains 'Grafana Mimir'", async () => {
      mockConfigService.get.mockReturnValue("http://mimir:9090");

      const emptyHeaders = new Headers();
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue(""),
        })
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue("Grafana Mimir, have a great day."),
        }) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "mimir",
      });
    });

    it("detects Cortex backend when /ready body contains 'Cortex'", async () => {
      mockConfigService.get.mockReturnValue("http://cortex:9090");

      const emptyHeaders = new Headers();
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue(""),
        })
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue("Cortex is ready."),
        }) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "cortex",
      });
    });

    it("returns { type: 'unknown' } when the fetch to /api/v1/labels throws", async () => {
      mockConfigService.get.mockReturnValue("http://prometheus:9090");

      globalThis.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("ECONNREFUSED")) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "unknown",
      });
    });

    it("returns { type: 'unknown' } when the fetch to /ready throws", async () => {
      mockConfigService.get.mockReturnValue("http://prometheus:9090");

      const emptyHeaders = new Headers();
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue(""),
        })
        .mockRejectedValueOnce(new Error("timeout")) as typeof fetch;

      await expect(service.detectMetricsBackend()).resolves.toMatchObject({
        type: "unknown",
      });
    });
  });

  // -------------------------------------------------------------------------
  // getAll
  // -------------------------------------------------------------------------

  describe("getAll", () => {
    it("aggregates operator, inCluster, and backendType into a single ThanosResult", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);
      mockConfigService.get.mockReturnValue(undefined);

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [],
      });
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [],
      });
      mockAppsV1Api.listStatefulSetForAllNamespaces.mockResolvedValue({
        items: [],
      });

      const result = await service.getAll();

      expect(result).toMatchObject({
        operator: [],
        inCluster: [],
        backendType: "unknown",
        longTermEnabled: false,
      });
    });

    it("sets longTermEnabled=true when backendType is thanos", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);
      mockConfigService.get.mockReturnValue("http://thanos:9090");

      const mockHeaders = new Headers({ "x-thanos-trace-id": "xyz" });
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        headers: mockHeaders,
        text: jest.fn().mockResolvedValue(""),
      }) as typeof fetch;

      const result = await service.getAll();

      expect(result.backendType).toBe("thanos");
      expect(result.longTermEnabled).toBe(true);
    });

    it("sets longTermEnabled=true when backendType is mimir", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);
      mockConfigService.get.mockReturnValue("http://mimir:9090");

      const emptyHeaders = new Headers();
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue(""),
        })
        .mockResolvedValueOnce({
          headers: emptyHeaders,
          text: jest.fn().mockResolvedValue("Grafana Mimir"),
        }) as typeof fetch;

      const result = await service.getAll();

      expect(result.backendType).toBe("mimir");
      expect(result.longTermEnabled).toBe(true);
    });

    it("provides safe empty defaults when all sub-calls fail", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);
      mockConfigService.get.mockReturnValue("http://prometheus:9090");

      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("cluster down"),
      );
      mockAppsV1Api.listDeploymentForAllNamespaces.mockRejectedValue(
        new Error("cluster down"),
      );
      mockAppsV1Api.listStatefulSetForAllNamespaces.mockRejectedValue(
        new Error("cluster down"),
      );
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error("ECONNREFUSED")) as typeof fetch;

      const result = await service.getAll();

      expect(result.operator).toEqual([]);
      expect(result.inCluster).toEqual([]);
      expect(result.backendType).toBe("unknown");
      expect(result.longTermEnabled).toBe(false);
    });
  });
});
