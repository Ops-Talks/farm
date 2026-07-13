import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";
import { KubernetesService } from "./kubernetes.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** The role a discovered Thanos component plays in the metrics pipeline. */
export type ThanosComponentType =
  "querier" | "store-gateway" | "compactor" | "ruler" | "receiver" | "sidecar";

/** The type of the Prometheus-compatible metrics backend that was probed. */
export type MetricsBackendType =
  "prometheus" | "thanos" | "mimir" | "cortex" | "unknown";

/**
 * Represents a Thanos component managed by the Thanos operator
 * (monitoring.thanos.io CRDs).
 */
export interface ThanosOperatorComponent {
  /** Metadata name of the custom resource */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Functional role of this component */
  type: ThanosComponentType;
  /** True when the resource reports an Available or Ready condition */
  ready: boolean;
  /** Always "operator" — identifies the discovery source */
  source: "operator";
}

/**
 * Represents a Thanos component discovered via Helm/YAML label selectors
 * applied to Deployments and StatefulSets.
 */
export interface ThanosLabelComponent {
  /** Workload metadata name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Functional role inferred from the app.kubernetes.io/name label value */
  type: ThanosComponentType;
  /** Number of ready replicas from status.readyReplicas */
  readyReplicas: number;
  /** Desired replica count from spec.replicas or status.replicas */
  desiredReplicas: number;
  /** Always "helm" — identifies the discovery source */
  source: "helm";
}

/**
 * Result of probing the configured Prometheus-compatible metrics backend
 * to determine which product is serving the remote-read / query API.
 */
export interface MetricsBackend {
  /** Detected backend product */
  type: MetricsBackendType;
  /** Reported version string when available */
  version?: string;
  /** True when Thanos query fan-out headers indicate multi-cluster aggregation */
  multiCluster?: boolean;
}

/**
 * Aggregated result returned by ThanosService.getAll().
 * Every sub-field degrades to a safe default on individual failures.
 */
export interface ThanosResult {
  /** Components managed by the Thanos operator CRDs */
  operator: ThanosOperatorComponent[];
  /** Components discovered via Helm/YAML label selectors */
  inCluster: ThanosLabelComponent[];
  /** Detected metrics backend type */
  backendType: MetricsBackendType;
  /**
   * True when long-term storage is implied by the detected backend
   * (Thanos, Mimir, or Cortex).
   */
  longTermEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Raw API shapes (internal)
// ---------------------------------------------------------------------------

/** Minimal shape of a single Thanos custom resource returned by the API. */
interface RawThanosItem {
  metadata: { name: string; namespace?: string };
  status?: {
    conditions?: Array<{ type: string; status: string }>;
    availableReplicas?: number;
  };
}

/** Minimal shape of a Thanos custom resource list. */
interface RawThanosList {
  items?: RawThanosItem[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service for discovering Thanos components running inside a Kubernetes
 * cluster and probing the configured metrics backend.
 *
 * Three discovery strategies are implemented:
 *
 * 1. Thanos operator CRDs (monitoring.thanos.io/v1alpha1)
 * 2. Thanos sidecars injected into Prometheus pods
 * 3. Label-selector queries against Deployments and StatefulSets
 *
 * Every public method degrades gracefully: HTTP 404 responses (CRD absent)
 * are logged at DEBUG level and an empty default is returned; all other
 * errors are logged at WARN.  No exception propagates to the controller.
 */
@Injectable()
export class ThanosService {
  private readonly logger = new Logger(ThanosService.name);

  private readonly THANOS_GROUP = "monitoring.thanos.io";
  private readonly THANOS_VERSION = "v1alpha1";

  /** CRD plural resource names and the component type they map to. */
  private readonly THANOS_CRD_TYPES: Array<{
    plural: string;
    type: ThanosComponentType;
  }> = [
    { plural: "thanosqueries", type: "querier" },
    { plural: "thanosstores", type: "store-gateway" },
    { plural: "thanoscompacts", type: "compactor" },
    { plural: "thanosrulers", type: "ruler" },
    { plural: "thanosreceives", type: "receiver" },
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly kubernetesService: KubernetesService,
    private readonly configService: ConfigService,
    private readonly cb: CircuitBreakerService,
  ) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns true when an error represents an HTTP 404 response from the
   * Kubernetes API, which indicates that the requested CRD is not installed.
   */
  private isNotFound(error: unknown): boolean {
    const status = (error as { response?: { statusCode?: number } })?.response
      ?.statusCode;
    return status === 404;
  }

  /**
   * Inspects a raw Thanos custom resource status block and returns true when
   * the resource reports itself as available or ready.
   */
  private isReady(item: RawThanosItem): boolean {
    const conditions = item.status?.conditions ?? [];
    const readyCondition = conditions.find(
      (c) =>
        (c.type === "Available" || c.type === "Ready") && c.status === "True",
    );
    if (readyCondition) {
      return true;
    }
    return (item.status?.availableReplicas ?? 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // Operator CRD discovery
  // ---------------------------------------------------------------------------

  /**
   * Discovers Thanos components managed by the Thanos operator by querying
   * each known CRD type and, separately, scanning Prometheus pods for an
   * injected thanos-sidecar container.
   *
   * Each CRD type is queried independently in parallel; a 404 for any single
   * type is silently ignored (it means that CRD variant is not installed).
   *
   * @param namespace - Optional Kubernetes namespace to scope all queries
   * @returns Array of operator-managed Thanos component descriptors
   */
  async getThanosOperatorComponents(
    namespace?: string,
  ): Promise<ThanosOperatorComponent[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty Thanos operator components list",
      );
      return [];
    }

    // Query all known CRD types in parallel, tolerating individual 404s.
    const crdOutcomes = await Promise.allSettled(
      this.THANOS_CRD_TYPES.map(({ plural, type }) =>
        namespace
          ? api
              .listNamespacedCustomObject({
                group: this.THANOS_GROUP,
                version: this.THANOS_VERSION,
                namespace,
                plural,
              })
              .then((res) => ({ res: res as RawThanosList, type }))
          : api
              .listClusterCustomObject({
                group: this.THANOS_GROUP,
                version: this.THANOS_VERSION,
                plural,
              })
              .then((res) => ({ res: res as RawThanosList, type })),
      ),
    );

    const components: ThanosOperatorComponent[] = [];

    for (const outcome of crdOutcomes) {
      if (outcome.status === "rejected") {
        if (this.isNotFound(outcome.reason)) {
          this.logger.debug(
            "Thanos operator CRD not found; skipping this resource type",
          );
        } else {
          const msg =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);
          this.logger.warn(
            `Failed to list Thanos operator custom resources: ${msg}`,
          );
        }
        continue;
      }

      const { res, type } = outcome.value;
      for (const item of res.items ?? []) {
        components.push({
          name: item.metadata.name,
          namespace: item.metadata.namespace ?? namespace ?? "",
          type,
          ready: this.isReady(item),
          source: "operator" as const,
        });
      }
    }

    // Detect thanos-sidecar containers injected into Prometheus pods.
    const coreApi = this.kubernetesService.getCoreV1Api();
    if (coreApi) {
      try {
        const podList = namespace
          ? await coreApi.listNamespacedPod({
              namespace,
              labelSelector: "app.kubernetes.io/name=prometheus",
            })
          : await coreApi.listPodForAllNamespaces({
              labelSelector: "app.kubernetes.io/name=prometheus",
            });

        for (const pod of podList.items ?? []) {
          const containers = pod.spec?.containers ?? [];
          const hasSidecar = containers.some(
            (c) => c.name === "thanos-sidecar",
          );
          if (!hasSidecar) continue;

          components.push({
            name: pod.metadata?.name ?? "",
            namespace: pod.metadata?.namespace ?? namespace ?? "",
            type: "sidecar",
            ready: pod.status?.phase === "Running",
            source: "operator" as const,
          });
        }
      } catch (error) {
        if (this.isNotFound(error)) {
          this.logger.debug(
            "No Prometheus pods found while scanning for thanos-sidecar",
          );
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to scan Prometheus pods for thanos-sidecar: ${msg}`,
          );
        }
      }
    }

    return components;
  }

  // ---------------------------------------------------------------------------
  // Label-selector discovery (Helm / plain YAML)
  // ---------------------------------------------------------------------------

  /**
   * Discovers Thanos components deployed via Helm or plain YAML by querying
   * well-known app.kubernetes.io/name label selectors against Deployments and
   * StatefulSets.
   *
   * Both workload kinds are queried for every label in parallel; results from
   * both are merged and deduplicated by name+namespace.
   *
   * @param namespace - Optional Kubernetes namespace to scope all queries
   * @returns Deduplicated array of label-based Thanos component descriptors
   */
  async getThanosLabelBased(
    namespace?: string,
  ): Promise<ThanosLabelComponent[]> {
    const api = this.kubernetesService.getAppsV1Api();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty Thanos label-based components list",
      );
      return [];
    }

    /** Maps the app.kubernetes.io/name label value to a component type. */
    const labelTypeMap: Array<{
      labelSelector: string;
      type: ThanosComponentType;
    }> = [
      { labelSelector: "app.kubernetes.io/name=thanos-query", type: "querier" },
      {
        labelSelector: "app.kubernetes.io/name=thanos-storegateway",
        type: "store-gateway",
      },
      {
        labelSelector: "app.kubernetes.io/name=thanos-compactor",
        type: "compactor",
      },
      { labelSelector: "app.kubernetes.io/name=thanos-ruler", type: "ruler" },
      {
        labelSelector: "app.kubernetes.io/name=thanos-receive",
        type: "receiver",
      },
    ];

    try {
      // For each label, query both Deployments and StatefulSets in parallel.
      const allOutcomes = await Promise.allSettled(
        labelTypeMap.flatMap(({ labelSelector, type }) => [
          namespace
            ? api
                .listNamespacedDeployment({ namespace, labelSelector })
                .then((res) => ({ items: res.items ?? [], type }))
            : api
                .listDeploymentForAllNamespaces({ labelSelector })
                .then((res) => ({ items: res.items ?? [], type })),
          namespace
            ? api
                .listNamespacedStatefulSet({ namespace, labelSelector })
                .then((res) => ({ items: res.items ?? [], type }))
            : api
                .listStatefulSetForAllNamespaces({ labelSelector })
                .then((res) => ({ items: res.items ?? [], type })),
        ]),
      );

      const seen = new Set<string>();
      const results: ThanosLabelComponent[] = [];

      for (const outcome of allOutcomes) {
        if (outcome.status === "rejected") {
          const msg =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);
          this.logger.warn(
            `Thanos label-selector workload query failed: ${msg}`,
          );
          continue;
        }

        for (const workload of outcome.value.items) {
          const name = workload.metadata?.name ?? "";
          const ns = workload.metadata?.namespace ?? namespace ?? "";
          const key = `${ns}/${name}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            name,
            namespace: ns,
            type: outcome.value.type,
            readyReplicas: workload.status?.readyReplicas ?? 0,
            desiredReplicas:
              workload.spec?.replicas ?? workload.status?.replicas ?? 0,
            source: "helm" as const,
          });
        }
      }

      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Thanos label-based components: ${msg}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Metrics backend detection
  // ---------------------------------------------------------------------------

  /**
   * Probes the configured Prometheus-compatible metrics backend to determine
   * whether it is plain Prometheus, Thanos Query, Grafana Mimir, or Cortex.
   *
   * Detection strategy:
   *  1. GET /api/v1/labels — response headers containing any "x-thanos-*" key
   *     indicate a Thanos Query frontend with multi-cluster fan-out.
   *  2. GET /ready — response body is inspected for product-specific strings
   *     to distinguish Mimir, Cortex, or plain Prometheus.
   *
   * The configured URL is never included in log messages above DEBUG level
   * and is never returned in the response object.
   *
   * @returns Detected backend descriptor; falls back to { type: "unknown" }
   *          on any network or configuration error
   */
  async detectMetricsBackend(): Promise<MetricsBackend> {
    const url = this.configService.get<string>("prometheus.url");
    if (!url) {
      return { type: "unknown" };
    }

    try {
      // Probe /api/v1/labels to check for Thanos query-layer response headers.
      const labelsResponse = await this.cb.fire("thanos", () =>
        firstValueFrom(
          this.httpService.get(`${url}/api/v1/labels`, {
            timeout: 3000,
            validateStatus: () => true,
          }),
        ),
      );

      if (labelsResponse.status >= 400) {
        return { type: "unknown" };
      }

      const hasThanosHeader = Object.keys(labelsResponse.headers).some((key) =>
        key.toLowerCase().startsWith("x-thanos-"),
      );

      if (hasThanosHeader) {
        return { type: "thanos", multiCluster: true };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Metrics backend /api/v1/labels probe failed: ${msg}`);
      return { type: "unknown" };
    }

    // No Thanos headers — probe /ready to distinguish Mimir, Cortex, Prometheus.
    try {
      const readyResponse = await this.cb.fire("thanos", () =>
        firstValueFrom(
          this.httpService.get(`${url}/ready`, {
            timeout: 3000,
            responseType: "text",
            validateStatus: () => true,
          }),
        ),
      );

      if (readyResponse.status >= 400) {
        return { type: "unknown" };
      }

      const body = readyResponse.data as string;

      if (body.includes("Grafana Mimir")) {
        return { type: "mimir" };
      }
      if (body.includes("Cortex")) {
        return { type: "cortex" };
      }
      return { type: "prometheus" };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Metrics backend /ready probe failed: ${msg}`);
      return { type: "unknown" };
    }
  }

  // ---------------------------------------------------------------------------
  // Aggregated entry point
  // ---------------------------------------------------------------------------

  /**
   * Runs all discovery methods concurrently via Promise.allSettled and
   * aggregates their results into a single ThanosResult.
   *
   * Individual method failures are isolated: a failed sub-call contributes
   * an empty array or safe default rather than propagating an exception.
   *
   * @param namespace - Optional Kubernetes namespace to scope all queries
   * @returns Complete ThanosResult with safe defaults for any failed sub-result
   */
  async getAll(namespace?: string): Promise<ThanosResult> {
    const [operatorResult, inClusterResult, backendResult] =
      await Promise.allSettled([
        this.getThanosOperatorComponents(namespace),
        this.getThanosLabelBased(namespace),
        this.detectMetricsBackend(),
      ]);

    const operator =
      operatorResult.status === "fulfilled" ? operatorResult.value : [];
    const inCluster =
      inClusterResult.status === "fulfilled" ? inClusterResult.value : [];
    const backend: MetricsBackend =
      backendResult.status === "fulfilled"
        ? backendResult.value
        : { type: "unknown" };

    const backendType = backend.type;
    const longTermEnabled =
      backendType === "thanos" ||
      backendType === "mimir" ||
      backendType === "cortex";

    return { operator, inCluster, backendType, longTermEnabled };
  }
}
