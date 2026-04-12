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

    it("should return mapped templates on success", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
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

      const result = await service.listConstraintTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("k8srequiredlabels");
      expect(result[0].group).toBe("templates.gatekeeper.sh");
      expect(result[0].description).toBe("Requires labels");
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

      // First call: listConstraintTemplates
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });

      // Second call: list constraint instances for "k8srequiredlabels"
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
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
        ],
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

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });

      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValueOnce({
        response: { statusCode: 404 },
      });

      const result = await service.listViolations();
      expect(result).toEqual([]);
    });

    it("should filter violations by namespace when provided", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(
        mockCustomObjectsApi,
      );

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [{ metadata: { name: "K8sRequiredLabels" } }],
      });

      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValueOnce({
        items: [
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
        ],
      });

      const result = await service.listViolations("prod");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("pod-a");
    });
  });
});
