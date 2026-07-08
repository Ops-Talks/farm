# Istio Service Mesh Integration

Farm integrates with Istio to surface live traffic metrics, security posture, and canary traffic controls directly on each catalog component -- without requiring users to switch to the Istio dashboard or kubectl.

## Overview

| Capability | Description |
|------------|-------------|
| Istio detection | Automatically detects whether Istio is installed in the connected cluster |
| Traffic metrics | RPS, error rate, and P99 latency pulled from Prometheus/Istio telemetry |
| Security posture | mTLS mode (PeerAuthentication) and AuthorizationPolicy rules per namespace |
| Canary control | View and adjust VirtualService traffic weights from the component detail page |
| Graceful degradation | All Istio tabs display an empty state when Istio is not installed or data is unavailable |

---

## Prerequisites

- A Kubernetes cluster with Istio installed (tested with Istio 1.17+)
- Prometheus scraping Istio telemetry metrics (`istio_requests_total`, `istio_request_duration_milliseconds_bucket`)
- `KUBECONFIG_PATH` pointing to a valid kubeconfig, or Farm running in-cluster with RBAC permissions to read Istio CRDs
- For traffic metrics: `PROMETHEUS_URL` environment variable set to the Prometheus base URL (e.g. `http://prometheus:9090`)

---

## Component Namespace

Istio resources are scoped by Kubernetes namespace. Farm reads the optional `namespace` field on each catalog component. If not set, it defaults to `default`.

Set the namespace in your `catalog-info.yaml`:

```yaml
metadata:
  name: payment-service
  namespace: payments
```

Or update it via the Farm API:

```http
PATCH /api/v1/catalog/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "namespace": "payments" }
```

---

## Traffic Tab

The **Traffic** tab on the component detail page shows live Istio telemetry for the component:

| Metric | Description |
|--------|-------------|
| Requests per Second | Current RPS to the service (`istio_requests_total`) |
| Error Rate | Percentage of 5xx responses |
| P99 Latency | 99th percentile request latency in milliseconds |

Each metric card displays the latest value and a timeseries table of historical data points for the selected time range (default: last 1 hour).

The tab is hidden and displays an empty state if Istio is not detected in the cluster.

---

## Security Tab

The **Security** tab shows the mTLS and authorization configuration for the component's namespace.

### mTLS Mode (PeerAuthentication)

Displays the active `PeerAuthentication` policy with a color-coded badge:

| Badge | Meaning |
|-------|---------|
| `STRICT` (green) | All traffic must use mTLS |
| `PERMISSIVE` (yellow) | Both plaintext and mTLS accepted |
| `DISABLE` (red) | mTLS disabled |

### AuthorizationPolicies

Lists all `AuthorizationPolicy` resources in the namespace. For each policy:

- Policy name and creation timestamp
- Number of rules defined
- A warning alert is shown when a policy exists but has no rules (which denies all traffic by default)

### No Policies

If no `PeerAuthentication` or `AuthorizationPolicy` resources are found, an empty state is shown prompting the user to configure mesh security.

---

## Canary Tab

The **Canary** tab lets you view and adjust Istio `VirtualService` traffic splitting for the component.

### Viewing VirtualServices

All `VirtualService` resources in the component's namespace are listed. For each VirtualService:

- Resource name and namespace
- HTTP route destinations with current traffic weights
- A `Canary` badge when multiple routes with different weights are detected

### Adjusting Weights (Admin only)

Users with the `admin` role can open the **Adjust Weights** dialog to redistribute traffic between destinations.

Rules:
- Weights must be whole numbers between 0 and 100
- The sum of all destination weights must equal 100
- Changes are applied immediately via `PATCH /api/v1/istio/virtual-services/:namespace/:name/weights`

Non-admin users see a read-only notice instead of the dialog button.

---

## Graceful Degradation

All Istio tabs handle unavailability gracefully:

- If Istio is not installed, all three tabs display an informational empty state
- If Prometheus is unreachable, the Traffic tab shows an empty state instead of an error
- If no resources exist in the namespace, each tab shows a contextual empty state with guidance
- Individual query failures do not break the page -- other tabs continue to work independently

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KUBECONFIG_PATH` | Yes | Path to kubeconfig file for cluster access |
| `PROMETHEUS_URL` | Yes (metrics) | Base URL of Prometheus instance scraping Istio metrics |

---

## Related

- [Kubernetes Operator](kubernetes-operator.md)
- [Helm Integration](helm-integration.md)
- [Istio API Reference](../api-reference/istio.md)


