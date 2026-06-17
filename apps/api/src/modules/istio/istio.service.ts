import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import {
  IstioAuthorizationPolicy,
  IstioPeerAuthentication,
  IstioTopologyEdge,
  IstioVirtualService,
  MtlsMode,
  AuthorizationAction,
  RawAuthorizationPolicy,
  RawAuthorizationPolicyList,
  RawPeerAuthentication,
  RawPeerAuthenticationList,
  RawVirtualService,
  RawVirtualServiceList,
  IstioAuthorizationRule,
} from "./interfaces/istio.interfaces";

/** Istio API group for networking resources. */
const ISTIO_NETWORKING_GROUP = "networking.istio.io";
/** API version used for VirtualService, DestinationRule, etc. */
const ISTIO_NETWORKING_VERSION = "v1alpha3";
/** API group for security resources. */
const ISTIO_SECURITY_GROUP = "security.istio.io";
/** API version used for PeerAuthentication and AuthorizationPolicy. */
const ISTIO_SECURITY_VERSION = "v1beta1";

/**
 * Service that integrates with Istio service mesh custom resources via the
 * Kubernetes CustomObjectsApi.
 *
 * All public methods accept an optional `kubeconfig` string (YAML content or
 * file path) to target a specific cluster. When omitted the shared client from
 * KubernetesService is used. Every method degrades gracefully when:
 * - The Kubernetes client is not configured (returns empty / false).
 * - The Istio CRDs are not installed (HTTP 404 => returns empty / false).
 */
@Injectable()
export class IstioService {
  private readonly logger = new Logger(IstioService.name);

  constructor(private readonly kubernetesService: KubernetesService) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalizes a kubeconfig parameter that may arrive as a string array due to
   * HTTP query parameter tampering (e.g. ?kubeconfig=a&kubeconfig=b). Returns
   * the first element when given an array, the string itself when already a
   * string, or undefined when the value is absent.
   *
   * @param kubeconfig - Raw query parameter value
   * @returns Single normalized string, or undefined
   */
  private normalizeKubeconfigInput(
    kubeconfig?: string | string[],
  ): string | undefined {
    if (kubeconfig === undefined) return undefined;
    if (Array.isArray(kubeconfig)) {
      this.logger.warn(
        "Received array value for kubeconfig parameter; using first element",
      );
      const first = kubeconfig[0];
      if (typeof first !== "string" || first.length === 0) {
        throw new BadRequestException("Invalid kubeconfig parameter");
      }
      return first;
    }
    if (typeof kubeconfig !== "string") {
      throw new BadRequestException("Invalid kubeconfig parameter");
    }
    return kubeconfig;
  }

  /**
   * Resolves a CustomObjectsApi client from an optional inline kubeconfig
   * string or file path. Falls back to the shared KubernetesService client
   * when no kubeconfig is provided.
   *
   * @param kubeconfig - Optional YAML kubeconfig content, file path, or array
   * @returns Configured CustomObjectsApi instance, or null when unavailable
   */
  private getApi(kubeconfig?: string | string[]): k8s.CustomObjectsApi | null {
    const normalized = this.normalizeKubeconfigInput(kubeconfig);
    if (!normalized) {
      return this.kubernetesService.getCustomObjectsApi();
    }

    try {
      const kc = new k8s.KubeConfig();
      // Treat value as file path first; fall back to inline YAML content.
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
   * Returns true when an error represents a "not found" response from the
   * Kubernetes API (HTTP 404), which means the CRD is not installed.
   */
  private isNotFound(error: unknown): boolean {
    const status = (error as { response?: { statusCode?: number } })?.response
      ?.statusCode;
    return status === 404;
  }

  // ---------------------------------------------------------------------------
  // Istio availability check
  // ---------------------------------------------------------------------------

  /**
   * Checks whether Istio is installed in the target cluster by attempting to
   * list VirtualService resources. A successful (even empty) response confirms
   * the `networking.istio.io/v1alpha3` API group is registered. A 404
   * response means Istio is not installed.
   *
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns true when Istio is installed and reachable
   */
  async isIstioEnabled(kubeconfig?: string | string[]): Promise<boolean> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      this.logger.debug("No Kubernetes client available; Istio disabled");
      return false;
    }

    try {
      await api.listClusterCustomObject({
        group: ISTIO_NETWORKING_GROUP,
        version: ISTIO_NETWORKING_VERSION,
        plural: "virtualservices",
      });
      return true;
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "networking.istio.io/v1alpha3 CRD group not found; Istio is not installed",
        );
        return false;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Istio enabled check failed: ${message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // VirtualService methods
  // ---------------------------------------------------------------------------

  /**
   * Lists all VirtualService resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of mapped VirtualService objects; empty on error or missing CRD
   */
  async getVirtualServices(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<IstioVirtualService[]> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty VS list",
      );
      return [];
    }

    try {
      const response = (await api.listNamespacedCustomObject({
        group: ISTIO_NETWORKING_GROUP,
        version: ISTIO_NETWORKING_VERSION,
        namespace,
        plural: "virtualservices",
      })) as RawVirtualServiceList;

      return (response.items ?? []).map((item) => this.mapVirtualService(item));
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "VirtualService CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list VirtualServices in ${namespace}: ${message}`,
      );
      return [];
    }
  }

  /**
   * Retrieves a single VirtualService by namespace and name.
   *
   * @param namespace - Kubernetes namespace
   * @param name - VirtualService resource name
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Mapped VirtualService; throws NotFoundException when not found
   */
  async getVirtualService(
    namespace: string,
    name: string,
    kubeconfig?: string | string[],
  ): Promise<IstioVirtualService> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      throw new Error("Kubernetes client not available");
    }

    const raw = (await api.getNamespacedCustomObject({
      group: ISTIO_NETWORKING_GROUP,
      version: ISTIO_NETWORKING_VERSION,
      namespace,
      plural: "virtualservices",
      name,
    })) as RawVirtualService;

    return this.mapVirtualService(raw);
  }

  /**
   * Patches the route weights in the first HTTP route rule of a VirtualService.
   * Requires ADMIN role — enforced at the controller layer.
   *
   * @param namespace - Kubernetes namespace
   * @param name - VirtualService resource name
   * @param weights - Ordered list of destination/weight pairs
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   */
  async patchVirtualServiceWeights(
    namespace: string,
    name: string,
    weights: { destination: string; weight: number }[],
    kubeconfig?: string | string[],
  ): Promise<void> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      throw new Error("Kubernetes client not available");
    }

    // Retrieve the current VS to preserve all other fields.
    const current = (await api.getNamespacedCustomObject({
      group: ISTIO_NETWORKING_GROUP,
      version: ISTIO_NETWORKING_VERSION,
      namespace,
      plural: "virtualservices",
      name,
    })) as RawVirtualService;

    const httpRoutes = current.spec?.http ?? [];
    if (httpRoutes.length === 0) {
      throw new Error(
        `VirtualService ${namespace}/${name} has no HTTP routes to patch`,
      );
    }

    // Build new route entries preserving existing destination metadata.
    const existingRoutes = httpRoutes[0].route ?? [];
    const patchedRoutes = weights.map((w) => {
      const existing = existingRoutes.find(
        (r) => r.destination?.host === w.destination,
      );
      return {
        destination: existing?.destination ?? { host: w.destination },
        weight: w.weight,
      };
    });

    const patchBody = {
      spec: {
        http: [
          {
            ...httpRoutes[0],
            route: patchedRoutes,
          },
          ...httpRoutes.slice(1),
        ],
      },
    };

    await api.patchNamespacedCustomObject({
      group: ISTIO_NETWORKING_GROUP,
      version: ISTIO_NETWORKING_VERSION,
      namespace,
      plural: "virtualservices",
      name,
      body: patchBody,
    });

    this.logger.log(
      `Patched VirtualService ${namespace}/${name} weights: ${JSON.stringify(weights)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // PeerAuthentication methods
  // ---------------------------------------------------------------------------

  /**
   * Lists all PeerAuthentication resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of mapped PeerAuthentication objects; empty on error
   */
  async getPeerAuthentications(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<IstioPeerAuthentication[]> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty PeerAuthentication list",
      );
      return [];
    }

    try {
      const response = (await api.listNamespacedCustomObject({
        group: ISTIO_SECURITY_GROUP,
        version: ISTIO_SECURITY_VERSION,
        namespace,
        plural: "peerauthentications",
      })) as RawPeerAuthenticationList;

      return (response.items ?? []).map((item) =>
        this.mapPeerAuthentication(item),
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "PeerAuthentication CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list PeerAuthentications in ${namespace}: ${message}`,
      );
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // AuthorizationPolicy methods
  // ---------------------------------------------------------------------------

  /**
   * Lists all AuthorizationPolicy resources in the given namespace.
   * Each policy is annotated with a `hasNoRules` security warning flag when
   * the policy is of type ALLOW but defines no rules.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of mapped AuthorizationPolicy objects; empty on error
   */
  async getAuthorizationPolicies(
    namespace: string,
    kubeconfig?: string | string[],
  ): Promise<IstioAuthorizationPolicy[]> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty AuthorizationPolicy list",
      );
      return [];
    }

    try {
      const response = (await api.listNamespacedCustomObject({
        group: ISTIO_SECURITY_GROUP,
        version: ISTIO_SECURITY_VERSION,
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
  // Topology
  // ---------------------------------------------------------------------------

  /**
   * Builds a service dependency graph by parsing VirtualService route
   * destinations across all namespaces visible to the cluster client.
   * Each VS host-to-destination combination produces a directed topology edge.
   *
   * @param _orgId - Organization identifier (reserved for future multi-tenant scoping)
   * @param kubeconfig - Optional kubeconfig YAML content or file path
   * @returns Array of directed topology edges derived from VS routing rules
   */
  async buildTopology(
    _orgId: string,
    kubeconfig?: string | string[],
  ): Promise<IstioTopologyEdge[]> {
    const api = this.getApi(kubeconfig);
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty topology",
      );
      return [];
    }

    try {
      const response = (await api.listClusterCustomObject({
        group: ISTIO_NETWORKING_GROUP,
        version: ISTIO_NETWORKING_VERSION,
        plural: "virtualservices",
      })) as RawVirtualServiceList;

      const edges: IstioTopologyEdge[] = [];

      for (const vs of response.items ?? []) {
        const namespace = vs.metadata?.namespace ?? "default";
        const sources = vs.spec?.hosts ?? [];
        const httpRoutes = vs.spec?.http ?? [];

        for (const source of sources) {
          for (const httpRoute of httpRoutes) {
            for (const routeDest of httpRoute.route ?? []) {
              const dest = routeDest.destination?.host;
              if (dest) {
                edges.push({
                  source,
                  destination: dest,
                  weight: routeDest.weight ?? 100,
                  namespace,
                });
              }
            }
          }
        }
      }

      return edges;
    } catch (error) {
      if (this.isNotFound(error)) {
        this.logger.debug(
          "VirtualService CRD not installed; returning empty topology",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to build Istio topology: ${message}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  /**
   * Maps a raw Kubernetes VirtualService API object to the typed
   * IstioVirtualService shape.
   *
   * @param raw - Raw VirtualService object from the Kubernetes API
   * @returns Typed IstioVirtualService
   */
  private mapVirtualService(raw: RawVirtualService): IstioVirtualService {
    const httpRoutes = (raw.spec?.http ?? []).map((httpRoute) => ({
      name: httpRoute.name,
      route: (httpRoute.route ?? []).map((r) => ({
        destination: r.destination?.host ?? "",
        weight: r.weight ?? 100,
        subset: r.destination?.subset,
        port: r.destination?.port?.number,
      })),
    }));

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      hosts: raw.spec?.hosts ?? [],
      gateways: raw.spec?.gateways ?? [],
      http: httpRoutes,
      labels: (raw.metadata?.labels as Record<string, string>) ?? {},
    };
  }

  /**
   * Maps a raw Kubernetes PeerAuthentication API object to the typed
   * IstioPeerAuthentication shape.
   *
   * @param raw - Raw PeerAuthentication object from the Kubernetes API
   * @returns Typed IstioPeerAuthentication
   */
  private mapPeerAuthentication(
    raw: RawPeerAuthentication,
  ): IstioPeerAuthentication {
    const rawMode = raw.spec?.mtls?.mode ?? "UNSET";
    const validModes: MtlsMode[] = ["UNSET", "DISABLE", "PERMISSIVE", "STRICT"];
    const mtlsMode: MtlsMode = validModes.includes(rawMode as MtlsMode)
      ? (rawMode as MtlsMode)
      : "UNSET";

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      selector: raw.spec?.selector?.matchLabels ?? {},
      mtlsMode,
    };
  }

  /**
   * Maps a raw Kubernetes AuthorizationPolicy API object to the typed
   * IstioAuthorizationPolicy shape.
   *
   * @param raw - Raw AuthorizationPolicy object from the Kubernetes API
   * @returns Typed IstioAuthorizationPolicy
   */
  private mapAuthorizationPolicy(
    raw: RawAuthorizationPolicy,
  ): IstioAuthorizationPolicy {
    const rawAction = raw.spec?.action ?? "ALLOW";
    const validActions: AuthorizationAction[] = [
      "ALLOW",
      "DENY",
      "AUDIT",
      "CUSTOM",
    ];
    const action: AuthorizationAction = validActions.includes(
      rawAction as AuthorizationAction,
    )
      ? (rawAction as AuthorizationAction)
      : "ALLOW";

    const rules: IstioAuthorizationRule[] = (raw.spec?.rules ?? []).map(
      (rule) => {
        const from = rule.from ?? [];
        const to = rule.to ?? [];
        const principals = from.flatMap((f) => f.source?.principals ?? []);
        const namespaces = from.flatMap((f) => f.source?.namespaces ?? []);
        const methods = to.flatMap((t) => t.operation?.methods ?? []);
        const paths = to.flatMap((t) => t.operation?.paths ?? []);

        return {
          principals: principals.length ? principals : undefined,
          namespaces: namespaces.length ? namespaces : undefined,
          methods: methods.length ? methods : undefined,
          paths: paths.length ? paths : undefined,
        };
      },
    );

    return {
      name: raw.metadata?.name ?? "unknown",
      namespace: raw.metadata?.namespace ?? "default",
      selector: raw.spec?.selector?.matchLabels ?? {},
      action,
      rules,
      hasNoRules: action === "ALLOW" && rules.length === 0,
    };
  }
}
