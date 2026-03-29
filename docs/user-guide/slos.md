# SLO Management

Service Level Objectives (SLOs) let you define reliability targets for your catalog components and track error budget consumption over time. Farm calculates budget status automatically from Prometheus metrics (or simulated data when Prometheus is unreachable or returns an empty result).

## Core Concepts

### Service Level Objective

An SLO sets a measurable target for a specific metric type over a rolling time window. For example, "API gateway must maintain 99.95% availability over 30 days."

### Error Budget

The error budget is the acceptable amount of unreliability derived from the SLO target. A 99.95% availability target yields a 0.05 percentage-point error budget. Farm tracks how much of this budget has been consumed and alerts when consumption accelerates.

### Burn Rate

Burn rate measures how fast the error budget is being consumed relative to the elapsed window. A burn rate of 1.0 means the budget is being consumed at a sustainable pace; values above 1.0 indicate the budget will be exhausted before the window ends.

---

## Managing SLOs

Navigate to **SLOs** in the sidebar to see all configured objectives.

### Creating an SLO

1. Click **Create SLO**.
2. Fill in the required fields:

| Field | Description |
|---|---|
| Name | Unique identifier (e.g., `api-availability`) |
| Target % | The reliability target (e.g., 99.95) |
| Metric Type | `availability`, `latency`, or `error_rate` |
| Window | Rolling evaluation window: `7d`, `30d`, or `90d` |
| Description | Optional human-readable explanation |
| Component | Optional link to a catalog component |

3. Click **Save**. The SLO begins tracking immediately.

### Editing an SLO

Click the pencil icon on any SLO card to modify its fields. Changes take effect on the next budget calculation.

### Deleting an SLO

Click the trash icon and confirm. Historical budget data is not retained after deletion.

---

## Error Budget Status

Each SLO card displays a status badge based on remaining budget:

| Status | Condition | Color |
|---|---|---|
| **Healthy** | More than 50% budget remaining | Green |
| **Warning** | 10-50% budget remaining | Yellow |
| **Critical** | Less than 10% budget remaining | Red |
| **Exhausted** | Budget fully consumed | Red (solid) |

Click **View Budget** on any SLO to see detailed metrics: current performance percentage, total budget, consumed budget, remaining budget percentage, and burn rate.

---

## Metric Types

| Type | What it measures | Prometheus query pattern (simplified) |
|---|---|---|
| `availability` | Uptime percentage over the SLO window | `avg_over_time(up{job="<componentId>"}[<window>])` |
| `latency` | Response time compliance over the SLO window | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="<componentId>"}[<window>]))` |
| `error_rate` | Error-free request ratio over the SLO window | `rate(http_requests_total{job="<componentId>",status!~"5.."}[<window>]) / rate(http_requests_total{job="<componentId>"}[<window>])` |

If Prometheus is unreachable or returns an error or empty result, Farm falls back to simulated metrics for development and demonstration purposes.

---

## Best Practices

- **Start with availability SLOs** for your most critical services before adding latency and error rate targets.
- **Use 30-day windows** as the default. Seven-day windows are too noisy for most services; 90-day windows react too slowly.
- **Set realistic targets.** A 99.99% target for a service that currently runs at 99.5% creates a permanently exhausted budget.
- **Link SLOs to catalog components** so teams can see reliability targets alongside service metadata.

---

## Related

- [SLO API Reference](../api-reference/slos.md) for endpoint details and response schemas.
- [Observability](observability.md) for metrics, traces, and alerting rules.
- [Incident Management](incidents.md) for coordinating response when SLO breaches occur.
