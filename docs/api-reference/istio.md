# Istio API

The Istio API provides endpoints for detecting Istio installation, reading service mesh resources (VirtualServices, PeerAuthentications, AuthorizationPolicies), applying traffic weight changes, and fetching Istio telemetry metrics from Prometheus.

## Base Path

`/api/v1/istio`

## Prerequisites

- `KUBECONFIG_PATH` must point to a valid kubeconfig with permissions to read Istio CRDs (`networking.istio.io`, `security.istio.io`)
- For metrics endpoints: `PROMETHEUS_URL` must be set to a Prometheus instance scraping Istio telemetry
- All endpoints require JWT authentication

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/istio/status` | Check if Istio is installed | JWT |
| `GET` | `/api/v1/istio/virtual-services` | List VirtualServices in a namespace | JWT |
| `GET` | `/api/v1/istio/virtual-services/:namespace/:name` | Get a specific VirtualService | JWT |
| `PATCH` | `/api/v1/istio/virtual-services/:namespace/:name/weights` | Update traffic weights | JWT + Admin |
| `GET` | `/api/v1/istio/peer-authentications` | List PeerAuthentication policies | JWT |
| `GET` | `/api/v1/istio/authorization-policies` | List AuthorizationPolicy resources | JWT |
| `GET` | `/api/v1/istio/metrics/rps` | Get requests-per-second timeseries | JWT |
| `GET` | `/api/v1/istio/metrics/error-rate` | Get error rate timeseries | JWT |
| `GET` | `/api/v1/istio/metrics/latency` | Get P99 latency timeseries | JWT |
| `GET` | `/api/v1/istio/topology` | Get service dependency topology | JWT |

---

## Check Istio Status

```http
GET /api/v1/istio/status
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `kubeconfig` | string | No | Base64-encoded kubeconfig. Falls back to `KUBECONFIG_PATH` if omitted. |

### Response (200)

```json
{ "istioEnabled": true }
```

---

## List VirtualServices

```http
GET /api/v1/istio/virtual-services?namespace=default
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
    "name": "payment-service",
    "namespace": "payments",
    "hosts": ["payment-service"],
    "http": [
      {
        "route": [
          { "destination": { "host": "payment-service", "subset": "stable" }, "weight": 90 },
          { "destination": { "host": "payment-service", "subset": "canary" }, "weight": 10 }
        ]
      }
    ]
  }
]
```

---

## Get VirtualService

```http
GET /api/v1/istio/virtual-services/:namespace/:name
Authorization: Bearer <token>
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `namespace` | Kubernetes namespace |
| `name` | VirtualService name |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

### Response (200)

Returns a single `IstioVirtualService` object (same shape as list items above).

---

## Patch Traffic Weights

Requires `admin` role.

```http
PATCH /api/v1/istio/virtual-services/:namespace/:name/weights
Authorization: Bearer <token>
Content-Type: application/json
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `namespace` | Kubernetes namespace |
| `name` | VirtualService name |

### Request Body

```json
{
  "weights": [
    { "destination": "stable", "weight": 80 },
    { "destination": "canary", "weight": 20 }
  ],
  "kubeconfig": "<optional base64 kubeconfig>"
}
```

Weights must be whole numbers between 0–100 and must sum to 100.

### Response (200)

Returns the updated `IstioVirtualService` object.

---

## List PeerAuthentications

```http
GET /api/v1/istio/peer-authentications?namespace=default
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace |
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

### Response (200)

```json
[
  {
    "name": "default",
    "namespace": "payments",
    "mtlsMode": "STRICT",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

`mtlsMode` values: `STRICT`, `PERMISSIVE`, `DISABLE`, `UNSET`.

---

## List AuthorizationPolicies

```http
GET /api/v1/istio/authorization-policies?namespace=default
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace |
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

### Response (200)

```json
[
  {
    "name": "allow-frontend",
    "namespace": "payments",
    "action": "ALLOW",
    "rules": [
      {
        "from": [{ "source": { "principals": ["cluster.local/ns/frontend/sa/frontend"] } }]
      }
    ],
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

---

## Traffic Metrics

All metrics endpoints share the same query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service` | string | Yes | Service name to filter Istio metrics |
| `namespace` | string | Yes | Kubernetes namespace |
| `range` | string | No | Time range string, e.g. `1h`, `30m`, `24h` (default: `1h`) |

### Requests Per Second

```http
GET /api/v1/istio/metrics/rps?service=payment-service&namespace=payments
Authorization: Bearer <token>
```

### Error Rate

```http
GET /api/v1/istio/metrics/error-rate?service=payment-service&namespace=payments
Authorization: Bearer <token>
```

### P99 Latency

```http
GET /api/v1/istio/metrics/latency?service=payment-service&namespace=payments
Authorization: Bearer <token>
```

### Metrics Response (200)

All three endpoints return the same shape:

```json
{
  "metric": "rps",
  "service": "payment-service",
  "namespace": "payments",
  "timeseries": [
    { "timestamp": 1700000000, "value": 12.4 },
    { "timestamp": 1700000060, "value": 13.1 }
  ]
}
```

---

## Service Topology

```http
GET /api/v1/istio/topology?namespace=payments
Authorization: Bearer <token>
```

Returns the service dependency graph derived from Istio VirtualService routes.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Kubernetes namespace |
| `kubeconfig` | string | No | Base64-encoded kubeconfig override |

### Response (200)

```json
[
  { "source": "frontend", "destination": "payment-service", "weight": 100 },
  { "source": "payment-service", "destination": "database", "weight": 100 }
]
```

---

## Error Responses

| Status | Cause |
|--------|-------|
| 400 | Missing required query parameters or invalid weight values |
| 401 | Missing or invalid JWT token |
| 403 | Admin role required (weight patch endpoint) |
| 503 | Kubernetes cluster or Prometheus unreachable |


