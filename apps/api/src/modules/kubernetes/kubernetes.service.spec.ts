import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  KubernetesService,
  CrdResource,
  ArgoRolloutStatus,
} from "./kubernetes.service";
import { CatalogService } from "../catalog/catalog.service";
import { EventsGateway } from "../../common/events/events.gateway";

// ---------------------------------------------------------------------------
// Module-level mocks for the @kubernetes/client-node factory.
// Each mock function is reassigned before every test so individual tests
// can override behaviour without leaking state.
// ---------------------------------------------------------------------------
let mockLoadFromFile: jest.Mock;
let mockLoadFromCluster: jest.Mock;
let mockMakeApiClient: jest.Mock;
let mockListDeployments: jest.Mock;
let mockListSecrets: jest.Mock;
let mockListCRDs: jest.Mock;
let mockListRollouts: jest.Mock;
let mockListNamespacedRollouts: jest.Mock;

jest.mock("@kubernetes/client-node", () => {
  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      get loadFromFile() {
        return mockLoadFromFile;
      },
      get loadFromCluster() {
        return mockLoadFromCluster;
      },
      get makeApiClient() {
        return mockMakeApiClient;
      },
    })),
    AppsV1Api: class AppsV1Api {},
    CoreV1Api: class CoreV1Api {},
    ApiextensionsV1Api: class ApiextensionsV1Api {},
    CustomObjectsApi: class CustomObjectsApi {},
  };
});

// ---------------------------------------------------------------------------
// Helper fixtures
// ---------------------------------------------------------------------------

function buildFakeDeployments(items: object[]) {
  return { items };
}

function fakeDeploymentItem(overrides: {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  replicas?: number;
  readyReplicas?: number;
  image?: string;
}) {
  return {
    metadata: {
      name: overrides.name,
      namespace: overrides.namespace ?? "default",
      labels: overrides.labels ?? {},
      annotations: overrides.annotations ?? {},
    },
    spec: {
      replicas: overrides.replicas ?? 1,
      template: {
        spec: {
          containers: [{ image: overrides.image ?? "image:latest" }],
        },
      },
    },
    status: { readyReplicas: overrides.readyReplicas ?? 1 },
  };
}

function fakeCRDItem(overrides: {
  name: string;
  group: string;
  kind: string;
  scope?: string;
  versions?: Array<{ name: string; served: boolean }>;
}) {
  return {
    metadata: { name: overrides.name },
    spec: {
      group: overrides.group,
      scope: overrides.scope ?? "Namespaced",
      names: { kind: overrides.kind },
      versions: overrides.versions ?? [{ name: "v1alpha1", served: true }],
    },
  };
}

function fakeRollout(overrides: {
  name: string;
  namespace?: string;
  phase?: string;
  canaryWeight?: number;
}) {
  return {
    metadata: {
      name: overrides.name,
      namespace: overrides.namespace ?? "default",
    },
    status: {
      phase: overrides.phase ?? "Healthy",
      canary:
        overrides.canaryWeight !== undefined
          ? { weights: { canary: { weight: overrides.canaryWeight } } }
          : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KubernetesService", () => {
  let service: KubernetesService;
  let mockCatalogService: Partial<jest.Mocked<CatalogService>>;
  let mockEventsGateway: { server: { emit: jest.Mock } };

  const mockConfigService = {
    get: (key: string) => {
      if (key === "kubernetes.kubeconfigPath") return "/fake/kubeconfig";
      return "";
    },
  };

  beforeEach(async () => {
    // Reset all mock functions.
    mockListDeployments = jest.fn();
    mockListSecrets = jest.fn().mockResolvedValue({ items: [] });
    mockListCRDs = jest.fn().mockResolvedValue({ items: [] });
    mockListRollouts = jest.fn().mockResolvedValue({ items: [] });
    mockListNamespacedRollouts = jest.fn().mockResolvedValue({ items: [] });
    mockLoadFromFile = jest.fn();
    mockLoadFromCluster = jest.fn().mockImplementation(() => {
      throw new Error("not in cluster");
    });
    mockMakeApiClient = jest.fn().mockImplementation((ApiClass: object) => {
      const name = (ApiClass as { name?: string }).name ?? "";
      if (name === "AppsV1Api") {
        return { listDeploymentForAllNamespaces: mockListDeployments };
      }
      if (name === "CoreV1Api") {
        return {
          listSecretForAllNamespaces: mockListSecrets,
          listNamespacedSecret: mockListSecrets,
        };
      }
      if (name === "ApiextensionsV1Api") {
        return { listCustomResourceDefinition: mockListCRDs };
      }
      if (name === "CustomObjectsApi") {
        return {
          listClusterCustomObject: mockListRollouts,
          listNamespacedCustomObject: mockListNamespacedRollouts,
        };
      }
      return {};
    });

    mockCatalogService = {
      findAll: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockResolvedValue({ id: "new-id", name: "test" }),
      update: jest.fn().mockResolvedValue({ id: "existing-id" }),
    };

    mockEventsGateway = {
      server: { emit: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KubernetesService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<KubernetesService>(KubernetesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // isEnabled
  // -------------------------------------------------------------------------
  describe("isEnabled", () => {
    it("should return true when client initialized successfully", () => {
      expect(service.isEnabled()).toBe(true);
    });

    it("should return false when initialization fails", async () => {
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("file not found");
      });
      const failModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();
      const failedService =
        failModule.get<KubernetesService>(KubernetesService);
      expect(failedService.isEnabled()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // discoverWorkloads
  // -------------------------------------------------------------------------
  describe("discoverWorkloads", () => {
    it("should return an array of workloads from the cluster", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "user-service",
            namespace: "default",
            labels: { app: "user-service", team: "platform" },
            replicas: 3,
            readyReplicas: 3,
            image: "user-service:1.0.0",
          }),
        ]),
      );

      const workloads = await service.discoverWorkloads();
      expect(workloads).toHaveLength(1);
      expect(workloads[0]).toMatchObject({
        name: "user-service",
        namespace: "default",
        replicas: 3,
      });
    });

    it("should return empty array when API call fails", async () => {
      mockListDeployments.mockRejectedValue(new Error("API unavailable"));
      const workloads = await service.discoverWorkloads();
      expect(workloads).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // matchComponent
  // -------------------------------------------------------------------------
  describe("matchComponent", () => {
    it("should match workloads by name", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "user-service",
            labels: { app: "user-service" },
          }),
          fakeDeploymentItem({
            name: "payment-service",
            labels: { app: "payment" },
          }),
        ]),
      );
      const matches = await service.matchComponent("user");
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("user-service");
    });

    it("should return empty array when no workloads match", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({ name: "unrelated", labels: {} }),
        ]),
      );
      const matches = await service.matchComponent("no-match");
      expect(matches).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listCRDs (FARM-S139)
  // -------------------------------------------------------------------------
  describe("listCRDs", () => {
    it("should return empty array when Kubernetes is disabled", async () => {
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("disabled");
      });
      const disabledModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();
      const disabledService =
        disabledModule.get<KubernetesService>(KubernetesService);
      const crds = await disabledService.listCRDs();
      expect(crds).toEqual([]);
    });

    it("should map well-known operator groups to display templates", async () => {
      mockListCRDs.mockResolvedValue({
        items: [
          fakeCRDItem({
            name: "rollouts.argoproj.io",
            group: "argoproj.io",
            kind: "Rollout",
            scope: "Namespaced",
          }),
          fakeCRDItem({
            name: "prometheusrules.monitoring.coreos.com",
            group: "monitoring.coreos.com",
            kind: "PrometheusRule",
            scope: "Namespaced",
          }),
          fakeCRDItem({
            name: "widgets.custom.example.com",
            group: "custom.example.com",
            kind: "Widget",
            scope: "Cluster",
          }),
        ],
      });

      const crds: CrdResource[] = await service.listCRDs();

      expect(crds).toHaveLength(3);

      const argoCrd = crds.find((c) => c.group === "argoproj.io");
      expect(argoCrd?.displayTemplate).toBe("Argo Rollouts");
      expect(argoCrd?.kind).toBe("Rollout");

      const prometheusCrd = crds.find(
        (c) => c.group === "monitoring.coreos.com",
      );
      expect(prometheusCrd?.displayTemplate).toBe("Prometheus Operator");

      const unknownCrd = crds.find((c) => c.group === "custom.example.com");
      expect(unknownCrd?.displayTemplate).toBe("custom.example.com");
    });

    it("should return empty array when listCustomResourceDefinition throws", async () => {
      mockListCRDs.mockRejectedValue(new Error("server error"));
      const crds = await service.listCRDs();
      expect(crds).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // syncAnnotatedWorkloads (FARM-S139)
  // -------------------------------------------------------------------------
  describe("syncAnnotatedWorkloads", () => {
    it("should create a component when farm.io/component annotation is found and component does not exist", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "annotated-service",
            namespace: "production",
            annotations: {
              "farm.io/component": "my-annotated-service",
              "farm.io/owner": "platform-team",
            },
          }),
        ]),
      );
      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([[], 0]);

      const result = await service.syncAnnotatedWorkloads();

      expect(mockCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-annotated-service",
          owner: "platform-team",
        }),
      );
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
    });

    it("should update an existing component when it is already registered", async () => {
      const existingComponent = {
        id: "existing-uuid",
        name: "my-annotated-service",
        metadata: {},
      };
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "annotated-service",
            namespace: "production",
            annotations: { "farm.io/component": "my-annotated-service" },
          }),
        ]),
      );
      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([
        [existingComponent],
        1,
      ]);

      const result = await service.syncAnnotatedWorkloads();

      expect(mockCatalogService.update).toHaveBeenCalled();
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it("should skip deployments without farm.io/component annotation", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "no-annotation-service",
            annotations: {},
          }),
        ]),
      );

      const result = await service.syncAnnotatedWorkloads();

      expect(mockCatalogService.create).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
    });

    it("should return zeros when Kubernetes is disabled", async () => {
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("disabled");
      });
      const disabledModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();
      const disabledService =
        disabledModule.get<KubernetesService>(KubernetesService);
      const result = await disabledService.syncAnnotatedWorkloads();
      expect(result).toEqual({ created: 0, updated: 0 });
    });
  });

  // -------------------------------------------------------------------------
  // listRollouts (FARM-S141)
  // -------------------------------------------------------------------------
  describe("listRollouts", () => {
    it("should return empty array when Kubernetes is disabled", async () => {
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("disabled");
      });
      const disabledModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();
      const disabledService =
        disabledModule.get<KubernetesService>(KubernetesService);
      const rollouts = await disabledService.listRollouts();
      expect(rollouts).toEqual([]);
    });

    it("should handle 404 gracefully when CRD is not installed", async () => {
      const notFound = new Error("Not Found") as Error & {
        response: { statusCode: number };
      };
      notFound.response = { statusCode: 404 };
      mockListRollouts.mockRejectedValue(notFound);

      const rollouts = await service.listRollouts();
      expect(rollouts).toEqual([]);
    });

    it("should parse rollout status from cluster response", async () => {
      mockListRollouts.mockResolvedValue({
        items: [
          fakeRollout({
            name: "my-rollout",
            namespace: "production",
            phase: "Healthy",
          }),
          fakeRollout({
            name: "canary-app",
            namespace: "staging",
            phase: "Progressing",
            canaryWeight: 20,
          }),
        ],
      });

      const rollouts: ArgoRolloutStatus[] = await service.listRollouts();

      expect(rollouts).toHaveLength(2);
      expect(rollouts[0].name).toBe("my-rollout");
      expect(rollouts[0].phase).toBe("Healthy");
      expect(rollouts[1].canaryWeight).toBe(20);
    });

    it("should filter rollouts by namespace when namespace param is provided", async () => {
      mockListNamespacedRollouts.mockResolvedValue({
        items: [
          fakeRollout({
            name: "ns-rollout",
            namespace: "staging",
            phase: "Paused",
          }),
        ],
      });

      const rollouts = await service.listRollouts("staging");

      expect(mockListNamespacedRollouts).toHaveBeenCalled();
      expect(rollouts).toHaveLength(1);
      expect(rollouts[0].name).toBe("ns-rollout");
    });

    it("should return empty array when listClusterCustomObject throws a non-404 error", async () => {
      mockListRollouts.mockRejectedValue(new Error("Internal Server Error"));
      const rollouts = await service.listRollouts();
      expect(rollouts).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // pollRollouts — ROLLOUT_UPDATED event emission (FARM-S141)
  // -------------------------------------------------------------------------
  describe("pollRollouts", () => {
    it("should emit ROLLOUT_UPDATED when a rollout phase changes", async () => {
      // First poll — rollout is Healthy.
      mockListRollouts.mockResolvedValueOnce({
        items: [
          fakeRollout({
            name: "my-rollout",
            namespace: "prod",
            phase: "Healthy",
          }),
        ],
      });
      await service.pollRollouts();
      // The first time we see it, the cache was empty so it emits.
      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "rollout.updated",
        expect.objectContaining({ name: "my-rollout", phase: "Healthy" }),
      );

      jest.clearAllMocks();

      // Second poll — phase changed to Degraded.
      mockListRollouts.mockResolvedValueOnce({
        items: [
          fakeRollout({
            name: "my-rollout",
            namespace: "prod",
            phase: "Degraded",
          }),
        ],
      });
      await service.pollRollouts();
      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "rollout.updated",
        expect.objectContaining({ name: "my-rollout", phase: "Degraded" }),
      );
    });

    it("should NOT emit ROLLOUT_UPDATED when phase is unchanged", async () => {
      // First poll — prime the cache.
      mockListRollouts.mockResolvedValueOnce({
        items: [
          fakeRollout({
            name: "stable-rollout",
            namespace: "prod",
            phase: "Healthy",
          }),
        ],
      });
      await service.pollRollouts();
      jest.clearAllMocks();

      // Second poll — same phase.
      mockListRollouts.mockResolvedValueOnce({
        items: [
          fakeRollout({
            name: "stable-rollout",
            namespace: "prod",
            phase: "Healthy",
          }),
        ],
      });
      await service.pollRollouts();
      expect(mockEventsGateway.server.emit).not.toHaveBeenCalled();
    });
  });
});
