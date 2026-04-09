import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import * as k8s from "@kubernetes/client-node";
import { CatalogService } from "../catalog/catalog.service";
import { ComponentKind } from "../catalog/entities/component.entity";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";

/**
 * Represents a discovered Kubernetes workload (Deployment).
 */
export interface KubernetesWorkload {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  image: string;
  labels: Record<string, string>;
}

/**
 * Represents a Kubernetes Custom Resource Definition discovered in the cluster.
 */
export interface CrdResource {
  /** Full CRD name, e.g. "rollouts.argoproj.io" */
  name: string;
  /** API group, e.g. "argoproj.io" */
  group: string;
  /** Served API version, e.g. "v1alpha1" */
  version: string;
  /** Scope: "Namespaced" or "Cluster" */
  scope: string;
  /** Kind name, e.g. "Rollout" */
  kind: string;
  /** Human-readable display name derived from the well-known operator map */
  displayTemplate: string;
}

/**
 * Represents an OLM-managed operator discovered via ClusterServiceVersion resources.
 */
export interface OperatorInfo {
  /** CSV name, e.g. "prometheus-operator.v0.65.1" */
  name: string;
  /** Human-readable display name from the CSV spec */
  displayName: string;
  /** Semantic version string */
  version: string;
  /** Namespace where the CSV is installed */
  namespace: string;
  /** CSV phase: "Succeeded" | "Failed" | "Pending" | "InstallReady" | "Replacing" | "Deleting" | "Unknown" */
  phase: string;
  /** Short description from the CSV spec */
  description: string;
  /** Base64-encoded icon data URI (optional) */
  icon?: string;
  /** Provider name from the CSV spec (optional) */
  provider?: string;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** CRDs owned by this operator */
  customResourceDefinitions: Array<{
    name: string;
    version: string;
    kind: string;
    description: string;
  }>;
}

/**
 * Represents a single instance of a custom resource managed by an operator.
 */
export interface CustomResourceInstance {
  /** Resource name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Resource kind, e.g. "Prometheus" */
  kind: string;
  /** Full API version, e.g. "monitoring.coreos.com/v1" */
  apiVersion: string;
  /** Arbitrary status fields from the resource (optional) */
  status?: Record<string, unknown>;
  /** Standard Kubernetes conditions array (optional) */
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  /** ISO-8601 creation timestamp */
  createdAt: string;
}

/**
 * Container runtime information for a Kubernetes node.
 */
export interface NodeRuntimeInfo {
  /** Node name */
  nodeName: string;
  /** Runtime name, e.g. "containerd", "cri-o", "docker" */
  runtimeName: string;
  /** Runtime version string */
  runtimeVersion: string;
  /** Kernel version reported by the node */
  kernelVersion: string;
  /** OS image description */
  osImage: string;
  /** CPU architecture, e.g. "amd64", "arm64" */
  architecture: string;
}

/**
 * CRI-O storage metrics for a specific node.
 */
export interface CrioStorageMetrics {
  /** Node name */
  nodeName: string;
  /** Whether CRI-O metrics are available on this node */
  available: boolean;
  /** Number of image layers cached on the node (optional) */
  imageLayers?: number;
  /** Cache hit rate percentage (optional) */
  cacheHitRate?: number;
  /** Total storage usage in bytes (optional) */
  storageUsageBytes?: number;
}

/**
 * Represents the status of an Argo Rollout custom resource.
 */
export interface ArgoRolloutStatus {
  /** Rollout name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /**
   * Rollout phase.
   * Possible values: "Healthy" | "Degraded" | "Paused" | "Progressing" | "Unknown"
   */
  phase: string;
  /** Optional human-readable status message */
  message?: string;
  /** Canary weight percentage (0–100) when using the canary strategy */
  canaryWeight?: number;
  /** Active revision hash when using the blue-green strategy */
  blueGreenActive?: string;
  /** Preview revision hash when using the blue-green strategy */
  blueGreenPreview?: string;
  /** Results from any linked AnalysisRun objects */
  analysisRunResults?: Array<{ name: string; phase: string; message?: string }>;
  /** ISO-8601 timestamp of the last observed status change */
  updatedAt: string;
}

/**
 * Information about a single Dragonfly component pod group.
 */
export interface DragonflyComponentInfo {
  /** Component role: "manager" | "scheduler" | "dfdaemon" */
  component: "manager" | "scheduler" | "dfdaemon";
  /** Kubernetes namespace */
  namespace: string;
  /** Container image version extracted from the pod spec */
  version: string;
  /** Number of ready replicas */
  readyReplicas: number;
  /** Total desired replicas */
  totalReplicas: number;
  /** Workload kind: "Deployment" | "DaemonSet" */
  workloadKind: "Deployment" | "DaemonSet";
}

/**
 * Overall Dragonfly installation status.
 */
export interface DragonflyInstallStatus {
  /** Overall health: "not-installed" | "degraded" | "healthy" */
  status: "not-installed" | "degraded" | "healthy";
  /** Dragonfly version (from the first component found), or null when not installed */
  version: string | null;
  /** Detected components */
  components: DragonflyComponentInfo[];
}

/**
 * P2P task counters and peer metrics scraped from the Dragonfly Manager.
 */
export interface DragonflyTaskMetrics {
  /** Total P2P pull tasks since startup */
  totalTasks: number;
  /** Succeeded tasks */
  succeededTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Currently active (in-progress) tasks */
  activeTasks: number;
  /** Total active peers across all tasks */
  totalPeers: number;
}

/**
 * A single recent P2P pull task scraped from Dragonfly metrics.
 */
export interface DragonflyTask {
  /** Image reference, e.g. "docker.io/library/nginx:latest" */
  image: string;
  /** Number of peers involved in this pull */
  peerCount: number;
  /** Bytes transferred via P2P */
  bytesTransferred: number;
  /** Ratio of P2P bytes to total bytes (0–1) */
  accelerationRatio: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Task status: "succeeded" | "failed" | "running" */
  status: "succeeded" | "failed" | "running";
}

/**
 * An active Dragonfly peer node.
 */
export interface DragonflyPeer {
  /** Peer identifier */
  peerId: string;
  /** Peer IP address */
  ip: string;
  /** Peer status: "active" | "idle" */
  status: "active" | "idle";
  /** Number of active tasks on this peer */
  taskCount: number;
}

// ---------------------------------------------------------------------------
// Flux GitOps interfaces (FARM-E61)
// ---------------------------------------------------------------------------

/**
 * Information about a single Flux controller deployment.
 */
export interface FluxControllerInfo {
  /** Controller name, e.g. "source-controller" */
  name: string;
  /** Kubernetes namespace where the controller is running */
  namespace: string;
  /** Whether the controller has at least one ready replica */
  ready: boolean;
  /** Container image tag extracted from the deployment spec */
  version: string;
}

/**
 * Overall Flux v2 installation status.
 */
export interface FluxInstallStatus {
  /** Whether at least one Flux controller is ready */
  installed: boolean;
  /** Per-controller status descriptors */
  controllers: FluxControllerInfo[];
}

/**
 * A Flux Kustomization custom resource.
 */
export interface FluxKustomization {
  /** Resource name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Path within the source repository */
  path: string;
  /** Whether the Ready condition is True */
  ready: boolean;
  /** Whether reconciliation is suspended */
  suspended: boolean;
  /** Last revision that was successfully applied */
  lastAppliedRevision: string | null;
  /** Source reference in the form "Kind/name" */
  sourceRef: string | null;
  /** Human-readable message from the Ready condition */
  readyConditionMessage: string | null;
}

/**
 * A Flux HelmRelease custom resource.
 */
export interface FluxHelmRelease {
  /** Resource name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Helm chart name */
  chartName: string;
  /** Helm chart version constraint, or null when not specified */
  chartVersion: string | null;
  /** Whether the Ready condition is True */
  ready: boolean;
  /** Whether reconciliation is suspended */
  suspended: boolean;
  /** Last revision that was successfully applied */
  lastAppliedRevision: string | null;
  /** Human-readable message from the Ready condition */
  readyConditionMessage: string | null;
}

/**
 * A Flux GitRepository or OCIRepository source resource.
 */
export interface FluxSource {
  /** Source kind */
  kind: "GitRepository" | "OCIRepository";
  /** Resource name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Repository URL */
  url: string;
  /** Branch name (GitRepository only), or null for OCIRepository */
  branch: string | null;
  /** Last fetched commit or digest from the artifact status */
  lastFetchedCommit: string | null;
  /** Whether the Ready condition is True */
  ready: boolean;
  /** Human-readable message from the Ready condition */
  readyConditionMessage: string | null;
}

// ---------------------------------------------------------------------------
// KEDA Autoscaling (FARM-E62)
// ---------------------------------------------------------------------------

/**
 * Installation status of the KEDA autoscaler in the cluster.
 */
export interface KedaInstallStatus {
  /** Whether the KEDA operator is installed and ready */
  installed: boolean;
  /** KEDA version extracted from the operator image tag */
  version: string;
}

/**
 * Describes a single trigger attached to a KEDA ScaledObject.
 */
export interface KedaScaledObjectTrigger {
  /** Trigger type, e.g. "kafka", "prometheus", "redis" */
  type: string;
  /** Trigger-specific metadata key/value pairs */
  metadata: Record<string, string>;
}

/**
 * Represents a KEDA ScaledObject resource discovered in the cluster.
 */
export interface KedaScaledObject {
  /** ScaledObject name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Name of the target Deployment/StatefulSet, or null when unresolved */
  targetDeployment: string | null;
  /** Minimum replica count configured on the ScaledObject */
  minReplicaCount: number;
  /** Maximum replica count configured on the ScaledObject */
  maxReplicaCount: number;
  /** Whether the Ready condition is True */
  ready: boolean;
  /** Whether the Active condition is True (at least one trigger is firing) */
  active: boolean;
  /** Whether the ScaledObject is paused via the autoscaling.keda.sh/paused annotation */
  paused: boolean;
  /** Current replica count reported by KEDA */
  currentReplicas: number;
  /** Desired replica count computed by KEDA */
  desiredReplicas: number;
  /** Type of the first trigger, e.g. "kafka" */
  scalerType: string;
}

/**
 * Represents a KEDA ScaledJob resource discovered in the cluster.
 */
export interface KedaScaledJob {
  /** ScaledJob name */
  name: string;
  /** Kubernetes namespace */
  namespace: string;
  /** Job template name (from completions field), or null when absent */
  jobTemplateName: string | null;
  /** Minimum replica count */
  minReplicaCount: number;
  /** Maximum replica count */
  maxReplicaCount: number;
  /** Whether the Ready condition is True */
  ready: boolean;
}

/**
 * Raw shape of an Argo Rollout object returned by the CustomObjectsApi.
 * Only the fields consumed by this service are declared; additional cluster
 * fields are captured by the index signature.
 */
interface RawArgoRollout {
  metadata?: { name?: string; namespace?: string };
  status?: {
    phase?: string;
    message?: string;
    canary?: {
      weights?: { canary?: { weight?: number } };
    };
    blueGreen?: {
      activeSelector?: string;
      previewSelector?: string;
    };
    canaryStatus?: {
      currentStepAnalysisRunStatus?: {
        name: string;
        phase: string;
        message?: string;
      };
    };
  };
  [key: string]: unknown;
}

/**
 * Raw list response from the CustomObjectsApi for Rollout resources.
 */
interface RawRolloutList {
  items?: RawArgoRollout[];
  [key: string]: unknown;
}
/**
 * Raw shape of an OLM ClusterServiceVersion returned by the CustomObjectsApi.
 */
interface RawClusterServiceVersion {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  spec?: {
    displayName?: string;
    description?: string;
    version?: string;
    icon?: Array<{ base64data?: string; mediatype?: string }>;
    provider?: { name?: string };
    customresourcedefinitions?: {
      owned?: Array<{
        name?: string;
        version?: string;
        kind?: string;
        description?: string;
      }>;
    };
  };
  status?: {
    phase?: string;
  };
  [key: string]: unknown;
}

/**
 * Raw list response from the CustomObjectsApi for ClusterServiceVersion resources.
 */
interface RawCsvList {
  items?: RawClusterServiceVersion[];
  [key: string]: unknown;
}

const WELL_KNOWN_OPERATOR_GROUPS: Record<string, string> = {
  "monitoring.coreos.com": "Prometheus Operator",
  "cert-manager.io": "Cert-Manager",
  "argoproj.io": "Argo Rollouts",
  "kafka.strimzi.io": "Strimzi Kafka",
};

/**
 * Farm annotation keys used to auto-register Kubernetes workloads into the catalog.
 */
const FARM_ANNOTATIONS = {
  COMPONENT: "farm.io/component",
  OWNER: "farm.io/owner",
  CATALOG_URL: "farm.io/catalog-url",
  ENVIRONMENT: "farm.io/environment",
} as const;

/**
 * Service for Kubernetes cluster discovery.
 * Connects to a cluster using KUBECONFIG_PATH or in-cluster config.
 * Provides workload discovery, CRD listing, annotation-based auto-registration,
 * and Argo Rollouts status polling.
 *
 * The service disables itself gracefully when neither config source is available.
 */
@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private appsV1Api: k8s.AppsV1Api | null = null;
  private coreV1Api: k8s.CoreV1Api | null = null;
  private apiExtensionsV1Api: k8s.ApiextensionsV1Api | null = null;
  private customObjectsApi: k8s.CustomObjectsApi | null = null;
  private readonly enabled: boolean;

  /**
   * In-memory cache of the latest Argo Rollout statuses, keyed by
   * "<namespace>/<name>" for O(1) lookup during change detection.
   */
  private rolloutCache = new Map<string, ArgoRolloutStatus>();

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly catalogService?: CatalogService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {
    this.enabled = this.initClient();
  }

  /**
   * Initializes all Kubernetes API clients from KUBECONFIG_PATH or in-cluster config.
   * @returns true if the client was initialized successfully, false otherwise
   */
  private initClient(): boolean {
    const kubeconfig = new k8s.KubeConfig();
    const kubeconfigPath =
      this.configService.get<string>("kubernetes.kubeconfigPath") || "";

    try {
      if (kubeconfigPath) {
        kubeconfig.loadFromFile(kubeconfigPath);
        this.logger.log(
          `Kubernetes client initialized from file: ${kubeconfigPath}`,
        );
      } else {
        kubeconfig.loadFromCluster();
        this.logger.log("Kubernetes client initialized from in-cluster config");
      }

      // Validate the server URL before creating API clients. loadFromCluster()
      // can succeed outside a real cluster (reads KUBERNETES_SERVICE_HOST /
      // KUBERNETES_SERVICE_PORT) but produce an invalid URL that causes every
      // subsequent API call to throw "Invalid URL" inside the HTTP client.
      const cluster = kubeconfig.getCurrentCluster();
      const serverUrl = cluster?.server ?? "";
      try {
        new URL(serverUrl);
      } catch {
        this.logger.warn(
          `Kubernetes client initialization failed (service disabled): invalid server URL "${serverUrl}"`,
        );
        return false;
      }

      this.appsV1Api = kubeconfig.makeApiClient(k8s.AppsV1Api);
      this.coreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
      this.apiExtensionsV1Api = kubeconfig.makeApiClient(
        k8s.ApiextensionsV1Api,
      );
      this.customObjectsApi = kubeconfig.makeApiClient(k8s.CustomObjectsApi);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Kubernetes client initialization failed (service disabled): ${message}`,
      );
      return false;
    }
  }

  /**
   * Returns whether the Kubernetes integration is enabled and connected.
   */
  isEnabled(): boolean {
    return this.enabled && this.appsV1Api !== null;
  }

  /**
   * Returns the CoreV1Api instance, or null if not initialized.
   * Used by HelmService and other consumers needing core resource access.
   */
  getCoreV1Api(): k8s.CoreV1Api | null {
    return this.coreV1Api;
  }

  /**
   * Returns the CustomObjectsApi instance, or null if not initialized.
   * Used by KyvernoPolicyReportService and other consumers that work with
   * custom Kubernetes resources.
   */
  getCustomObjectsApi(): k8s.CustomObjectsApi | null {
    return this.customObjectsApi;
  }

  // ---------------------------------------------------------------------------
  // Workload Discovery
  // ---------------------------------------------------------------------------

  /**
   * Discovers all Deployment workloads across all namespaces.
   * @returns Array of discovered workloads with metadata
   */
  async discoverWorkloads(): Promise<KubernetesWorkload[]> {
    if (!this.appsV1Api) {
      this.logger.warn("Kubernetes client not available; returning empty list");
      return [];
    }

    try {
      const response = await this.appsV1Api.listDeploymentForAllNamespaces();
      const items = response.items ?? [];

      return items.map((d) => ({
        name: d.metadata?.name ?? "unknown",
        namespace: d.metadata?.namespace ?? "default",
        replicas: d.spec?.replicas ?? 0,
        readyReplicas: d.status?.readyReplicas ?? 0,
        image: d.spec?.template?.spec?.containers?.[0]?.image ?? "unknown",
        labels: (d.metadata?.labels as Record<string, string>) ?? {},
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list deployments: ${message}`);
      return [];
    }
  }

  /**
   * Finds Kubernetes workloads whose name or labels match a catalog component name.
   * @param componentName - The catalog component name to match
   * @returns Array of matching workloads
   */
  async matchComponent(componentName: string): Promise<KubernetesWorkload[]> {
    const workloads = await this.discoverWorkloads();
    const normalizedName = componentName.toLowerCase();

    return workloads.filter((w) => {
      const nameMatch = w.name.toLowerCase().includes(normalizedName);
      const labelMatch = Object.values(w.labels).some((v) =>
        v.toLowerCase().includes(normalizedName),
      );
      const labelKeyMatch = Object.keys(w.labels).some((k) =>
        k.toLowerCase().includes(normalizedName),
      );
      return nameMatch || labelMatch || labelKeyMatch;
    });
  }

  // ---------------------------------------------------------------------------
  // CRD Discovery (FARM-S139)
  // ---------------------------------------------------------------------------

  /**
   * Lists all Custom Resource Definitions installed in the cluster.
   * Enriches each CRD with a human-readable display template when the API
   * group is in the well-known operator map.
   *
   * @returns Array of CrdResource descriptors; empty array when disabled or on error
   */
  async listCRDs(): Promise<CrdResource[]> {
    if (!this.isEnabled() || !this.apiExtensionsV1Api) {
      this.logger.warn("Kubernetes not enabled; returning empty CRD list");
      return [];
    }

    try {
      const response =
        await this.apiExtensionsV1Api.listCustomResourceDefinition();
      const items = response.items ?? [];

      return items.map((crd) => {
        const group = crd.spec?.group ?? "";
        const storedVersions = crd.spec?.versions ?? [];
        const servedVersion =
          storedVersions.find((v) => v.served)?.name ??
          storedVersions[0]?.name ??
          "v1";

        return {
          name: crd.metadata?.name ?? "unknown",
          group,
          version: servedVersion,
          scope: crd.spec?.scope ?? "Namespaced",
          kind: crd.spec?.names?.kind ?? "Unknown",
          displayTemplate: WELL_KNOWN_OPERATOR_GROUPS[group] ?? group,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list CRDs: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Annotation-Based Auto-Registration (FARM-S139)
  // ---------------------------------------------------------------------------

  /**
   * Scans all Kubernetes Deployments for Farm annotation keys and upserts
   * matching Component records in the catalog.
   *
   * Recognized annotations (all under the "farm.io/" prefix):
   *   - farm.io/component  → component name
   *   - farm.io/owner      → team slug
   *   - farm.io/catalog-url → catalog-info.yaml URL
   *   - farm.io/environment → environment slug
   *
   * Runs automatically every 60 seconds when Kubernetes is enabled.
   *
   * @returns Counts of created and updated component records
   */
  @Cron("*/60 * * * * *")
  async syncAnnotatedWorkloads(): Promise<{
    created: number;
    updated: number;
  }> {
    if (!this.isEnabled() || !this.appsV1Api) {
      return { created: 0, updated: 0 };
    }

    if (!this.catalogService) {
      this.logger.warn(
        "CatalogService not available; skipping annotation sync",
      );
      return { created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    try {
      const response = await this.appsV1Api.listDeploymentForAllNamespaces();
      const deployments = response.items ?? [];

      for (const deployment of deployments) {
        const annotations =
          (deployment.metadata?.annotations as Record<string, string>) ?? {};
        const componentName = annotations[FARM_ANNOTATIONS.COMPONENT];

        if (!componentName) {
          continue;
        }

        const owner =
          annotations[FARM_ANNOTATIONS.OWNER] ??
          deployment.metadata?.namespace ??
          "unknown";

        try {
          // Attempt to find an existing component by name.
          const [existing] = await this.catalogService
            .findAll(0, 1)
            .then(([items]) => items.filter((c) => c.name === componentName));

          if (!existing) {
            await this.catalogService.create({
              name: componentName,
              owner,
              kind: ComponentKind.SERVICE,
              metadata: {
                k8sAnnotationSync: true,
                k8sNamespace: deployment.metadata?.namespace,
                k8sCatalogUrl: annotations[FARM_ANNOTATIONS.CATALOG_URL],
                k8sEnvironment: annotations[FARM_ANNOTATIONS.ENVIRONMENT],
              },
            });
            this.logger.log(
              `Auto-registered component "${componentName}" from k8s annotation`,
            );
            created++;
          } else {
            await this.catalogService.update(existing.id, {
              metadata: {
                ...(existing.metadata ?? {}),
                k8sAnnotationSync: true,
                k8sNamespace: deployment.metadata?.namespace,
                k8sCatalogUrl: annotations[FARM_ANNOTATIONS.CATALOG_URL],
                k8sEnvironment: annotations[FARM_ANNOTATIONS.ENVIRONMENT],
              },
            });
            updated++;
          }
        } catch (innerErr) {
          const msg =
            innerErr instanceof Error ? innerErr.message : String(innerErr);
          this.logger.error(
            `Failed to upsert component "${componentName}": ${msg}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Annotation sync failed: ${message}`);
    }

    return { created, updated };
  }

  // ---------------------------------------------------------------------------
  // Argo Rollouts (FARM-S141)
  // ---------------------------------------------------------------------------

  /**
   * Lists all Argo Rollout custom resources, optionally filtered by namespace.
   * Returns an empty array gracefully when the Rollout CRD is not installed
   * (HTTP 404 from the API server).
   *
   * @param namespace - Kubernetes namespace to query; omit for all namespaces
   * @returns Array of ArgoRolloutStatus objects
   */
  async listRollouts(namespace?: string): Promise<ArgoRolloutStatus[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn("Kubernetes not enabled; returning empty rollout list");
      return [];
    }

    try {
      const group = "argoproj.io";
      const version = "v1alpha1";
      const plural = "rollouts";

      let response: RawRolloutList;

      if (namespace) {
        response = (await this.customObjectsApi.listNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
        })) as RawRolloutList;
      } else {
        response = (await this.customObjectsApi.listClusterCustomObject({
          group,
          version,
          plural,
        })) as RawRolloutList;
      }

      const items: RawArgoRollout[] = response.items ?? [];
      return items.map((item) => this.parseRollout(item));
    } catch (error) {
      // 404 means the Argo Rollouts CRD is not installed — degrade gracefully.
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "Argo Rollouts CRD not installed in this cluster; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list Argo Rollouts: ${message}`);
      return [];
    }
  }

  /**
   * Polls Argo Rollout statuses every 30 seconds, caches the results, and
   * emits a ROLLOUT_UPDATED event via the WebSocket gateway whenever the
   * phase of a rollout changes compared to the cached value.
   */
  @Cron("*/30 * * * * *")
  async pollRollouts(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const rollouts = await this.listRollouts();

    for (const rollout of rollouts) {
      const cacheKey = `${rollout.namespace}/${rollout.name}`;
      const cached = this.rolloutCache.get(cacheKey);

      if (cached?.phase !== rollout.phase) {
        this.rolloutCache.set(cacheKey, rollout);

        this.eventsGateway?.server?.emit(FarmEvent.ROLLOUT_UPDATED, rollout);
        this.logger.log(
          `Rollout status changed: ${cacheKey} ${cached?.phase ?? "none"} → ${rollout.phase}`,
        );
      } else {
        // Update cache entry even when phase is unchanged to keep updatedAt fresh.
        this.rolloutCache.set(cacheKey, rollout);
      }
    }
  }

  /**
   * Parses a raw Argo Rollout custom object into an ArgoRolloutStatus.
   *
   * @param raw - Raw API object from CustomObjectsApi
   * @returns Typed ArgoRolloutStatus
   */
  private parseRollout(raw: RawArgoRollout): ArgoRolloutStatus {
    const status = raw.status ?? {};
    const canaryStatus = status.canary ?? {};
    const blueGreenStatus = status.blueGreen ?? {};

    const analysisRunResult = status.canaryStatus?.currentStepAnalysisRunStatus;
    const analysisRuns: Array<{
      name: string;
      phase: string;
      message?: string;
    }> = analysisRunResult ? [analysisRunResult] : [];

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      phase: status.phase ?? "Unknown",
      message: status.message,
      canaryWeight: canaryStatus.weights?.canary?.weight,
      blueGreenActive: blueGreenStatus.activeSelector,
      blueGreenPreview: blueGreenStatus.previewSelector,
      analysisRunResults: analysisRuns.length ? analysisRuns : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Operator Discovery (FARM-S237)
  // ---------------------------------------------------------------------------

  /**
   * Lists all OLM-managed operators by querying ClusterServiceVersion resources.
   * Returns an empty array gracefully when OLM is not installed (HTTP 404).
   *
   * @returns Array of OperatorInfo descriptors; empty array when disabled or on error
   */
  async listOperators(): Promise<OperatorInfo[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn("Kubernetes not enabled; returning empty operator list");
      return [];
    }

    try {
      const response = (await this.customObjectsApi.listClusterCustomObject({
        group: "operators.coreos.com",
        version: "v1alpha1",
        plural: "clusterserviceversions",
      })) as RawCsvList;

      const items: RawClusterServiceVersion[] = response.items ?? [];
      return items.map((csv) => this.parseCsv(csv));
    } catch (error) {
      // 404 means OLM is not installed — degrade gracefully.
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "OLM not installed in this cluster; returning empty operator list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list operators: ${message}`);
      return [];
    }
  }

  /**
   * Parses a raw OLM ClusterServiceVersion into an OperatorInfo descriptor.
   *
   * @param csv - Raw CSV object from CustomObjectsApi
   * @returns Typed OperatorInfo
   */
  private parseCsv(csv: RawClusterServiceVersion): OperatorInfo {
    const spec = csv.spec ?? {};
    const ownedCrds = spec.customresourcedefinitions?.owned ?? [];
    const icon = spec.icon?.[0];

    return {
      name: csv.metadata?.name ?? "unknown",
      displayName: spec.displayName ?? csv.metadata?.name ?? "unknown",
      version: spec.version ?? "unknown",
      namespace: csv.metadata?.namespace ?? "default",
      phase: csv.status?.phase ?? "Unknown",
      description: spec.description ?? "",
      icon: icon?.base64data
        ? `data:${icon.mediatype ?? "image/png"};base64,${icon.base64data}`
        : undefined,
      provider: spec.provider?.name,
      createdAt: csv.metadata?.creationTimestamp ?? new Date().toISOString(),
      customResourceDefinitions: ownedCrds.map((crd) => ({
        name: crd.name ?? "unknown",
        version: crd.version ?? "unknown",
        kind: crd.kind ?? "Unknown",
        description: crd.description ?? "",
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Custom Resource Inventory (FARM-S238)
  // ---------------------------------------------------------------------------

  /**
   * Lists all custom resource instances owned by a specific OLM operator.
   * Discovers the operator's owned CRDs via its ClusterServiceVersion, then
   * queries each CRD's resources across all namespaces.
   *
   * @param operatorName - The CSV name of the operator to query
   * @returns Array of CustomResourceInstance objects; empty array when not found or on error
   */
  async listOperatorCustomResources(
    operatorName: string,
  ): Promise<CustomResourceInstance[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty custom resource list",
      );
      return [];
    }

    try {
      const operators = await this.listOperators();
      const operator = operators.find((op) => op.name === operatorName);

      if (!operator) {
        this.logger.warn(`Operator "${operatorName}" not found`);
        return [];
      }

      const instances: CustomResourceInstance[] = [];

      for (const crd of operator.customResourceDefinitions) {
        try {
          // Derive group and plural from the CRD name (format: "plural.group")
          const dotIndex = crd.name.indexOf(".");
          const plural =
            dotIndex > 0 ? crd.name.substring(0, dotIndex) : crd.name;
          const group = dotIndex > 0 ? crd.name.substring(dotIndex + 1) : "";

          const response = (await this.customObjectsApi.listClusterCustomObject(
            {
              group,
              version: crd.version,
              plural,
            },
          )) as { items?: Array<Record<string, unknown>> };

          const items = response.items ?? [];
          for (const item of items) {
            instances.push(
              this.parseCustomResourceInstance(
                item,
                crd.kind,
                group,
                crd.version,
              ),
            );
          }
        } catch (error) {
          const errStatus = (error as { response?: { statusCode?: number } })
            ?.response?.statusCode;
          if (errStatus === 404) {
            this.logger.debug(
              `CRD "${crd.name}" not found in cluster; skipping`,
            );
            continue;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to list custom resources for CRD "${crd.name}": ${message}`,
          );
        }
      }

      return instances;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list operator custom resources: ${message}`);
      return [];
    }
  }

  /**
   * Parses a raw custom resource object into a CustomResourceInstance.
   *
   * @param raw - Raw API object from CustomObjectsApi
   * @param kind - Resource kind name
   * @param group - API group
   * @param version - API version
   * @returns Typed CustomResourceInstance
   */
  private parseCustomResourceInstance(
    raw: Record<string, unknown>,
    kind: string,
    group: string,
    version: string,
  ): CustomResourceInstance {
    const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
    const status = (raw.status ?? {}) as Record<string, unknown>;
    const conditions = (status.conditions ?? []) as Array<
      Record<string, unknown>
    >;

    return {
      name: (metadata.name as string) ?? "unknown",
      namespace: (metadata.namespace as string) ?? "default",
      kind,
      apiVersion: `${group}/${version}`,
      status: Object.keys(status).length > 0 ? status : undefined,
      conditions:
        conditions.length > 0
          ? conditions.map((c) => ({
              type: (c.type as string) ?? "Unknown",
              status: (c.status as string) ?? "Unknown",
              reason: c.reason as string | undefined,
              message: c.message as string | undefined,
              lastTransitionTime: c.lastTransitionTime as string | undefined,
            }))
          : undefined,
      createdAt:
        (metadata.creationTimestamp as string) ?? new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // CRI-O Runtime Detection (FARM-S241)
  // ---------------------------------------------------------------------------

  /**
   * Lists container runtime information for all nodes in the cluster.
   * Parses the containerRuntimeVersion field from each node's status to
   * extract the runtime name and version.
   *
   * @returns Array of NodeRuntimeInfo objects; empty array when disabled or on error
   */
  async listNodeRuntimes(): Promise<NodeRuntimeInfo[]> {
    if (!this.isEnabled() || !this.coreV1Api) {
      this.logger.warn("Kubernetes not enabled; returning empty runtime list");
      return [];
    }

    try {
      const response = await this.coreV1Api.listNode();
      const items = response.items ?? [];

      return items.map((node) => {
        const nodeInfo = node.status?.nodeInfo;
        const runtimeVersion =
          nodeInfo?.containerRuntimeVersion ?? "unknown://unknown";
        const [runtimeName, version] =
          this.parseContainerRuntimeVersion(runtimeVersion);

        return {
          nodeName: node.metadata?.name ?? "unknown",
          runtimeName,
          runtimeVersion: version,
          kernelVersion: nodeInfo?.kernelVersion ?? "unknown",
          osImage: nodeInfo?.osImage ?? "unknown",
          architecture: nodeInfo?.architecture ?? "unknown",
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list node runtimes: ${message}`);
      return [];
    }
  }

  /**
   * Retrieves CRI-O storage metrics for a specific node.
   * Verifies the node exists and uses the CRI-O runtime.  Metrics fields
   * (imageLayers, cacheHitRate, storageUsageBytes) require a dedicated
   * monitoring agent and are only populated when available.
   *
   * @param nodeName - Name of the Kubernetes node
   * @returns CrioStorageMetrics with availability info
   */
  async getCrioMetrics(nodeName: string): Promise<CrioStorageMetrics> {
    if (!this.isEnabled() || !this.coreV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning unavailable CRI-O metrics",
      );
      return { nodeName, available: false };
    }

    try {
      const runtimes = await this.listNodeRuntimes();
      const nodeRuntime = runtimes.find((r) => r.nodeName === nodeName);

      if (!nodeRuntime) {
        this.logger.warn(`Node "${nodeName}" not found`);
        return { nodeName, available: false };
      }

      if (!["cri-o", "crio"].includes(nodeRuntime.runtimeName)) {
        this.logger.debug(
          `Node "${nodeName}" does not use CRI-O runtime (uses "${nodeRuntime.runtimeName}")`,
        );
        return { nodeName, available: false };
      }

      // CRI-O is detected. Direct metrics scraping requires a dedicated
      // monitoring agent (e.g. Prometheus node exporter). Return availability.
      return { nodeName, available: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get CRI-O metrics for node "${nodeName}": ${message}`,
      );
      return { nodeName, available: false };
    }
  }

  /**
   * Parses a containerRuntimeVersion string into [runtimeName, version].
   * The format is typically "containerd://1.6.20" or "cri-o://1.28.0".
   *
   * @param containerRuntimeVersion - Raw version string from node status
   * @returns Tuple of [runtimeName, version]
   */
  private parseContainerRuntimeVersion(
    containerRuntimeVersion: string,
  ): [string, string] {
    const separatorIndex = containerRuntimeVersion.indexOf("://");
    if (separatorIndex === -1) {
      return [containerRuntimeVersion, "unknown"];
    }
    return [
      containerRuntimeVersion.substring(0, separatorIndex),
      containerRuntimeVersion.substring(separatorIndex + 3),
    ];
  }

  // ---------------------------------------------------------------------------
  // Dragonfly P2P CDN Detection (FARM-S245)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of the Dragonfly P2P CDN components.
   * Discovers Deployments and DaemonSets labelled with
   * "app.kubernetes.io/name=dragonfly" and classifies them as manager,
   * scheduler, or dfdaemon based on their name.
   *
   * @returns DragonflyInstallStatus with component breakdown
   */
  async getDragonflyStatus(): Promise<DragonflyInstallStatus> {
    const notInstalled: DragonflyInstallStatus = {
      status: "not-installed",
      version: null,
      components: [],
    };

    if (!this.isEnabled() || !this.appsV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning not-installed Dragonfly status",
      );
      return notInstalled;
    }

    try {
      const labelSelector = "app.kubernetes.io/name=dragonfly";
      const [deploymentsRes, daemonSetsRes] = await Promise.all([
        this.appsV1Api.listDeploymentForAllNamespaces({
          labelSelector,
        }),
        this.appsV1Api.listDaemonSetForAllNamespaces({
          labelSelector,
        }),
      ]);

      const components: DragonflyComponentInfo[] = [];

      for (const item of deploymentsRes.items ?? []) {
        const name = item.metadata?.name ?? "";
        const component = this.resolveDragonflyComponent(name);
        if (!component) continue;

        const image =
          item.spec?.template?.spec?.containers?.[0]?.image ??
          "unknown:unknown";
        const version = this.extractImageTag(image);

        components.push({
          component,
          namespace: item.metadata?.namespace ?? "default",
          version,
          readyReplicas: item.status?.readyReplicas ?? 0,
          totalReplicas: item.spec?.replicas ?? 0,
          workloadKind: "Deployment",
        });
      }

      for (const item of daemonSetsRes.items ?? []) {
        const name = item.metadata?.name ?? "";
        const component = this.resolveDragonflyComponent(name);
        if (!component) continue;

        const image =
          item.spec?.template?.spec?.containers?.[0]?.image ??
          "unknown:unknown";
        const version = this.extractImageTag(image);

        const desired =
          (item.status as { desiredNumberScheduled?: number })
            ?.desiredNumberScheduled ?? 0;
        const ready =
          (item.status as { numberReady?: number })?.numberReady ?? 0;

        components.push({
          component,
          namespace: item.metadata?.namespace ?? "default",
          version,
          readyReplicas: ready,
          totalReplicas: desired,
          workloadKind: "DaemonSet",
        });
      }

      if (components.length === 0) {
        return notInstalled;
      }

      const allReady = components.every(
        (c) => c.readyReplicas === c.totalReplicas,
      );
      const overallStatus: "healthy" | "degraded" = allReady
        ? "healthy"
        : "degraded";

      return {
        status: overallStatus,
        version: components[0].version,
        components,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to get Dragonfly status: ${message}`);
      return notInstalled;
    }
  }

  /**
   * Resolves the Dragonfly component role from a workload name.
   * Returns null when the name does not match any known component.
   *
   * @param name - Kubernetes resource name
   * @returns Component role or null
   */
  private resolveDragonflyComponent(
    name: string,
  ): "manager" | "scheduler" | "dfdaemon" | null {
    if (name.includes("manager")) return "manager";
    if (name.includes("scheduler")) return "scheduler";
    if (name.includes("dfdaemon") || name.includes("dfget")) return "dfdaemon";
    return null;
  }

  /**
   * Extracts the image tag from a container image reference.
   * Handles registry ports (e.g. `registry:5000/image:tag`) and digest
   * references (`image@sha256:...`). Returns the tag portion after the last
   * `:` that follows the last `/`, or `"unknown"` when no tag is present.
   *
   * @param imageRef - Full container image reference
   * @returns The tag string, or "unknown"
   */
  private extractImageTag(imageRef: string): string {
    // Strip any digest suffix (e.g. @sha256:..., @sha384:..., @sha512:...)
    const withoutDigest = imageRef.split("@")[0];
    // The tag is after the last ":" that comes after the last "/"
    const lastSlash = withoutDigest.lastIndexOf("/");
    const tagPortion =
      lastSlash >= 0 ? withoutDigest.substring(lastSlash) : withoutDigest;
    const colonIdx = tagPortion.lastIndexOf(":");
    if (colonIdx < 0) return "unknown";
    return tagPortion.substring(colonIdx + 1) || "unknown";
  }

  // ---------------------------------------------------------------------------
  // Dragonfly P2P Metrics (FARM-S246)
  // ---------------------------------------------------------------------------

  /**
   * Retrieves aggregated P2P task counters from the Dragonfly Manager pod.
   * Scrapes Prometheus metrics via the Kubernetes pod proxy endpoint and
   * parses the text format to extract task and peer counters.
   *
   * @returns DragonflyTaskMetrics with zero values when not available
   */
  async getDragonflyMetrics(): Promise<DragonflyTaskMetrics> {
    const emptyMetrics: DragonflyTaskMetrics = {
      totalTasks: 0,
      succeededTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      totalPeers: 0,
    };

    if (!this.isEnabled() || !this.coreV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning zero Dragonfly metrics",
      );
      return emptyMetrics;
    }

    try {
      const podsRes = await this.coreV1Api.listPodForAllNamespaces({
        labelSelector:
          "app.kubernetes.io/name=dragonfly,app.kubernetes.io/component=manager",
      });

      const pods = podsRes.items ?? [];
      if (pods.length === 0) {
        this.logger.warn(
          "No Dragonfly manager pod found; returning zero metrics",
        );
        return emptyMetrics;
      }

      const pod = pods[0];
      const podName = pod.metadata?.name ?? "";
      const namespace = pod.metadata?.namespace ?? "default";

      const rawBody = await this.coreV1Api.connectGetNamespacedPodProxy({
        name: podName,
        namespace,
        path: "/metrics",
      });

      const metricsText =
        typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

      const parseMetric = (metricName: string): number => {
        const escapedMetricName = metricName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const metricPattern = new RegExp(
          `^${escapedMetricName}(?:\\{[^}]*\\})?\\s+([^\\s]+)`,
        );

        return metricsText.split("\n").reduce((total, line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith("#")) {
            return total;
          }

          const match = trimmedLine.match(metricPattern);
          if (!match) {
            return total;
          }

          const value = Number.parseFloat(match[1]);
          return Number.isFinite(value) ? total + value : total;
        }, 0);
      };

      const totalTasks = parseMetric("dragonfly_manager_peer_task_total");
      const succeededTasks = parseMetric(
        "dragonfly_manager_peer_task_succeeded_total",
      );
      const failedTasks = parseMetric(
        "dragonfly_manager_peer_task_failed_total",
      );
      const totalPeers = parseMetric("dragonfly_manager_peer_total");

      return {
        totalTasks,
        succeededTasks,
        failedTasks,
        activeTasks: totalTasks - succeededTasks - failedTasks,
        totalPeers,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to get Dragonfly metrics: ${message}`);
      return emptyMetrics;
    }
  }

  /**
   * Returns recent Dragonfly P2P pull tasks.
   * Dragonfly Prometheus metrics do not expose individual tasks as separate
   * time series; this method returns an empty array unless a future scraping
   * strategy is implemented.
   *
   * @returns Array of DragonflyTask objects (currently always empty)
   */
  getDragonflyTasks(): Promise<DragonflyTask[]> {
    if (!this.isEnabled()) {
      return Promise.resolve([]);
    }

    // Individual task data is not exposed via standard Prometheus metrics.
    // Return empty until a dedicated task API or log scraping is available.
    return Promise.resolve([]);
  }

  /**
   * Lists active Dragonfly peer nodes by discovering dfdaemon pods.
   * Maps each running pod to a DragonflyPeer descriptor.
   *
   * @returns Array of DragonflyPeer objects; empty when not available
   */
  async getDragonflyPeers(): Promise<DragonflyPeer[]> {
    if (!this.isEnabled() || !this.coreV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty Dragonfly peers list",
      );
      return [];
    }

    try {
      const podsRes = await this.coreV1Api.listPodForAllNamespaces({
        labelSelector:
          "app.kubernetes.io/name=dragonfly,app.kubernetes.io/component=dfdaemon",
      });

      return (podsRes.items ?? []).map((pod) => ({
        peerId: pod.metadata?.name ?? "unknown",
        ip: pod.status?.podIP ?? "unknown",
        status: pod.status?.phase === "Running" ? "active" : "idle",
        taskCount: 0,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to get Dragonfly peers: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Flux GitOps Integration (FARM-S248 / FARM-S249 / FARM-S250)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of Flux v2 by checking for well-known
   * controller deployments labelled with app.kubernetes.io/part-of=flux.
   *
   * @returns FluxInstallStatus with per-controller info and overall installed flag
   */
  async getFluxStatus(): Promise<FluxInstallStatus> {
    if (!this.isEnabled() || !this.appsV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning not-installed Flux status",
      );
      return { installed: false, controllers: [] };
    }

    try {
      const controllerNames = [
        "source-controller",
        "kustomize-controller",
        "helm-controller",
        "notification-controller",
      ];

      const res = await this.appsV1Api.listDeploymentForAllNamespaces({
        labelSelector: "app.kubernetes.io/part-of=flux",
      });

      const deployments = res.items ?? [];
      const controllers: FluxControllerInfo[] = controllerNames.map((name) => {
        const dep = deployments.find((d) => d.metadata?.name === name);
        const image = dep?.spec?.template?.spec?.containers?.[0]?.image ?? "";
        const version = this.extractImageTag(image);
        return {
          name,
          namespace: dep?.metadata?.namespace ?? "flux-system",
          ready: (dep?.status?.readyReplicas ?? 0) > 0,
          version: version === "unknown" ? "" : version,
        };
      });

      const installed = controllers.some((c) => c.ready);
      return { installed, controllers };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to get Flux status: ${message}`);
      return { installed: false, controllers: [] };
    }
  }

  /**
   * Lists all Flux Kustomization custom resources in the cluster.
   *
   * @returns Array of FluxKustomization descriptors; empty when Flux is not installed
   */
  async listFluxKustomizations(): Promise<FluxKustomization[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty Flux Kustomization list",
      );
      return [];
    }

    try {
      const res = (await this.customObjectsApi.listClusterCustomObject({
        group: "kustomize.toolkit.fluxcd.io",
        version: "v1",
        plural: "kustomizations",
      })) as { items?: object[] };

      const items = res.items ?? [];
      return items.map((item) => {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const sourceRef = spec.sourceRef as Record<string, string> | undefined;

        return {
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          path: (spec.path as string) ?? "",
          ready: readyCond?.status === "True",
          suspended: (spec.suspend as boolean) ?? false,
          lastAppliedRevision: (status.lastAppliedRevision as string) ?? null,
          sourceRef: sourceRef ? `${sourceRef.kind}/${sourceRef.name}` : null,
          readyConditionMessage: readyCond?.message ?? null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Flux Kustomizations: ${message}`);
      return [];
    }
  }

  /**
   * Lists all Flux HelmRelease custom resources in the cluster.
   *
   * @returns Array of FluxHelmRelease descriptors; empty when Flux is not installed
   */
  async listFluxHelmReleases(): Promise<FluxHelmRelease[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty Flux HelmRelease list",
      );
      return [];
    }

    try {
      const res = (await this.customObjectsApi.listClusterCustomObject({
        group: "helm.toolkit.fluxcd.io",
        version: "v2",
        plural: "helmreleases",
      })) as { items?: object[] };

      const items = res.items ?? [];
      return items.map((item) => {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const chart = (spec.chart ?? {}) as Record<string, unknown>;
        const chartSpec = (chart.spec ?? {}) as Record<string, unknown>;

        return {
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          chartName: (chartSpec.chart as string) ?? "",
          chartVersion: (chartSpec.version as string) ?? null,
          ready: readyCond?.status === "True",
          suspended: (spec.suspend as boolean) ?? false,
          lastAppliedRevision: (status.lastAppliedRevision as string) ?? null,
          readyConditionMessage: readyCond?.message ?? null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list Flux HelmReleases: ${message}`);
      return [];
    }
  }

  /**
   * Lists all Flux GitRepository and OCIRepository source resources in the
   * cluster. Both kinds are fetched independently so a missing CRD for one
   * kind does not prevent results from the other.
   *
   * @returns Array of FluxSource descriptors
   */
  async listFluxSources(): Promise<FluxSource[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty Flux source list",
      );
      return [];
    }

    const sources: FluxSource[] = [];

    try {
      const gitRes = (await this.customObjectsApi.listClusterCustomObject({
        group: "source.toolkit.fluxcd.io",
        version: "v1",
        plural: "gitrepositories",
      })) as { items?: object[] };
      const gitItems = gitRes.items ?? [];
      for (const item of gitItems) {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const artifact = (status.artifact ?? {}) as Record<string, unknown>;

        sources.push({
          kind: "GitRepository",
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          url: (spec.url as string) ?? "",
          branch:
            (spec.ref as Record<string, string> | undefined)?.branch ?? null,
          lastFetchedCommit: (artifact.revision as string) ?? null,
          ready: readyCond?.status === "True",
          readyConditionMessage: readyCond?.message ?? null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list GitRepositories: ${message}`);
    }

    try {
      const ociRes = (await this.customObjectsApi.listClusterCustomObject({
        group: "source.toolkit.fluxcd.io",
        version: "v1beta2",
        plural: "ocirepositories",
      })) as { items?: object[] };
      const ociItems = ociRes.items ?? [];
      for (const item of ociItems) {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const artifact = (status.artifact ?? {}) as Record<string, unknown>;

        sources.push({
          kind: "OCIRepository",
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          url: (spec.url as string) ?? "",
          branch: null,
          lastFetchedCommit: (artifact.revision as string) ?? null,
          ready: readyCond?.status === "True",
          readyConditionMessage: readyCond?.message ?? null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list OCIRepositories: ${message}`);
    }

    return sources;
  }

  /**
   * Polls Flux Kustomization and HelmRelease resources every 60 seconds and
   * emits a WebSocket event for each resource that is not ready, not suspended,
   * and has a non-empty condition message.
   */
  @Cron("*/60 * * * * *")
  async pollFluxReconciliation(): Promise<void> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      return;
    }

    try {
      const [kustomizations, helmReleases] = await Promise.all([
        this.listFluxKustomizations(),
        this.listFluxHelmReleases(),
      ]);

      for (const k of kustomizations) {
        if (!k.ready && !k.suspended && k.readyConditionMessage) {
          this.eventsGateway?.server?.emit(
            FarmEvent.FLUX_RECONCILIATION_FAILED,
            {
              resourceKind: "Kustomization",
              name: k.name,
              namespace: k.namespace,
              reason: k.readyConditionMessage,
              timestamp: new Date().toISOString(),
            },
          );
        }
      }

      for (const hr of helmReleases) {
        if (!hr.ready && !hr.suspended && hr.readyConditionMessage) {
          this.eventsGateway?.server?.emit(
            FarmEvent.FLUX_RECONCILIATION_FAILED,
            {
              resourceKind: "HelmRelease",
              name: hr.name,
              namespace: hr.namespace,
              reason: hr.readyConditionMessage,
              timestamp: new Date().toISOString(),
            },
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to poll Flux reconciliation: ${message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // KEDA Autoscaling (FARM-S252)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of the KEDA autoscaler operator.
   * Discovers Deployments labelled with "app=keda-operator" and checks
   * readiness. Returns not-installed when Kubernetes is unavailable or
   * the operator is not found.
   *
   * @returns KedaInstallStatus with installed flag and version string
   */
  async getKedaStatus(): Promise<KedaInstallStatus> {
    if (!this.isEnabled() || !this.appsV1Api) {
      this.logger.warn(
        "Kubernetes not enabled; returning not-installed KEDA status",
      );
      return { installed: false, version: "" };
    }

    try {
      const res = await this.appsV1Api.listDeploymentForAllNamespaces({
        labelSelector: "app=keda-operator",
      });
      const items = res.items ?? [];
      const kedaDep = items.find((d) =>
        (d.metadata?.name ?? "").includes("keda-operator"),
      );

      if (!kedaDep) {
        return { installed: false, version: "" };
      }

      const image = kedaDep.spec?.template?.spec?.containers?.[0]?.image ?? "";
      const version = this.extractImageTag(image);

      return {
        installed: (kedaDep.status?.readyReplicas ?? 0) > 0,
        version: version === "unknown" ? "" : version,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to get KEDA status: ${message}`);
      return { installed: false, version: "" };
    }
  }

  /**
   * Lists all KEDA ScaledObject resources discovered cluster-wide.
   * Returns an empty array gracefully when the KEDA CRD is not installed.
   *
   * @returns Array of KedaScaledObject descriptors
   */
  async listKedaScaledObjects(): Promise<KedaScaledObject[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty KEDA ScaledObject list",
      );
      return [];
    }

    try {
      const res = (await this.customObjectsApi.listClusterCustomObject({
        group: "keda.sh",
        version: "v1alpha1",
        plural: "scaledobjects",
      })) as { items?: object[] };

      const items = res.items ?? [];
      return items.map((item) => {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const activeCond = conditions.find((c) => c.type === "Active");
        const scaleTarget = (spec.scaleTargetRef ?? {}) as Record<
          string,
          string
        >;
        const triggers =
          (spec.triggers as Array<Record<string, unknown>> | undefined) ?? [];
        const firstTrigger = triggers[0] as Record<string, unknown> | undefined;

        const annotations = (metadata.annotations ?? {}) as Record<
          string,
          string
        >;
        const paused = annotations["autoscaling.keda.sh/paused"] === "true";

        return {
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          targetDeployment: scaleTarget.name ?? null,
          minReplicaCount: (spec.minReplicaCount as number) ?? 0,
          maxReplicaCount: (spec.maxReplicaCount as number) ?? 100,
          ready: readyCond?.status === "True",
          active: activeCond?.status === "True",
          paused,
          currentReplicas: (status.currentReplicas as number) ?? 0,
          desiredReplicas: (status.desiredReplicas as number) ?? 0,
          scalerType: (firstTrigger?.type as string) ?? "unknown",
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list KEDA ScaledObjects: ${message}`);
      return [];
    }
  }

  /**
   * Lists all KEDA ScaledJob resources discovered cluster-wide.
   * Returns an empty array gracefully when the KEDA CRD is not installed.
   *
   * @returns Array of KedaScaledJob descriptors
   */
  async listKedaScaledJobs(): Promise<KedaScaledJob[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn(
        "Kubernetes not enabled; returning empty KEDA ScaledJob list",
      );
      return [];
    }

    try {
      const res = (await this.customObjectsApi.listClusterCustomObject({
        group: "keda.sh",
        version: "v1alpha1",
        plural: "scaledjobs",
      })) as { items?: object[] };

      const items = res.items ?? [];
      return items.map((item) => {
        const obj = item as Record<string, unknown>;
        const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
        const spec = (obj.spec ?? {}) as Record<string, unknown>;
        const status = (obj.status ?? {}) as Record<string, unknown>;
        const conditions =
          (status.conditions as Array<Record<string, string>> | undefined) ??
          [];
        const readyCond = conditions.find((c) => c.type === "Ready");
        const jobTemplate = (spec.jobTargetRef ?? {}) as Record<
          string,
          unknown
        >;

        return {
          name: (metadata.name as string) ?? "",
          namespace: (metadata.namespace as string) ?? "default",
          jobTemplateName: (jobTemplate.completions as string) ?? null,
          minReplicaCount: (spec.minReplicaCount as number) ?? 0,
          maxReplicaCount: (spec.maxReplicaCount as number) ?? 100,
          ready: readyCond?.status === "True",
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to list KEDA ScaledJobs: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // KEDA Trigger Details (FARM-S253)
  // ---------------------------------------------------------------------------

  /**
   * Returns the list of triggers configured on a specific KEDA ScaledObject.
   * Returns an empty array gracefully when the ScaledObject is not found or
   * when Kubernetes is unavailable.
   *
   * @param name - ScaledObject name
   * @param namespace - Kubernetes namespace
   * @returns Array of KedaScaledObjectTrigger descriptors
   */
  async getKedaScaledObjectTriggers(
    name: string,
    namespace: string,
  ): Promise<KedaScaledObjectTrigger[]> {
    if (!this.isEnabled() || !this.customObjectsApi) {
      this.logger.warn("Kubernetes not enabled; returning empty trigger list");
      return [];
    }

    try {
      const res = (await this.customObjectsApi.getNamespacedCustomObject({
        group: "keda.sh",
        version: "v1alpha1",
        namespace,
        plural: "scaledobjects",
        name,
      })) as Record<string, unknown>;

      const obj = res;
      const spec = (obj.spec ?? {}) as Record<string, unknown>;
      const triggers =
        (spec.triggers as Array<Record<string, unknown>> | undefined) ?? [];

      return triggers.map((t) => ({
        type: (t.type as string) ?? "unknown",
        metadata: (t.metadata ?? {}) as Record<string, string>,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get KEDA ScaledObject triggers for "${name}": ${message}`,
      );
      return [];
    }
  }
}
