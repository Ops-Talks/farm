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
let mockListNodes: jest.Mock;
let mockListClusterCustomObjectCSV: jest.Mock;

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

function fakeNodeItem(overrides: {
  name: string;
  containerRuntimeVersion?: string;
  kernelVersion?: string;
  osImage?: string;
  architecture?: string;
}) {
  return {
    metadata: { name: overrides.name },
    status: {
      nodeInfo: {
        containerRuntimeVersion:
          overrides.containerRuntimeVersion ?? "containerd://1.6.20",
        kernelVersion: overrides.kernelVersion ?? "5.15.0-generic",
        osImage: overrides.osImage ?? "Ubuntu 22.04 LTS",
        architecture: overrides.architecture ?? "amd64",
      },
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
    mockListNodes = jest.fn().mockResolvedValue({ items: [] });
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
          listNode: mockListNodes,
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

  // -------------------------------------------------------------------------
  // Additional branch-coverage tests
  // -------------------------------------------------------------------------

  describe("initClient — loadFromCluster path", () => {
    it("should initialize from in-cluster config when kubeconfigPath is empty", async () => {
      // Make loadFromCluster succeed (not throw).
      mockLoadFromCluster = jest.fn();

      const inClusterConfig = {
        get: (key: string) =>
          key === "kubernetes.kubeconfigPath" ? "" : undefined,
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: inClusterConfig },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const inClusterService = module.get<KubernetesService>(KubernetesService);
      expect(inClusterService.isEnabled()).toBe(true);
    });
  });

  describe("getCoreV1Api and getCustomObjectsApi", () => {
    it("should return the CoreV1Api instance", () => {
      const api = service.getCoreV1Api();
      expect(api).not.toBeNull();
    });

    it("should return the CustomObjectsApi instance", () => {
      const api = service.getCustomObjectsApi();
      expect(api).not.toBeNull();
    });
  });

  describe("discoverWorkloads — appsV1Api is null", () => {
    it("should return empty array when appsV1Api is null (makeApiClient returns null)", async () => {
      mockMakeApiClient = jest.fn().mockReturnValue(null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const nullApiService = module.get<KubernetesService>(KubernetesService);
      const workloads = await nullApiService.discoverWorkloads();
      expect(workloads).toEqual([]);
    });
  });

  describe("syncAnnotatedWorkloads — catalogService not available", () => {
    it("should return zeros when catalogService is not provided", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EventsGateway, useValue: mockEventsGateway },
          // Note: CatalogService intentionally omitted
        ],
      }).compile();

      const noCatalogService = module.get<KubernetesService>(KubernetesService);

      const result = await noCatalogService.syncAnnotatedWorkloads();
      expect(result).toEqual({ created: 0, updated: 0 });
    });
  });

  describe("syncAnnotatedWorkloads — inner error handling", () => {
    it("should catch and log errors thrown by catalogService.create", async () => {
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
      (mockCatalogService.create as jest.Mock).mockRejectedValue(
        new Error("create failed"),
      );

      const result = await service.syncAnnotatedWorkloads();

      // Error is swallowed; counters remain at 0.
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it("should catch and log errors thrown by the outer API call", async () => {
      mockListDeployments.mockRejectedValue(new Error("API unavailable"));

      const result = await service.syncAnnotatedWorkloads();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });

    it("should use namespace as owner when farm.io/owner annotation is absent", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "no-owner-service",
            namespace: "staging",
            annotations: {
              "farm.io/component": "no-owner-component",
              // No "farm.io/owner" annotation
            },
          }),
        ]),
      );
      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([[], 0]);

      await service.syncAnnotatedWorkloads();

      expect(mockCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "staging" }),
      );
    });
  });

  describe("pollRollouts — disabled service", () => {
    it("should return early without listing rollouts when disabled", async () => {
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("disabled");
      });

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          KubernetesService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CatalogService, useValue: mockCatalogService },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const disabledService =
        disabledModule.get<KubernetesService>(KubernetesService);

      await disabledService.pollRollouts();

      // listRollouts is never called since the service returns early.
      expect(mockListRollouts).not.toHaveBeenCalled();
    });
  });

  describe("parseRollout — blue-green and analysis run fields", () => {
    it("should populate blueGreen fields when blueGreen status is present", async () => {
      mockListRollouts.mockResolvedValue({
        items: [
          {
            metadata: { name: "bg-rollout", namespace: "prod" },
            status: {
              phase: "Healthy",
              blueGreen: {
                activeSelector: "abc123",
                previewSelector: "def456",
              },
              canaryStatus: {
                currentStepAnalysisRunStatus: {
                  name: "analysis-run-1",
                  phase: "Running",
                  message: "in progress",
                },
              },
            },
          },
        ],
      });

      const rollouts = await service.listRollouts();

      expect(rollouts[0].blueGreenActive).toBe("abc123");
      expect(rollouts[0].blueGreenPreview).toBe("def456");
      expect(rollouts[0].analysisRunResults).toHaveLength(1);
      expect(rollouts[0].analysisRunResults![0].name).toBe("analysis-run-1");
    });

    it("should leave analysisRunResults undefined when no analysis run exists", async () => {
      mockListRollouts.mockResolvedValue({
        items: [
          {
            metadata: { name: "plain-rollout", namespace: "prod" },
            status: { phase: "Healthy" },
          },
        ],
      });

      const rollouts = await service.listRollouts();

      expect(rollouts[0].analysisRunResults).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Branch coverage for ?? defaults and String(error) paths
  // -------------------------------------------------------------------------

  describe("discoverWorkloads — ?? default field values", () => {
    it("should use default values when deployment fields are absent", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          {
            // All optional fields absent to trigger ?? defaults.
            metadata: {},
            spec: {},
            status: {},
          },
        ]),
      );

      const workloads = await service.discoverWorkloads();

      expect(workloads[0].name).toBe("unknown");
      expect(workloads[0].namespace).toBe("default");
      expect(workloads[0].replicas).toBe(0);
      expect(workloads[0].readyReplicas).toBe(0);
      expect(workloads[0].image).toBe("unknown");
      expect(workloads[0].labels).toEqual({});
    });

    it("should use String(error) when non-Error is thrown in discoverWorkloads", async () => {
      mockListDeployments.mockRejectedValue("non-error-string");

      const workloads = await service.discoverWorkloads();
      expect(workloads).toEqual([]);
    });
  });

  describe("listCRDs — ?? default and String(error) paths", () => {
    it("should fill in defaults for CRDs with empty spec", async () => {
      mockListCRDs.mockResolvedValue({
        items: [
          {
            // All optional fields absent.
            metadata: {},
            spec: { versions: [] },
          },
          {
            metadata: {},
            spec: {
              versions: [
                { name: "v1beta1", served: false },
                { name: "v1", served: true },
              ],
            },
          },
        ],
      });

      const crds = await service.listCRDs();

      expect(crds[0].name).toBe("unknown");
      expect(crds[0].group).toBe("");
      expect(crds[0].version).toBe("v1"); // No served version; fallback to storedVersions[0] → no items → "v1"
      expect(crds[0].scope).toBe("Namespaced");
      expect(crds[0].kind).toBe("Unknown");
    });

    it("should use String(error) when non-Error is thrown in listCRDs", async () => {
      mockListCRDs.mockRejectedValue(42);

      const crds = await service.listCRDs();
      expect(crds).toEqual([]);
    });

    it("should use storedVersions[0] when no version is marked as served", async () => {
      mockListCRDs.mockResolvedValue({
        items: [
          {
            metadata: { name: "my-crd.example.com" },
            spec: {
              group: "example.com",
              scope: "Cluster",
              names: { kind: "MyResource" },
              versions: [{ name: "v1alpha1", served: false }],
            },
          },
        ],
      });

      const crds = await service.listCRDs();
      // No served version → falls back to storedVersions[0].name
      expect(crds[0].version).toBe("v1alpha1");
    });
  });

  describe("listRollouts — String(error) path", () => {
    it("should use String(error) when non-Error is thrown", async () => {
      mockListRollouts.mockRejectedValue({ message: "object-error" });

      const rollouts = await service.listRollouts();
      expect(rollouts).toEqual([]);
    });

    it("should return items ?? [] when items is undefined", async () => {
      mockListRollouts.mockResolvedValue({
        // No items property
      });

      const rollouts = await service.listRollouts();
      expect(rollouts).toHaveLength(0);
    });
  });

  describe("syncAnnotatedWorkloads — String(error) path for inner error", () => {
    it("should log String(error) when a non-Error is thrown in inner catch", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "annotated-service",
            annotations: { "farm.io/component": "my-svc" },
          }),
        ]),
      );
      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([[], 0]);
      (mockCatalogService.create as jest.Mock).mockRejectedValue(
        "non-error-thrown",
      );

      const result = await service.syncAnnotatedWorkloads();
      expect(result.created).toBe(0);
    });

    it("should log String(error) when outer API call throws a non-Error", async () => {
      mockListDeployments.mockRejectedValue("non-error-outer");

      const result = await service.syncAnnotatedWorkloads();
      expect(result.created).toBe(0);
    });

    it("should use namespace as default when annotation owner is missing and namespace is also absent", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          {
            metadata: {
              annotations: { "farm.io/component": "no-ns-svc" },
              // No namespace, no farm.io/owner
            },
            spec: { replicas: 1 },
            status: {},
          },
        ]),
      );
      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([[], 0]);

      await service.syncAnnotatedWorkloads();

      expect(mockCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "unknown" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // listNodeRuntimes (FARM-S241)
  // -------------------------------------------------------------------------

  describe("listNodeRuntimes", () => {
    it("should return empty array when CoreV1Api is not initialized", async () => {
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

      const result = await failedService.listNodeRuntimes();
      expect(result).toEqual([]);
    });

    it("should return runtime info for all nodes", async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "node-1",
            containerRuntimeVersion: "containerd://1.7.2",
          }),
          fakeNodeItem({
            name: "node-2",
            containerRuntimeVersion: "cri-o://1.28.0",
          }),
        ],
      });

      const result = await service.listNodeRuntimes();

      expect(result).toHaveLength(2);
      expect(result[0].nodeName).toBe("node-1");
      expect(result[1].nodeName).toBe("node-2");
    });

    it('should parse "containerd://1.7.2" correctly', async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "worker-1",
            containerRuntimeVersion: "containerd://1.7.2",
          }),
        ],
      });

      const result = await service.listNodeRuntimes();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        nodeName: "worker-1",
        runtimeName: "containerd",
        runtimeVersion: "1.7.2",
      });
    });

    it('should parse "cri-o://1.28.0" correctly', async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "worker-2",
            containerRuntimeVersion: "cri-o://1.28.0",
          }),
        ],
      });

      const result = await service.listNodeRuntimes();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        nodeName: "worker-2",
        runtimeName: "cri-o",
        runtimeVersion: "1.28.0",
      });
    });

    it("should handle nodes without containerRuntimeVersion", async () => {
      mockListNodes.mockResolvedValue({
        items: [
          {
            metadata: { name: "bare-node" },
            status: { nodeInfo: {} },
          },
        ],
      });

      const result = await service.listNodeRuntimes();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        nodeName: "bare-node",
        runtimeName: "unknown",
        runtimeVersion: "unknown",
      });
    });

    it("should handle API errors gracefully", async () => {
      mockListNodes.mockRejectedValue(new Error("connection refused"));

      const result = await service.listNodeRuntimes();

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getCrioMetrics (FARM-S241)
  // -------------------------------------------------------------------------

  describe("getCrioMetrics", () => {
    it("should return available=false when CoreV1Api is not initialized", async () => {
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

      const result = await failedService.getCrioMetrics("node-1");

      expect(result).toEqual({ nodeName: "node-1", available: false });
    });

    it("should return available=false when node runtime is not CRI-O", async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "worker-1",
            containerRuntimeVersion: "containerd://1.7.2",
          }),
        ],
      });

      const result = await service.getCrioMetrics("worker-1");

      expect(result).toEqual({ nodeName: "worker-1", available: false });
    });

    it("should return available=true when CRI-O is detected", async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "worker-crio",
            containerRuntimeVersion: "cri-o://1.28.0",
          }),
        ],
      });

      const result = await service.getCrioMetrics("worker-crio");

      expect(result).toEqual({ nodeName: "worker-crio", available: true });
    });

    it("should return available=true when CRI-O is detected (crio:// prefix)", async () => {
      mockListNodes.mockResolvedValue({
        items: [
          fakeNodeItem({
            name: "worker-crio2",
            containerRuntimeVersion: "crio://1.28.0",
          }),
        ],
      });

      const result = await service.getCrioMetrics("worker-crio2");

      expect(result).toEqual({ nodeName: "worker-crio2", available: true });
    });

    it("should return available=false when listNodeRuntimes throws", async () => {
      jest
        .spyOn(service, "listNodeRuntimes")
        .mockRejectedValue(new Error("unexpected failure"));

      const result = await service.getCrioMetrics("worker-1");

      expect(result).toEqual({ nodeName: "worker-1", available: false });
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("KubernetesService — additional branch coverage", () => {
  let mockCatalogService: Partial<jest.Mocked<CatalogService>>;
  let mockEventsGateway: { server: { emit: jest.Mock } | null };
  let mockConfigService: { get: jest.Mock };

  // Helpers copied from parent describe
  function buildFakeDeployments(items: object[]) {
    return { items };
  }

  function fakeDeploymentItem(opts: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  }) {
    return {
      metadata: {
        name: opts.name ?? "deploy-1",
        namespace: opts.namespace ?? "default",
        annotations: opts.annotations ?? {},
        labels: opts.labels ?? {},
      },
      spec: { replicas: 1 },
      status: { readyReplicas: 1 },
    };
  }

  beforeEach(() => {
    mockListDeployments = jest.fn().mockResolvedValue({ items: [] });
    mockListCRDs = jest.fn().mockResolvedValue({ items: [] });
    mockListRollouts = jest.fn().mockResolvedValue({ items: [] });
    mockListNamespacedRollouts = jest.fn().mockResolvedValue({ items: [] });
    mockListNodes = jest.fn().mockResolvedValue({ items: [] });
    mockListClusterCustomObjectCSV = jest.fn().mockResolvedValue({ items: [] });

    mockCatalogService = {
      findAll: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn().mockResolvedValue({ id: "new-comp", name: "test" }),
      update: jest.fn().mockResolvedValue({ id: "upd-comp", name: "test" }),
    };

    mockEventsGateway = { server: { emit: jest.fn() } };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "kubernetes.kubeconfigPath") return "";
        return undefined;
      }),
    };
  });

  async function buildService() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KubernetesService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();
    return module.get<KubernetesService>(KubernetesService);
  }

  // -------------------------------------------------------------------------
  // discoverWorkloads — null items in response
  // -------------------------------------------------------------------------

  describe("discoverWorkloads — null items", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockLoadFromCluster = jest.fn();
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest.fn().mockResolvedValue({}),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const workloads = await service.discoverWorkloads();

      expect(workloads).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listCRDs — null items in response
  // -------------------------------------------------------------------------

  describe("listCRDs — null items", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockLoadFromCluster = jest.fn();
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest.fn().mockResolvedValue({}),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const crds = await service.listCRDs();

      expect(crds).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listCRDs — crd.spec?.versions ?? []
  // -------------------------------------------------------------------------

  describe("listCRDs — CRD with no versions", () => {
    it("should fall back to v1 when versions array is absent", async () => {
      mockLoadFromCluster = jest.fn();
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: { name: "my-crd.example.com" },
              spec: {
                group: "example.com",
                scope: "Cluster",
                names: { kind: "MyResource" },
                // No versions field
              },
            },
          ],
        }),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const crds = await service.listCRDs();

      expect(crds[0].version).toBe("v1");
    });
  });

  // -------------------------------------------------------------------------
  // syncAnnotatedWorkloads — not enabled (returns early)
  // -------------------------------------------------------------------------

  describe("syncAnnotatedWorkloads — disabled", () => {
    it("should return 0,0 when kubernetes is not enabled", async () => {
      // Force initClient to fail so enabled=false
      mockLoadFromCluster = jest.fn().mockImplementation(() => {
        throw new Error("No cluster config");
      });
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("No file");
      });
      mockMakeApiClient = jest.fn();

      const service = await buildService();

      const result = await service.syncAnnotatedWorkloads();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // syncAnnotatedWorkloads — null annotations on deployment
  // -------------------------------------------------------------------------

  describe("syncAnnotatedWorkloads — deployment without annotations", () => {
    it("should skip deployments that have no annotations at all", async () => {
      mockLoadFromCluster = jest.fn();
      const mockListDeploy = jest.fn().mockResolvedValue(
        buildFakeDeployments([
          {
            metadata: {
              name: "no-annotations-deploy",
              namespace: "default",
              // No annotations field
            },
            spec: { replicas: 1 },
            status: {},
          },
        ]),
      );
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: mockListDeploy,
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.syncAnnotatedWorkloads();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockCatalogService.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // syncAnnotatedWorkloads — existing component with null metadata
  // -------------------------------------------------------------------------

  describe("syncAnnotatedWorkloads — existing component with null metadata", () => {
    it("should merge into empty object when existing.metadata is null", async () => {
      mockLoadFromCluster = jest.fn();
      const mockListDeploy = jest.fn().mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "svc-deploy",
            namespace: "default",
            annotations: {
              "farm.io/component": "my-svc",
              "farm.io/owner": "team-a",
            },
          }),
        ]),
      );
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: mockListDeploy,
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      (mockCatalogService.findAll as jest.Mock).mockResolvedValue([
        [{ id: "existing-id", name: "my-svc", metadata: null }],
        1,
      ]);
      (mockCatalogService.update as jest.Mock).mockResolvedValue({
        id: "existing-id",
      });

      const result = await service.syncAnnotatedWorkloads();

      expect(result.updated).toBe(1);
      expect(mockCatalogService.update).toHaveBeenCalledWith(
        "existing-id",
        expect.objectContaining({
          metadata: expect.objectContaining({
            k8sAnnotationSync: true,
          }) as unknown,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // pollRollouts — disabled
  // -------------------------------------------------------------------------

  describe("pollRollouts — disabled", () => {
    it("should return early without fetching rollouts when disabled", async () => {
      mockLoadFromCluster = jest.fn().mockImplementation(() => {
        throw new Error("No cluster");
      });
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("No file");
      });
      mockMakeApiClient = jest.fn();

      const service = await buildService();

      // Should not throw even when disabled
      await expect(service.pollRollouts()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // pollRollouts — same phase (cache update branch)
  // -------------------------------------------------------------------------

  describe("pollRollouts — same phase triggers cache update only", () => {
    it("should update cache without emitting when rollout phase is unchanged", async () => {
      mockLoadFromCluster = jest.fn();
      const rolloutItem = {
        metadata: { name: "stable-rollout", namespace: "prod" },
        status: { phase: "Healthy" },
      };
      const mockListRolloutsLocal = jest
        .fn()
        .mockResolvedValue({ items: [rolloutItem] });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListRolloutsLocal,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      // First poll — cache is empty, phase change detected
      await service.pollRollouts();

      const emitCount = (mockEventsGateway.server as { emit: jest.Mock }).emit
        .mock.calls.length;

      // Second poll — same phase, should not emit again
      await service.pollRollouts();

      const emitCountAfter = (mockEventsGateway.server as { emit: jest.Mock })
        .emit.mock.calls.length;

      // Only one emit (from first poll)
      expect(emitCountAfter).toBe(emitCount);
    });
  });

  // -------------------------------------------------------------------------
  // parseRollout — status absent (raw.status ?? {})
  // -------------------------------------------------------------------------

  describe("parseRollout — status absent", () => {
    it("should use Unknown phase and empty defaults when status is absent", async () => {
      mockLoadFromCluster = jest.fn();
      const mockListRolloutsLocal = jest.fn().mockResolvedValue({
        items: [
          {
            metadata: { name: "no-status-rollout", namespace: "default" },
            // No status field
          },
        ],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListRolloutsLocal,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const rollouts = await service.listRollouts();

      expect(rollouts[0].phase).toBe("Unknown");
      expect(rollouts[0].canaryWeight).toBeUndefined();
      expect(rollouts[0].blueGreenActive).toBeUndefined();
      expect(rollouts[0].analysisRunResults).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // listRollouts — with namespace filter
  // -------------------------------------------------------------------------

  describe("listRollouts — with namespace filter", () => {
    it("should call listNamespacedCustomObject when namespace is provided", async () => {
      mockLoadFromCluster = jest.fn();
      const mockNamespacedList = jest.fn().mockResolvedValue({ items: [] });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNamespacedCustomObject: mockNamespacedList,
      });
      const service = await buildService();

      const rollouts = await service.listRollouts("my-namespace");

      expect(mockNamespacedList).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "my-namespace" }),
      );
      expect(rollouts).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // initClient — String(error) path
  // -------------------------------------------------------------------------

  describe("initClient — String(error) path", () => {
    it("should log String(error) when a non-Error is thrown during initialization", async () => {
      mockLoadFromCluster = jest.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string error from cluster";
      });
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string error from file";
      });
      mockMakeApiClient = jest.fn();

      const service = await buildService();

      // Service initializes but is disabled
      expect(service.isEnabled()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // listOperators (FARM-S237)
  // -------------------------------------------------------------------------

  describe("listOperators", () => {
    it("should return empty array when CustomObjectsApi is not initialized", async () => {
      mockLoadFromCluster = jest.fn().mockImplementation(() => {
        throw new Error("not in cluster");
      });
      mockLoadFromFile = jest.fn().mockImplementation(() => {
        throw new Error("file not found");
      });
      mockMakeApiClient = jest.fn();
      const service = await buildService();

      const result = await service.listOperators();

      expect(result).toEqual([]);
    });

    it("should return mapped OperatorInfo array from CSV response", async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest.fn().mockResolvedValue({
        items: [
          {
            metadata: {
              name: "prometheus-operator.v0.65.1",
              namespace: "monitoring",
              creationTimestamp: "2024-01-01T00:00:00Z",
            },
            spec: {
              displayName: "Prometheus Operator",
              version: "0.65.1",
              description: "Manages Prometheus instances",
              provider: { name: "CoreOS" },
              icon: [{ base64data: "abc123", mediatype: "image/png" }],
              customresourcedefinitions: {
                owned: [
                  {
                    name: "prometheuses.monitoring.coreos.com",
                    version: "v1",
                    kind: "Prometheus",
                    description: "A Prometheus instance",
                  },
                ],
              },
            },
            status: { phase: "Succeeded" },
          },
        ],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "prometheus-operator.v0.65.1",
        displayName: "Prometheus Operator",
        version: "0.65.1",
        namespace: "monitoring",
        phase: "Succeeded",
        description: "Manages Prometheus instances",
        provider: "CoreOS",
        createdAt: "2024-01-01T00:00:00Z",
      });
      expect(result[0].icon).toBe("data:image/png;base64,abc123");
      expect(result[0].customResourceDefinitions).toHaveLength(1);
      expect(result[0].customResourceDefinitions[0]).toMatchObject({
        name: "prometheuses.monitoring.coreos.com",
        version: "v1",
        kind: "Prometheus",
        description: "A Prometheus instance",
      });
    });

    it("should handle 404 gracefully when OLM is not installed", async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest.fn().mockRejectedValue({
        response: { statusCode: 404 },
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result).toEqual([]);
    });

    it("should handle API errors gracefully and return empty array", async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result).toEqual([]);
    });

    it("should extract customResourceDefinitions from spec.customresourcedefinitions.owned", async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest.fn().mockResolvedValue({
        items: [
          {
            metadata: {
              name: "test-operator.v1.0.0",
              namespace: "default",
              creationTimestamp: "2024-01-01T00:00:00Z",
            },
            spec: {
              displayName: "Test Operator",
              version: "1.0.0",
              customresourcedefinitions: {
                owned: [
                  {
                    name: "foos.example.com",
                    version: "v1",
                    kind: "Foo",
                    description: "A Foo resource",
                  },
                  {
                    name: "bars.example.com",
                    version: "v1beta1",
                    kind: "Bar",
                    description: "A Bar resource",
                  },
                ],
              },
            },
            status: { phase: "Succeeded" },
          },
        ],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result[0].customResourceDefinitions).toHaveLength(2);
      expect(result[0].customResourceDefinitions[0].name).toBe(
        "foos.example.com",
      );
      expect(result[0].customResourceDefinitions[0].kind).toBe("Foo");
      expect(result[0].customResourceDefinitions[1].name).toBe(
        "bars.example.com",
      );
      expect(result[0].customResourceDefinitions[1].kind).toBe("Bar");
      expect(result[0].customResourceDefinitions[1].version).toBe("v1beta1");
    });

    it("should handle CSV with missing spec fields gracefully", async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest.fn().mockResolvedValue({
        items: [
          {
            metadata: {
              name: "bare-operator.v1.0.0",
              namespace: "default",
              creationTimestamp: "2024-01-01T00:00:00Z",
            },
            // No spec at all
            status: { phase: "Succeeded" },
          },
        ],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe("bare-operator.v1.0.0");
      expect(result[0].version).toBe("unknown");
      expect(result[0].description).toBe("");
      expect(result[0].customResourceDefinitions).toEqual([]);
      expect(result[0].icon).toBeUndefined();
      expect(result[0].provider).toBeUndefined();
    });

    it('should set phase to "Unknown" when status.phase is undefined', async () => {
      mockLoadFromCluster = jest.fn();
      mockListClusterCustomObjectCSV = jest.fn().mockResolvedValue({
        items: [
          {
            metadata: {
              name: "no-phase-op.v1.0.0",
              namespace: "default",
              creationTimestamp: "2024-01-01T00:00:00Z",
            },
            spec: { displayName: "No Phase Op" },
            // No status at all
          },
        ],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockListClusterCustomObjectCSV,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperators();

      expect(result[0].phase).toBe("Unknown");
    });
  });

  // -------------------------------------------------------------------------
  // listOperatorCustomResources (FARM-S238)
  // -------------------------------------------------------------------------

  describe("listOperatorCustomResources", () => {
    const csvWithCrds = {
      metadata: {
        name: "test-operator.v1.0.0",
        namespace: "operators",
        creationTimestamp: "2024-01-01T00:00:00Z",
      },
      spec: {
        displayName: "Test Operator",
        version: "1.0.0",
        customresourcedefinitions: {
          owned: [
            {
              name: "widgets.example.com",
              version: "v1",
              kind: "Widget",
              description: "A Widget resource",
            },
          ],
        },
      },
      status: { phase: "Succeeded" },
    };

    it("should return empty array when operator is not found", async () => {
      mockLoadFromCluster = jest.fn();
      // Return a CSV list that does NOT contain the operator we ask for
      const mockClusterObj = jest.fn().mockResolvedValue({
        items: [csvWithCrds],
      });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockClusterObj,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperatorCustomResources(
        "nonexistent-operator",
      );

      expect(result).toEqual([]);
    });

    it("should return CR instances from discovered CRDs", async () => {
      mockLoadFromCluster = jest.fn();
      const mockClusterObj = jest
        .fn()
        // First call: listOperators → returns CSV list
        .mockResolvedValueOnce({ items: [csvWithCrds] })
        // Second call: list CRD instances for widgets.example.com
        .mockResolvedValueOnce({
          items: [
            {
              metadata: {
                name: "my-widget",
                namespace: "default",
                creationTimestamp: "2024-06-01T12:00:00Z",
              },
              status: {
                conditions: [
                  {
                    type: "Ready",
                    status: "True",
                    reason: "Available",
                    message: "Widget is ready",
                    lastTransitionTime: "2024-06-01T12:00:00Z",
                  },
                ],
              },
            },
          ],
        });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockClusterObj,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperatorCustomResources(
        "test-operator.v1.0.0",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "my-widget",
        namespace: "default",
        kind: "Widget",
        apiVersion: "example.com/v1",
      });
      expect(result[0].conditions).toBeDefined();
      expect(result[0].conditions![0].type).toBe("Ready");
    });

    it("should handle API errors when querying CR instances gracefully", async () => {
      mockLoadFromCluster = jest.fn();
      const mockClusterObj = jest
        .fn()
        // First call: listOperators → returns CSV list
        .mockResolvedValueOnce({ items: [csvWithCrds] })
        // Second call: CRD query fails
        .mockRejectedValueOnce(new Error("Forbidden"));
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockClusterObj,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperatorCustomResources(
        "test-operator.v1.0.0",
      );

      // Should return empty since the CRD query failed gracefully
      expect(result).toEqual([]);
    });

    it("should return empty array when operator has no owned CRDs", async () => {
      mockLoadFromCluster = jest.fn();
      const csvNoCrds = {
        metadata: {
          name: "empty-operator.v1.0.0",
          namespace: "operators",
          creationTimestamp: "2024-01-01T00:00:00Z",
        },
        spec: {
          displayName: "Empty Operator",
          version: "1.0.0",
          // No customresourcedefinitions
        },
        status: { phase: "Succeeded" },
      };
      const mockClusterObj = jest
        .fn()
        .mockResolvedValue({ items: [csvNoCrds] });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockClusterObj,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperatorCustomResources(
        "empty-operator.v1.0.0",
      );

      expect(result).toEqual([]);
    });

    it("should merge results from multiple owned CRDs", async () => {
      mockLoadFromCluster = jest.fn();
      const csvMultiCrd = {
        metadata: {
          name: "multi-operator.v2.0.0",
          namespace: "operators",
          creationTimestamp: "2024-01-01T00:00:00Z",
        },
        spec: {
          displayName: "Multi Operator",
          version: "2.0.0",
          customresourcedefinitions: {
            owned: [
              {
                name: "alphas.multi.io",
                version: "v1",
                kind: "Alpha",
                description: "Alpha resource",
              },
              {
                name: "betas.multi.io",
                version: "v1beta1",
                kind: "Beta",
                description: "Beta resource",
              },
            ],
          },
        },
        status: { phase: "Succeeded" },
      };
      const mockClusterObj = jest
        .fn()
        // First call: listOperators
        .mockResolvedValueOnce({ items: [csvMultiCrd] })
        // Second call: alphas
        .mockResolvedValueOnce({
          items: [
            {
              metadata: {
                name: "alpha-1",
                namespace: "default",
                creationTimestamp: "2024-06-01T00:00:00Z",
              },
            },
          ],
        })
        // Third call: betas
        .mockResolvedValueOnce({
          items: [
            {
              metadata: {
                name: "beta-1",
                namespace: "production",
                creationTimestamp: "2024-06-02T00:00:00Z",
              },
            },
            {
              metadata: {
                name: "beta-2",
                namespace: "staging",
                creationTimestamp: "2024-06-03T00:00:00Z",
              },
            },
          ],
        });
      mockMakeApiClient = jest.fn().mockReturnValue({
        listDeploymentForAllNamespaces: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listCustomResourceDefinition: jest
          .fn()
          .mockResolvedValue({ items: [] }),
        listClusterCustomObject: mockClusterObj,
        listNamespacedCustomObject: jest.fn().mockResolvedValue({ items: [] }),
        listNode: jest.fn().mockResolvedValue({ items: [] }),
      });
      const service = await buildService();

      const result = await service.listOperatorCustomResources(
        "multi-operator.v2.0.0",
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: "alpha-1",
        kind: "Alpha",
        apiVersion: "multi.io/v1",
      });
      expect(result[1]).toMatchObject({
        name: "beta-1",
        kind: "Beta",
        apiVersion: "multi.io/v1beta1",
      });
      expect(result[2]).toMatchObject({
        name: "beta-2",
        kind: "Beta",
      });
    });
  });
});

// ---------------------------------------------------------------------------
