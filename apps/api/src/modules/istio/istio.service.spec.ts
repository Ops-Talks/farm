import { Test, TestingModule } from "@nestjs/testing";
import { IstioService } from "./istio.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";

// ---------------------------------------------------------------------------
// Mock @kubernetes/client-node so the module can load in Jest (CJS mode).
// ---------------------------------------------------------------------------

let mockLoadFromFile: jest.Mock;
let mockLoadFromString: jest.Mock;
let mockMakeApiClient: jest.Mock;
let mockListClusterCustomObject: jest.Mock;
let mockListNamespacedCustomObject: jest.Mock;
let mockGetNamespacedCustomObject: jest.Mock;
let mockPatchNamespacedCustomObject: jest.Mock;

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
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fakeVirtualService(overrides: {
  name?: string;
  namespace?: string;
  hosts?: string[];
  weight?: number;
}) {
  return {
    metadata: {
      name: overrides.name ?? "my-vs",
      namespace: overrides.namespace ?? "default",
      labels: {},
    },
    spec: {
      hosts: overrides.hosts ?? ["my-service"],
      gateways: [],
      http: [
        {
          route: [
            {
              destination: { host: "stable", subset: "v1" },
              weight: overrides.weight ?? 100,
            },
          ],
        },
      ],
    },
  };
}

function fakePeerAuth(name: string, mode: string) {
  return {
    metadata: { name, namespace: "default" },
    spec: {
      selector: { matchLabels: { app: name } },
      mtls: { mode },
    },
  };
}

function fakeAuthPolicy(name: string, action: string, hasRules: boolean) {
  return {
    metadata: { name, namespace: "default" },
    spec: {
      selector: { matchLabels: { app: name } },
      action,
      rules: hasRules
        ? [
            {
              from: [
                {
                  source: {
                    principals: ["cluster.local/ns/default/sa/client"],
                  },
                },
              ],
            },
          ]
        : [],
    },
  };
}

function makeNotFoundError() {
  return { response: { statusCode: 404 } };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("IstioService", () => {
  let service: IstioService;
  let mockCustomObjectsApi: {
    listClusterCustomObject: jest.Mock;
    listNamespacedCustomObject: jest.Mock;
    getNamespacedCustomObject: jest.Mock;
    patchNamespacedCustomObject: jest.Mock;
  };

  const mockKubernetesService = {
    getCustomObjectsApi: jest.fn(),
  };

  beforeEach(async () => {
    // Reset per-test mocks.
    mockListClusterCustomObject = jest.fn();
    mockListNamespacedCustomObject = jest.fn();
    mockGetNamespacedCustomObject = jest.fn();
    mockPatchNamespacedCustomObject = jest.fn();
    mockLoadFromFile = jest.fn();
    mockLoadFromString = jest.fn();

    mockCustomObjectsApi = {
      listClusterCustomObject: mockListClusterCustomObject,
      listNamespacedCustomObject: mockListNamespacedCustomObject,
      getNamespacedCustomObject: mockGetNamespacedCustomObject,
      patchNamespacedCustomObject: mockPatchNamespacedCustomObject,
    };

    mockMakeApiClient = jest.fn().mockReturnValue(mockCustomObjectsApi);

    mockKubernetesService.getCustomObjectsApi.mockReturnValue(
      mockCustomObjectsApi,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IstioService,
        { provide: KubernetesService, useValue: mockKubernetesService },
      ],
    }).compile();

    service = module.get<IstioService>(IstioService);
  });

  // ---------------------------------------------------------------------------
  // isIstioEnabled
  // ---------------------------------------------------------------------------

  describe("isIstioEnabled", () => {
    it("returns true when the VirtualService list call succeeds", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      const result = await service.isIstioEnabled();
      expect(result).toBe(true);
    });

    it("returns false when the CRD group returns 404", async () => {
      mockListClusterCustomObject.mockRejectedValue(makeNotFoundError());
      const result = await service.isIstioEnabled();
      expect(result).toBe(false);
    });

    it("returns false when the Kubernetes client is not available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      const result = await service.isIstioEnabled();
      expect(result).toBe(false);
    });

    it("returns false on unexpected errors", async () => {
      mockListClusterCustomObject.mockRejectedValue(
        new Error("network timeout"),
      );
      const result = await service.isIstioEnabled();
      expect(result).toBe(false);
    });

    it("handles array kubeconfig by using the first element", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      // An array value must not throw and must still return a boolean.
      const result = await service.isIstioEnabled([
        "/path/to/kubeconfig",
        "/path/to/other",
      ]);
      expect(typeof result).toBe("boolean");
    });
  });

  // ---------------------------------------------------------------------------
  // getVirtualServices
  // ---------------------------------------------------------------------------

  describe("getVirtualServices", () => {
    it("returns mapped VirtualServices from the cluster", async () => {
      const raw = fakeVirtualService({ name: "checkout-vs", weight: 80 });
      mockListNamespacedCustomObject.mockResolvedValue({ items: [raw] });

      const result = await service.getVirtualServices("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("checkout-vs");
      expect(result[0].http[0].route[0].weight).toBe(80);
    });

    it("returns empty array when the VirtualService CRD is not installed (404)", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());
      const result = await service.getVirtualServices("default");
      expect(result).toEqual([]);
    });

    it("returns empty array when Kubernetes client is unavailable", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      const result = await service.getVirtualServices("default");
      expect(result).toEqual([]);
    });

    it("returns empty array on unexpected error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(new Error("API error"));
      const result = await service.getVirtualServices("default");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getVirtualService (single)
  // ---------------------------------------------------------------------------

  describe("getVirtualService", () => {
    it("returns a single mapped VirtualService", async () => {
      const raw = fakeVirtualService({ name: "payment-vs" });
      mockGetNamespacedCustomObject.mockResolvedValue(raw);

      const result = await service.getVirtualService("default", "payment-vs");

      expect(result.name).toBe("payment-vs");
      expect(result.namespace).toBe("default");
    });

    it("propagates errors so the controller can handle them", async () => {
      mockGetNamespacedCustomObject.mockRejectedValue(makeNotFoundError());
      await expect(
        service.getVirtualService("default", "nonexistent"),
      ).rejects.toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // patchVirtualServiceWeights
  // ---------------------------------------------------------------------------

  describe("patchVirtualServiceWeights", () => {
    it("patches weights on a VirtualService with existing routes", async () => {
      const raw = fakeVirtualService({ name: "canary-vs" });
      mockGetNamespacedCustomObject.mockResolvedValue(raw);
      mockPatchNamespacedCustomObject.mockResolvedValue({});

      await service.patchVirtualServiceWeights("default", "canary-vs", [
        { destination: "stable", weight: 90 },
        { destination: "canary", weight: 10 },
      ]);

      expect(mockPatchNamespacedCustomObject).toHaveBeenCalledTimes(1);
      const rawCalls = mockPatchNamespacedCustomObject.mock.calls as Array<
        Array<{
          body: { spec: { http: Array<{ route: Array<{ weight: number }> }> } };
        }>
      >;
      const callArgs = rawCalls[0][0];
      expect(callArgs.body.spec.http[0].route).toHaveLength(2);
      expect(callArgs.body.spec.http[0].route[0].weight).toBe(90);
      expect(callArgs.body.spec.http[0].route[1].weight).toBe(10);
    });

    it("throws when the VirtualService has no HTTP routes", async () => {
      mockGetNamespacedCustomObject.mockResolvedValue({
        metadata: { name: "empty-vs", namespace: "default" },
        spec: { http: [] },
      });

      await expect(
        service.patchVirtualServiceWeights("default", "empty-vs", [
          { destination: "svc", weight: 100 },
        ]),
      ).rejects.toThrow("no HTTP routes");
    });

    it("throws when Kubernetes client is not available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      await expect(
        service.patchVirtualServiceWeights("default", "vs", [
          { destination: "svc", weight: 100 },
        ]),
      ).rejects.toThrow("Kubernetes client not available");
    });
  });

  // ---------------------------------------------------------------------------
  // getPeerAuthentications
  // ---------------------------------------------------------------------------

  describe("getPeerAuthentications", () => {
    it("returns mapped PeerAuthentications", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakePeerAuth("my-pa", "STRICT")],
      });

      const result = await service.getPeerAuthentications("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("my-pa");
      expect(result[0].mtlsMode).toBe("STRICT");
    });

    it("returns empty array on 404 (CRD not installed)", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());
      const result = await service.getPeerAuthentications("default");
      expect(result).toEqual([]);
    });

    it("normalizes unknown mTLS modes to UNSET", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakePeerAuth("pa", "UNKNOWN_MODE")],
      });

      const result = await service.getPeerAuthentications("default");
      expect(result[0].mtlsMode).toBe("UNSET");
    });
  });

  // ---------------------------------------------------------------------------
  // getAuthorizationPolicies
  // ---------------------------------------------------------------------------

  describe("getAuthorizationPolicies", () => {
    it("returns mapped AuthorizationPolicies", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeAuthPolicy("allow-all", "ALLOW", false)],
      });

      const result = await service.getAuthorizationPolicies("default");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("allow-all");
      expect(result[0].action).toBe("ALLOW");
    });

    it("sets hasNoRules=true for ALLOW policies with no rules (security warning)", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeAuthPolicy("open-policy", "ALLOW", false)],
      });

      const result = await service.getAuthorizationPolicies("default");
      expect(result[0].hasNoRules).toBe(true);
    });

    it("sets hasNoRules=false when the ALLOW policy has rules", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeAuthPolicy("restricted", "ALLOW", true)],
      });

      const result = await service.getAuthorizationPolicies("default");
      expect(result[0].hasNoRules).toBe(false);
    });

    it("sets hasNoRules=false for DENY policies even without rules", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [fakeAuthPolicy("deny-all", "DENY", false)],
      });

      const result = await service.getAuthorizationPolicies("default");
      expect(result[0].hasNoRules).toBe(false);
    });

    it("returns empty array on 404 (CRD not installed)", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(makeNotFoundError());
      const result = await service.getAuthorizationPolicies("default");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopology
  // ---------------------------------------------------------------------------

  describe("buildTopology", () => {
    it("builds topology edges from VirtualService routes", async () => {
      mockListClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "checkout-vs", namespace: "production" },
            spec: {
              hosts: ["checkout"],
              http: [
                {
                  route: [
                    { destination: { host: "checkout-stable" }, weight: 80 },
                    { destination: { host: "checkout-canary" }, weight: 20 },
                  ],
                },
              ],
            },
          },
        ],
      });

      const result = await service.buildTopology("org-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        source: "checkout",
        destination: "checkout-stable",
        weight: 80,
        namespace: "production",
      });
      expect(result[1]).toMatchObject({
        source: "checkout",
        destination: "checkout-canary",
        weight: 20,
        namespace: "production",
      });
    });

    it("returns empty array when there are no VirtualServices", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      const result = await service.buildTopology("org-1");
      expect(result).toEqual([]);
    });

    it("returns empty array on 404 (Istio not installed)", async () => {
      mockListClusterCustomObject.mockRejectedValue(makeNotFoundError());
      const result = await service.buildTopology("org-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when Kubernetes client is unavailable", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);
      const result = await service.buildTopology("org-1");
      expect(result).toEqual([]);
    });
  });
});
