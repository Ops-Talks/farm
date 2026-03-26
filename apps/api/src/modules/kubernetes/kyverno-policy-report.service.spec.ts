import { Test, TestingModule } from "@nestjs/testing";
import {
  KyvernoPolicyReportService,
  KyvernoPolicyReportResult,
} from "./kyverno-policy-report.service";
import { KubernetesService } from "./kubernetes.service";
import { TagPolicyService } from "../tag-policy/tag-policy.service";

// ---------------------------------------------------------------------------
// Shared mock state for the CustomObjectsApi.
// Each test reassigns these before use to avoid leaking state.
// ---------------------------------------------------------------------------
let mockListNamespacedCustomObject: jest.Mock;
let mockListClusterCustomObject: jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a raw Kyverno PolicyReport API object with the given fields.
 */
function buildRawReport(opts: {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  scopeKind?: string;
  scopeName?: string;
  scopeNamespace?: string;
  results?: Array<{
    policy: string;
    rule: string;
    result: "pass" | "fail" | "warn" | "error" | "skip";
    message?: string;
    category?: string;
    severity?: string;
  }>;
}) {
  return {
    metadata: {
      name: opts.name,
      namespace: opts.namespace,
      labels: opts.labels ?? {},
    },
    scope:
      opts.scopeKind !== undefined
        ? {
            kind: opts.scopeKind,
            name: opts.scopeName ?? opts.name,
            namespace: opts.scopeNamespace,
          }
        : undefined,
    results: opts.results ?? [],
  };
}

/**
 * Wraps items in a Kubernetes list response shape.
 */
function buildList(items: object[]) {
  return { items };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("KyvernoPolicyReportService", () => {
  let service: KyvernoPolicyReportService;
  let mockTagPolicyService: jest.Mocked<
    Pick<TagPolicyService, "upsertViolation">
  >;

  beforeEach(async () => {
    mockListNamespacedCustomObject = jest.fn();
    mockListClusterCustomObject = jest.fn();

    const mockKubernetesService = {
      getCustomObjectsApi: jest.fn().mockReturnValue({
        listNamespacedCustomObject: mockListNamespacedCustomObject,
        listClusterCustomObject: mockListClusterCustomObject,
      }),
    };

    mockTagPolicyService = {
      upsertViolation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KyvernoPolicyReportService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        { provide: TagPolicyService, useValue: mockTagPolicyService },
      ],
    }).compile();

    service = module.get<KyvernoPolicyReportService>(
      KyvernoPolicyReportService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // listPolicyReports
  // -------------------------------------------------------------------------

  describe("listPolicyReports", () => {
    it("should map a valid PolicyReport to KyvernoPolicyReportResult", async () => {
      mockListNamespacedCustomObject.mockResolvedValue(
        buildList([
          buildRawReport({
            name: "report-pod-x",
            namespace: "default",
            scopeKind: "Pod",
            scopeName: "pod-x",
            scopeNamespace: "default",
            results: [
              {
                policy: "require-labels",
                rule: "check-env",
                result: "fail",
                message: "missing env label",
                severity: "high",
              },
            ],
          }),
        ]),
      );

      const results: KyvernoPolicyReportResult[] =
        await service.listPolicyReports("default");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("report-pod-x");
      expect(results[0].namespace).toBe("default");
      expect(results[0].resourceId).toBe("default/pod-x");
      expect(results[0].resourceType).toBe("k8s-pod");
      expect(results[0].results[0].status).toBe("fail");
      expect(results[0].results[0].policy).toBe("require-labels");
      expect(results[0].results[0].rule).toBe("check-env");
      expect(results[0].results[0].message).toBe("missing env label");
    });

    it("should return [] on 404 — Kyverno not installed", async () => {
      const notFound = Object.assign(new Error("Not Found"), {
        response: { statusCode: 404 },
      });
      mockListNamespacedCustomObject.mockRejectedValue(notFound);

      const results = await service.listPolicyReports("default");

      expect(results).toEqual([]);
    });

    it("should return [] and log on non-404 error", async () => {
      mockListNamespacedCustomObject.mockRejectedValue(
        new Error("Internal Server Error"),
      );

      const results = await service.listPolicyReports("default");

      expect(results).toEqual([]);
    });

    it("should pass the provided namespace to the API call", async () => {
      mockListNamespacedCustomObject.mockResolvedValue(buildList([]));

      await service.listPolicyReports("kube-system");

      expect(mockListNamespacedCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "kube-system" }),
      );
    });

    it("should default to namespace 'default' when none is provided", async () => {
      mockListNamespacedCustomObject.mockResolvedValue(buildList([]));

      await service.listPolicyReports();

      expect(mockListNamespacedCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "default" }),
      );
    });

    it("should extract linkedComponentId from farm.io/component label", async () => {
      mockListNamespacedCustomObject.mockResolvedValue(
        buildList([
          buildRawReport({
            name: "report-svc",
            namespace: "prod",
            labels: { "farm.io/component": "my-component" },
            scopeKind: "Deployment",
            scopeName: "svc-deploy",
            scopeNamespace: "prod",
          }),
        ]),
      );

      const results = await service.listPolicyReports("prod");

      expect(results[0].linkedComponentId).toBe("my-component");
    });
  });

  // -------------------------------------------------------------------------
  // listClusterPolicyReports
  // -------------------------------------------------------------------------

  describe("listClusterPolicyReports", () => {
    it("should map a ClusterPolicyReport correctly", async () => {
      mockListClusterCustomObject.mockResolvedValue(
        buildList([
          buildRawReport({
            name: "cluster-report-1",
            scopeKind: "Namespace",
            scopeName: "production",
            results: [
              {
                policy: "cluster-policy",
                rule: "require-network-policy",
                result: "fail",
                message: "No NetworkPolicy found",
              },
            ],
          }),
        ]),
      );

      const results = await service.listClusterPolicyReports();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("cluster-report-1");
      expect(results[0].resourceId).toBe("production");
      expect(results[0].resourceType).toBe("k8s-namespace");
      expect(results[0].results[0].policy).toBe("cluster-policy");
      expect(results[0].results[0].status).toBe("fail");
    });

    it("should return [] on 404 for clusterpolicyreports", async () => {
      const notFound = Object.assign(new Error("Not Found"), {
        response: { statusCode: 404 },
      });
      mockListClusterCustomObject.mockRejectedValue(notFound);

      const results = await service.listClusterPolicyReports();

      expect(results).toEqual([]);
    });

    it("should call listClusterCustomObject with plural 'clusterpolicyreports'", async () => {
      mockListClusterCustomObject.mockResolvedValue(buildList([]));

      await service.listClusterPolicyReports();

      expect(mockListClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ plural: "clusterpolicyreports" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // syncViolationsForOrg
  // -------------------------------------------------------------------------

  describe("syncViolationsForOrg", () => {
    it("should call upsertViolation for each failing policy report result", async () => {
      // listAllNamespacePolicyReports uses listClusterCustomObject with plural='policyreports'
      // listClusterPolicyReports uses listClusterCustomObject with plural='clusterpolicyreports'
      mockListClusterCustomObject.mockImplementation(
        (args: { plural: string }) => {
          if (args.plural === "policyreports") {
            return Promise.resolve(
              buildList([
                buildRawReport({
                  name: "ns-report",
                  namespace: "default",
                  scopeKind: "Pod",
                  scopeName: "my-pod",
                  scopeNamespace: "default",
                  results: [
                    {
                      policy: "require-labels",
                      rule: "check-team",
                      result: "fail",
                      message: "missing team",
                    },
                  ],
                }),
              ]),
            );
          }
          // clusterpolicyreports — return empty
          return Promise.resolve(buildList([]));
        },
      );
      mockListNamespacedCustomObject.mockResolvedValue(buildList([]));

      await service.syncViolationsForOrg("org-abc");

      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledTimes(1);
      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-abc",
          resourceId: "default/my-pod",
          resourceType: "k8s-pod",
          provider: "kubernetes",
          missingKeys: ["require-labels/check-team"],
        }),
      );
    });

    it("should skip upsert for reports with no failing results", async () => {
      mockListClusterCustomObject.mockImplementation(
        (args: { plural: string }) => {
          if (args.plural === "policyreports") {
            return Promise.resolve(
              buildList([
                buildRawReport({
                  name: "passing-report",
                  namespace: "default",
                  scopeKind: "Pod",
                  scopeName: "good-pod",
                  scopeNamespace: "default",
                  results: [
                    {
                      policy: "require-labels",
                      rule: "check-team",
                      result: "pass",
                      message: "ok",
                    },
                  ],
                }),
              ]),
            );
          }
          return Promise.resolve(buildList([]));
        },
      );
      mockListNamespacedCustomObject.mockResolvedValue(buildList([]));

      await service.syncViolationsForOrg("org-abc");

      // upsertViolation is still called but with empty missingKeys (resolves violation)
      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          missingKeys: [],
        }),
      );
    });

    it("should not call upsertViolation when TagPolicyService is not injected", async () => {
      // Create a service instance without TagPolicyService
      const moduleWithoutTagPolicy: TestingModule =
        await Test.createTestingModule({
          providers: [
            KyvernoPolicyReportService,
            {
              provide: KubernetesService,
              useValue: {
                getCustomObjectsApi: jest.fn().mockReturnValue({
                  listNamespacedCustomObject: mockListNamespacedCustomObject,
                  listClusterCustomObject: mockListClusterCustomObject,
                }),
              },
            },
          ],
        }).compile();

      const serviceWithoutTag =
        moduleWithoutTagPolicy.get<KyvernoPolicyReportService>(
          KyvernoPolicyReportService,
        );

      // Should not throw, should just warn and return
      await expect(
        serviceWithoutTag.syncViolationsForOrg("org-xyz"),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // listAllNamespacePolicyReports
  // -------------------------------------------------------------------------

  describe("listAllNamespacePolicyReports", () => {
    it("should fall back to listPolicyReports('default') when cluster-scoped call fails", async () => {
      // First call (cluster-scoped policyreports) fails
      mockListClusterCustomObject.mockRejectedValue(new Error("Forbidden"));

      // Fall-back: namespaced call returns one report
      mockListNamespacedCustomObject.mockResolvedValue(
        buildList([
          buildRawReport({
            name: "fallback-report",
            namespace: "default",
            scopeKind: "Pod",
            scopeName: "fallback-pod",
            scopeNamespace: "default",
          }),
        ]),
      );

      const results = await service.listAllNamespacePolicyReports();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("fallback-report");
      expect(mockListNamespacedCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "default" }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("KyvernoPolicyReportService — additional branches", () => {
  let service: KyvernoPolicyReportService;
  let mockGetCustomObjectsApi: jest.Mock;
  let mockTagPolicyService: jest.Mocked<
    Pick<TagPolicyService, "upsertViolation">
  >;

  beforeEach(async () => {
    mockGetCustomObjectsApi = jest.fn();

    const mockKubernetesService = {
      getCustomObjectsApi: mockGetCustomObjectsApi,
    };

    mockTagPolicyService = {
      upsertViolation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KyvernoPolicyReportService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        { provide: TagPolicyService, useValue: mockTagPolicyService },
      ],
    }).compile();

    service = module.get<KyvernoPolicyReportService>(
      KyvernoPolicyReportService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // listPolicyReports — null API
  // -------------------------------------------------------------------------

  describe("listPolicyReports — null API client", () => {
    it("should return empty array when getCustomObjectsApi returns null", async () => {
      mockGetCustomObjectsApi.mockReturnValue(null);

      const results = await service.listPolicyReports("default");

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listClusterPolicyReports — null API + non-404 error
  // -------------------------------------------------------------------------

  describe("listClusterPolicyReports — null API client", () => {
    it("should return empty array when getCustomObjectsApi returns null", async () => {
      mockGetCustomObjectsApi.mockReturnValue(null);

      const results = await service.listClusterPolicyReports();

      expect(results).toEqual([]);
    });
  });

  describe("listClusterPolicyReports — non-404 error", () => {
    it("should return empty array and log error on unexpected non-404 error", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listClusterCustomObject: jest
          .fn()
          .mockRejectedValue(new Error("Connection refused")),
      });

      const results = await service.listClusterPolicyReports();

      expect(results).toEqual([]);
    });

    it("should return empty array on non-Error object thrown", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listClusterCustomObject: jest.fn().mockRejectedValue("string error"),
      });

      const results = await service.listClusterPolicyReports();

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listAllNamespacePolicyReports — null API
  // -------------------------------------------------------------------------

  describe("listAllNamespacePolicyReports — null API client", () => {
    it("should return empty array when getCustomObjectsApi returns null", async () => {
      mockGetCustomObjectsApi.mockReturnValue(null);

      const results = await service.listAllNamespacePolicyReports();

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // mapPolicyReport — no scope (k8s-unknown path)
  // -------------------------------------------------------------------------

  describe("mapPolicyReport — without scope", () => {
    it("should set resourceType to k8s-unknown when scope is absent", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: {
                name: "cluster-report",
                namespace: "default",
                labels: {},
              },
              // No scope field
              results: [],
            },
          ],
        }),
      });

      const results = await service.listPolicyReports("default");

      expect(results[0].resourceType).toBe("k8s-unknown");
      expect(results[0].resourceId).toBe("cluster-report");
    });

    it("should derive resourceId from scope.name when scope has no namespace", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: { name: "ns-report", namespace: undefined, labels: {} },
              scope: {
                kind: "Node",
                name: "worker-node-1",
                // No namespace on scope, no namespace on metadata
              },
              results: [],
            },
          ],
        }),
      });

      const results = await service.listPolicyReports();

      // ns is undefined from both scope.namespace and item.metadata.namespace
      expect(results[0].resourceId).toBe("worker-node-1");
      expect(results[0].resourceType).toBe("k8s-node");
    });

    it("should use farm/component label as linkedComponentId fallback", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: {
                name: "report-alt-label",
                namespace: "default",
                labels: { "farm/component": "alt-comp" },
              },
              results: [],
            },
          ],
        }),
      });

      const results = await service.listPolicyReports("default");

      expect(results[0].linkedComponentId).toBe("alt-comp");
    });

    it("should return undefined linkedComponentId when no farm labels exist", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: {
                name: "unlabeled-report",
                namespace: "default",
                labels: {},
              },
              results: [],
            },
          ],
        }),
      });

      const results = await service.listPolicyReports("default");

      expect(results[0].linkedComponentId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // listPolicyReports — null items in response
  // -------------------------------------------------------------------------

  describe("listPolicyReports — null items in response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({}),
      });

      const results = await service.listPolicyReports("default");

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listClusterPolicyReports — null items in response
  // -------------------------------------------------------------------------

  describe("listClusterPolicyReports — null items in response", () => {
    it("should return empty array when response.items is undefined", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listClusterCustomObject: jest.fn().mockResolvedValue({}),
      });

      const results = await service.listClusterPolicyReports();

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // mapPolicyReport — result fields
  // -------------------------------------------------------------------------

  describe("mapPolicyReport — result field defaults", () => {
    it("should use empty string for missing message field in results", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: {
                name: "no-msg-report",
                namespace: "default",
                labels: {},
              },
              scope: { kind: "Pod", name: "my-pod", namespace: "default" },
              results: [
                {
                  policy: "require-labels",
                  rule: "check-env",
                  result: "fail",
                  // No message field
                },
              ],
            },
          ],
        }),
      });

      const results = await service.listPolicyReports("default");

      expect(results[0].results[0].message).toBe("");
    });

    it("should handle null results array in policy report", async () => {
      mockGetCustomObjectsApi.mockReturnValue({
        listNamespacedCustomObject: jest.fn().mockResolvedValue({
          items: [
            {
              metadata: {
                name: "null-results-report",
                namespace: "default",
                labels: {},
              },
              // No results field
            },
          ],
        }),
      });

      const results = await service.listPolicyReports("default");

      expect(results[0].results).toEqual([]);
    });
  });
});
