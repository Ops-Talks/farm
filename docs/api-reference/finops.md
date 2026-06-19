# FinOps API

The FinOps API provides endpoints for retrieving infrastructure cost data per component and per team, surfacing top-spending components platform-wide, and checking OpenCost availability. Cost data is fetched from OpenCost and synced to the database by a background BullMQ scheduler.

## Base Path

`/api/v1/cost`

## Prerequisites

- An OpenCost instance must be running and accessible
- `OPENCOST_URL` environment variable must point to the OpenCost base URL (default: `http://localhost:9090`)
- All endpoints require JWT authentication

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/cost/components/:id/actual` | 7-day and 30-day cost breakdown for a component | JWT |
| `GET` | `/api/v1/cost/components/:id/history` | Last 30 cost records for a component | JWT |
| `GET` | `/api/v1/cost/teams/:id/summary` | Aggregated cost summary for all components in a team | JWT |
| `GET` | `/api/v1/cost/summary` | Top-N most expensive components platform-wide | JWT |
| `GET` | `/api/v1/cost/available` | Check if OpenCost is reachable | JWT |

---

## Get Component Actual Costs

Returns a 7-day and 30-day cost breakdown from OpenCost for the given catalog component.

```http
GET /api/v1/cost/components/550e8400-e29b-41d4-a716-446655440001/actual
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "sevenDay": {
    "cpuCost": 12.40,
    "memoryCost": 3.20,
    "pvCost": 0.80,
    "networkCost": 0.50,
    "totalCost": 16.90
  },
  "thirtyDay": {
    "cpuCost": 52.10,
    "memoryCost": 13.70,
    "pvCost": 3.40,
    "networkCost": 2.10,
    "totalCost": 71.30
  }
}
```

`sevenDay` and `thirtyDay` each contain an OpenCost allocation object, or `null` if no data is available for that window.

---

## Get Component Cost History

Returns the last 30 persisted cost records for a component. Used to render a cost trend sparkline on the component detail page.

```http
GET /api/v1/cost/components/550e8400-e29b-41d4-a716-446655440001/history
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "cpuCost": 1.75,
    "memoryCost": 0.45,
    "pvCost": 0.11,
    "networkCost": 0.07,
    "totalCost": 2.38,
    "currency": "USD",
    "syncedAt": "2025-06-01T08:00:00Z"
  },
  {
    "cpuCost": 1.68,
    "memoryCost": 0.43,
    "pvCost": 0.11,
    "networkCost": 0.06,
    "totalCost": 2.28,
    "currency": "USD",
    "syncedAt": "2025-05-31T08:00:00Z"
  }
]
```

Records are ordered by `syncedAt` descending (most recent first).

---

## Get Team Cost Summary

Returns an aggregated cost summary for all catalog components owned by the given team.

```http
GET /api/v1/cost/teams/7c9e6679-7425-40de-944b-e07fc1f90ae7/summary
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "teamId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "totalCost": 142.60,
  "currency": "USD",
  "components": [
    {
      "componentId": "550e8400-e29b-41d4-a716-446655440001",
      "totalCost": 71.30,
      "window": "30d"
    },
    {
      "componentId": "550e8400-e29b-41d4-a716-446655440002",
      "totalCost": 71.30,
      "window": "30d"
    }
  ]
}
```

---

## Platform Cost Summary

Returns the top-N most expensive components across the entire platform.

```http
GET /api/v1/cost/summary?limit=10
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of components to return (default: `10`, max: `100`) |

### Response (200)

```json
[
  {
    "componentId": "550e8400-e29b-41d4-a716-446655440001",
    "totalCost": 71.30,
    "currency": "USD",
    "syncedAt": "2025-06-01T08:00:00Z",
    "budgetUsd": 100.00
  },
  {
    "componentId": "550e8400-e29b-41d4-a716-446655440003",
    "totalCost": 340.80,
    "currency": "USD",
    "syncedAt": "2025-06-01T08:00:00Z",
    "budgetUsd": null
  }
]
```

---

## Check Availability

```http
GET /api/v1/cost/available
Authorization: Bearer <token>
```

### Response (200)

```json
{ "available": true }
```

When OpenCost is unreachable:

```json
{ "available": false }
```

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCOST_URL` | Yes | Base URL of the OpenCost instance (default: `http://localhost:9090`) |
| `COST_SYNC_CRON` | No | Cron expression for the background cost sync schedule (default: `0 3 * * *` — daily at 03:00 UTC) |

---

## Error Responses

| Status | Cause |
|--------|-------|
| 400 | Invalid query parameters |
| 401 | Missing or invalid JWT token |
| 404 | Component or team not found |
| 503 | OpenCost unreachable |


