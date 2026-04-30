/**
 * Shared TypeScript interfaces for Linkerd custom resources and derived data
 * structures used across LinkerdService, LinkerdMetricsService, and
 * LinkerdController.
 */

// ---------------------------------------------------------------------------
// Control plane status
// ---------------------------------------------------------------------------

/**
 * Status of a single Linkerd control plane component (Deployment).
 */
export interface LinkerdControlPlaneComponent {
  /** Deployment name (e.g. linkerd-controller, linkerd-identity). */
  name: string;
  /** True when at least one replica is ready. */
  ready: boolean;
  /** Container image version tag (if determinable from the deployment spec). */
  version?: string;
}

/**
 * Linkerd installation status returned by GET /linkerd/status.
 */
export interface LinkerdStatus {
  /** True when the Linkerd CRD group is present and reachable. */
  installed: boolean;
  /** Status of key control plane deployments (only populated when installed). */
  components: LinkerdControlPlaneComponent[];
}

// ---------------------------------------------------------------------------
// ServerAuthorization
// ---------------------------------------------------------------------------

/**
 * Linkerd ServerAuthorization policy resource (policy.linkerd.io/v1beta1).
 */
export interface LinkerdServerAuthorization {
  /** Resource name. */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** Name of the Server resource this authorization applies to. */
  server: string;
  /** Display strings for allowed clients (service account names or "unauthenticated"). */
  clients: string[];
}

// ---------------------------------------------------------------------------
// AuthorizationPolicy
// ---------------------------------------------------------------------------

/**
 * Linkerd AuthorizationPolicy resource (policy.linkerd.io/v1alpha1).
 */
export interface LinkerdAuthorizationPolicy {
  /** Resource name. */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** The resource this policy targets. */
  targetRef: { kind: string; name: string };
  /** Authentication refs required to satisfy this policy. */
  requiredAuthenticationRefs: Array<{ name: string; kind: string }>;
}

// ---------------------------------------------------------------------------
// ServiceProfile
// ---------------------------------------------------------------------------

/**
 * A single route rule defined in a Linkerd ServiceProfile.
 */
export interface LinkerdServiceProfileRoute {
  /** Route name (used for metrics labelling). */
  name: string;
  /** Optional request matching condition. */
  condition?: { pathRegex?: string; method?: string };
  /** Whether this route is eligible for automatic retries. */
  isRetryable: boolean;
  /** Per-route timeout (Go duration string, e.g. "250ms"). */
  timeout?: string;
}

/**
 * Retry budget for a ServiceProfile — controls the maximum fraction of
 * additional retries allowed above the original request rate.
 */
interface LinkerdRetryBudget {
  /** Maximum ratio of retries to original requests (e.g. 0.2 = 20 %). */
  retryRatio: number;
  /** Minimum number of retries per second regardless of ratio. */
  minRetriesPerSecond: number;
  /** TTL for the retry budget window (Go duration string). */
  ttl: string;
}

/**
 * Linkerd ServiceProfile resource (linkerd.io/v1alpha2).
 */
export interface LinkerdServiceProfile {
  /** Resource name (usually <service>.<namespace>.svc.cluster.local). */
  name: string;
  /** Kubernetes namespace. */
  namespace: string;
  /** Defined route rules. */
  routes: LinkerdServiceProfileRoute[];
  /** Optional retry budget. */
  retryBudget?: LinkerdRetryBudget;
}

// ---------------------------------------------------------------------------
// Topology
// ---------------------------------------------------------------------------

/**
 * A directed service dependency edge derived from Linkerd Prometheus traffic
 * metrics (request_total label pairs).
 */
export interface LinkerdTopologyEdge {
  /** Source deployment name. */
  source: string;
  /** Destination deployment name. */
  destination: string;
  /** Namespace of the source deployment. */
  namespace: string;
  /** Approximate requests-per-second on this edge. */
  rps?: number;
}

// ---------------------------------------------------------------------------
// Prometheus / Metrics (shared with Istio but re-declared here for independence)
// ---------------------------------------------------------------------------

/** A single Prometheus data point: [unixTimestamp, value]. */
type PrometheusDataPoint = [number, string];

/** A single Prometheus timeseries. */
export interface PrometheusTimeseries {
  metric: Record<string, string>;
  values: PrometheusDataPoint[];
}

/** Parsed result from a Prometheus range query. */
export interface PrometheusRangeResult {
  timeseries: PrometheusTimeseries[];
  query: string;
}

/** Aggregated latency percentiles for a Linkerd-proxied service. */
export interface LinkerdLatency {
  p50: PrometheusRangeResult;
  p95: PrometheusRangeResult;
  p99: PrometheusRangeResult;
}

// ---------------------------------------------------------------------------
// Raw Kubernetes API shapes (internal use only)
// ---------------------------------------------------------------------------

/** Raw Prometheus HTTP API response envelope. */
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

/** Minimal raw shape of a Linkerd ServerAuthorization. */
export interface RawServerAuthorization {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    server?: {
      name?: string;
      selector?: { matchLabels?: Record<string, string> };
    };
    client?: {
      meshTLS?: {
        serviceAccounts?: Array<{ name?: string; namespace?: string }>;
      };
      unauthenticated?: boolean;
    };
  };
}

/** Raw list response for ServerAuthorization resources. */
export interface RawServerAuthorizationList {
  items?: RawServerAuthorization[];
  [key: string]: unknown;
}

/** Minimal raw shape of a Linkerd AuthorizationPolicy (policy.linkerd.io/v1alpha1). */
export interface RawAuthorizationPolicy {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    targetRef?: { kind?: string; name?: string; group?: string };
    requiredAuthenticationRefs?: Array<{
      name?: string;
      kind?: string;
      group?: string;
    }>;
  };
}

/** Raw list response for AuthorizationPolicy resources. */
export interface RawAuthorizationPolicyList {
  items?: RawAuthorizationPolicy[];
  [key: string]: unknown;
}

/** Minimal raw shape of a Linkerd ServiceProfile. */
export interface RawServiceProfile {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    routes?: Array<{
      name?: string;
      condition?: { pathRegex?: string; method?: string };
      isRetryable?: boolean;
      timeout?: string;
    }>;
    retryBudget?: {
      retryRatio?: number;
      minRetriesPerSecond?: number;
      ttl?: string;
    };
  };
}

/** Raw list response for ServiceProfile resources. */
export interface RawServiceProfileList {
  items?: RawServiceProfile[];
  [key: string]: unknown;
}

/** Minimal raw Kubernetes Deployment shape. */
export interface RawDeployment {
  metadata?: { name?: string; labels?: Record<string, string> };
  spec?: {
    template?: {
      spec?: { containers?: Array<{ image?: string; name?: string }> };
    };
  };
  status?: { readyReplicas?: number; replicas?: number };
}

/** Raw list response for Deployment resources. */
export interface RawDeploymentList {
  items?: RawDeployment[];
  [key: string]: unknown;
}
