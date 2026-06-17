import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";
import { KubernetesService } from "./kubernetes.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { validateResponse } from "../../common/http/validate-response";
import { ElasticsearchClusterHealth } from "../../common/http/external-response.dto";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Represents an ECK-managed Elasticsearch cluster discovered via the
 * elasticsearch.k8s.elastic.co/v1 CRD.
 */
export interface EckElasticsearch {
  /** Metadata name of the Elasticsearch resource */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Cluster health colour derived from status.health */
  health: "green" | "yellow" | "red" | "unknown";
  /** Elasticsearch version from spec.version */
  version: string;
  /** Number of available nodes from status.availableNodes */
  nodeCount: number;
  /** Always "eck" — identifies the discovery source */
  source: "eck";
}

/**
 * Represents an ECK-managed Kibana instance discovered via the
 * kibana.k8s.elastic.co/v1 CRD.
 */
export interface EckKibana {
  /** Metadata name of the Kibana resource */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** True when status.health is "green" */
  available: boolean;
  /** Kibana version from spec.version (optional) */
  version?: string;
  /** Always "eck" — identifies the discovery source */
  source: "eck";
}

/**
 * Represents an ECK-managed Beat instance discovered via the
 * beat.k8s.elastic.co/v1beta1 CRD.
 */
export interface EckBeat {
  /** Metadata name of the Beat resource */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** True when status.health is "green" */
  available: boolean;
  /** Beat version from spec.version (optional) */
  version?: string;
  /** Always "eck" — identifies the discovery source */
  source: "eck";
}

/**
 * Represents an ECK-managed Logstash instance discovered via the
 * logstash.k8s.elastic.co/v1alpha1 CRD.
 */
export interface EckLogstash {
  /** Metadata name of the Logstash resource */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Number of currently available nodes from status.availableNodes */
  readyReplicas: number;
  /** Desired node count from spec.count */
  desiredReplicas: number;
  /** Always "eck" — identifies the discovery source */
  source: "eck";
}

/**
 * Represents a Fluent Bit DaemonSet discovered via Kubernetes label selectors.
 * Fluent Bit may be labelled with either "app.kubernetes.io/name=fluent-bit"
 * or "k8s-app=fluent-bit" depending on the Helm chart variant used.
 */
export interface FluentBitDaemonSet {
  /** DaemonSet metadata.name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Total desired nodes from status.desiredNumberScheduled */
  desiredNodes: number;
  /** Number of ready nodes from status.numberReady */
  readyNodes: number;
  /** Nodes not yet ready (desiredNodes - readyNodes) */
  notReadyNodes: number;
  /** Name of the first ConfigMap volume referenced in the pod spec (optional) */
  configMapRef?: string;
  /** Always "helm" — identifies the discovery source */
  source: "helm";
}

/**
 * Represents a Fluentd DaemonSet discovered via the
 * "app.kubernetes.io/name=fluentd" label selector.
 */
export interface FluentdDaemonSet {
  /** DaemonSet metadata.name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Total desired nodes from status.desiredNumberScheduled */
  desiredNodes: number;
  /** Number of ready nodes from status.numberReady */
  readyNodes: number;
  /** Nodes not yet ready (desiredNodes - readyNodes) */
  notReadyNodes: number;
  /** Name of the first ConfigMap volume referenced in the pod spec (optional) */
  configMapRef?: string;
  /** Always "helm" — identifies the discovery source */
  source: "helm";
}

/**
 * Represents a Logstash Deployment discovered via the
 * "app.kubernetes.io/name=logstash" label selector.
 */
export interface LogstashDeployment {
  /** Deployment metadata.name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Desired replica count from spec.replicas */
  desiredReplicas: number;
  /** Ready replicas from status.readyReplicas */
  readyReplicas: number;
  /** Name of the first ConfigMap volume referenced in the pod spec (optional) */
  configMapRef?: string;
  /** Always "helm" — identifies the discovery source */
  source: "helm";
}

/**
 * Reachability status of an externally configured Elasticsearch cluster
 * probed via the _cluster/health HTTP endpoint.
 */
export interface ExternalElasticsearch {
  /** Whether the cluster health endpoint responded within the timeout */
  reachable: boolean;
  /** Cluster health colour returned by _cluster/health (optional) */
  clusterHealth?: "green" | "yellow" | "red";
  /**
   * Elasticsearch version — not available from _cluster/health; always
   * undefined in this implementation.
   */
  version?: string;
}

/**
 * Aggregated result returned by ElasticStackService.getAll().
 * Each sub-object degrades to empty collections on error.
 */
export interface ElasticStackResult {
  /** Resources managed by the Elastic Cloud on Kubernetes (ECK) operator */
  eck: {
    elasticsearch: EckElasticsearch[];
    kibana: EckKibana[];
    logstash: EckLogstash[];
    beats: EckBeat[];
  };
  /** In-cluster log forwarders / processors discovered via label selectors */
  inCluster: {
    fluentBit: FluentBitDaemonSet[];
    fluentd: FluentdDaemonSet[];
    logstash: LogstashDeployment[];
  };
  /** Externally configured Elasticsearch reachability probe result */
  external: ExternalElasticsearch;
}

// ---------------------------------------------------------------------------
// Raw API shapes (internal)
// ---------------------------------------------------------------------------

/** Minimal raw shape of any ECK custom resource list returned by CustomObjectsApi. */
interface RawEckList {
  items?: Array<{
    metadata: { name: string; namespace?: string };
    spec?: Record<string, unknown>;
    status?: Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service for discovering Elastic Stack components running inside a Kubernetes
 * cluster.  Three discovery strategies are implemented:
 *
 * 1. ECK operator CRDs (Elasticsearch, Kibana, Beat, Logstash)
 * 2. In-cluster DaemonSet / Deployment label-selector queries (Fluent Bit,
 *    Fluentd, plain Logstash Deployments managed via Helm)
 * 3. External Elasticsearch reachability probe via the _cluster/health API
 *
 * Every public method degrades gracefully: HTTP 404 responses (CRD absent)
 * are logged at DEBUG level and an empty default is returned; all other errors
 * are logged at WARN.  Safe empty defaults ensure a partial cluster
 * configuration never causes a 500 response upstream.
 */
@Injectable()
export class ElasticStackService {
  private readonly logger = new Logger(ElasticStackService.name);

  // ECK CRD coordinates
  private readonly ECK_ES_GROUP = "elasticsearch.k8s.elastic.co";
  private readonly ECK_ES_VERSION = "v1";
  private readonly ECK_ES_PLURAL = "elasticsearches";

  private readonly ECK_KIBANA_GROUP = "kibana.k8s.elastic.co";
  private readonly ECK_KIBANA_VERSION = "v1";
  private readonly ECK_KIBANA_PLURAL = "kibanas";

  private readonly ECK_BEAT_GROUP = "beat.k8s.elastic.co";
  private readonly ECK_BEAT_VERSION = "v1beta1";
  private readonly ECK_BEAT_PLURAL = "beats";

  private readonly ECK_LOGSTASH_GROUP = "logstash.k8s.elastic.co";
  private readonly ECK_LOGSTASH_VERSION = "v1alpha1";
  private readonly ECK_LOGSTASH_PLURAL = "logstashes";

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
   * Returns true when an error represents a "not found" response from the
   * Kubernetes API (HTTP 404), which means the CRD is not installed.
   */
  private isNotFound(error: unknown): boolean {
    const status = (error as { response?: { statusCode?: number } })?.response
      ?.statusCode;
    return status === 404;
  }

  // ---------------------------------------------------------------------------
  // ECK discovery
  // ---------------------------------------------------------------------------

  /**
   * Lists ECK-managed Elasticsearch clusters from the Kubernetes API.
   * Performs a namespaced list when a namespace is provided; otherwise a
   * cluster-wide list.  Returns an empty array when the ECK CRD is absent
   * or the client is not initialised.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Elasticsearch descriptors
   */
  async getEckElasticsearch(namespace?: string): Promise<EckElasticsearch[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ECK Elasticsearch list",
      );
      return [];
    }

    try {
      const response = namespace
        ? ((await api.listNamespacedCustomObject({
            group: this.ECK_ES_GROUP,
            version: this.ECK_ES_VERSION,
            namespace,
            plural: this.ECK_ES_PLURAL,
          })) as RawEckList)
        : ((await api.listClusterCustomObject({
            group: this.ECK_ES_GROUP,
            version: this.ECK_ES_VERSION,
            plural: this.ECK_ES_PLURAL,
          })) as RawEckList);

      return (response.items ?? []).map((item) => {
        const status = (item.status ?? {}) as {
          health?: string;
          availableNodes?: number;
        };
        const spec = (item.spec ?? {}) as { version?: string };
        const rawHealth = (status.health ?? "").toLowerCase();

        const health: EckElasticsearch["health"] =
          rawHealth === "green" || rawHealth === "yellow" || rawHealth === "red"
            ? rawHealth
            : "unknown";

        return {
          name: item.metadata.name,
          namespace: item.metadata.namespace ?? namespace ?? "",
          health,
          version: spec.version ?? "",
          nodeCount: Number(status.availableNodes ?? 0),
          source: "eck" as const,
        };
      });
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ECK Elasticsearch CRD not found; returning empty Elasticsearch list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to list ECK Elasticsearch resources: ${message}`,
      );
      return [];
    }
  }

  /**
   * Lists ECK-managed Kibana instances from the Kubernetes API.
   * Returns an empty array when the ECK CRD is absent or the client is not
   * initialised.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Kibana descriptors
   */
  async getEckKibana(namespace?: string): Promise<EckKibana[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ECK Kibana list",
      );
      return [];
    }

    try {
      const response = namespace
        ? ((await api.listNamespacedCustomObject({
            group: this.ECK_KIBANA_GROUP,
            version: this.ECK_KIBANA_VERSION,
            namespace,
            plural: this.ECK_KIBANA_PLURAL,
          })) as RawEckList)
        : ((await api.listClusterCustomObject({
            group: this.ECK_KIBANA_GROUP,
            version: this.ECK_KIBANA_VERSION,
            plural: this.ECK_KIBANA_PLURAL,
          })) as RawEckList);

      return (response.items ?? []).map((item) => {
        const status = (item.status ?? {}) as { health?: string };
        const spec = (item.spec ?? {}) as { version?: string };
        const health = (status.health ?? "").toLowerCase();

        return {
          name: item.metadata.name,
          namespace: item.metadata.namespace ?? namespace ?? "",
          available: health === "green",
          version: spec.version,
          source: "eck" as const,
        };
      });
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ECK Kibana CRD not found; returning empty Kibana list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list ECK Kibana resources: ${message}`);
      return [];
    }
  }

  /**
   * Lists ECK-managed Beat instances from the Kubernetes API.
   * Returns an empty array when the ECK CRD is absent or the client is not
   * initialised.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Beat descriptors
   */
  async getEckBeats(namespace?: string): Promise<EckBeat[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ECK Beat list",
      );
      return [];
    }

    try {
      const response = namespace
        ? ((await api.listNamespacedCustomObject({
            group: this.ECK_BEAT_GROUP,
            version: this.ECK_BEAT_VERSION,
            namespace,
            plural: this.ECK_BEAT_PLURAL,
          })) as RawEckList)
        : ((await api.listClusterCustomObject({
            group: this.ECK_BEAT_GROUP,
            version: this.ECK_BEAT_VERSION,
            plural: this.ECK_BEAT_PLURAL,
          })) as RawEckList);

      return (response.items ?? []).map((item) => {
        const status = (item.status ?? {}) as { health?: string };
        const spec = (item.spec ?? {}) as { version?: string };
        const health = (status.health ?? "").toLowerCase();

        return {
          name: item.metadata.name,
          namespace: item.metadata.namespace ?? namespace ?? "",
          available: health === "green",
          version: spec.version,
          source: "eck" as const,
        };
      });
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ECK Beat CRD not installed; returning empty ECK Beat list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list ECK Beat resources: ${message}`);
      return [];
    }
  }

  /**
   * Lists ECK-managed Logstash instances from the Kubernetes API.
   * Returns an empty array when the ECK CRD is absent or the client is not
   * initialised.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Logstash descriptors
   */
  async getEckLogstash(namespace?: string): Promise<EckLogstash[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ECK Logstash list",
      );
      return [];
    }

    try {
      const response = namespace
        ? ((await api.listNamespacedCustomObject({
            group: this.ECK_LOGSTASH_GROUP,
            version: this.ECK_LOGSTASH_VERSION,
            namespace,
            plural: this.ECK_LOGSTASH_PLURAL,
          })) as RawEckList)
        : ((await api.listClusterCustomObject({
            group: this.ECK_LOGSTASH_GROUP,
            version: this.ECK_LOGSTASH_VERSION,
            plural: this.ECK_LOGSTASH_PLURAL,
          })) as RawEckList);

      return (response.items ?? []).map((item) => {
        const status = item.status ?? {};
        const spec = item.spec ?? {};

        return {
          name: item.metadata.name,
          namespace: item.metadata.namespace ?? namespace ?? "",
          readyReplicas: Number(status["availableNodes"] ?? 0),
          desiredReplicas: Number(spec["count"] ?? 0),
          source: "eck" as const,
        };
      });
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ECK Logstash CRD not found; returning empty ECK Logstash list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list ECK Logstash resources: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // In-cluster discovery via AppsV1Api
  // ---------------------------------------------------------------------------

  /**
   * Lists Fluent Bit DaemonSets by querying two label selectors in parallel
   * and merging the deduplicated results.
   *
   * Fluent Bit can be deployed with two different label conventions depending
   * on the Helm chart variant:
   *   - app.kubernetes.io/name=fluent-bit  (official fluent/fluent-bit chart)
   *   - k8s-app=fluent-bit                 (legacy / custom charts)
   *
   * Because the Kubernetes label selector syntax does not support logical OR,
   * two separate API calls are issued and deduplication is performed on
   * name+namespace.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Deduplicated array of Fluent Bit DaemonSet descriptors
   */
  async getFluentBit(namespace?: string): Promise<FluentBitDaemonSet[]> {
    const api = this.kubernetesService.getAppsV1Api();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty Fluent Bit list",
      );
      return [];
    }

    const labelSelectors = [
      "app.kubernetes.io/name=fluent-bit",
      "k8s-app=fluent-bit",
    ] as const;

    try {
      // Issue both label-selector queries in parallel and tolerate individual
      // failures so that one missing label variant does not hide the other.
      const outcomes = await Promise.allSettled(
        labelSelectors.map((labelSelector) =>
          namespace
            ? api.listNamespacedDaemonSet({ namespace, labelSelector })
            : api.listDaemonSetForAllNamespaces({ labelSelector }),
        ),
      );

      const seen = new Set<string>();
      const results: FluentBitDaemonSet[] = [];

      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          const msg =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);
          this.logger.warn(`Fluent Bit DaemonSet label query failed: ${msg}`);
          continue;
        }

        for (const ds of outcome.value.items ?? []) {
          const name = ds.metadata?.name ?? "";
          const ns = ds.metadata?.namespace ?? namespace ?? "";
          const key = `${ns}/${name}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const desiredNodes = ds.status?.desiredNumberScheduled ?? 0;
          const readyNodes = ds.status?.numberReady ?? 0;

          results.push({
            name,
            namespace: ns,
            desiredNodes,
            readyNodes,
            notReadyNodes: Math.max(0, desiredNodes - readyNodes),
            configMapRef: this.extractConfigMapRef(ds),
            source: "helm",
          });
        }
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Fluent Bit DaemonSets: ${message}`);
      return [];
    }
  }

  /**
   * Lists Fluentd DaemonSets discovered via the
   * "app.kubernetes.io/name=fluentd" label selector.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Fluentd DaemonSet descriptors
   */
  async getFluentd(namespace?: string): Promise<FluentdDaemonSet[]> {
    const api = this.kubernetesService.getAppsV1Api();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty Fluentd list",
      );
      return [];
    }

    try {
      const labelSelector = "app.kubernetes.io/name=fluentd";
      const response = namespace
        ? await api.listNamespacedDaemonSet({ namespace, labelSelector })
        : await api.listDaemonSetForAllNamespaces({ labelSelector });

      return (response.items ?? []).map((ds) => {
        const desiredNodes = ds.status?.desiredNumberScheduled ?? 0;
        const readyNodes = ds.status?.numberReady ?? 0;

        return {
          name: ds.metadata?.name ?? "",
          namespace: ds.metadata?.namespace ?? namespace ?? "",
          desiredNodes,
          readyNodes,
          notReadyNodes: Math.max(0, desiredNodes - readyNodes),
          configMapRef: this.extractConfigMapRef(ds),
          source: "helm" as const,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Fluentd DaemonSets: ${message}`);
      return [];
    }
  }

  /**
   * Lists plain (non-ECK) Logstash Deployments discovered via the
   * "app.kubernetes.io/name=logstash" label selector.
   *
   * @param namespace - Optional Kubernetes namespace to scope the query
   * @returns Array of discovered Logstash Deployment descriptors
   */
  async getLogstashDeployment(
    namespace?: string,
  ): Promise<LogstashDeployment[]> {
    const api = this.kubernetesService.getAppsV1Api();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty Logstash Deployment list",
      );
      return [];
    }

    try {
      const labelSelector = "app.kubernetes.io/name=logstash";
      const response = namespace
        ? await api.listNamespacedDeployment({ namespace, labelSelector })
        : await api.listDeploymentForAllNamespaces({ labelSelector });

      return (response.items ?? []).map((dep) => ({
        name: dep.metadata?.name ?? "",
        namespace: dep.metadata?.namespace ?? namespace ?? "",
        desiredReplicas: dep.spec?.replicas ?? 0,
        readyReplicas: dep.status?.readyReplicas ?? 0,
        configMapRef: this.extractConfigMapRefFromDeployment(dep),
        source: "helm" as const,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Logstash Deployments: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // External Elasticsearch probe
  // ---------------------------------------------------------------------------

  /**
   * Probes the externally configured Elasticsearch cluster by calling its
   * _cluster/health endpoint with a hard 3-second timeout.
   *
   * The cluster URL is read from the "elasticsearch.url" config key, which
   * maps to the ELASTICSEARCH_URL environment variable.  When no URL is
   * configured the method returns { reachable: false } immediately without
   * making any network request.
   *
   * The configured URL is NEVER included in the returned object to prevent
   * accidental credential or hostname leakage through the API response.
   *
   * @returns Reachability status and optional cluster health colour
   */
  async getExternalElasticsearch(): Promise<ExternalElasticsearch> {
    const url = this.configService.get<string>("elasticsearch.url");
    if (!url) {
      return { reachable: false };
    }

    try {
      const response = await this.cb.fire("elastic-stack", () =>
        firstValueFrom(
          this.httpService.get(`${url}/_cluster/health`, {
            timeout: 3000,
            validateStatus: () => true,
          }),
        ),
      );

      if (response.status >= 400) {
        this.logger.warn(
          `External Elasticsearch health check returned HTTP ${response.status}`,
        );
        return { reachable: false };
      }

      const body = validateResponse(
        ElasticsearchClusterHealth,
        response.data,
        "ElasticStackService.getExternalElasticsearch",
        this.logger,
      );

      const rawStatus = (body.status ?? "").toLowerCase();
      const clusterHealth: ExternalElasticsearch["clusterHealth"] =
        rawStatus === "green" || rawStatus === "yellow" || rawStatus === "red"
          ? rawStatus
          : undefined;

      return { reachable: true, clusterHealth };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `External Elasticsearch health probe failed: ${message}`,
      );
      return { reachable: false };
    }
  }

  // ---------------------------------------------------------------------------
  // Aggregated entry point
  // ---------------------------------------------------------------------------

  /**
   * Runs all discovery methods concurrently via Promise.allSettled and
   * aggregates their results into a single ElasticStackResult.
   *
   * Individual method failures are isolated: a failed sub-call contributes
   * an empty array / default value rather than propagating an exception.
   *
   * @param namespace - Optional Kubernetes namespace to scope all queries
   * @returns Complete ElasticStackResult with safe defaults for any failed
   *          sub-result
   */
  async getAll(namespace?: string): Promise<ElasticStackResult> {
    const [
      esResult,
      kibanaResult,
      logstashEckResult,
      beatsResult,
      fluentBitResult,
      fluentdResult,
      logstashHelmResult,
      externalResult,
    ] = await Promise.allSettled([
      this.getEckElasticsearch(namespace),
      this.getEckKibana(namespace),
      this.getEckLogstash(namespace),
      this.getEckBeats(namespace),
      this.getFluentBit(namespace),
      this.getFluentd(namespace),
      this.getLogstashDeployment(namespace),
      this.getExternalElasticsearch(),
    ]);

    return {
      eck: {
        elasticsearch: esResult.status === "fulfilled" ? esResult.value : [],
        kibana: kibanaResult.status === "fulfilled" ? kibanaResult.value : [],
        logstash:
          logstashEckResult.status === "fulfilled"
            ? logstashEckResult.value
            : [],
        beats: beatsResult.status === "fulfilled" ? beatsResult.value : [],
      },
      inCluster: {
        fluentBit:
          fluentBitResult.status === "fulfilled" ? fluentBitResult.value : [],
        fluentd:
          fluentdResult.status === "fulfilled" ? fluentdResult.value : [],
        logstash:
          logstashHelmResult.status === "fulfilled"
            ? logstashHelmResult.value
            : [],
      },
      external:
        externalResult.status === "fulfilled"
          ? externalResult.value
          : { reachable: false },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Extracts the name of the first ConfigMap-backed volume from a DaemonSet
   * pod template spec.  Returns undefined when no ConfigMap volume is present.
   *
   * @param ds - Kubernetes DaemonSet object from AppsV1Api
   * @returns ConfigMap name or undefined
   */
  private extractConfigMapRef(ds: {
    spec?: {
      template?: {
        spec?: {
          volumes?: Array<{
            name: string;
            configMap?: { name?: string };
          }>;
        };
      };
    };
  }): string | undefined {
    const volumes = ds.spec?.template?.spec?.volumes ?? [];
    const cmVolume = volumes.find((v) => v.configMap !== undefined);
    return cmVolume?.configMap?.name ?? undefined;
  }

  /**
   * Extracts the name of the first ConfigMap-backed volume from a Deployment
   * pod template spec.  Returns undefined when no ConfigMap volume is present.
   *
   * @param dep - Kubernetes Deployment object from AppsV1Api
   * @returns ConfigMap name or undefined
   */
  private extractConfigMapRefFromDeployment(dep: {
    spec?: {
      template?: {
        spec?: {
          volumes?: Array<{
            name: string;
            configMap?: { name?: string };
          }>;
        };
      };
    };
  }): string | undefined {
    const volumes = dep.spec?.template?.spec?.volumes ?? [];
    const cmVolume = volumes.find((v) => v.configMap !== undefined);
    return cmVolume?.configMap?.name ?? undefined;
  }
}
