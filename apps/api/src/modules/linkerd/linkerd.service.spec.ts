import { Test, TestingModule } from "@nestjs/testing";
import { LinkerdService } from "./linkerd.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";

// ---------------------------------------------------------------------------
// Mock @kubernetes/client-node
// ---------------------------------------------------------------------------

let mockLoadFromFile: jest.Mock;
let mockLoadFromString: jest.Mock;
let mockMakeApiClient: jest.Mock;
let mockListClusterCustomObject: jest.Mock;
let mockListNamespacedCustomObject: jest.Mock;
let mockListNamespacedDeployment: jest.Mock;

jest.mock("@kubernetes/client-node", () => {
  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      get loadFromFile() {
        return mockLoadFromFile;
      },
      get loadFromString() {
        return mockLoadFromString;
      },
      get makeApiClient() {
        return mockMakeApiClient;
      },
    })),
    CustomObjectsApi: class CustomObjectsApi {},
    AppsV1Api: class AppsV1Api {},
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNotFoundError() {
  return { response: { statusCode: 404 } };
}

function makeGenericError() {
  return new Error("Kubernetes API unreachable");
}

function fakeDeployment(
  name: string,
  readyReplicas = 1,
  image = "linkerd/controller:stable-2.14.0",
) {
  return {
    metadata: { name },
    spec: {
      template: {
        spec: { containers: [{ name, image }] },
      },
    },
    status: { readyReplicas, replicas: 1 },
  };
}

function fakeServerAuth(name: string, namespace = "default") {
  return {
    metadata: { name, namespace },
    spec: {
      server: { name: "my-server" },
      client: {
        meshTLS: {
          serviceAccounts: [{ name: "client-sa", namespace }],
        },
      },
    },
  };
}

function fakeAuthPolicy(name: string, namespace = "default") {
  return {
    metadata: { name, namespace },
    spec: {
      targetRef: { kind: "Server", name: "my-server" },
      requiredAuthenticationRefs: [
        { name: "my-auth", kind: "MeshTLSAuthentication" },
      ],
    },
  };
}

function fakeServiceProfile(name: string, namespace = "default") {
  return {
    metadata: { name, namespace },
    spec: {
      routes: [
        {
          name: "GET /api",
          condition: { pathRegex: "/api", method: "GET" },
          isRetryable: true,
          timeout: "250ms",
        },
      ],
      retryBudget: { retryRatio: 0.2, minRetriesPerSecond: 10, ttl: "10s" },
    },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("LinkerdService", () => {
  let service: LinkerdService;
  let mockCustomObjectsApi: {
    listClusterCustomObject: jest.Mock;
    listNamespacedCustomObject: jest.Mock;
  };
  let mockAppsV1Api: {
    listNamespacedDeployment: jest.Mock;
  };

  const mockKubernetesService = {
    getCustomObjectsApi: jest.fn(),
    getAppsV1Api: jest.fn(),
  };

  beforeEach(async () => {
    mockListClusterCustomObject = jest.fn();
    mockListNamespacedCustomObject = jest.fn();
    mockListNamespacedDeployment = jest.fn();
    mockLoadFromFile = jest.fn();
    mockLoadFromString = jest.fn();
    mockMakeApiClient = jest.fn();

    mockCustomObjectsApi = {
      listClusterCustomObject: mockListClusterCustomObject,
      listNamespacedCustomObject: mockListNamespacedCustomObject,
    };

    mockAppsV1Api = {
      listNamespacedDeployment: mockListNamespacedDeployment,
    };

    mockKubernetesService.getCustomObjectsApi.mockReturnValue(
      mockCustomObjectsApi,
    );
    mockKubernetesService.getAppsV1Api.mockReturnValue(mockAppsV1Api);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkerdService,
        { provide: KubernetesService, useValue: mockKubernetesService },
      ],
    }).compile();

    service = module.get<LinkerdService>(LinkerdService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isLinkerdEnabled
  // ---------------------------------------------------------------------------

  describe("isLinkerdEnabled", () => {
    it("returns true when listClusterCustomObject succeeds", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });

      const result = await service.isLinkerdEnabled();
      expect(result).toBe(true);
    });

    it("returns false on 404 (CRD not installed)", async () => {
      mockListClusterCustomObject.mockRejectedValue(makeNotFoundError());

      const result = await service.isLinkerdEnabled();
      expect(result).toBe(false);
    });

    it("returns false on unexpected errors", async () => {
      mockListClusterCustomObject.mockRejectedValue(makeGenericError());

      const result = await service.isLinkerdEnabled();
      expect(result).toBe(false);
    });

    it("returns false when no Kubernetes client is available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.isLinkerdEnabled();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getStatus
  // ---------------------------------------------------------------------------

  describe("getStatus", () => {
    it("returns installed: false when Linkerd is not enabled", async () => {
      mockListClusterCustomObject.mockRejectedValue(makeNotFoundError());

      const result = await service.getStatus();
      expect(result.installed).toBe(false);
      expect(result.components).toEqual([]);
    });

    it("returns installed: true with component status when Linkerd is enabled", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockListNamespacedDeployment.mockResolvedValue({
        items: [
          fakeDeployment("linkerd-controller"),
          fakeDeployment("linkerd-identity"),
          fakeDeployment("linkerd-proxy-injector", 0),
        ],
      });

      const result = await service.getStatus();

      expect(result.installed).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);

      const controller = result.components.find(
        (c) => c.name === "linkerd-controller",
      );
      expect(controller?.ready).toBe(true);
      expect(controller?.version).toBe("stable-2.14.0");

      const injector = result.components.find(
        (c) => c.name === "linkerd-proxy-injector",
      );
      expect(injector?.ready).toBe(false);
    });

    it("marks missing control plane components as not ready", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      // Only linkerd-controller is present
      mockListNamespacedDeployment.mockResolvedValue({
        items: [fakeDeployment("linkerd-controller")],
      });

      const result = await service.getStatus();

      const identity = result.components.find(
        (c) => c.name === "linkerd-identity",
      );
      expect(identity?.ready).toBe(false);
    });

    it("returns installed: true with empty components if AppsV1Api unavailable", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockKubernetesService.getAppsV1Api.mockReturnValue(null);

      const result = await service.getStatus();
      expect(result.installed).toBe(true);
      expect(result.components).toEqual([]);
    });

    it("handles deployment listing error gracefully", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockListNamespacedDeployment.mockRejectedValue(makeGenericError());

      const result = await service.getStatus();
      expect(result.installed).toBe(true);
      expect(result.components).toEqual([]);
    });

    it("uses inline kubeconfig to build AppsV1Api client", async () => {
      const inlineYaml = "apiVersion: v1\nclusters: []\n";
      mockMakeApiClient
        .mockReturnValueOnce(mockCustomObjectsApi)
        .mockReturnValueOnce(mockAppsV1Api);
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockListNamespacedDeployment.mockResolvedValue({
        items: [fakeDeployment("linkerd-controller")],
      });

      const result = await service.getStatus(inlineYaml);

      expect(mockLoadFromString).toHaveBeenCalledWith(inlineYaml);
      expect(result.installed).toBe(true);
    });

    it("uses file path kubeconfig to build AppsV1Api client", async () => {
      const filePath = "/home/user/.kube/config";
      mockMakeApiClient
        .mockReturnValueOnce(mockCustomObjectsApi)
        .mockReturnValueOnce(mockAppsV1Api);
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockListNamespacedDeployment.mockResolvedValue({ items: [] });

      await service.getStatus(filePath);

      expect(mockLoadFromFile).toHaveBeenCalledWith(filePath);
    });

    it("returns empty components when getAppsV1Api fails with inline kubeconfig", async () => {
      const inlineYaml = "apiVersion: v1\n";
      mockMakeApiClient
        .mockReturnValueOnce(mockCustomObjectsApi)
        .mockImplementationOnce(() => {
          throw new Error("failed");
        });
      mockListClusterCustomObject.mockResolvedValue({ items: [] });

      const result = await service.getStatus(inlineYaml);
      expect(result.installed).toBe(true);
      expect(result.components).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // listServerAuthorizations
  // ---------------------------------------------------------------------------

  describe("listServerAuthorizations", () => {
    it("returns mapped ServerAuthorization resources", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeServerAuth("sa-1")],
      });

      const result = await service.listServerAuthorizations("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("sa-1");
      expect(result[0].namespace).toBe("default");
      expect(result[0].server).toBe("my-server");
      expect(result[0].clients).toContain("default/client-sa");
    });

    it("returns empty array on 404", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());

      const result = await service.listServerAuthorizations("default");
      expect(result).toEqual([]);
    });

    it("returns empty array on unexpected error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeGenericError());

      const result = await service.listServerAuthorizations("default");
      expect(result).toEqual([]);
    });

    it("returns empty array when Kubernetes client unavailable", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.listServerAuthorizations("default");
      expect(result).toEqual([]);
    });

    it("falls back to 'meshTLS' when no service accounts and not unauthenticated", async () => {
      const noClientsSA = {
        metadata: { name: "sa-empty", namespace: "default" },
        spec: {
          server: { name: "some-server" },
          client: { meshTLS: { serviceAccounts: [] } },
        },
      };
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [noClientsSA],
      });

      const result = await service.listServerAuthorizations("default");
      expect(result[0].clients).toContain("meshTLS");
    });

    it("adds 'unauthenticated' to clients when flag is set", async () => {
      const unauthSA = {
        metadata: { name: "sa-unauth", namespace: "default" },
        spec: {
          server: { name: "some-server" },
          client: { unauthenticated: true },
        },
      };
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [unauthSA],
      });

      const result = await service.listServerAuthorizations("default");
      expect(result[0].clients).toContain("unauthenticated");
    });
  });

  // ---------------------------------------------------------------------------
  // listAuthorizationPolicies
  // ---------------------------------------------------------------------------

  describe("listAuthorizationPolicies", () => {
    it("returns mapped AuthorizationPolicy resources", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeAuthPolicy("policy-1")],
      });

      const result = await service.listAuthorizationPolicies("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("policy-1");
      expect(result[0].targetRef.kind).toBe("Server");
      expect(result[0].requiredAuthenticationRefs).toHaveLength(1);
      expect(result[0].requiredAuthenticationRefs[0].name).toBe("my-auth");
    });

    it("returns empty array on 404", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());

      const result = await service.listAuthorizationPolicies("default");
      expect(result).toEqual([]);
    });

    it("returns empty array when Kubernetes client unavailable", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.listAuthorizationPolicies("default");
      expect(result).toEqual([]);
    });

    it("returns empty array on generic non-404 error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeGenericError());

      const result = await service.listAuthorizationPolicies("default");
      expect(result).toEqual([]);
    });
  });

  describe("listServiceProfiles", () => {
    it("returns mapped ServiceProfile resources with routes", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeServiceProfile("my-svc.default.svc.cluster.local")],
      });

      const result = await service.listServiceProfiles("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("my-svc.default.svc.cluster.local");
      expect(result[0].routes).toHaveLength(1);
      expect(result[0].routes[0].name).toBe("GET /api");
      expect(result[0].routes[0].isRetryable).toBe(true);
      expect(result[0].routes[0].timeout).toBe("250ms");
      expect(result[0].retryBudget?.retryRatio).toBe(0.2);
    });

    it("returns empty array on 404", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());

      const result = await service.listServiceProfiles("default");
      expect(result).toEqual([]);
    });

    it("returns empty array when Kubernetes client unavailable", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.listServiceProfiles("default");
      expect(result).toEqual([]);
    });

    it("handles service profile with no routes or retry budget", async () => {
      const bare = {
        metadata: { name: "bare-profile", namespace: "default" },
        spec: {},
      };
      mockListNamespacedCustomObject.mockResolvedValue({ items: [bare] });

      const result = await service.listServiceProfiles("default");

      expect(result[0].routes).toEqual([]);
      expect(result[0].retryBudget).toBeUndefined();
    });

    it("returns empty array on generic non-404 error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeGenericError());

      const result = await service.listServiceProfiles("default");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopologyPlaceholder
  // ---------------------------------------------------------------------------

  describe("buildTopologyPlaceholder", () => {
    it("returns an empty array", () => {
      const result = service.buildTopologyPlaceholder();
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Inline kubeconfig support
  // ---------------------------------------------------------------------------

  describe("inline kubeconfig handling", () => {
    it("uses inline YAML kubeconfig to build a new client", async () => {
      const inlineYaml = "apiVersion: v1\nclusters: []\n";
      mockMakeApiClient.mockReturnValue(mockCustomObjectsApi);
      mockListClusterCustomObject.mockResolvedValue({ items: [] });

      const result = await service.isLinkerdEnabled(inlineYaml);

      expect(mockLoadFromString).toHaveBeenCalledWith(inlineYaml);
      expect(result).toBe(true);
    });

    it("uses file path kubeconfig to build a new client", async () => {
      const filePath = "/home/user/.kube/config";
      mockMakeApiClient.mockReturnValue(mockCustomObjectsApi);
      mockListClusterCustomObject.mockResolvedValue({ items: [] });

      await service.isLinkerdEnabled(filePath);

      expect(mockLoadFromFile).toHaveBeenCalledWith(filePath);
    });

    it("returns false when kubeconfig parsing fails", async () => {
      const badYaml = "not-yaml";
      mockLoadFromString.mockImplementation(() => {
        throw new Error("invalid kubeconfig");
      });

      const result = await service.isLinkerdEnabled(badYaml + "\n");
      expect(result).toBe(false);
    });

    it("logs a warning and uses first element when kubeconfig is an array", async () => {
      mockMakeApiClient.mockReturnValue(mockCustomObjectsApi);
      mockListClusterCustomObject.mockResolvedValue({ items: [] });

      const result = await service.isLinkerdEnabled([
        "apiVersion: v1\nclusters: []\n",
        "second",
      ]);

      expect(result).toBe(true);
    });
  });
});
