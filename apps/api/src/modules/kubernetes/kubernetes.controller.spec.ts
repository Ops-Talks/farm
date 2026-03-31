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
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";

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
    };

    kyvernoService = {
      listPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
      listClusterPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
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
      const dto = {
        operatorName: "prometheus-operator.v0.65.1",
        operatorNamespace: "monitoring",
        componentId: "comp-uuid-1",
      };
      const result = await controller.createBinding(
        "prometheus-operator.v0.65.1",
        dto,
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
      const dto = {
        operatorNamespace: "monitoring",
        componentId: "comp-uuid-1",
      };
      await controller.removeBinding("prometheus-operator.v0.65.1", dto);
      expect(bindingService.remove).toHaveBeenCalledWith(
        "prometheus-operator.v0.65.1",
        "monitoring",
        "comp-uuid-1",
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
});
