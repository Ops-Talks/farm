import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as k8s from "@kubernetes/client-node";

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
 * Service for Kubernetes cluster discovery.
 * Connects to a cluster using KUBECONFIG_PATH or in-cluster config.
 * The service disables itself gracefully when neither config source is available.
 */
@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private appsV1Api: k8s.AppsV1Api | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.initClient();
  }

  /**
   * Initializes the Kubernetes client from KUBECONFIG_PATH or in-cluster config.
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
}
