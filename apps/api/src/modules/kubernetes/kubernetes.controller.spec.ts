import { Test, TestingModule } from "@nestjs/testing";
import { KubernetesController } from "./kubernetes.controller";
import { KubernetesService } from "./kubernetes.service";
import { KyvernoPolicyReportService } from "./kyverno-policy-report.service";

describe("KubernetesController", () => {
  let controller: KubernetesController;
  let kubernetesService: jest.Mocked<
    Pick<
      KubernetesService,
      "discoverWorkloads" | "matchComponent" | "listCRDs" | "listRollouts"
    >
  >;
  let kyvernoService: jest.Mocked<
    Pick<
      KyvernoPolicyReportService,
      "listPolicyReports" | "listClusterPolicyReports"
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

  beforeEach(async () => {
    kubernetesService = {
      discoverWorkloads: jest.fn().mockResolvedValue([mockWorkload]),
      matchComponent: jest.fn().mockResolvedValue([mockWorkload]),
      listCRDs: jest.fn().mockResolvedValue([mockCrd]),
      listRollouts: jest.fn().mockResolvedValue([mockRollout]),
    };

    kyvernoService = {
      listPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
      listClusterPolicyReports: jest.fn().mockResolvedValue([mockPolicyReport]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KubernetesController],
      providers: [
        { provide: KubernetesService, useValue: kubernetesService },
        { provide: KyvernoPolicyReportService, useValue: kyvernoService },
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
});
