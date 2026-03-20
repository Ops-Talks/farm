/**
 * Shared TypeScript interfaces for Istio custom resources and derived data
 * structures used across IstioService, IstioMetricsService, and
 * IstioController.
 */

// ---------------------------------------------------------------------------
// VirtualService
// ---------------------------------------------------------------------------

/**
 * A single weighted route destination inside an Istio VirtualService HTTP
 * route rule.
 */
export interface IstioRouteDestination {
  /** Target service host name (Kubernetes service name or FQDN). */
  destination: string;
  /** Traffic weight (0-100). */
  weight: number;
  /** Optional destination subset (e.g. stable/canary label). */
  subset?: string;
  /** Optional destination port. */
  port?: number;
}

/**
 * An HTTP route rule inside a VirtualService; may carry multiple weighted
 * destinations (canary split).
 */
export interface IstioHttpRoute {
  /** Optional name for the route rule. */
  name?: string;
  /** Weighted destinations for this route rule. */
  route: IstioRouteDestination[];
}

/**
 * Istio VirtualService custom resource, as returned by this API.
 */
export interface IstioVirtualService {
  /** Resource name. */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** List of host names this VirtualService applies to. */
  hosts: string[];
  /** List of Istio gateways the resource is bound to. */
  gateways: string[];
  /** Parsed HTTP route rules with weighted destinations. */
  http: IstioHttpRoute[];
  /** Raw resource metadata labels. */
  labels: Record<string, string>;
}

// ---------------------------------------------------------------------------
// PeerAuthentication
// ---------------------------------------------------------------------------

/**
 * mTLS mode values supported by Istio PeerAuthentication.
 */
export type MtlsMode = "UNSET" | "DISABLE" | "PERMISSIVE" | "STRICT";

/**
 * Istio PeerAuthentication custom resource.
 */
export interface IstioPeerAuthentication {
  /** Resource name. */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** Workload selector labels; empty means namespace-wide or mesh-wide policy. */
  selector: Record<string, string>;
  /** mTLS mode configured for the matched workloads. */
  mtlsMode: MtlsMode;
}

// ---------------------------------------------------------------------------
// AuthorizationPolicy
// ---------------------------------------------------------------------------

/**
 * The action taken when a request matches the policy rules.
 */
export type AuthorizationAction = "ALLOW" | "DENY" | "AUDIT" | "CUSTOM";

/**
 * A single rule inside an Istio AuthorizationPolicy.
 */
export interface IstioAuthorizationRule {
  /** Source principals allowed (SPIFFE URIs or service account patterns). */
  principals?: string[];
  /** Namespace sources allowed. */
  namespaces?: string[];
  /** HTTP method constraints. */
  methods?: string[];
  /** HTTP path constraints. */
  paths?: string[];
}

/**
 * Istio AuthorizationPolicy custom resource.
 */
export interface IstioAuthorizationPolicy {
  /** Resource name. */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** Workload selector labels; empty means namespace-wide policy. */
  selector: Record<string, string>;
  /** Policy action. */
  action: AuthorizationAction;
  /** Rules that trigger the action. */
  rules: IstioAuthorizationRule[];
  /**
   * Security warning flag set to true when no rules are defined on an ALLOW
   * policy (effectively allows all traffic without restriction).
   */
  hasNoRules: boolean;
}

// ---------------------------------------------------------------------------
// Topology
// ---------------------------------------------------------------------------

/**
 * A directed service dependency edge derived from VirtualService routing
 * configuration.
 */
export interface IstioTopologyEdge {
  /** Source service host name (the VS hosts entry). */
  source: string;
  /** Destination service host name. */
  destination: string;
  /** Traffic weight percentage assigned to this edge (0-100). */
  weight: number;
  /** Kubernetes namespace of the VirtualService that defines this edge. */
  namespace: string;
}

// ---------------------------------------------------------------------------
// Prometheus / Metrics
// ---------------------------------------------------------------------------

/**
 * A single data point in a Prometheus range query result: [unixTimestamp, value].
 */
export type PrometheusDataPoint = [number, string];

/**
 * A single timeseries in a Prometheus range query response.
 */
export interface PrometheusTimeseries {
  /** Metric labels map from the Prometheus response. */
  metric: Record<string, string>;
  /** Sequence of [timestamp, value] pairs. */
  values: PrometheusDataPoint[];
}

/**
 * The parsed result of a Prometheus range query.
 */
export interface PrometheusRangeResult {
  /** Timeseries returned by the query. */
  timeseries: PrometheusTimeseries[];
  /** The PromQL expression that was executed. */
  query: string;
}

/**
 * Aggregated latency percentiles for a service, expressed in milliseconds.
 */
export interface IstioLatency {
  /** P50 latency in milliseconds. */
  p50: PrometheusRangeResult;
  /** P95 latency in milliseconds. */
  p95: PrometheusRangeResult;
  /** P99 latency in milliseconds. */
  p99: PrometheusRangeResult;
}

// ---------------------------------------------------------------------------
// Raw Kubernetes API shapes (internal use only)
// ---------------------------------------------------------------------------

/**
 * Minimal raw shape of an Istio VirtualService returned by the Kubernetes
 * CustomObjectsApi. Fields not consumed by this service are omitted.
 */
export interface RawVirtualService {
  metadata?: {
    name?: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec?: {
    hosts?: string[];
    gateways?: string[];
    http?: Array<{
      name?: string;
      route?: Array<{
        destination?: {
          host?: string;
          subset?: string;
          port?: { number?: number };
        };
        weight?: number;
      }>;
    }>;
  };
}

/** Raw list response for VirtualService resources. */
export interface RawVirtualServiceList {
  items?: RawVirtualService[];
  [key: string]: unknown;
}

/**
 * Minimal raw shape of an Istio PeerAuthentication.
 */
export interface RawPeerAuthentication {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    selector?: { matchLabels?: Record<string, string> };
    mtls?: { mode?: string };
  };
}

/** Raw list response for PeerAuthentication resources. */
export interface RawPeerAuthenticationList {
  items?: RawPeerAuthentication[];
  [key: string]: unknown;
}

/**
 * Minimal raw shape of an Istio AuthorizationPolicy.
 */
export interface RawAuthorizationPolicy {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    selector?: { matchLabels?: Record<string, string> };
    action?: string;
    rules?: Array<{
      from?: Array<{
        source?: { principals?: string[]; namespaces?: string[] };
      }>;
      to?: Array<{
        operation?: { methods?: string[]; paths?: string[] };
      }>;
    }>;
  };
}

/** Raw list response for AuthorizationPolicy resources. */
export interface RawAuthorizationPolicyList {
  items?: RawAuthorizationPolicy[];
  [key: string]: unknown;
}

/**
 * Raw Prometheus HTTP API response envelope.
 */
export interface PrometheusApiResponse {
  status: "success" | "error";
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values?: PrometheusDataPoint[];
      value?: PrometheusDataPoint;
    }>;
  };
  error?: string;
}
