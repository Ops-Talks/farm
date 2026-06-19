# Linkerd Service Mesh Integration

Farm integrates with Linkerd 2.x to surface live traffic metrics, security posture, ServiceProfile route rules, and a service topology graph directly on each catalog component — without requiring users to switch to the Linkerd dashboard or kubectl.

## Overview

| Capability | Description |
|------------|-------------|
| Linkerd detection | Automatically detects whether Linkerd is installed in the connected cluster |
| Traffic metrics | Inbound RPS, failure rate, and P50/P95/P99 latency pulled from Prometheus/Linkerd telemetry |
| Security posture | ServerAuthorization and AuthorizationPolicy resources per namespace |
| ServiceProfile route rules | Route definitions, retry policies, and timeouts from ServiceProfile resources |
| Topology graph | Directed service dependency graph derived from Linkerd telemetry |
| Graceful degradation | All Linkerd tabs display an empty state when Linkerd is not installed or data is unavailable |

---

## Prerequisites

- A Kubernetes cluster with Linkerd 2.x installed (tested with Linkerd stable-2.14+)
- Prometheus scraping Linkerd telemetry metrics (`response_total`, `response_latency_ms_bucket`)
- `KUBECONFIG_PATH` pointing to a valid kubeconfig, or Farm running in-cluster with RBAC permissions to read Linkerd CRDs (`policy.linkerd.io`, `linkerd.io`)
- For traffic metrics: `PROMETHEUS_URL` environment variable set to the Prometheus base URL (e.g. `http://prometheus:9090`)

---

## Component Namespace

Linkerd resources are scoped by Kubernetes namespace. Farm reads the optional `namespace` field on each catalog component. If not set, it defaults to `default`.

Set the namespace in your `catalog-info.yaml`:

```yaml
metadata:
  name: payment-service
  namespace: payments
```

Or update it via the Farm API:

```http
PATCH /api/v1/catalog/components/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "namespace": "payments" }
```

---

## Traffic Metrics

The **Linkerd** tab on the component detail page shows live telemetry for the component deployment.

| Metric | Description |
|--------|-------------|
| Requests per Second | Inbound RPS to the deployment (`response_total`) |
| Failure Rate | Percentage of non-2xx responses |
| P50 Latency | Median request latency in milliseconds |
| P95 Latency | 95th percentile request latency in milliseconds |
| P99 Latency | 99th percentile request latency in milliseconds |

Each metric displays the latest value and a timeseries chart for the selected time range (default: last 5 minutes).

The tab is hidden and displays an empty state if Linkerd is not detected in the cluster.

---

## Security Posture

The **Security** tab shows the authorization configuration for the component's namespace.

### ServerAuthorizations

Lists all `ServerAuthorization` resources in the namespace. For each resource:

- Resource name and the Server it targets
- Allowed client identities (service accounts, mesh TLS principals)
- Creation timestamp

### AuthorizationPolicies

Lists all `AuthorizationPolicy` resources in the namespace. For each policy:

- Policy name and the target ref (`Server`, `HTTPRoute`, etc.)
- Required authentication references
- Creation timestamp

If no authorization resources are found, an empty state is shown prompting the user to configure mesh security.

---

## ServiceProfiles

The **ServiceProfiles** tab lists `ServiceProfile` resources in the component's namespace. ServiceProfiles define per-route behavior including:

- Route name and matching condition (method and path regex)
- Whether the route is retryable
- Per-route timeout

This view helps operators verify that route-level timeouts and retry policies are correctly defined for the service.

---

## Topology Graph

The **Topology** tab displays a directed service dependency graph built from Linkerd telemetry data. Each edge shows the calling service, the called service, and the observed inbound RPS.

The graph is useful for identifying unexpected dependencies, understanding blast radius, and verifying that traffic flows match the intended architecture.

The lookback window defaults to 5 minutes and can be adjusted from the tab controls.

---

## Availability Check

Call `GET /api/v1/linkerd/available` to check whether Linkerd is installed in the connected cluster before rendering Linkerd-specific UI elements:

```http
GET /api/v1/linkerd/available
Authorization: Bearer <token>
```

```json
{ "available": true }
```

---

## Graceful Degradation

All Linkerd tabs handle unavailability gracefully:

- If Linkerd is not installed, all tabs display an informational empty state
- If Prometheus is unreachable, the Traffic tab shows an empty state instead of an error
- If no resources exist in the namespace, each tab shows a contextual empty state with guidance
- Individual query failures do not break the page — other tabs continue to work independently

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `KUBECONFIG_PATH` | Yes | Path to kubeconfig file for cluster access |
| `PROMETHEUS_URL` | Yes (metrics) | Base URL of Prometheus instance scraping Linkerd metrics |

---

## Related

- [Kubernetes Operator](kubernetes-operator.md)
- [Istio Service Mesh](istio-integration.md)
- [Linkerd API Reference](../api-reference/linkerd.md)


