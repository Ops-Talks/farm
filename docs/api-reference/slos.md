# SLO API

The SLO (Service Level Objectives) API provides endpoints for defining reliability targets, tracking error budgets, and managing SLO lifecycle.

## Base URL

```
/api/v1/slos
```

## Authentication

All endpoints require a valid JWT token via `Authorization: Bearer <token>` header.

## Endpoints

### List SLOs

```http
GET /api/v1/slos
```

**Query Parameters:**

| Parameter     | Type    | Description                           |
|---------------|---------|---------------------------------------|
| `componentId` | string  | Filter by component UUID              |
| `metricType`  | string  | Filter by metric type                 |
| `window`      | string  | Filter by evaluation window           |
| `enabled`     | boolean | Filter by enabled/disabled status     |
| `skip`        | number  | Pagination offset (default: 0)        |
| `take`        | number  | Page size (default: 20)               |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "api-availability",
      "description": "API gateway must maintain 99.95% availability",
      "targetPercent": 99.95,
      "metricType": "availability",
      "window": "30d",
      "componentId": "uuid",
      "organizationId": "uuid",
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 20
}
```

### Create SLO

```http
POST /api/v1/slos
```

**Requires:** `admin` role.

**Request Body:**

| Field           | Type    | Required | Description                                         |
|-----------------|---------|----------|-----------------------------------------------------|
| `name`          | string  | Yes      | Unique name for the SLO                             |
| `targetPercent`  | number  | Yes      | Target percentage (0-100)                           |
| `metricType`    | string  | Yes      | One of: `availability`, `latency`, `error_rate`     |
| `window`        | string  | Yes      | One of: `7d`, `30d`, `90d`                          |
| `description`   | string  | No       | Human-readable description                          |
| `componentId`   | string  | No       | UUID of the component this SLO is scoped to         |
| `enabled`       | boolean | No       | Whether the SLO is active (default: true)           |

**Response:** `201 Created`

### Get SLO

```http
GET /api/v1/slos/:id
```

**Response:** `200 OK` with the SLO object.

### Update SLO

```http
PATCH /api/v1/slos/:id
```

**Requires:** `admin` role. Accepts partial updates with the same fields as creation.

**Response:** `200 OK` with the updated SLO.

### Delete SLO

```http
DELETE /api/v1/slos/:id
```

**Requires:** `admin` role.

**Response:** `204 No Content`

### Get Error Budget

```http
GET /api/v1/slos/:id/budget
```

Returns the current error budget status for an SLO based on Prometheus metrics (or simulated data if Prometheus is not configured).

**Response:** `200 OK`

```json
{
  "sloId": "uuid",
  "name": "api-availability",
  "targetPercent": 99.95,
  "currentPercent": 99.97,
  "budgetRemaining": 0.02,
  "budgetTotal": 0.05,
  "budgetConsumed": 0.03,
  "status": "healthy"
}
```

**Budget Status Values:**

| Status      | Description                          |
|-------------|--------------------------------------|
| `healthy`   | More than 50% of error budget remains |
| `warning`   | 10-50% of error budget remains        |
| `critical`  | Less than 10% of error budget remains |
| `exhausted` | Error budget is fully consumed        |

## Enums

### SloMetricType

| Value          | Description                  |
|----------------|------------------------------|
| `availability` | Uptime / availability metric |
| `latency`      | Response latency metric      |
| `error_rate`   | Error rate metric            |

### SloWindow

| Value | Description         |
|-------|---------------------|
| `7d`  | 7-day rolling window  |
| `30d` | 30-day rolling window |
| `90d` | 90-day rolling window |
