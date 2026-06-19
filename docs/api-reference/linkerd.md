# Linkerd API

The Linkerd API provides endpoints for detecting Linkerd 2.x installation, reading service mesh security resources (ServerAuthorizations, AuthorizationPolicies, ServiceProfiles), fetching traffic metrics from Prometheus, and surfacing the service dependency topology graph.

## Base Path

`/api/v1/linkerd`

## Prerequisites

- `KUBECONFIG_PATH` must point to a valid kubeconfig with permissions to read Linkerd CRDs (`policy.linkerd.io`, `linkerd.io`)
- For metrics endpoints: `PROMETHEUS_URL` must be set to a Prometheus instance scraping Linkerd telemetry
- All endpoints require JWT authentication

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/linkerd/status` | Linkerd installation status and control plane readiness | JWT |
| `GET` | `/api/v1/linkerd/server-authorizations` | List ServerAuthorization resources in a namespace | JWT |
| `GET` | `/api/v1/linkerd/authorization-policies` | List AuthorizationPolicy resources in a namespace | JWT |
| `GET` | `/api/v1/linkerd/service-profiles` | List ServiceProfile resources with route rules | JWT |
| `GET` | `/api/v1/linkerd/metrics/rps` | Inbound RPS timeseries for a deployment | JWT |
| `GET` | `/api/v1/linkerd/metrics/error-rate` | Failure rate timeseries for a deployment | JWT |
| `GET` | `/api/v1/linkerd/metrics/latency` | P50/P95/P99 latency percentiles timeseries | JWT |
| `GET` | `/api/v1/linkerd/topology` | Service dependency graph (directed topology edges) | JWT |
| `GET` | `/api/v1/linkerd/available` | Check if Linkerd is installed in the cluster | JWT |

---

## Check Linkerd Status

```http
GET /api/v1/linkerd/status
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `kubeconfig` | string | No | Inline kubeconfig YAML (including a multi-line string) or a kubeconfig file path. Falls back to `KUBECONFIG_PATH` if omitted. |

### Response (200)

```json
{
  "installed": true,
  "components": [
    { "name": "linkerd-controller", "ready": true, "version": "stable-2.14.0" },
    { "name": "linkerd-identity", "ready": true, "version": "stable-2.14.0" },
    { "name": "linkerd-proxy-injector", "ready": true }
  ]
}
```

---

## List ServerAuthorizations

```http
GET /api/v1/linkerd/server-authorizations?namespace=default
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace to query |
| `kubeconfig` | string | No | Inline kubeconfig YAML or kubeconfig file path. Falls back to `KUBECONFIG_PATH` if omitted. |

### Response (200)

```json
[
  {
    "name": "allow-monitoring",
    "namespace": "payments",
    "server": "payments-server",
    "clients": ["prometheus/monitoring", "frontend/default"]
  }
]
```

---

## List AuthorizationPolicies

```http
GET /api/v1/linkerd/authorization-policies?namespace=default
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace to query |
| `kubeconfig` | string | No | Inline kubeconfig YAML or kubeconfig file path. Falls back to `KUBECONFIG_PATH` if omitted. |

### Response (200)

```json
[
  {
    "name": "allow-frontend",
    "namespace": "payments",
    "targetRef": {
      "kind": "Server",
      "name": "payments-server"
    },
    "requiredAuthenticationRefs": [
      { "kind": "MeshTLSAuthentication", "name": "frontend-mtls" }
    ]
  }
]
```

---

## List ServiceProfiles

```http
GET /api/v1/linkerd/service-profiles?namespace=default
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace to query |
| `kubeconfig` | string | No | Inline kubeconfig YAML or kubeconfig file path. Falls back to `KUBECONFIG_PATH` if omitted. |

### Response (200)

```json
[
  {
    "name": "payment-service.payments.svc.cluster.local",
    "namespace": "payments",
    "routes": [
      {
        "name": "POST /charge",
        "condition": { "method": "POST", "pathRegex": "/charge" },
        "isRetryable": false,
        "timeout": "10s"
      }
    ]
  }
]
```

---

## Traffic Metrics

All metrics endpoints share the following query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deployment` | string | Yes | Deployment name to filter Linkerd metrics |
| `namespace` | string | Yes | Kubernetes namespace |
| `range` | string | No | Time range string, e.g. `1h`, `30m`, `24h` (default: `5m`) |

### Inbound RPS

```http
GET /api/v1/linkerd/metrics/rps?deployment=payment-service&namespace=payments
Authorization: Bearer <token>
```

### Failure Rate

```http
GET /api/v1/linkerd/metrics/error-rate?deployment=payment-service&namespace=payments
Authorization: Bearer <token>
```

### P50 / P95 / P99 Latency

```http
GET /api/v1/linkerd/metrics/latency?deployment=payment-service&namespace=payments
Authorization: Bearer <token>
```

### Metrics Response (200)

The RPS and error-rate endpoints return the same shape (`PrometheusRangeResult`):

```json
{
  "query": "sum(rate(response_total{deployment=\"payment-service\",namespace=\"payments\"}[5m]))",
  "timeseries": [
    {
      "metric": { "deployment": "payment-service", "namespace": "payments" },
      "values": [[1700000000, "12.4"], [1700000060, "13.1"]]
    }
  ]
}
```

The latency endpoint returns three `PrometheusRangeResult` objects keyed by percentile:

```json
{
  "p50": {
    "query": "histogram_quantile(0.5, ...)",
    "timeseries": [
      {
        "metric": { "deployment": "payment-service", "namespace": "payments" },
        "values": [[1700000000, "4.2"]]
      }
    ]
  },
  "p95": {
    "query": "histogram_quantile(0.95, ...)",
    "timeseries": [
      {
        "metric": { "deployment": "payment-service", "namespace": "payments" },
        "values": [[1700000000, "18.7"]]
      }
    ]
  },
  "p99": {
    "query": "histogram_quantile(0.99, ...)",
    "timeseries": [
      {
        "metric": { "deployment": "payment-service", "namespace": "payments" },
        "values": [[1700000000, "45.3"]]
      }
    ]
  }
}
```

---

## Service Topology

Returns the directed service dependency graph derived from Linkerd telemetry data.

```http
GET /api/v1/linkerd/topology
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `range` | string | No | Lookback window for topology data (default: `5m`) |

### Response (200)

```json
[
  { "source": "frontend", "destination": "payment-service", "namespace": "payments", "rps": 14.2 },
  { "source": "payment-service", "destination": "database", "namespace": "payments" }
]
```

---

## Check Availability

```http
GET /api/v1/linkerd/available
Authorization: Bearer <token>
```

### Response (200)

```json
{ "available": true }
```

When Linkerd is not installed:

```json
{ "available": false, "reason": "Linkerd control plane not found in cluster" }
```

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `KUBECONFIG_PATH` | Yes | Path to kubeconfig file for cluster access |
| `PROMETHEUS_URL` | Yes (metrics) | Base URL of Prometheus instance scraping Linkerd metrics |

---

## Error Responses

| Status | Cause |
|--------|-------|
| 400 | Missing required query parameters |
| 401 | Missing or invalid JWT token |
| 503 | Kubernetes cluster or Prometheus unreachable |


