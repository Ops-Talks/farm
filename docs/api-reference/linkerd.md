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
  "linkerdEnabled": true,
  "controlPlaneReady": true,
  "version": "stable-2.14.0"
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
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

### Response (200)

```json
[
  {
    "name": "allow-monitoring",
    "namespace": "payments",
    "server": "payments-server",
    "client": {
      "meshTLS": {
        "serviceAccounts": [
          { "name": "prometheus", "namespace": "monitoring" }
        ]
      }
    },
    "createdAt": "2025-01-15T10:00:00Z"
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
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

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
    ],
    "createdAt": "2025-01-15T10:00:00Z"
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
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

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
    ],
    "createdAt": "2025-01-15T10:00:00Z"
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

The RPS and error-rate endpoints return the same shape:

```json
{
  "metric": "rps",
  "deployment": "payment-service",
  "namespace": "payments",
  "timeseries": [
    { "timestamp": 1700000000, "value": 12.4 },
    { "timestamp": 1700000060, "value": 13.1 }
  ]
}
```

The latency endpoint returns three separate percentile series:

```json
{
  "metric": "latency",
  "deployment": "payment-service",
  "namespace": "payments",
  "p50": [
    { "timestamp": 1700000000, "value": 4.2 }
  ],
  "p95": [
    { "timestamp": 1700000000, "value": 18.7 }
  ],
  "p99": [
    { "timestamp": 1700000000, "value": 45.3 }
  ]
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
  { "source": "frontend", "destination": "payment-service", "rps": 14.2 },
  { "source": "payment-service", "destination": "database", "rps": 8.7 }
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
