# Dashboard API

The Dashboard API provides endpoints for creating custom dashboards with configurable widgets for monitoring and observability views.

## Base URL

```text
/api/v1/dashboards
```

## Authentication

All endpoints require a valid JWT token via `Authorization: Bearer <token>` header.

## Dashboard Endpoints

### List Dashboards

```http
GET /api/v1/dashboards
```

**Query Parameters:**

| Parameter    | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `ownerId`    | string | Filter by dashboard owner UUID           |
| `visibility` | string | Filter by visibility (`private`/`workspace`) |
| `skip`       | number | Pagination offset (default: 0)           |
| `take`       | number | Page size (default: 20)                  |

**Response:** `200 OK` — Paginated list of dashboards with widgets.

### Create Dashboard

```http
POST /api/v1/dashboards
```

The `ownerId` is automatically set from the authenticated user's JWT token.

**Request Body:**

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `name`        | string | Yes      | Display name for the dashboard           |
| `description` | string | No       | Optional description                     |
| `visibility`  | string | No       | `private` (default) or `workspace`       |

**Response:** `201 Created`

### Get Dashboard

```http
GET /api/v1/dashboards/:id
```

Returns the dashboard with all widgets.

**Response:** `200 OK`

### Update Dashboard

```http
PATCH /api/v1/dashboards/:id
```

**Requires:** `admin` role. Accepts partial updates (name, description, visibility).

**Response:** `200 OK`

### Update Layout

```http
PATCH /api/v1/dashboards/:id/layout
```

**Requires:** `admin` role. Bulk-updates widget positions.

**Request Body:**

```json
{
  "widgets": [
    { "id": "widget-uuid", "gridX": 0, "gridY": 0, "gridW": 6, "gridH": 4 },
    { "id": "widget-uuid", "gridX": 6, "gridY": 0, "gridW": 6, "gridH": 4 }
  ]
}
```

**Response:** `200 OK` — Updated dashboard with widgets.

### Delete Dashboard

```http
DELETE /api/v1/dashboards/:id
```

**Requires:** `admin` role.

**Response:** `204 No Content`

## Widget Endpoints

### Add Widget

```http
POST /api/v1/dashboards/:id/widgets
```

**Requires:** `admin` role.

**Request Body:**

| Field    | Type   | Required | Description                              |
|----------|--------|----------|------------------------------------------|
| `type`   | string | Yes      | Widget type (see WidgetType enum below)  |
| `title`  | string | Yes      | Display title for the widget             |
| `gridX`  | number | No       | Horizontal grid position (default: 0)    |
| `gridY`  | number | No       | Vertical grid position (default: 0)      |
| `gridW`  | number | No       | Width in grid units (default: 4)         |
| `gridH`  | number | No       | Height in grid units (default: 3)        |
| `config` | object | No       | Widget-specific configuration            |

**Response:** `201 Created`

### Update Widget

```http
PATCH /api/v1/dashboards/:dashboardId/widgets/:widgetId
```

**Requires:** `admin` role.

**Response:** `200 OK`

### Delete Widget

```http
DELETE /api/v1/dashboards/:dashboardId/widgets/:widgetId
```

**Requires:** `admin` role.

**Response:** `204 No Content`

### Get Widget Data

```http
GET /api/v1/dashboards/:dashboardId/widgets/:widgetId/data
```

Returns data appropriate for the widget type (mock data in development).

**Response:** `200 OK` — Widget-type-specific data object.

## Enums

### DashboardVisibility

| Value       | Description                          |
|-------------|--------------------------------------|
| `private`   | Only visible to the owner            |
| `workspace` | Visible to all workspace members     |

### WidgetType

| Value              | Description                        |
|--------------------|------------------------------------|
| `metric_graph`     | Time-series metric graph           |
| `component_health` | Component health status overview   |
| `deployment_feed`  | Recent deployment activity feed    |
| `queue_status`     | Queue depth and processing status  |
| `slo_gauge`        | SLO error budget gauge             |
| `alert_summary`    | Active alerting rules summary      |
| `team_activity`    | Team activity feed                 |
| `uptime_chart`     | Uptime percentage chart            |


