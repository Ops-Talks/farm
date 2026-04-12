import { Injectable, Logger } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import {
  LinkerdAuthorizationPolicy,
  LinkerdControlPlaneComponent,
  LinkerdServerAuthorization,
  LinkerdServiceProfile,
  LinkerdServiceProfileRoute,
  LinkerdStatus,
  LinkerdTopologyEdge,
  RawAuthorizationPolicy,
  RawAuthorizationPolicyList,
  RawDeployment,
  RawDeploymentList,
  RawServerAuthorization,
  RawServerAuthorizationList,
  RawServiceProfile,
  RawServiceProfileList,
} from "./interfaces/linkerd.interfaces";

/** API group for Linkerd policy resources (ServerAuthorization, AuthorizationPolicy). */
const LINKERD_POLICY_GROUP = "policy.linkerd.io";
/** API version for ServerAuthorization. */
const LINKERD_POLICY_SERVER_AUTH_VERSION = "v1beta1";
/** API version for AuthorizationPolicy. */
const LINKERD_POLICY_AUTH_POLICY_VERSION = "v1alpha1";
/** API group and version for ServiceProfile. */
const LINKERD_PROFILE_GROUP = "linkerd.io";
const LINKERD_PROFILE_VERSION = "v1alpha2";
/** Namespace where Linkerd control plane deployments reside. */
const LINKERD_NAMESPACE = "linkerd";
/** Expected control plane deployment names for status reporting. */
const LINKERD_CONTROL_PLANE_COMPONENTS = [
  "linkerd-controller",
  "linkerd-identity",
  "linkerd-proxy-injector",
  "linkerd-destination",
];

/**
 * Service that integrates with Linkerd 2.x service mesh custom resources via
 * the Kubernetes CustomObjectsApi and AppsV1Api.
 *
 * All public methods accept an optional kubeconfig string and degrade
 * gracefully when Linkerd is not installed.
 */
@Injectable()
export class LinkerdService {
  private readonly logger = new Logger(LinkerdService.name);

  constructor(private readonly kubernetesService: KubernetesService) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalizes a kubeconfig query parameter that may arrive as an array due
   * to HTTP query parameter tampering.
   */
  private normalizeKubeconfigInput(
    kubeconfig?: string | string[],
  ): string | undefined {
    if (kubeconfig === undefined) return undefined;
    if (Array.isArray(kubeconfig)) {
      this.logger.warn(
        "Received array value for kubeconfig parameter; using first element",
      );
      return kubeconfig[0];
    }
    return kubeconfig;
  }

  /**
   * Resolves a CustomObjectsApi client from an optional inline kubeconfig
   * string or file path. Falls back to the shared KubernetesService client.
   */
  private getCustomObjectsApi(
    kubeconfig?: string | string[],
  ): k8s.CustomObjectsApi | null {
    const normalized = this.normalizeKubeconfigInput(kubeconfig);
    if (!normalized) {
      return this.kubernetesService.getCustomObjectsApi();
    }
    try {
      const kc = new k8s.KubeConfig();
      if (
        normalized.trim().startsWith("apiVersion") ||
        normalized.includes("\n")
      ) {
        kc.loadFromString(normalized);
      } else {
        kc.loadFromFile(normalized);
      }
      return kc.makeApiClient(k8s.CustomObjectsApi);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to build kubeconfig client: ${message}`);
      return null;
    }
  }

  /**
   * Resolves an AppsV1Api client from an optional inline kubeconfig or falls
   * back to the shared KubernetesService instance.
   */
  private getAppsV1Api(kubeconfig?: string | string[]): k8s.AppsV1Api | null {
    const normalized = this.normalizeKubeconfigInput(kubeconfig);
    if (!normalized) {
      return this.kubernetesService.getAppsV1Api();
    }
    try {
      const kc = new k8s.KubeConfig();
      if (
        normalized.trim().startsWith("apiVersion") ||
        normalized.includes("\n")
      ) {
        kc.loadFromString(normalized);
      } else {
        kc.loadFromFile(normalized);
      }
      return kc.makeApiClient(k8s.AppsV1Api);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to build AppsV1Api client: ${message}`);
      return null;
    }
  }

  /**
   * Returns true when an error represents a "not found" response (HTTP 404)
   * from the Kubernetes API.
   */
  private isNotFound(error: unknown): boolean {
    const status = (error as { response?: { statusCode?: number } })?.response
      ?.statusCode;
    return status === 404;
  }

  // ---------------------------------------------------------------------------
  // Linkerd availability check
  // ---------------------------------------------------------------------------

  /**
   * Checks whether Linkerd is installed in the target cluster by attempting to
   * list ServiceProfile resources cluster-wide. A successful (even empty)
   * response confirms the linkerd.io/v1alpha2 API group is registered.
   *
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns true when Linkerd is installed and reachable
   */
  async isLinkerdEnabled(kubeconfig?: string | string[]): Promise<boolean> {
    const api = this.getCustomObjectsApi(kubeconfig);
    if (!api) {
      this.logger.debug("No Kubernetes client available; Linkerd disabled");
      return false;
    }
    try {
      await api.listClusterCustomObject({
        group: LINKERD_PROFILE_GROUP,
        version: LINKERD_PROFILE_VERSION,
        plural: "serviceprofiles",
      });
      return true;
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "linkerd.io/v1alpha2 CRD group not found; Linkerd is not installed",
        );
        return false;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Linkerd enabled check failed: ${message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  /**
   * Returns the Linkerd installation status including control plane component
   * readiness derived from the linkerd namespace deployments.
   *
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns LinkerdStatus with installed flag and component readiness
   */
  async getStatus(kubeconfig?: string | string[]): Promise<LinkerdStatus> {
    const installed = await this.isLinkerdEnabled(kubeconfig);
    if (!installed) {
      return { installed: false, components: [] };
    }

    const appsApi = this.getAppsV1Api(kubeconfig);
    if (!appsApi) {
      return { installed: true, components: [] };
    }

    try {
      const response = (await appsApi.listNamespacedDeployment({
        namespace: LINKERD_NAMESPACE,
      })) as unknown as RawDeploymentList;

      const deploymentMap = new Map<string, RawDeployment>();
      for (const dep of response.items ?? []) {
        const name = dep.metadata?.name ?? "";
        if (name) deploymentMap.set(name, dep);
      }

      const components: LinkerdControlPlaneComponent[] =
        LINKERD_CONTROL_PLANE_COMPONENTS.map((compName) => {
          const dep = deploymentMap.get(compName);
          if (!dep) {
            return { name: compName, ready: false };
          }
          const ready = (dep.status?.readyReplicas ?? 0) > 0;
          const image = dep.spec?.template?.spec?.containers?.[0]?.image ?? "";
          const version = image.includes(":")
            ? image.split(":").pop()
            : undefined;
          return { name: compName, ready, version };
        });

      return { installed: true, components };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch Linkerd control plane status: ${message}`,
      );
      return { installed: true, components: [] };
    }
  }

  // ---------------------------------------------------------------------------
  // ServerAuthorization
  // ---------------------------------------------------------------------------

  /**
   * Lists Linkerd ServerAuthorization resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of ServerAuthorization objects; empty on error or missing CRD
   */
  async listServerAuthorizations(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<LinkerdServerAuthorization[]> {
    const api = this.getCustomObjectsApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ServerAuthorization list",
      );
      return [];
    }
    try {
      const response = (await api.listNamespacedCustomObject({
        group: LINKERD_POLICY_GROUP,
        version: LINKERD_POLICY_SERVER_AUTH_VERSION,
        namespace,
        plural: "serverauthorizations",
      })) as RawServerAuthorizationList;

      return (response.items ?? []).map((item) =>
        this.mapServerAuthorization(item),
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ServerAuthorization CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list ServerAuthorizations in ${namespace}: ${message}`,
      );
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // AuthorizationPolicy
  // ---------------------------------------------------------------------------

  /**
   * Lists Linkerd AuthorizationPolicy resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of AuthorizationPolicy objects; empty on error or missing CRD
   */
  async listAuthorizationPolicies(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<LinkerdAuthorizationPolicy[]> {
    const api = this.getCustomObjectsApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty AuthorizationPolicy list",
      );
      return [];
    }
    try {
      const response = (await api.listNamespacedCustomObject({
        group: LINKERD_POLICY_GROUP,
        version: LINKERD_POLICY_AUTH_POLICY_VERSION,
        namespace,
        plural: "authorizationpolicies",
      })) as RawAuthorizationPolicyList;

      return (response.items ?? []).map((item) =>
        this.mapAuthorizationPolicy(item),
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "AuthorizationPolicy CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list AuthorizationPolicies in ${namespace}: ${message}`,
      );
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // ServiceProfile
  // ---------------------------------------------------------------------------

  /**
   * Lists Linkerd ServiceProfile resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of ServiceProfile objects; empty on error or missing CRD
   */
  async listServiceProfiles(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<LinkerdServiceProfile[]> {
    const api = this.getCustomObjectsApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty ServiceProfile list",
      );
      return [];
    }
    try {
      const response = (await api.listNamespacedCustomObject({
        group: LINKERD_PROFILE_GROUP,
        version: LINKERD_PROFILE_VERSION,
        namespace,
        plural: "serviceprofiles",
      })) as RawServiceProfileList;

      return (response.items ?? []).map((item) => this.mapServiceProfile(item));
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "ServiceProfile CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list ServiceProfiles in ${namespace}: ${message}`,
      );
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Topology (delegated to metrics)
  // ---------------------------------------------------------------------------

  /**
   * Builds a service dependency graph by querying Prometheus Linkerd metrics.
   * Edges are derived from request_total{dst_deployment!=""} label pairs.
   * The actual Prometheus query is delegated to LinkerdMetricsService; this
   * method serves as the service-layer entry point for the controller.
   *
   * This method is intentionally kept minimal — the topology query logic lives
   * in LinkerdMetricsService to keep Prometheus concerns co-located.
   *
   * @returns Empty array (topology is fully handled by LinkerdMetricsService)
   */
  buildTopologyPlaceholder(): LinkerdTopologyEdge[] {
    return [];
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private mapServerAuthorization(
    raw: RawServerAuthorization,
  ): LinkerdServerAuthorization {
    const serverName = raw.spec?.server?.name ?? "";
    const meshTLS = raw.spec?.client?.meshTLS;
    const clients: string[] = [];

    if (raw.spec?.client?.unauthenticated) {
      clients.push("unauthenticated");
    }
    if (meshTLS) {
      for (const sa of meshTLS.serviceAccounts ?? []) {
        const ns = sa.namespace ? `${sa.namespace}/` : "";
        clients.push(`${ns}${sa.name ?? "unknown"}`);
      }
    }
    if (clients.length === 0) {
      clients.push("meshTLS");
    }

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      server: serverName,
      clients,
    };
  }

  private mapAuthorizationPolicy(
    raw: RawAuthorizationPolicy,
  ): LinkerdAuthorizationPolicy {
    const targetRef = {
      kind: raw.spec?.targetRef?.kind ?? "unknown",
      name: raw.spec?.targetRef?.name ?? "unknown",
    };
    const requiredAuthenticationRefs = (
      raw.spec?.requiredAuthenticationRefs ?? []
    ).map((ref) => ({
      name: ref.name ?? "unknown",
      kind: ref.kind ?? "unknown",
    }));

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      targetRef,
      requiredAuthenticationRefs,
    };
  }

  private mapServiceProfile(raw: RawServiceProfile): LinkerdServiceProfile {
    const routes: LinkerdServiceProfileRoute[] = (raw.spec?.routes ?? []).map(
      (r) => {
        const route: LinkerdServiceProfileRoute = {
          name: r.name ?? "unnamed",
          isRetryable: r.isRetryable ?? false,
        };
        if (r.condition) {
          route.condition = {
            pathRegex: r.condition.pathRegex,
            method: r.condition.method,
          };
        }
        if (r.timeout) {
          route.timeout = r.timeout;
        }
        return route;
      },
    );

    const result: LinkerdServiceProfile = {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      routes,
    };

    const rb = raw.spec?.retryBudget;
    if (rb) {
      result.retryBudget = {
        retryRatio: rb.retryRatio ?? 0.2,
        minRetriesPerSecond: rb.minRetriesPerSecond ?? 10,
        ttl: rb.ttl ?? "10s",
      };
    }

    return result;
  }
}
