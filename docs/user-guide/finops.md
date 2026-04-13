# FinOps and Cost Management

Farm integrates with OpenCost to display infrastructure cost data per component and per team, with per-component budget tracking and automated background sync.

## Overview

| Capability | Description |
|------------|-------------|
| Component cost breakdown | 7-day and 30-day CPU, memory, PV, and network cost data |
| Cost history sparkline | Last 30 data points for trend visualization |
| Team cost summary | Aggregated cost for all components owned by a team |
| Platform cost summary | Top-N most expensive components platform-wide |
| Budget tracking | Per-component `costBudgetUsd` field shown against actual spend |
| Background sync | Automated cost data refresh via a scheduled BullMQ job |

---

## Prerequisites

- OpenCost must be running and accessible from Farm
- `OPENCOST_URL` environment variable set to the OpenCost base URL (default: `http://localhost:9090`)

---

## Component Cost View

The **Cost** tab on the component detail page shows:

- A 7-day and 30-day cost breakdown with line items for CPU, memory, persistent volume (PV), and network costs
- The configured cost budget (`costBudgetUsd`) compared against 30-day actual spend, with a visual indicator when the budget is exceeded
- A sparkline chart of the last 30 cost records for trend analysis

### Setting a Cost Budget

Set a cost budget on a catalog component by updating the `costBudgetUsd` field:

```http
PATCH /api/v1/catalog/components/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "costBudgetUsd": 100.00 }
```

---

## Cost History

The cost history endpoint returns the last 30 persisted cost records for trend rendering:

```http
GET /api/v1/cost/components/:id/history
Authorization: Bearer <token>
```

Each record includes `cpuCost`, `memoryCost`, `pvCost`, `networkCost`, `totalCost`, `currency`, and `syncedAt`.

---

## Team Cost Summary

The team detail page shows an aggregated cost summary for all components owned by the team:

```http
GET /api/v1/cost/teams/:id/summary
Authorization: Bearer <token>
```

The response includes the total team cost, currency, and a per-component breakdown so team leads can identify the highest spenders within their portfolio.

---

## Platform Cost Summary

Identify the top-N most expensive components across the entire platform:

```http
GET /api/v1/cost/summary?limit=10
Authorization: Bearer <token>
```

Results include the component name, total cost, currency, last sync timestamp, and configured budget. This view is accessible from the FinOps dashboard page.

---

## Availability Check

Verify that OpenCost is reachable before rendering cost UI elements:

```http
GET /api/v1/cost/available
Authorization: Bearer <token>
```

```json
{ "available": true }
```

Cost tabs and cards display an empty state when OpenCost is unavailable.

---

## Background Sync

Cost data is automatically refreshed by a scheduled BullMQ processor. The sync schedule is controlled by the `COST_SYNC_CRON` environment variable (default: `0 3 * * *` — daily at 03:00 UTC). The processor:

1. Queries OpenCost for cost data for each catalog component
2. Persists the results to the database
3. Trims old history records to keep the last 30 per component

No manual action is needed. The sync runs on the configured cron schedule as long as the Farm API is running and OpenCost is reachable.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCOST_URL` | Yes | Base URL of the OpenCost instance (default: `http://localhost:9090`) |
| `COST_SYNC_CRON` | No | Cron expression for the background cost sync schedule (default: `0 3 * * *` — daily at 03:00 UTC) |

---

## Related

- [FinOps API Reference](../api-reference/finops.md)
- [Catalog](catalog.md)
