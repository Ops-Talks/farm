import { Test, TestingModule } from "@nestjs/testing";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { KubernetesController } from "./kubernetes.controller";
import {
  KubernetesService,
  OperatorInfo,
  CustomResourceInstance,
  NodeRuntimeInfo,
  CrioStorageMetrics,
} from "./kubernetes.service";
import { KyvernoPolicyReportService } from "./kyverno-policy-report.service";
import { GatekeeperService } from "./gatekeeper.service";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CreateOperatorBindingBodyDto } from "./dto/create-operator-binding-body.dto";
import { FluxBindingService } from "./flux-binding.service";
import { KedaBindingService } from "./keda-binding.service";

describe("KubernetesController", () => {
  let controller: KubernetesController;
  let kubernetesService: jest.Mocked<
    Pick<
      KubernetesService,
      | "discoverWorkloads"
      | "matchComponent"
      | "listCRDs"
      | "listRollouts"
      | "listOperators"
      | "listOperatorCustomResources"
      | "listNodeRuntimes"
      | "getCrioMetrics"
    >
  >;
  let kyvernoService: jest.Mocked<
    Pick<
      KyvernoPolicyReportService,
      "listPolicyReports" | "listClusterPolicyReports"
    >
  >;
  let gatekeeperService: jest.Mocked<
    Pick<
      GatekeeperService,
      "isGatekeeperEnabled" | "listConstraintTemplates" | "listViolations"
    >
  >;
  let bindingService: jest.Mocked<
    Pick<
      OperatorBindingService,
      "create" | "findByOperator" | "findByComponent" | "remove"
    >
  >;

  const mockWorkload = {
    name: "my-deploy",
    namespace: "default",
    replicas: 2,
    readyReplicas: 2,
    image: "nginx:latest",
    labels: {},
  };

  const mockCrd = {
    name: "rollouts.argoproj.io",
    group: "argoproj.io",
    version: "v1alpha1",
    scope: "Namespaced",
    kind: "Rollout",
    displayTemplate: "Argo Rollouts",
  };

  const mockRollout = {
    name: "my-rollout",
    namespace: "default",
    phase: "Healthy",
    updatedAt: new Date().toISOString(),
  };

  const mockPolicyReport = {
    name: "report-1",
    namespace: "default",
    resourceId: "default/pod-1",
    resourceType: "k8s-pod",
    results: [],
  };

  const mockOperator: OperatorInfo = {
    name: "prometheus-operator.v0.65.1",
    displayName: "Prometheus Operator",
    version: "0.65.1",
    namespace: "monitoring",
    phase: "Succeeded",
    description: "Manages Prometheus instances",
    provider: "Red Hat",
    createdAt: new Date().toISOString(),
    customResourceDefinitions: [
      {
        name: "prometheuses.monitoring.coreos.com",
        version: "v1",
        kind: "Prometheus",
        description: "A Prometheus deployment",
      },
    ],
  };

  const mockCR: CustomResourceInstance = {
    name: "k8s-prometheus",
    namespace: "monitoring",
    kind: "Prometheus",
    apiVersion: "monitoring.coreos.com/v1",
    status: { availableReplicas: 1 },
    conditions: [{ type: "Available", status: "True" }],
    createdAt: new Date().toISOString(),
  };

  const mockRuntime: NodeRuntimeInfo = {
    nodeName: "node-1",
    runtimeName: "containerd",
    runtimeVersion: "1.7.2",
    kernelVersion: "5.15.0-91-generic",
    osImage: "Ubuntu 22.04.3 LTS",
    architecture: "amd64",
  };

  const mockCrioMetrics: CrioStorageMetrics = {
    nodeName: "node-1",
    available: true,
    imageLayers: 42,
    cacheHitRate: 0.85,
    storageUsageBytes: 1073741824,
  };

  const mockBinding = {
    id: "binding-uuid-1",
    operatorName: "prometheus-operator.v0.65.1",
    operatorNamespace: "monitoring",
    componentId: "comp-uuid-1",
    addedAt: new Date(),
    organizationId: "org-1",
  } as OperatorBinding;

  beforeEach(async () => {
    kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([mockWorkload]),
      matchComponent: jest.fn().mockResolvedValue([mockWorkload]),
      listCRDs: jest.fn().mockResolvedValue([mockCrd]),
      listRollouts: jest.fn().mockResolvedValue([mockRollout]),
      listOperators: jest.fn().mockResolvedValue([mockOperator]),
      listOperatorCustomResources: jest.fn().mockResolvedValue([mockCR]),
      listNodeRuntimes: jest.fn().mockResolvedValue([mockRuntime]),
      getCrioMetrics: jest.fn().mockResolvedValue(mockCrioMetrics),
      isEnabled: jest.fn().mockReturnValue(false),
    };
    kyvernoService = {
      listPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
      listClusterPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
    };

    gatekeeperService = {
      isGatekeeperEnabled: jest.fn().mockResolvedValue(false),
      listConstraintTemplates: jest.fn().mockResolvedValue([]),
      listViolations: jest.fn().mockResolvedValue([]),
    };

    bindingService = {
      create: jest.fn().mockResolvedValue(mockBinding),
      findByOperator: jest.fn().mockResolvedValue([mockBinding]),
      findByComponent: jest.fn().mockResolvedValue([mockBinding]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        { provide: KyvernoPolicyReportService, useValue: kyvernoService },
        { provide: GatekeeperService, useValue: gatekeeperService },
        { provide: OperatorBindingService, useValue: bindingService },
      ],
    }).compile();

    controller = module.get<KubernetesController>(KubernetesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listWorkloads", () => {
    it("should return all discovered workloads", async () => {
      const result = await controller.listWorkloads();
      expect(result).toEqual([mockWorkload]);
      expect(kubernetesService.discoverWorkloads).toHaveBeenCalled();
    });
  });

  describe("matchComponent", () => {
    it("should return workloads matching the component name", async () => {
      const result = await controller.matchComponent("my-deploy");
      expect(result).toEqual([mockWorkload]);
      expect(kubernetesService.matchComponent).toHaveBeenCalledWith(
        "my-deploy",
      );
    });
  });

  describe("listCRDs", () => {
    it("should return all CRDs", async () => {
      const result = await controller.listCRDs();
      expect(result).toEqual([mockCrd]);
      expect(kubernetesService.listCRDs).toHaveBeenCalled();
    });
  });

  describe("listCRDsByGroup", () => {
    it("should return CRDs filtered by group", async () => {
      const result = await controller.listCRDsByGroup("argoproj.io");
      expect(result).toEqual([mockCrd]);
    });

    it("should return empty array when no CRDs match the group", async () => {
      const result = await controller.listCRDsByGroup("unknown.io");
      expect(result).toEqual([]);
    });
  });

  describe("listRollouts", () => {
    it("should return all rollouts when no namespace is provided", async () => {
      const result = await controller.listRollouts();
      expect(result).toEqual([mockRollout]);
      expect(kubernetesService.listRollouts).toHaveBeenCalledWith(undefined);
    });

    it("should pass namespace to the service when provided", async () => {
      const result = await controller.listRollouts("staging");
      expect(result).toEqual([mockRollout]);
      expect(kubernetesService.listRollouts).toHaveBeenCalledWith("staging");
    });
  });

  describe("listPolicyReports", () => {
    it("should return policy reports for the default namespace", async () => {
      const result = await controller.listPolicyReports();
      expect(result).toEqual([mockPolicyReport]);
      expect(kyvernoService.listPolicyReports).toHaveBeenCalledWith(undefined);
    });

    it("should pass the namespace to the kyverno service", async () => {
      const result = await controller.listPolicyReports("production");
      expect(result).toEqual([mockPolicyReport]);
      expect(kyvernoService.listPolicyReports).toHaveBeenCalledWith(
        "production",
      );
    });
  });

  describe("listClusterPolicyReports", () => {
    it("should return cluster-scoped policy reports", async () => {
      const result = await controller.listClusterPolicyReports();
      expect(result).toEqual([mockPolicyReport]);
      expect(kyvernoService.listClusterPolicyReports).toHaveBeenCalled();
    });
  });

  // --- Phase 16: Kubernetes Operators ---

  describe("listOperators", () => {
    it("should return all OLM operators", async () => {
      const result = await controller.listOperators();
      expect(result).toEqual([mockOperator]);
      expect(kubernetesService.listOperators).toHaveBeenCalled();
    });
  });

  describe("getOperator", () => {
    it("should return a single operator by name", async () => {
      const result = await controller.getOperator(
        "prometheus-operator.v0.65.1",
      );
      expect(result).toEqual(mockOperator);
      expect(kubernetesService.listOperators).toHaveBeenCalled();
    });

    it("should return null when operator is not found", async () => {
      kubernetesService.listOperators.mockResolvedValue([]);
      const result = await controller.getOperator("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("listOperatorCustomResources", () => {
    it("should return CR instances for the given operator", async () => {
      const result = await controller.listOperatorCustomResources(
        "prometheus-operator.v0.65.1",
      );
      expect(result).toEqual([mockCR]);
      expect(
        kubernetesService.listOperatorCustomResources,
      ).toHaveBeenCalledWith("prometheus-operator.v0.65.1");
    });
  });

  describe("listNodeRuntimes", () => {
    it("should return runtime info for all nodes", async () => {
      const result = await controller.listNodeRuntimes();
      expect(result).toEqual([mockRuntime]);
      expect(kubernetesService.listNodeRuntimes).toHaveBeenCalled();
    });
  });

  describe("getCrioMetrics", () => {
    it("should return CRI-O metrics for a specific node", async () => {
      const result = await controller.getCrioMetrics("node-1");
      expect(result).toEqual(mockCrioMetrics);
      expect(kubernetesService.getCrioMetrics).toHaveBeenCalledWith("node-1");
    });
  });

  describe("createBinding", () => {
    it("should create an operator-component binding", async () => {
      const req: RequestWithOrg = { organizationId: "org-1" };
      const body: CreateOperatorBindingBodyDto = {
        operatorNamespace: "monitoring",
        componentId: "comp-uuid-1",
      };
      const result = await controller.createBinding(
        "prometheus-operator.v0.65.1",
        body,
        req,
      );
      expect(result).toEqual(mockBinding);
      expect(bindingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorName: "prometheus-operator.v0.65.1",
          operatorNamespace: "monitoring",
          componentId: "comp-uuid-1",
          organizationId: "org-1",
        }),
      );
    });
  });

  describe("removeBinding", () => {
    it("should remove an operator-component binding", async () => {
      const req: RequestWithOrg = { organizationId: "org-1" };
      const dto = {
        operatorNamespace: "monitoring",
        componentId: "comp-uuid-1",
      };
      await controller.removeBinding("prometheus-operator.v0.65.1", dto, req);
      expect(bindingService.remove).toHaveBeenCalledWith(
        "prometheus-operator.v0.65.1",
        "monitoring",
        "comp-uuid-1",
        "org-1",
      );
    });
  });

  describe("listBindings", () => {
    it("should return bindings for an operator", async () => {
      const req: RequestWithOrg = { organizationId: "org-1" };
      const result = await controller.listBindings(
        "prometheus-operator.v0.65.1",
        req,
      );
      expect(result).toEqual([mockBinding]);
      expect(bindingService.findByOperator).toHaveBeenCalledWith(
        "prometheus-operator.v0.65.1",
        "org-1",
      );
    });
  });

  describe("listBindingsByComponent", () => {
    it("should return all bindings for a catalog component", async () => {
      const result = await controller.listBindingsByComponent("comp-uuid-1");
      expect(result).toEqual([mockBinding]);
      expect(bindingService.findByComponent).toHaveBeenCalledWith(
        "comp-uuid-1",
      );
    });

    it("should return an empty array when the component has no bindings", async () => {
      bindingService.findByComponent.mockResolvedValue([]);
      const result = await controller.listBindingsByComponent("comp-uuid-none");
      expect(result).toEqual([]);
      expect(bindingService.findByComponent).toHaveBeenCalledWith(
        "comp-uuid-none",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Flux GitOps endpoints (FARM-S248 / FARM-S249 / FARM-S250)
  // ---------------------------------------------------------------------------

  describe("getFluxStatus", () => {
    it("should return flux status from the service", async () => {
      (
        kubernetesService as jest.Mocked<typeof kubernetesService> & {
          getFluxStatus: jest.Mock;
        }
      ).getFluxStatus = jest.fn().mockResolvedValue({
        installed: true,
        controllers: [],
      });
      const result = await controller.getFluxStatus();
      expect(result).toMatchObject({ installed: true });
    });
  });

  describe("listFluxKustomizations", () => {
    it("should return kustomizations from the service", async () => {
      (
        kubernetesService as jest.Mocked<typeof kubernetesService> & {
          listFluxKustomizations: jest.Mock;
        }
      ).listFluxKustomizations = jest.fn().mockResolvedValue([]);
      const result = await controller.listFluxKustomizations();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listFluxHelmReleases", () => {
    it("should return helm releases from the service", async () => {
      (
        kubernetesService as jest.Mocked<typeof kubernetesService> & {
          listFluxHelmReleases: jest.Mock;
        }
      ).listFluxHelmReleases = jest.fn().mockResolvedValue([]);
      const result = await controller.listFluxHelmReleases();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listFluxSources", () => {
    it("should return sources from the service", async () => {
      (
        kubernetesService as jest.Mocked<typeof kubernetesService> & {
          listFluxSources: jest.Mock;
        }
      ).listFluxSources = jest.fn().mockResolvedValue([]);
      const result = await controller.listFluxSources();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listFluxBindingsByComponent", () => {
    it("should throw ServiceUnavailableException when fluxBindingService is null", () => {
      const mockReq = {} as RequestWithOrg;
      expect(() =>
        controller.listFluxBindingsByComponent("comp-uuid-1", mockReq),
      ).toThrow("FluxBindingService not available");
    });
  });

  describe("createFluxBinding", () => {
    it("should throw ServiceUnavailableException when fluxBindingService is null", () => {
      const dto = {
        resourceKind: "Kustomization" as const,
        resourceName: "my-app",
        resourceNamespace: "flux-system",
        componentId: "comp-uuid-1",
      };
      const mockReq = {} as RequestWithOrg;
      // In this test setup fluxBindingService is not provided (null via @Optional)
      expect(() => controller.createFluxBinding(dto, mockReq)).toThrow(
        "FluxBindingService not available",
      );
    });
  });

  describe("removeFluxBinding", () => {
    it("should throw ServiceUnavailableException when fluxBindingService is null", () => {
      const mockReq = {} as RequestWithOrg;
      expect(() => controller.removeFluxBinding("some-id", mockReq)).toThrow(
        "FluxBindingService not available",
      );
    });
  });

  describe("getAvailability", () => {
    it("should return available: true when Kubernetes is enabled", () => {
      (kubernetesService as unknown as Record<string, unknown>).isEnabled = jest
        .fn()
        .mockReturnValue(true);
      const result = controller.getAvailability();
      expect(result).toEqual({ available: true });
    });

    it("should return available: false with reason when Kubernetes is not enabled", () => {
      (kubernetesService as unknown as Record<string, unknown>).isEnabled = jest
        .fn()
        .mockReturnValue(false);
      const result = controller.getAvailability();
      expect(result).toEqual({
        available: false,
        reason: "KUBECONFIG not set or cluster unreachable",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// KubernetesController — with FluxBindingService registered
// ---------------------------------------------------------------------------

describe("KubernetesController (with FluxBindingService)", () => {
  let controller: KubernetesController;
  let fluxBindingService: {
    create: jest.Mock;
    remove: jest.Mock;
    findByComponent: jest.Mock;
  };

  beforeEach(async () => {
    const kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([]),
      matchComponent: jest.fn().mockResolvedValue([]),
      listCRDs: jest.fn().mockResolvedValue([]),
      listRollouts: jest.fn().mockResolvedValue([]),
      listOperators: jest.fn().mockResolvedValue([]),
      listOperatorCustomResources: jest.fn().mockResolvedValue([]),
      listNodeRuntimes: jest.fn().mockResolvedValue([]),
      getCrioMetrics: jest.fn().mockResolvedValue({}),
      getFluxStatus: jest
        .fn()
        .mockResolvedValue({ installed: false, controllers: [] }),
      listFluxKustomizations: jest.fn().mockResolvedValue([]),
      listFluxHelmReleases: jest.fn().mockResolvedValue([]),
      listFluxSources: jest.fn().mockResolvedValue([]),
    };

    const kyvernoService = {
      listPolicyReports: jest.fn().mockResolvedValue([]),
      listClusterPolicyReports: jest.fn().mockResolvedValue([]),
    };

    const operatorBindingService = {
      create: jest.fn().mockResolvedValue({}),
      findByOperator: jest.fn().mockResolvedValue([]),
      findByComponent: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    fluxBindingService = {
      create: jest.fn().mockResolvedValue({
        id: "flux-binding-uuid",
        resourceKind: "Kustomization",
        resourceName: "my-app",
        resourceNamespace: "flux-system",
        componentId: "comp-uuid-1",
        boundAt: new Date(),
        organizationId: null,
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      findByComponent: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        { provide: KyvernoPolicyReportService, useValue: kyvernoService },
        { provide: OperatorBindingService, useValue: operatorBindingService },
        { provide: FluxBindingService, useValue: fluxBindingService },
        { provide: KedaBindingService, useValue: null },
      ],
    }).compile();

    controller = module.get<KubernetesController>(KubernetesController);
  });

  it("should create a flux binding when service is available", async () => {
    const dto = {
      resourceKind: "Kustomization" as const,
      resourceName: "my-app",
      resourceNamespace: "flux-system",
      componentId: "comp-uuid-1",
    };
    const mockReq = {} as RequestWithOrg;
    const result = await controller.createFluxBinding(dto, mockReq);
    expect(fluxBindingService.create).toHaveBeenCalledWith({
      ...dto,
      organizationId: undefined,
    });
    expect(result).toMatchObject({ resourceKind: "Kustomization" });
  });

  it("should remove a flux binding when service is available", async () => {
    const mockReq = {} as RequestWithOrg;
    await expect(
      controller.removeFluxBinding("flux-binding-uuid", mockReq),
    ).resolves.toBeUndefined();
    expect(fluxBindingService.remove).toHaveBeenCalledWith(
      "flux-binding-uuid",
      undefined,
    );
  });

  it("should list flux bindings by component when service is available", async () => {
    const mockReq = {} as RequestWithOrg;
    const result = await controller.listFluxBindingsByComponent(
      "comp-uuid-1",
      mockReq,
    );
    expect(Array.isArray(result)).toBe(true);
    expect(fluxBindingService.findByComponent).toHaveBeenCalledWith(
      "comp-uuid-1",
      undefined,
    );
  });
});

// ---------------------------------------------------------------------------
// KubernetesController — KEDA null guard and Dragonfly delegation
// ---------------------------------------------------------------------------

describe("KubernetesController (KEDA and Dragonfly coverage)", () => {
  let controller: KubernetesController;
  let kubernetesService: Record<string, jest.Mock>;

  beforeEach(async () => {
    kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([]),
      matchComponent: jest.fn().mockResolvedValue([]),
      listCRDs: jest.fn().mockResolvedValue([]),
      listRollouts: jest.fn().mockResolvedValue([]),
      listOperators: jest.fn().mockResolvedValue([]),
      listOperatorCustomResources: jest.fn().mockResolvedValue([]),
      listNodeRuntimes: jest.fn().mockResolvedValue([]),
      getCrioMetrics: jest.fn().mockResolvedValue({}),
      getDragonflyStatus: jest.fn().mockResolvedValue({
        status: "not-installed",
        version: null,
        components: [],
      }),
      getDragonflyTasks: jest.fn().mockResolvedValue([]),
      getDragonflyPeers: jest.fn().mockResolvedValue([]),
      getDragonflyMetrics: jest.fn().mockResolvedValue({
        totalTasks: 0,
        succeededTasks: 0,
        failedTasks: 0,
        activeTasks: 0,
        totalPeers: 0,
      }),
      getFluxStatus: jest
        .fn()
        .mockResolvedValue({ installed: false, controllers: [] }),
      listFluxKustomizations: jest.fn().mockResolvedValue([]),
      listFluxHelmReleases: jest.fn().mockResolvedValue([]),
      listFluxSources: jest.fn().mockResolvedValue([]),
      getKedaStatus: jest
        .fn()
        .mockResolvedValue({ installed: false, version: "" }),
      listKedaScaledObjects: jest.fn().mockResolvedValue([]),
      listKedaScaledJobs: jest.fn().mockResolvedValue([]),
      getKedaScaledObjectTriggers: jest.fn().mockResolvedValue([]),
    };

    const kyvernoService = {
      listPolicyReports: jest.fn().mockResolvedValue([]),
      listClusterPolicyReports: jest.fn().mockResolvedValue([]),
    };

    const operatorBindingService = {
      create: jest.fn().mockResolvedValue({}),
      findByOperator: jest.fn().mockResolvedValue([]),
      findByComponent: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        { provide: KyvernoPolicyReportService, useValue: kyvernoService },
        { provide: OperatorBindingService, useValue: operatorBindingService },
        {
          provide: FluxBindingService,
          useValue: {
            create: jest.fn(),
            remove: jest.fn(),
            findByComponent: jest.fn().mockResolvedValue([]),
          },
        },
        // KedaBindingService intentionally omitted to test null guard
      ],
    }).compile();

    controller = module.get<KubernetesController>(KubernetesController);
  });

  it("should delegate getDragonflyStatus to the service", async () => {
    const result = await controller.getDragonflyStatus();
    expect(result).toMatchObject({ status: "not-installed" });
    expect(kubernetesService.getDragonflyStatus).toHaveBeenCalled();
  });

  it("should delegate getDragonflyTasks to the service", async () => {
    const result = await controller.getDragonflyTasks();
    expect(Array.isArray(result)).toBe(true);
    expect(kubernetesService.getDragonflyTasks).toHaveBeenCalled();
  });

  it("should delegate getDragonflyPeers to the service", async () => {
    const result = await controller.getDragonflyPeers();
    expect(Array.isArray(result)).toBe(true);
    expect(kubernetesService.getDragonflyPeers).toHaveBeenCalled();
  });

  it("should delegate getDragonflyMetrics to the service", async () => {
    const result = await controller.getDragonflyMetrics();
    expect(result).toMatchObject({ totalTasks: 0 });
    expect(kubernetesService.getDragonflyMetrics).toHaveBeenCalled();
  });

  it("should delegate getKedaStatus to the service", async () => {
    const result = await controller.getKedaStatus();
    expect(result).toMatchObject({ installed: false });
    expect(kubernetesService.getKedaStatus).toHaveBeenCalled();
  });

  it("should delegate listKedaScaledObjects to the service", async () => {
    const result = await controller.listKedaScaledObjects();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should delegate listKedaScaledJobs to the service", async () => {
    const result = await controller.listKedaScaledJobs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should delegate getKedaScaledObjectTriggers to the service", async () => {
    const result = await controller.getKedaScaledObjectTriggers(
      "default",
      "my-scaler",
    );
    expect(Array.isArray(result)).toBe(true);
    expect(kubernetesService.getKedaScaledObjectTriggers).toHaveBeenCalled();
  });

  it("should throw ServiceUnavailableException for listKedaBindingsByComponent when kedaBindingService is null", () => {
    const mockReq = {} as RequestWithOrg;
    expect(() =>
      controller.listKedaBindingsByComponent("comp-uuid-1", mockReq),
    ).toThrow("KedaBindingService not available");
  });

  it("should throw ServiceUnavailableException for createKedaBinding when kedaBindingService is null", () => {
    const dto = {
      scaledObjectName: "my-scaler",
      scaledObjectNamespace: "default",
      componentId: "comp-uuid-1",
    };
    const mockReq = {} as RequestWithOrg;
    expect(() => controller.createKedaBinding(dto, mockReq)).toThrow(
      "KedaBindingService not available",
    );
  });

  it("should throw ServiceUnavailableException for removeKedaBinding when kedaBindingService is null", () => {
    const mockReq = {} as RequestWithOrg;
    expect(() => controller.removeKedaBinding("some-id", mockReq)).toThrow(
      "KedaBindingService not available",
    );
  });
});

// ---------------------------------------------------------------------------
// KubernetesController — with KedaBindingService registered (happy paths)
// ---------------------------------------------------------------------------

describe("KubernetesController (with KedaBindingService)", () => {
  let controller: KubernetesController;
  let kedaBindingService: {
    create: jest.Mock;
    remove: jest.Mock;
    findByComponent: jest.Mock;
  };

  beforeEach(async () => {
    const kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([]),
      matchComponent: jest.fn().mockResolvedValue([]),
      listCRDs: jest.fn().mockResolvedValue([]),
      listRollouts: jest.fn().mockResolvedValue([]),
      listOperators: jest.fn().mockResolvedValue([]),
      listOperatorCustomResources: jest.fn().mockResolvedValue([]),
      listNodeRuntimes: jest.fn().mockResolvedValue([]),
      getCrioMetrics: jest.fn().mockResolvedValue({}),
      getDragonflyStatus: jest.fn().mockResolvedValue({
        status: "not-installed",
        version: null,
        components: [],
      }),
      getDragonflyTasks: jest.fn().mockResolvedValue([]),
      getDragonflyPeers: jest.fn().mockResolvedValue([]),
      getDragonflyMetrics: jest.fn().mockResolvedValue({
        totalTasks: 0,
        succeededTasks: 0,
        failedTasks: 0,
        activeTasks: 0,
        totalPeers: 0,
      }),
      getFluxStatus: jest
        .fn()
        .mockResolvedValue({ installed: false, controllers: [] }),
      listFluxKustomizations: jest.fn().mockResolvedValue([]),
      listFluxHelmReleases: jest.fn().mockResolvedValue([]),
      listFluxSources: jest.fn().mockResolvedValue([]),
      getKedaStatus: jest
        .fn()
        .mockResolvedValue({ installed: false, version: "" }),
      listKedaScaledObjects: jest.fn().mockResolvedValue([]),
      listKedaScaledJobs: jest.fn().mockResolvedValue([]),
      getKedaScaledObjectTriggers: jest.fn().mockResolvedValue([]),
    };

    kedaBindingService = {
      create: jest.fn().mockResolvedValue({
        id: "keda-binding-uuid",
        scaledObjectName: "my-scaler",
        scaledObjectNamespace: "default",
        componentId: "comp-uuid-1",
        boundAt: new Date(),
        organizationId: null,
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      findByComponent: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        {
          provide: KyvernoPolicyReportService,
          useValue: {
            listPolicyReports: jest.fn(),
            listClusterPolicyReports: jest.fn(),
          },
        },
        {
          provide: OperatorBindingService,
          useValue: {
            create: jest.fn(),
            findByOperator: jest.fn(),
            findByComponent: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: FluxBindingService,
          useValue: {
            create: jest.fn(),
            remove: jest.fn(),
            findByComponent: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: KedaBindingService, useValue: kedaBindingService },
      ],
    }).compile();

    controller = module.get<KubernetesController>(KubernetesController);
    // Bypass the DI injection-token issue caused by "KedaBindingService | null"
    // union type: directly set the private property on the controller instance.
    (controller as unknown as Record<string, unknown>).kedaBindingService =
      kedaBindingService;
  });

  it("should create a KEDA binding when service is available", async () => {
    const dto = {
      scaledObjectName: "my-scaler",
      scaledObjectNamespace: "default",
      componentId: "comp-uuid-1",
    };
    const mockReq = {} as RequestWithOrg;
    const result = await controller.createKedaBinding(dto, mockReq);
    expect(kedaBindingService.create).toHaveBeenCalledWith({
      ...dto,
      organizationId: undefined,
    });
    expect(result).toMatchObject({
      scaledObjectName: "my-scaler",
      scaledObjectNamespace: "default",
    });
  });

  it("should remove a KEDA binding when service is available", async () => {
    const mockReq = {} as RequestWithOrg;
    await expect(
      controller.removeKedaBinding("keda-binding-uuid", mockReq),
    ).resolves.toBeUndefined();
    expect(kedaBindingService.remove).toHaveBeenCalledWith(
      "keda-binding-uuid",
      undefined,
    );
  });

  it("should list KEDA bindings by component when service is available", async () => {
    const mockReq = {} as RequestWithOrg;
    const result = await controller.listKedaBindingsByComponent(
      "comp-uuid-1",
      mockReq,
    );
    expect(Array.isArray(result)).toBe(true);
    expect(kedaBindingService.findByComponent).toHaveBeenCalledWith(
      "comp-uuid-1",
      undefined,
    );
  });
});

// ---------------------------------------------------------------------------
// Gatekeeper endpoints
// ---------------------------------------------------------------------------

describe("KubernetesController (Gatekeeper)", () => {
  let controller: KubernetesController;
  let gatekeeperService: {
    isGatekeeperEnabled: jest.Mock;
    listConstraintTemplates: jest.Mock;
    listViolations: jest.Mock;
  };

  beforeEach(async () => {
    gatekeeperService = {
      isGatekeeperEnabled: jest.fn().mockResolvedValue(false),
      listConstraintTemplates: jest.fn().mockResolvedValue([]),
      listViolations: jest.fn().mockResolvedValue([]),
    };

    const kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([]),
      matchComponent: jest.fn().mockResolvedValue([]),
      listCRDs: jest.fn().mockResolvedValue([]),
      listRollouts: jest.fn().mockResolvedValue([]),
      listOperators: jest.fn().mockResolvedValue([]),
      listOperatorCustomResources: jest.fn().mockResolvedValue([]),
      listNodeRuntimes: jest.fn().mockResolvedValue([]),
      getCrioMetrics: jest.fn().mockResolvedValue({}),
      isEnabled: jest.fn().mockReturnValue(false),
    };

    const module = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        {
          provide: KyvernoPolicyReportService,
          useValue: {
            listPolicyReports: jest.fn(),
            listClusterPolicyReports: jest.fn(),
          },
        },
        {
          provide: OperatorBindingService,
          useValue: {
            create: jest.fn(),
            findByOperator: jest.fn(),
            findByComponent: jest.fn(),
            remove: jest.fn(),
          },
        },
        { provide: GatekeeperService, useValue: gatekeeperService },
      ],
    }).compile();

    controller = module.get<KubernetesController>(KubernetesController);
  });

  describe("isGatekeeperEnabled", () => {
    it("should return enabled: false when service returns false", async () => {
      gatekeeperService.isGatekeeperEnabled.mockResolvedValue(false);
      const result = await controller.isGatekeeperEnabled();
      expect(result).toEqual({ enabled: false });
    });

    it("should return enabled: true when gatekeeper-system namespace exists", async () => {
      gatekeeperService.isGatekeeperEnabled.mockResolvedValue(true);
      const result = await controller.isGatekeeperEnabled();
      expect(result).toEqual({ enabled: true });
    });
  });

  describe("listConstraintTemplates", () => {
    it("should return empty array when no templates are installed", async () => {
      gatekeeperService.listConstraintTemplates.mockResolvedValue([]);
      const result = await controller.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("should return mapped templates from GatekeeperService", async () => {
      const mockTemplate = {
        name: "k8srequiredlabels",
        group: "templates.gatekeeper.sh",
        enforcementAction: "warn" as const,
        description: "Requires labels",
        violationCount: 0,
      };
      gatekeeperService.listConstraintTemplates.mockResolvedValue([
        mockTemplate,
      ]);
      const result = await controller.listConstraintTemplates();
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe("listGatekeeperViolations", () => {
    it("should return empty array when no violations exist", async () => {
      gatekeeperService.listViolations.mockResolvedValue([]);
      const result = await controller.listGatekeeperViolations();
      expect(result).toEqual([]);
    });

    it("should return violations from GatekeeperService", async () => {
      const mockViolation = {
        kind: "K8sRequiredLabels",
        name: "my-pod",
        namespace: "default",
        message: "Missing label",
        constraint: "require-env-label",
        enforcementAction: "deny" as const,
      };
      gatekeeperService.listViolations.mockResolvedValue([mockViolation]);
      const result = await controller.listGatekeeperViolations();
      expect(result).toEqual([mockViolation]);
    });

    it("should pass namespace filter to GatekeeperService", async () => {
      gatekeeperService.listViolations.mockResolvedValue([]);
      await controller.listGatekeeperViolations("prod");
      expect(gatekeeperService.listViolations).toHaveBeenCalledWith("prod");
    });
  });

  describe("when GatekeeperService is not provided", () => {
    let controllerWithoutGatekeeper: KubernetesController;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [KubernetesController],
        providers: [
          {
            provide: KubernetesService,
            useValue: { isEnabled: jest.fn().mockReturnValue(false) },
          },
          {
            provide: KyvernoPolicyReportService,
            useValue: {
              listPolicyReports: jest.fn(),
              listClusterPolicyReports: jest.fn(),
            },
          },
          {
            provide: OperatorBindingService,
            useValue: {
              create: jest.fn(),
              findByOperator: jest.fn(),
              findByComponent: jest.fn(),
              remove: jest.fn(),
            },
          },
          // GatekeeperService intentionally omitted — @Optional() → undefined
        ],
      }).compile();

      controllerWithoutGatekeeper =
        module.get<KubernetesController>(KubernetesController);
    });

    it("isGatekeeperEnabled returns { enabled: false } when service is absent", async () => {
      const result = await controllerWithoutGatekeeper.isGatekeeperEnabled();
      expect(result).toEqual({ enabled: false });
    });

    it("listConstraintTemplates returns [] when service is absent", async () => {
      const result =
        await controllerWithoutGatekeeper.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("listGatekeeperViolations returns [] when service is absent", async () => {
      const result =
        await controllerWithoutGatekeeper.listGatekeeperViolations();
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getElasticStack
  // -------------------------------------------------------------------------

  describe("getElasticStack", () => {
    it("throws ServiceUnavailableException when ElasticStackService is not provided", async () => {
      await expect(controller.getElasticStack()).rejects.toThrow(
        "ElasticStackService not available",
      );
    });
  });
});
