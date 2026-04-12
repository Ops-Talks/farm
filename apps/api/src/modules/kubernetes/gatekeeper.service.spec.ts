import { Test, TestingModule } from "@nestjs/testing";
import { GatekeeperService } from "./gatekeeper.service";
import { KubernetesService } from "./kubernetes.service";

describe("GatekeeperService", () => {
  let service: GatekeeperService;

  const mockCoreV1Api = {
    listNamespace: jest.fn(),
  };

  const mockCustomObjectsApi = {
    listClusterCustomObject: jest.fn(),
  };

  const mockKubernetesService = {
    getCoreV1Api: jest.fn(),
    getCustomObjectsApi: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatekeeperService,
        { provide: KubernetesService, useValue: mockKubernetesService },
      ],
    }).compile();

    service = module.get<GatekeeperService>(GatekeeperService);
  });

  // ---------------------------------------------------------------------------
  // isGatekeeperEnabled
  // ---------------------------------------------------------------------------

  describe("isGatekeeperEnabled", () => {
    it("should return false when CoreV1Api is null", async () => {
      mockKubernetesService.getCoreV1Api.mockReturnValue(null);
      const result = await service.isGatekeeperEnabled();
      expect(result).toBe(false);
    });

    it("should return false when gatekeeper-system namespace is absent", async () => {
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);
      mockCoreV1Api.listNamespace.mockResolvedValue({
        items: [
          { metadata: { name: "default" } },
          { metadata: { name: "kube-system" } },
        ],
      });
      const result = await service.isGatekeeperEnabled();
      expect(result).toBe(false);
    });

    it("should return true when gatekeeper-system namespace exists", async () => {
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);
      mockCoreV1Api.listNamespace.mockResolvedValue({
        items: [
          { metadata: { name: "default" } },
          { metadata: { name: "gatekeeper-system" } },
        ],
      });
      const result = await service.isGatekeeperEnabled();
      expect(result).toBe(true);
    });

    it("should return false when listNamespace throws a 404 error", async () => {
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);
      mockCoreV1Api.listNamespace.mockRejectedValue({
        response: { statusCode: 404 },
      });
      const result = await service.isGatekeeperEnabled();
      expect(result).toBe(false);
    });

    it("should return false when listNamespace throws a generic error", async () => {
      mockKubernetesService.getCoreV1Api.mockReturnValue(mockCoreV1Api);
      mockCoreV1Api.listNamespace.mockRejectedValue(new Error("network error"));
      const result = await service.isGatekeeperEnabled();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // listConstraintTemplates
  // ---------------------------------------------------------------------------

  describe("listConstraintTemplates", () => {
    it("should return empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      const result = await service.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("should return empty array when CRD returns 404", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue({
        response: { statusCode: 404 },
      });
      const result = await service.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("should return mapped templates with computed enforcementAction and violationCount", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // First call: list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: {
              name: "k8srequiredlabels",
              annotations: {
                "metadata.gatekeeper.sh/description": "Requires labels",
              },
            },
            spec: {},
          },
        ],
      });
      // Second call: list constraint instances for "k8srequiredlabels"
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: { name: "require-env-label" },
            spec: { enforcementAction: "deny" },
            status: {
              violations: [
                { name: "pod-a", namespace: "default", message: "missing" },
                { name: "pod-b", namespace: "prod", message: "missing" },
              ],
            },
          },
        ],
      });

      const result = await service.listConstraintTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("k8srequiredlabels");
      expect(result[0].group).toBe("templates.gatekeeper.sh");
      expect(result[0].description).toBe("Requires labels");
      expect(result[0].enforcementAction).toBe("deny");
      expect(result[0].violationCount).toBe(2);
    });

    it("should default enforcementAction to warn and violationCount to 0 when no constraints exist", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // First call: list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: { name: "k8srequiredlabels" },
            spec: {},
          },
        ],
      });
      // Second call: no constraint instances
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [],
      });

      const result = await service.listConstraintTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].enforcementAction).toBe("warn");
      expect(result[0].violationCount).toBe(0);
    });

    it("should return empty array when items list is empty", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [],
      });
      const result = await service.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("should gracefully handle 404 when listing constraint instances for a template", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // First call: list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: { name: "k8srequiredlabels" },
            spec: {},
          },
        ],
      });
      // Second call: constraint instances 404
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce({
        response: { statusCode: 404 },
      });

      const result = await service.listConstraintTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].enforcementAction).toBe("warn");
      expect(result[0].violationCount).toBe(0);
    });

    it("should handle non-404 error when listing constraint instances and continue", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // First call: list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "k8srequiredlabels" }, spec: {} }],
      });
      // Second call: non-404 error on constraint instances
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce(
        new Error("internal server error"),
      );

      const result = await service.listConstraintTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].enforcementAction).toBe("warn");
      expect(result[0].violationCount).toBe(0);
    });

    it("should return empty array on non-404 outer error", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(
        new Error("API server down"),
      );

      const result = await service.listConstraintTemplates();
      expect(result).toEqual([]);
    });

    it("should use 'description' annotation fallback when primary annotation is absent", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: {
              name: "k8srequiredlabels",
              annotations: { description: "Fallback description" },
            },
            spec: {},
          },
        ],
      });
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [],
      });

      const result = await service.listConstraintTemplates();
      expect(result[0].description).toBe("Fallback description");
    });

    it("should have undefined description when no annotations exist", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "k8srequiredlabels" }, spec: {} }],
      });
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [],
      });

      const result = await service.listConstraintTemplates();
      expect(result[0].description).toBeUndefined();
    });

    it("should map dryrun enforcement action from constraint instance", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "k8srequiredlabels" }, spec: {} }],
      });
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: { name: "c1" },
            spec: { enforcementAction: "dryrun" },
            status: { violations: [] },
          },
        ],
      });

      const result = await service.listConstraintTemplates();
      expect(result[0].enforcementAction).toBe("dryrun");
    });

    it("should default to 'warn' for unrecognized enforcement action values", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "k8srequiredlabels" }, spec: {} }],
      });
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
          {
            metadata: { name: "c1" },
            spec: { enforcementAction: "audit" },
            status: { violations: [] },
          },
        ],
      });

      const result = await service.listConstraintTemplates();
      expect(result[0].enforcementAction).toBe("warn");
    });
  });

  // ---------------------------------------------------------------------------
  // listViolations
  // ---------------------------------------------------------------------------

  describe("listViolations", () => {
    it("should return empty array when CustomObjectsApi is null", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      const result = await service.listViolations();
      expect(result).toEqual([]);
    });

    it("should return empty array when no constraint templates exist", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      // listConstraintTemplates call returns empty
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [],
      });
      const result = await service.listViolations();
      expect(result).toEqual([]);
    });

    it("should return mapped violations from constraint instances", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );

      const constraintInstances = [
        {
          metadata: { name: "require-env-label" },
          spec: { enforcementAction: "deny" },
          status: {
            violations: [
              {
                name: "my-pod",
                namespace: "default",
                message: "Missing label env",
                enforcementAction: "deny",
              },
            ],
          },
        },
      ];

      // Call 1: listConstraintTemplates -> list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });
      // Call 2: listConstraintTemplates -> list constraints for "k8srequiredlabels"
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: constraintInstances,
      });
      // Call 3: listViolations -> list constraints for "k8srequiredlabels"
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: constraintInstances,
      });

      const result = await service.listViolations();
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe("K8sRequiredLabels");
      expect(result[0].name).toBe("my-pod");
      expect(result[0].namespace).toBe("default");
      expect(result[0].message).toBe("Missing label env");
      expect(result[0].constraint).toBe("require-env-label");
      expect(result[0].enforcementAction).toBe("deny");
    });

    it("should skip constraint instances that return 404", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );

      // Call 1: listConstraintTemplates -> list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });
      // Call 2: listConstraintTemplates -> list constraints (404)
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce({
        response: { statusCode: 404 },
      });
      // Call 3: listViolations -> list constraints (404)
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce({
        response: { statusCode: 404 },
      });

      const result = await service.listViolations();
      expect(result).toEqual([]);
    });

    it("should handle non-404 error on constraint listing and still continue", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );

      const constraintInstances = [
        {
          metadata: { name: "require-env-label" },
          spec: { enforcementAction: "warn" },
          status: {
            violations: [
              {
                name: "pod-a",
                namespace: "default",
                message: "Missing label",
                enforcementAction: "warn",
              },
            ],
          },
        },
      ];

      // Call 1: listConstraintTemplates -> list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });
      // Call 2: listConstraintTemplates -> list constraints
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: constraintInstances,
      });
      // Call 3: listViolations -> list constraints — non-404 error
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce(
        new Error("unexpected error"),
      );

      const result = await service.listViolations();
      expect(result).toEqual([]);
    });

    it("should filter violations by namespace when provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );

      const constraintInstances = [
        {
          metadata: { name: "require-env-label" },
          spec: { enforcementAction: "warn" },
          status: {
            violations: [
              {
                name: "pod-a",
                namespace: "prod",
                message: "Missing label",
                enforcementAction: "warn",
              },
              {
                name: "pod-b",
                namespace: "staging",
                message: "Missing label",
                enforcementAction: "warn",
              },
            ],
          },
        },
      ];

      // Call 1: listConstraintTemplates -> list templates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });
      // Call 2: listConstraintTemplates -> list constraints
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: constraintInstances,
      });
      // Call 3: listViolations -> list constraints
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: constraintInstances,
      });

      const result = await service.listViolations("prod");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("pod-a");
    });
  });
});
