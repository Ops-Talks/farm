# Observability

Farm provides a built-in observability hub that aggregates metrics, traces, and logs from your infrastructure without requiring you to leave the portal. The hub is available at **Observability** in the main navigation and is restricted to administrators.

## Metrics

The **Metrics** tab connects to your Prometheus instance and renders time-series charts natively inside Farm.

### Pre-configured charts

Two charts are displayed by default:

| Chart | PromQL query |
|---|---|
| Request rate | `rate(http_requests_total[5m])` |
| Memory usage | `process_resident_memory_bytes` |

### Custom PromQL queries

Each chart card exposes a query input field. Type any valid PromQL expression and press **Run** to render the result as a line chart. The chart shows the last hour of data by default.

If Prometheus is not reachable, the card displays a "Prometheus not available" notice and no error is propagated to other parts of the UI.

### Configuration

Set the `PROMETHEUS_URL` environment variable on the API server (default: `http://localhost:9090`). No API key is required for query-only access.

---

## Traces

The **Traces** tab provides a native trace waterfall viewer compatible with Jaeger and Grafana Tempo.

### Searching traces

1. Select a **service** from the dropdown (populated from `/api/services`).
2. Choose a **time range**: 15 minutes, 1 hour, 3 hours, or 24 hours.
3. The trace list shows Trace ID, service, root operation, total duration, span count, and start time.

### Waterfall view

Click any row to expand the trace waterfall. Each span is rendered as a horizontal bar proportional to its duration relative to the total trace duration. Services are color-coded automatically using a hash of the service name.

If Jaeger is not reachable, the list shows an "unavailable" notice.

### Configuration

Set the `JAEGER_URL` environment variable (default: `http://localhost:16686`). Farm uses the standard Jaeger HTTP API (`/api/traces`, `/api/services`).

---

## Logs

The **Logs** tab queries your Loki instance with LogQL and displays log lines with automatic level detection.

### Running a query

1. Enter a LogQL selector in the query input (default: `{project="farm"}`).
2. Choose a time range: 15 minutes, 1 hour, 3 hours, or 24 hours.
3. Press **Run** to execute.

Up to 200 log lines are shown. Press **Load more** to fetch additional results.

### Useful LogQL selectors

| Goal | Selector |
|---|---|
| All Farm logs | `{project="farm"}` |
| API logs only | `{container="farm-api"}` |
| Error logs | `{project="farm", level="error"}` |
| Specific NestJS context | `{container="farm-api", context="HttpException"}` |

### Log levels

Farm auto-detects the level from each log line's content:

| Level | Color |
|---|---|
| error | Red |
| warn | Yellow |
| info | Blue |
| debug | Gray |

### Configuration

Set the `LOKI_URL` environment variable (default: `http://loki:3100` when using the observability stack, `http://localhost:3100` otherwise). Farm uses the Loki HTTP API (`/loki/api/v1/query_range`).

---

## Grafana Dashboards

The observability stack ships three pre-configured Grafana dashboards at `http://localhost:3002`:

| Dashboard | Description |
|---|---|
| **Farm API Overview** | Request rate, latency percentiles, error rate, traces, and business metrics |
| **Farm -- Application Logs** | Log throughput, error/warn counts, and live log panels per container |
| **Farm -- Infrastructure** | Host CPU, memory, disk I/O, network, and filesystem usage |

All dashboards are provisioned automatically from `observability/grafana/provisioning/dashboards/`. No login is required in local development.

---

## Alerting Rules

Alerting rules let you define PromQL-based thresholds linked to catalog components or environments.

### Managing rules

Navigate to **Alerting** in the sidebar to see all configured rules. From this page you can:

- **Create** a new rule using the "Create Rule" button.
- **Enable / disable** a rule with the inline toggle switch.
- **Delete** a rule via the trash icon (confirmation required).

### Rule fields

| Field | Description |
|---|---|
| Name | Unique identifier for the rule |
| Description | Optional human-readable description |
| PromQL Query | Expression to evaluate (e.g., `up == 0`) |
| Duration | How long the condition must hold before firing (e.g., `5m`, `1h`) |
| Severity | `critical`, `warning`, or `info` |
| Component ID | Optional link to a catalog component |
| Environment ID | Optional link to an environment |
| Enabled | Whether the rule is active |

!!! tip "Related features"
    For tracking compliance against formal service targets, see [SLO Management](slos.md). For coordinating incident response when alerts fire, see [Incident Management](incidents.md). Alerting rules define thresholds; SLOs define target budgets; incidents coordinate the human response.

---

## Real-time notifications

Farm broadcasts events over WebSocket so you receive instant feedback without polling.

| Event | Toast type |
|---|---|
| Audit log entry created | Info |
| Pipeline run completed successfully | Success |
| Pipeline run failed | Error |

Notifications appear in the bottom-right corner and dismiss automatically after 3 seconds.

---

## Elasticsearch Index Visibility

The **Elasticsearch** section of each catalog component lets you link one or more Elasticsearch index patterns and monitor their health without leaving Farm.

### Linking an index to a component

1. Open the component detail page in the catalog.
2. Navigate to the **Elasticsearch** tab.
3. Click **Add index**, enter an index pattern (e.g. `logs-app-*`) and optionally an Elasticsearch cluster URL (leave blank to use the default `ELASTICSEARCH_URL` configured on the server).
4. Save. Farm immediately attempts to reach the cluster and fetches live stats.

### Stats displayed per index

| Field | Description |
|---|---|
| **Status** | `reachable` or `unreachable` |
| **Doc count** | Total number of documents in the index |
| **Index size** | Disk size in human-readable format |
| **Health** | Elasticsearch cluster health (`green`, `yellow`, `red`) |
| **Kibana link** | Deep-link to the Discover view for this index pattern (generated by the UI when `NEXT_PUBLIC_KIBANA_URL` is set in the web app) |

### Admin cross-component overview

Platform admins can see all Elasticsearch index links across every component from **Observability → Elasticsearch**. The overview groups indices by component, fetches live stats in batches (one request per unique cluster URL), and highlights unreachable clusters. The view is org-scoped when an organization context is active.

### Configuration

| Variable | Description | Default |
|---|---|---|
| `ELASTICSEARCH_URL` | Default cluster URL used when no per-index URL is set | -- |
| `NEXT_PUBLIC_KIBANA_URL` | Kibana base URL for deep-link generation (web app env var; not read by the API) | -- |

If `ELASTICSEARCH_URL` is not set, Farm operates without any default Elasticsearch cluster. Per-component indices with an explicit URL still work independently.

---

## External service availability

All observability proxies return a graceful degradation response when the upstream service is unreachable:

```json
{ "error": "Prometheus not available", "data": null }
```

The UI handles these responses without displaying a global error -- individual cards or tabs show a targeted "unavailable" notice. Other tabs in the Observability hub remain fully functional.
