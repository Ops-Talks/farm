# Observability API Reference

All observability endpoints require the `admin` role. Requests must include a valid JWT access token in the `Authorization: Bearer <token>` header.

Base path: `/api/v1`

---

## Metrics (PromQL proxy)

### Instant query

```
GET /metrics/query
```

Proxies to `GET {PROMETHEUS_URL}/api/v1/query`.

**Query parameters** — passed through as-is to Prometheus:

| Parameter | Description |
|---|---|
| `query` | PromQL expression |
| `time` | Evaluation timestamp (Unix or RFC3339) |
| `timeout` | Evaluation timeout |

**Response** — Prometheus API envelope or degradation:

```json
{ "status": "success", "data": { "resultType": "vector", "result": [] } }
```

```json
{ "error": "Prometheus not available", "data": null }
```

---

### Range query

```
GET /metrics/query-range
```

Proxies to `GET {PROMETHEUS_URL}/api/v1/query_range`.

**Query parameters**:

| Parameter | Description |
|---|---|
| `query` | PromQL expression |
| `start` | Start timestamp |
| `end` | End timestamp |
| `step` | Resolution step |

---

### Labels

```
GET /metrics/labels
```

Proxies to `GET {PROMETHEUS_URL}/api/v1/labels`. Returns all available metric label names.

---

## Traces (Jaeger proxy)

### List traces

```
GET /traces
```

**Query parameters**:

| Parameter | Default | Description |
|---|---|---|
| `service` | — | Filter by service name |
| `operation` | — | Filter by operation name |
| `limit` | `20` | Maximum number of traces |
| `lookback` | `1h` | Time window (e.g. `15m`, `3h`, `24h`) |

---

### List services

```
GET /traces/services
```

Returns all service names known to Jaeger.

---

### Get trace by ID

```
GET /traces/:traceId
```

Returns the full trace with all spans for the given trace ID.

---

## Logs (Loki proxy)

### Query logs

```
GET /logs
```

**Query parameters**:

| Parameter | Default | Description |
|---|---|---|
| `query` | — | LogQL selector (e.g. `{job="farm-api"}`) |
| `start` | — | Start timestamp (nanoseconds or RFC3339) |
| `end` | — | End timestamp |
| `limit` | `100` | Maximum log lines |
| `direction` | — | `forward` or `backward` |

---

### List labels

```
GET /logs/labels
```

Returns all label names available in Loki.

---

### List label values

```
GET /logs/label/:name/values
```

Returns all values for the given label name.

---

## Alerting Rules

### List rules

```
GET /alerting-rules
```

**Query parameters**:

| Parameter | Description |
|---|---|
| `page` | Page number (default: `1`) |
| `limit` | Page size (default: `20`, max: `100`) |
| `severity` | Filter by `critical`, `warning`, or `info` |
| `componentId` | Filter by linked component UUID |
| `environmentId` | Filter by linked environment UUID |
| `organizationId` | Filter by organization UUID |
| `enabled` | Filter by enabled state (`true` / `false`) |

**Response**:

```json
{
  "data": [ { "id": "uuid", "name": "...", "severity": "critical", "enabled": true } ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### Create rule

```
POST /alerting-rules
```

**Request body**:

```json
{
  "name": "API error rate high",
  "description": "Fires when 5xx rate exceeds 1%",
  "query": "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.01",
  "duration": "5m",
  "severity": "critical",
  "componentId": "uuid",
  "environmentId": "uuid",
  "organizationId": "uuid",
  "enabled": true
}
```

Returns `201 Created` with the created rule. Returns `409 Conflict` if a rule with the same name already exists.

---

### Get rule

```
GET /alerting-rules/:id
```

Returns `404 Not Found` if the rule does not exist.

---

### Update rule

```
PATCH /alerting-rules/:id
```

All fields are optional. Returns the updated rule.

---

### Delete rule

```
DELETE /alerting-rules/:id
```

Returns `204 No Content` on success.

---

## WebSocket events

Connect to `ws://<host>/events` with a valid JWT in the handshake `auth.token` field.

| Event | Payload | Description |
|---|---|---|
| `audit-log.created` | `AuditLog` object | Emitted after every audit log write |
| `deployment.updated` | `Deployment` object | Emitted after every deployment status change |
| `pipeline-run.updated` | `PipelineRun` object | Emitted after every pipeline run state change |
| `pipeline.log` | `{ runId, line }` | Streaming log line from a running pipeline stage |
