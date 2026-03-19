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
