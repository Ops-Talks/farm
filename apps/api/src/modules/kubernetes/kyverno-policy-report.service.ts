import { Injectable, Logger, Optional } from "@nestjs/common";
import { KubernetesService } from "./kubernetes.service";
import { TagPolicyService } from "../tag-policy/tag-policy.service";

/**
 * Represents a mapped Kyverno PolicyReport or ClusterPolicyReport entry.
 * Each instance corresponds to one PolicyReport resource scoped to a single
 * Kubernetes subject (pod, deployment, etc.).
 */
export interface KyvernoPolicyReportResult {
  /** PolicyReport metadata.name */
  name: string;
  /** Kubernetes namespace of the report, absent for cluster-scoped reports */
  namespace?: string;
  /** Unique identifier derived from the subject scope or metadata name */
  resourceId: string;
  /** Resource type in Farm convention, e.g. "k8s-pod", "k8s-deployment" */
  resourceType: string;
  /** Catalog component ID from farm.io/component or farm/component label */
  linkedComponentId?: string;
  /** Individual policy rule evaluation results */
  results: Array<{
    policy: string;
    rule: string;
    status: "pass" | "fail" | "warn" | "error" | "skip";
    message: string;
    category?: string;
    severity?: string;
  }>;
}

/**
 * Raw shape of a Kyverno PolicyReport or ClusterPolicyReport object as
 * returned by the Kubernetes CustomObjectsApi.
 * Only the fields consumed by this service are declared.
 */
interface RawPolicyReport {
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  scope?: { kind: string; name: string; namespace?: string };
  results?: Array<{
    policy: string;
    rule: string;
    result: "pass" | "fail" | "warn" | "error" | "skip";
    message?: string;
    category?: string;
    severity?: string;
    resources?: Array<{ kind: string; name: string; namespace?: string }>;
  }>;
}

/**
 * Raw list response from the CustomObjectsApi for policyreport/clusterpolicyreport
 * resources.
 */
interface RawPolicyReportList {
  items?: RawPolicyReport[];
  [key: string]: unknown;
}

/**
 * Service for reading Kyverno PolicyReport and ClusterPolicyReport custom
 * resources from the Kubernetes cluster and synchronising failing results as
 * ResourceViolations in the Farm tag-governance store.
 *
 * The service degrades gracefully when:
 * - The Kubernetes client is not configured (returns empty arrays)
 * - The Kyverno CRD is not installed (HTTP 404 → returns empty arrays)
 * - TagPolicyService is not available (skips sync, warns instead)
 */
@Injectable()
export class KyvernoPolicyReportService {
  private readonly logger = new Logger(KyvernoPolicyReportService.name);
  private readonly GROUP = "wgpolicyk8s.io";
  private readonly VERSION = "v1alpha2";

  constructor(
    private readonly kubernetesService: KubernetesService,
    @Optional() private readonly tagPolicyService?: TagPolicyService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Lists PolicyReport resources from the given namespace.
   * Falls back to "default" namespace when none is provided.
   *
   * @param namespace - Kubernetes namespace to query; defaults to "default"
   * @returns Array of mapped policy report results
   */
  async listPolicyReports(
    namespace?: string,
  ): Promise<KyvernoPolicyReportResult[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty policy report list",
      );
      return [];
    }

    try {
      const response = (await api.listNamespacedCustomObject({
        group: this.GROUP,
        version: this.VERSION,
        namespace: namespace ?? "default",
        plural: "policyreports",
      })) as RawPolicyReportList;

      return (response.items ?? []).map((item) => this.mapPolicyReport(item));
    } catch (error) {
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "Kyverno PolicyReport CRD not installed in this cluster; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list PolicyReports: ${message}`);
      return [];
    }
  }

  /**
   * Lists ClusterPolicyReport resources (cluster-scoped, no namespace).
   * Returns an empty array gracefully when the CRD is not installed.
   *
   * @returns Array of mapped cluster policy report results
   */
  async listClusterPolicyReports(): Promise<KyvernoPolicyReportResult[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty cluster policy report list",
      );
      return [];
    }

    try {
      const response = (await api.listClusterCustomObject({
        group: this.GROUP,
        version: this.VERSION,
        plural: "clusterpolicyreports",
      })) as RawPolicyReportList;

      return (response.items ?? []).map((item) => this.mapPolicyReport(item));
    } catch (error) {
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "Kyverno ClusterPolicyReport CRD not installed in this cluster; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list ClusterPolicyReports: ${message}`);
      return [];
    }
  }

  /**
   * Lists PolicyReport resources across all namespaces using a cluster-scoped
   * list call.  Falls back to listing from the "default" namespace when the
   * cluster-scoped call fails (e.g. insufficient RBAC permissions).
   *
   * @returns Array of mapped policy report results
   */
  async listAllNamespacePolicyReports(): Promise<KyvernoPolicyReportResult[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      return [];
    }

    try {
      const response = (await api.listClusterCustomObject({
        group: this.GROUP,
        version: this.VERSION,
        plural: "policyreports",
      })) as RawPolicyReportList;

      return (response.items ?? []).map((item) => this.mapPolicyReport(item));
    } catch {
      this.logger.warn(
        "Cluster-scoped listing of policyreports failed; falling back to default namespace",
      );
      return this.listPolicyReports("default");
    }
  }

  /**
   * Fetches all PolicyReport and ClusterPolicyReport results and upserts
   * any failing entries as ResourceViolations for the given organization.
   *
   * A violation is created for each report whose results contain at least one
   * "fail" or "error" entry.  The missingKeys field records the failing
   * policy/rule combinations (e.g. "require-labels/check-env-label").
   *
   * No-ops silently when TagPolicyService is not injected.
   *
   * @param orgId - Organization UUID to associate violations with
   */
  async syncViolationsForOrg(orgId: string): Promise<void> {
    if (!this.tagPolicyService) {
      this.logger.warn(
        "TagPolicyService not available; skipping Kyverno violation sync",
      );
      return;
    }

    const [namespaced, cluster] = await Promise.all([
      this.listAllNamespacePolicyReports(),
      this.listClusterPolicyReports(),
    ]);

    const allReports = [...namespaced, ...cluster];

    for (const report of allReports) {
      const failingKeys = report.results
        .filter((r) => r.status === "fail" || r.status === "error")
        .map((r) => `${r.policy}/${r.rule}`);

      await this.tagPolicyService.upsertViolation({
        orgId,
        resourceId: report.resourceId,
        resourceType: report.resourceType,
        provider: "kubernetes",
        missingKeys: failingKeys,
        linkedComponentId: report.linkedComponentId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  /**
   * Maps a raw Kyverno PolicyReport API object to the typed
   * KyvernoPolicyReportResult shape.
   *
   * @param item - Raw PolicyReport object from the Kubernetes API
   * @returns Typed KyvernoPolicyReportResult
   */
  private mapPolicyReport(item: RawPolicyReport): KyvernoPolicyReportResult {
    const scope = item.scope;
    const labels = item.metadata.labels ?? {};

    let resourceId: string;
    let resourceType: string;

    if (scope) {
      const ns = scope.namespace ?? item.metadata.namespace;
      resourceId = ns ? `${ns}/${scope.name}` : scope.name;
      resourceType = `k8s-${scope.kind.toLowerCase()}`;
    } else {
      resourceId = item.metadata.name;
      resourceType = "k8s-unknown";
    }

    // Support both "farm.io/component" and "farm/component" label conventions.
    const linkedComponentId =
      labels["farm.io/component"] ?? labels["farm/component"] ?? undefined;

    const results = (item.results ?? []).map((r) => ({
      policy: r.policy,
      rule: r.rule,
      status: r.result,
      message: r.message ?? "",
      category: r.category,
      severity: r.severity,
    }));

    return {
      name: item.metadata.name,
      namespace: item.metadata.namespace,
      resourceId,
      resourceType,
      linkedComponentId,
      results,
    };
  }
}
