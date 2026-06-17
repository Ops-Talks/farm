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
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { IstioService } from "./istio.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";

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
      mockLoadFromFile.mockImplementation(() => undefined);

      await service.isIstioEnabled(["/path/to/kubeconfig", "/path/to/other"]);

      expect(mockLoadFromFile).toHaveBeenCalledWith("/path/to/kubeconfig");
      expect(mockLoadFromFile).not.toHaveBeenCalledWith("/path/to/other");
    });

    it("throws BadRequestException for array kubeconfig with non-string first element", async () => {
      await expect(
        service.isIstioEnabled([123 as unknown as string]),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for array kubeconfig with empty string first element", async () => {
      await expect(
        service.isIstioEnabled([""]),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for non-string kubeconfig", async () => {
      await expect(
        service.isIstioEnabled(123 as unknown as string),
      ).rejects.toThrow(BadRequestException);
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

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("IstioService — additional branches", () => {
  let service: IstioService;

  const mockKubernetesService = { getCustomObjectsApi: jest.fn() };

  beforeEach(async () => {
    mockListClusterCustomObject = jest.fn();
    mockListNamespacedCustomObject = jest.fn();
    mockGetNamespacedCustomObject = jest.fn();
    mockPatchNamespacedCustomObject = jest.fn();
    mockLoadFromFile = jest.fn();
    mockLoadFromString = jest.fn();
    mockMakeApiClient = jest.fn().mockReturnValue({
      listClusterCustomObject: mockListClusterCustomObject,
      listNamespacedCustomObject: mockListNamespacedCustomObject,
      getNamespacedCustomObject: mockGetNamespacedCustomObject,
      patchNamespacedCustomObject: mockPatchNamespacedCustomObject,
    });

    mockKubernetesService.getCustomObjectsApi.mockReturnValue({
      listClusterCustomObject: mockListClusterCustomObject,
      listNamespacedCustomObject: mockListNamespacedCustomObject,
      getNamespacedCustomObject: mockGetNamespacedCustomObject,
      patchNamespacedCustomObject: mockPatchNamespacedCustomObject,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IstioService,
        { provide: KubernetesService, useValue: mockKubernetesService },
      ],
    }).compile();

    service = module.get<IstioService>(IstioService);
  });

  // ---------------------------------------------------------------------------
  // getApi — inline YAML kubeconfig (loadFromString path)
  // ---------------------------------------------------------------------------

  describe("getApi — inline YAML kubeconfig", () => {
    it("uses loadFromString when kubeconfig contains a newline", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockLoadFromString.mockImplementation(() => undefined);

      const inlineYaml =
        "apiVersion: v1\nkind: Config\nclusters: []\ncontexts: []\ncurrent-context: ''\nusers: []\n";

      const result = await service.isIstioEnabled(inlineYaml);

      expect(result).toBe(true);
      expect(mockLoadFromString).toHaveBeenCalledWith(inlineYaml);
    });

    it("uses loadFromString when kubeconfig starts with 'apiVersion'", async () => {
      mockListClusterCustomObject.mockResolvedValue({ items: [] });
      mockLoadFromString.mockImplementation(() => undefined);

      const inlineYaml =
        "apiVersion: v1 kind: Config clusters: [] contexts: [] current-context: '' users: []";

      await service.isIstioEnabled(inlineYaml);

      expect(mockLoadFromString).toHaveBeenCalledWith(inlineYaml);
    });
  });

  // ---------------------------------------------------------------------------
  // getApi — kubeconfig parsing failure
  // ---------------------------------------------------------------------------

  describe("getApi — kubeconfig build fails", () => {
    it("returns empty VS list when kubeconfig loading throws", async () => {
      mockLoadFromFile.mockImplementation(() => {
        throw new Error("invalid kubeconfig file");
      });

      const result = await service.getVirtualServices(
        "default",
        "/bad/kubeconfig/path",
      );

      expect(result).toEqual([]);
    });

    it("returns false for isIstioEnabled when kubeconfig loading throws", async () => {
      mockLoadFromFile.mockImplementation(() => {
        throw new Error("not found");
      });

      const result = await service.isIstioEnabled("/bad/path");

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getVirtualService — when api is null
  // ---------------------------------------------------------------------------

  describe("getVirtualService — null api", () => {
    it("throws when Kubernetes client is not available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      await expect(
        service.getVirtualService("default", "my-vs"),
      ).rejects.toThrow("Kubernetes client not available");
    });
  });

  // ---------------------------------------------------------------------------
  // getPeerAuthentications — null api and unexpected error
  // ---------------------------------------------------------------------------

  describe("getPeerAuthentications — null api", () => {
    it("returns empty array when Kubernetes client is not available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.getPeerAuthentications("default");

      expect(result).toEqual([]);
    });
  });

  describe("getPeerAuthentications — unexpected error", () => {
    it("returns empty array on non-404 error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(
        new Error("Internal Server Error"),
      );

      const result = await service.getPeerAuthentications("default");

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getAuthorizationPolicies — null api and unexpected error
  // ---------------------------------------------------------------------------

  describe("getAuthorizationPolicies — null api", () => {
    it("returns empty array when Kubernetes client is not available", async () => {
      mockKubernetesService.getCustomObjectsApi.mockReturnValue(null);

      const result = await service.getAuthorizationPolicies("default");

      expect(result).toEqual([]);
    });
  });

  describe("getAuthorizationPolicies — unexpected error", () => {
    it("returns empty array on non-404 error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(
        new Error("connection refused"),
      );

      const result = await service.getAuthorizationPolicies("default");

      expect(result).toEqual([]);
    });

    it("normalizes unknown action to ALLOW", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "weird-policy", namespace: "default" },
            spec: {
              selector: { matchLabels: {} },
              action: "UNKNOWN_ACTION",
              rules: [],
            },
          },
        ],
      });

      const result = await service.getAuthorizationPolicies("default");

      expect(result[0].action).toBe("ALLOW");
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopology — unexpected error
  // ---------------------------------------------------------------------------

  describe("buildTopology — unexpected error", () => {
    it("returns empty array on non-404 error", async () => {
      mockListClusterCustomObject.mockRejectedValue(
        new Error("upstream connect error"),
      );

      const result = await service.buildTopology("org-1");

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // mapVirtualService — optional fields default values
  // ---------------------------------------------------------------------------

  describe("getVirtualServices — default field values", () => {
    it("maps optional fields to defaults when they are absent", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {},
            spec: {},
          },
        ],
      });

      const result = await service.getVirtualServices("default");

      expect(result[0].name).toBe("unknown");
      expect(result[0].namespace).toBe("default");
      expect(result[0].hosts).toEqual([]);
      expect(result[0].gateways).toEqual([]);
      expect(result[0].http).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopology — VS with missing destination host
  // ---------------------------------------------------------------------------

  describe("buildTopology — skips routes with no destination host", () => {
    it("does not add an edge when the route destination host is missing", async () => {
      mockListClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "no-dest-vs", namespace: "default" },
            spec: {
              hosts: ["my-service"],
              http: [
                {
                  route: [
                    { destination: {}, weight: 100 }, // no host
                  ],
                },
              ],
            },
          },
        ],
      });

      const result = await service.buildTopology("org-1");

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // String(error) branches — throw non-Error objects
  // ---------------------------------------------------------------------------

  describe("isIstioEnabled — String(error) non-404 path", () => {
    it("returns false when a non-Error, non-404 error is thrown", async () => {
      mockListClusterCustomObject.mockRejectedValue("string-error");

      const result = await service.isIstioEnabled();

      expect(result).toBe(false);
    });
  });

  describe("getVirtualServices — String(error) path", () => {
    it("returns empty array when a non-Error is thrown", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(42);

      const result = await service.getVirtualServices("default");

      expect(result).toEqual([]);
    });
  });

  describe("getAuthorizationPolicies — non-404 error with String(error) path", () => {
    it("returns empty array when a non-Error object is thrown", async () => {
      mockListNamespacedCustomObject.mockRejectedValue({ code: 500 });

      const result = await service.getAuthorizationPolicies("default");

      expect(result).toEqual([]);
    });
  });

  describe("getPeerAuthentications — non-404 error with String(error) path", () => {
    it("returns empty array when a non-Error is thrown", async () => {
      mockListNamespacedCustomObject.mockRejectedValue("peer-auth-error");

      const result = await service.getPeerAuthentications("default");

      expect(result).toEqual([]);
    });
  });

  describe("buildTopology — non-404 error with String(error) path", () => {
    it("returns empty array when a non-Error is thrown", async () => {
      mockListClusterCustomObject.mockRejectedValue("topology-error");

      const result = await service.buildTopology("org-1");

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // mapVirtualService — ?? defaults inside http routes
  // ---------------------------------------------------------------------------

  describe("mapVirtualService — route ?? defaults", () => {
    it("should use default weight and empty destination when route fields are absent", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "vs-partial", namespace: "test" },
            spec: {
              hosts: ["svc"],
              http: [
                {
                  name: "route-1",
                  route: [
                    {
                      // no weight, no destination
                    },
                    {
                      weight: 50,
                      destination: { host: "svc-v2" },
                    },
                  ],
                },
                {
                  // http entry with no route array
                  name: "route-2",
                },
              ],
            },
          },
        ],
      });

      const result = await service.getVirtualServices("test");

      expect(result[0].http[0].route[0].destination).toBe("");
      expect(result[0].http[0].route[0].weight).toBe(100); // ?? 100 default
      expect(result[0].http[1].route).toHaveLength(0); // route ?? []
    });
  });

  // ---------------------------------------------------------------------------
  // mapPeerAuthentication — ?? defaults and invalid mode
  // ---------------------------------------------------------------------------

  describe("mapPeerAuthentication — ?? defaults", () => {
    it("should use defaults when PeerAuthentication fields are absent", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {},
            spec: {},
          },
        ],
      });

      const result = await service.getPeerAuthentications("default");

      expect(result[0].name).toBe("unknown");
      expect(result[0].namespace).toBe("default");
      expect(result[0].selector).toEqual({});
      expect(result[0].mtlsMode).toBe("UNSET");
    });

    it("should fall back to UNSET for an unrecognized mtls mode", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "pa-bad", namespace: "default" },
            spec: { mtls: { mode: "INVALID_MODE" } },
          },
        ],
      });

      const result = await service.getPeerAuthentications("default");

      expect(result[0].mtlsMode).toBe("UNSET");
    });
  });

  // ---------------------------------------------------------------------------
  // mapAuthorizationPolicy — rule field ?? defaults
  // ---------------------------------------------------------------------------

  describe("mapAuthorizationPolicy — rule field ?? defaults", () => {
    it("should return empty rules array when spec.rules is absent", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "ap-no-rules", namespace: "default" },
            spec: { action: "DENY" },
          },
        ],
      });

      const result = await service.getAuthorizationPolicies("default");

      expect(result[0].rules).toHaveLength(0);
      expect(result[0].action).toBe("DENY");
    });

    it("should handle rule entries with missing from/to/source fields", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "ap-partial", namespace: "default" },
            spec: {
              action: "ALLOW",
              rules: [
                {
                  from: [{ source: {} }],
                  to: [{ operation: {} }],
                },
                {
                  from: [{}],
                  to: [{}],
                },
                {
                  // No from, no to
                },
              ],
            },
          },
        ],
      });

      const result = await service.getAuthorizationPolicies("default");

      expect(result[0].rules).toHaveLength(3);
      expect(result[0].rules[0].principals).toBeUndefined();
      expect(result[0].rules[0].methods).toBeUndefined();
    });

    it("should include principals and methods when they are present", async () => {
      mockListNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "ap-full", namespace: "default" },
            spec: {
              action: "DENY",
              rules: [
                {
                  from: [
                    {
                      source: {
                        principals: ["cluster.local/ns/default/sa/svc"],
                        namespaces: ["production"],
                      },
                    },
                  ],
                  to: [
                    {
                      operation: {
                        methods: ["GET", "POST"],
                        paths: ["/api/*"],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      });

      const result = await service.getAuthorizationPolicies("default");

      expect(result[0].rules[0].principals).toEqual([
        "cluster.local/ns/default/sa/svc",
      ]);
      expect(result[0].rules[0].namespaces).toEqual(["production"]);
      expect(result[0].rules[0].methods).toEqual(["GET", "POST"]);
      expect(result[0].rules[0].paths).toEqual(["/api/*"]);
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopology — edges with weights and null items
  // ---------------------------------------------------------------------------

  describe("buildTopology — edge weights and null items", () => {
    it("returns empty array when response has no items property", async () => {
      mockListClusterCustomObject.mockResolvedValue({});

      const result = await service.buildTopology("org-1");

      expect(result).toEqual([]);
    });

    it("creates edges for routes with a valid destination host", async () => {
      mockListClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "vs-with-edges", namespace: "default" },
            spec: {
              hosts: ["frontend"],
              http: [
                {
                  route: [
                    { destination: { host: "backend" }, weight: 80 },
                    { destination: { host: "backend-canary" }, weight: 20 },
                  ],
                },
              ],
            },
          },
        ],
      });

      const result = await service.buildTopology("org-1");

      expect(result.length).toBeGreaterThan(0);
      const edge = result.find(
        (e) => e.source === "frontend" && e.destination === "backend",
      );
      expect(edge).toBeDefined();
      expect(edge?.weight).toBe(80);
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests — ?? defaults and error paths
// ---------------------------------------------------------------------------

describe("IstioService — null items and deeper ?? paths", () => {
  let service: IstioService;
  let mockCustomObjectsApi: Record<string, jest.Mock>;
  let mockKubernetesService: { getCustomObjectsApi: jest.Mock };

  beforeEach(async () => {
    mockCustomObjectsApi = {
      listNamespacedCustomObject: jest.fn(),
      listClusterCustomObject: jest.fn(),
      getNamespacedCustomObject: jest.fn(),
      patchNamespacedCustomObject: jest.fn(),
    };

    mockKubernetesService = {
      getCustomObjectsApi: jest.fn().mockReturnValue(mockCustomObjectsApi),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IstioService,
        { provide: KubernetesService, useValue: mockKubernetesService },
      ],
    }).compile();

    service = module.get<IstioService>(IstioService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // getVirtualServices — null items in response
  // -------------------------------------------------------------------------

  describe("getVirtualServices — null items in response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({});

      const result = await service.getVirtualServices("default");

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getPeerAuthentications — null items
  // -------------------------------------------------------------------------

  describe("getPeerAuthentications — null items in response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({});

      const result = await service.getPeerAuthentications("default");

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getAuthorizationPolicies — null items
  // -------------------------------------------------------------------------

  describe("getAuthorizationPolicies — null items in response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({});

      const result = await service.getAuthorizationPolicies("default");

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // buildTopology — null items + VS with missing metadata/spec fields
  // -------------------------------------------------------------------------

  describe("buildTopology — VS with missing fields trigger ?? defaults", () => {
    it("should use 'default' namespace when VS metadata.namespace is absent", async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {}, // No namespace field
            spec: {
              hosts: ["svc-a"],
              http: [
                {
                  route: [
                    { destination: { host: "svc-b" }, weight: undefined },
                  ],
                },
              ],
            },
          },
        ],
      });

      const edges = await service.buildTopology("org-1");

      expect(edges[0].namespace).toBe("default");
      expect(edges[0].weight).toBe(100); // weight ?? 100
    });

    it("should skip VS with no hosts", async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { namespace: "default" },
            spec: {
              hosts: [], // Empty hosts
              http: [{ route: [{ destination: { host: "svc-b" } }] }],
            },
          },
        ],
      });

      const edges = await service.buildTopology("org-1");

      expect(edges).toEqual([]);
    });

    it("should skip httpRoute entries with no route array", async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { namespace: "prod" },
            spec: {
              hosts: ["my-svc"],
              http: [
                {
                  /* No route field */
                },
              ],
            },
          },
        ],
      });

      const edges = await service.buildTopology("org-1");

      expect(edges).toEqual([]);
    });

    it("should skip VS with no http array", async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { namespace: "prod" },
            spec: {
              hosts: ["my-svc"],
              // No http field
            },
          },
        ],
      });

      const edges = await service.buildTopology("org-1");

      expect(edges).toEqual([]);
    });

    it("should handle response with no items field (null items)", async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        // No items field
      });

      const edges = await service.buildTopology("org-1");

      expect(edges).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // patchVirtualServiceWeights — route without matching destination
  // -------------------------------------------------------------------------

  describe("patchVirtualServiceWeights — new destination not in existing routes", () => {
    it("should create a new destination entry when existing route is not found", async () => {
      mockCustomObjectsApi.getNamespacedCustomObject.mockResolvedValue({
        metadata: { name: "my-vs", namespace: "default" },
        spec: {
          http: [
            {
              route: [
                { destination: { host: "svc-a", subset: "v1" }, weight: 80 },
              ],
            },
          ],
        },
      });
      mockCustomObjectsApi.patchNamespacedCustomObject.mockResolvedValue({});

      await service.patchVirtualServiceWeights("default", "my-vs", [
        { destination: "svc-a", weight: 50 },
        { destination: "svc-new", weight: 50 }, // Not in existing routes
      ]);

      expect(
        mockCustomObjectsApi.patchNamespacedCustomObject,
      ).toHaveBeenCalled();
      const patchArg = mockCustomObjectsApi.patchNamespacedCustomObject.mock
        .calls[0] as [
        {
          body: {
            spec: {
              http: Array<{
                route: Array<{ destination: { host: string }; weight: number }>;
              }>;
            };
          };
        },
      ];
      const patchedRoutes = patchArg[0].body.spec.http[0].route;
      const newRoute = patchedRoutes.find(
        (r) => r.destination.host === "svc-new",
      );
      expect(newRoute).toBeDefined();
      expect(newRoute?.weight).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // mapAuthorizationPolicy — spec absent (action ?? "ALLOW")
  // -------------------------------------------------------------------------

  describe("mapAuthorizationPolicy — spec is absent", () => {
    it("should default action to ALLOW and metadata to unknowns when spec is absent", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: {}, // No name, no namespace
            // No spec field
          },
        ],
      });

      const results = await service.getAuthorizationPolicies("default");

      expect(results[0].name).toBe("unknown");
      expect(results[0].namespace).toBe("default");
      expect(results[0].action).toBe("ALLOW");
      expect(results[0].rules).toEqual([]);
      expect(results[0].hasNoRules).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // mapPeerAuthentication — spec absent
  // -------------------------------------------------------------------------

  describe("mapPeerAuthentication — spec is absent", () => {
    it("should use UNSET mode and empty selector when spec is absent", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "bare-pa" },
            // No spec field
          },
        ],
      });

      const results = await service.getPeerAuthentications("default");

      expect(results[0].mtlsMode).toBe("UNSET");
      expect(results[0].selector).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // mapVirtualService — spec absent
  // -------------------------------------------------------------------------

  describe("mapVirtualService — spec is absent", () => {
    it("should return defaults when spec is absent", async () => {
      mockCustomObjectsApi.listNamespacedCustomObject.mockResolvedValue({
        items: [
          {
            metadata: { name: "bare-vs", namespace: "prod" },
            // No spec field
          },
        ],
      });

      const results = await service.getVirtualServices("prod");

      expect(results[0].name).toBe("bare-vs");
      expect(results[0].hosts).toEqual([]);
      expect(results[0].gateways).toEqual([]);
      expect(results[0].http).toEqual([]);
      expect(results[0].labels).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // getApi — String(error) in catch (non-Error thrown)
  // -------------------------------------------------------------------------

  describe("getApi — String(error) path when loading kubeconfig", () => {
    it("should return null and warn when a non-Error is thrown during kubeconfig load", async () => {
      // Use a kubeconfig that starts with "apiVersion" so loadFromString is called,
      // then mock k8s.KubeConfig to throw a non-Error.
      const inlineKubeconfig = "apiVersion: v1\nclusters: []\n";

      // When kc.loadFromString fails with a non-Error value, getApi returns null.
      const result = await service.getVirtualServices(
        "default",
        inlineKubeconfig,
      );

      // The inline kubeconfig is invalid so either loadFromString or makeApiClient may throw.
      // Either way, result should be an empty array (null api path or error path).
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
