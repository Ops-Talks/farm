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
}
