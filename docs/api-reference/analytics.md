# Analytics API

The Analytics API provides platform-wide insights covering catalog health, DORA engineering metrics, and platform usage statistics.

For interactive documentation refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/analytics/catalog` | Service catalog health analytics | JWT |
| `GET` | `/api/v1/analytics/dora` | DORA engineering metrics | JWT |
| `GET` | `/api/v1/analytics/usage` | Platform usage report | JWT |
| `GET` | `/api/v1/analytics/export` | Export analytics as CSV | JWT |

All endpoints require a valid JWT — no admin role required.

---

## Catalog Analytics

`GET /api/v1/analytics/catalog`

Returns a snapshot of the service catalog's health.

### Response

```json
{
  "ownershipCoverage": {
    "total": 24,
    "withOwner": 20,
    "withoutOwner": 4,
    "coveragePercent": 83.3
  },
  "lifecycleDistribution": [
    { "lifecycle": "production", "count": 10 },
    { "lifecycle": "experimental", "count": 8 },
    { "lifecycle": "planned", "count": 3 },
    { "lifecycle": "deprecated", "count": 2 },
    { "lifecycle": "decommissioned", "count": 1 }
  ],
  "kindDistribution": [
    { "kind": "service", "count": 9 },
    { "kind": "library", "count": 5 }
  ],
  "unownedComponents": [
    { "id": "uuid", "name": "legacy-api", "kind": "api" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `ownershipCoverage` | How many components have a non-empty `owner` field |
| `lifecycleDistribution` | Count per lifecycle stage; all 5 stages always included (zero-count entries present) |
| `kindDistribution` | Count per component kind; only includes kinds with at least one component |
| `unownedComponents` | Up to 50 components where `owner` is null or empty |

---

## DORA Metrics

`GET /api/v1/analytics/dora`

Returns the four DORA (DevOps Research and Assessment) key metrics for the requested period.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | `30` | Lookback window in days |
| `componentId` | UUID | — | Scope metrics to a single component |
| `environmentId` | UUID | — | Scope metrics to a single environment |

### Response

```json
{
  "periodDays": 30,
  "deploymentFrequency": {
    "deploymentsPerDay": 2.33,
    "total": 70,
    "periodDays": 30
  },
  "changeFailureRate": {
    "rate": 8.5,
    "failed": 6,
    "total": 70
  },
  "meanTimeToRecovery": {
    "avgHours": 1.2,
    "samples": 6
  },
  "leadTimeForChanges": {
    "avgHours": 0.4,
    "samples": 64
  }
}
```

| Metric | Calculation |
|--------|-------------|
| `deploymentFrequency` | `COUNT(SUCCEEDED deployments) / days` |
| `changeFailureRate` | `COUNT(FAILED + ROLLED_BACK) / COUNT(all non-pending) × 100` |
| `meanTimeToRecovery` | Average time from a FAILED deployment to the next SUCCEEDED deployment for the same component and environment |
| `leadTimeForChanges` | Average duration from `startedAt` to `finishedAt` for SUCCEEDED deployments (proxy for commit-to-production time) |

All metrics return `{ ..., samples: 0 }` / `rate: 0` when no data is available for the period.

---

## Usage Report

`GET /api/v1/analytics/usage`

Returns platform activity derived from the audit log.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | `30` | Lookback window in days |

### Response

```json
{
  "periodDays": 30,
  "totalAuditEvents": 340,
  "topComponents": [
    { "componentId": "uuid", "componentName": "user-service", "accessCount": 42 }
  ],
  "activeUsers": [
    { "actorId": "uuid", "actorUsername": "jane_doe", "actionCount": 87 }
  ],
  "actionBreakdown": [
    { "action": "CREATE", "count": 120 },
    { "action": "UPDATE", "count": 180 },
    { "action": "DELETE", "count": 40 }
  ]
}
```

| Field | Description |
|-------|-------------|
| `topComponents` | Top 10 components by number of audit log entries (any action) |
| `activeUsers` | Top 10 users by total action count |
| `actionBreakdown` | Count per action type (CREATE, UPDATE, DELETE, etc.) |

---

## CSV Export

`GET /api/v1/analytics/export`

Downloads an analytics report as a CSV file.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report` | `catalog` \| `dora` \| `usage` | Yes | Which report to export |
| `days` | number | No | Lookback window (default `30`; used by `dora` and `usage`) |

### Response Headers

```
Content-Type: text/csv
Content-Disposition: attachment; filename="farm-catalog-2026-03-18.csv"
```

### Catalog CSV Example

```csv
Section,Metric,Value
Ownership,Total,24
Ownership,With Owner,20
Ownership,Without Owner,4
Ownership,Coverage %,83.3
Lifecycle,production,10
Lifecycle,experimental,8
Kind,service,9
Kind,library,5
```

### DORA CSV Example

```csv
Metric,Value,Notes
Deployment Frequency (deploys/day),2.33,Last 30 days
Change Failure Rate (%),8.5,6 failed of 70 total
Mean Time To Recovery (hours),1.2,6 samples
Lead Time For Changes (hours),0.4,64 samples
```

### Usage CSV Example

```csv
Section,Name,Count
Active Users,jane_doe,87
Active Users,john_smith,54
Top Components,user-service,42
Top Components,payment-api,31
Action Breakdown,UPDATE,180
Action Breakdown,CREATE,120
```
