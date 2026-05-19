# API Gateway Integration

## Overview

The API Gateway Integration module provides visibility into your gateway infrastructure directly within Farm. It pulls route metadata, configuration, and health status from supported gateways and surfaces them on the component detail page — without replacing or proxying the gateway itself.

Supported adapters:

- **Kong Gateway** — syncs routes from the Kong Admin API
- **AWS API Gateway** — syncs REST APIs from the AWS API Gateway service

Both adapters are independent and can be enabled simultaneously. When neither is enabled, the gateway module remains inactive and no background jobs are scheduled.

Synchronized data includes route paths, HTTP methods, tags, rate limit annotations, and last-seen timestamps. Health checks are performed on a separate schedule and store latency and availability status per route.

---

## Prerequisites

**Kong**

- Kong Admin API must be network-accessible from the Farm API process or pod (default port `8001`).
- If Kong RBAC is enabled, an admin token is required via `GATEWAY_KONG_API_KEY`.

**AWS API Gateway**

- An IAM user or role with read access to API Gateway and optionally CloudWatch.
- `GATEWAY_AWS_ACCESS_KEY_ID` and `GATEWAY_AWS_SECRET_ACCESS_KEY` must be set, or the instance must have an attached IAM role (the AWS SDK respects the standard credential chain).

---

## Configuration

All environment variables are optional. The gateway feature is disabled when neither `GATEWAY_KONG_ENABLED` nor `GATEWAY_AWS_ENABLED` is set to `true`.

### Kong

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_KONG_ENABLED` | `false` | Set to `true` to enable the Kong adapter. |
| `GATEWAY_KONG_URL` | `http://kong-admin:8001` | Base URL of the Kong Admin API. |
| `GATEWAY_KONG_API_KEY` | — | Admin token for Kong RBAC. Omit if RBAC is not enabled. |

```env
GATEWAY_KONG_ENABLED=true
GATEWAY_KONG_URL=http://kong-admin:8001
GATEWAY_KONG_API_KEY=<kong-admin-token>
```

### AWS API Gateway

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_AWS_ENABLED` | `false` | Set to `true` to enable the AWS adapter. |
| `GATEWAY_AWS_REGION` | `us-east-1` | AWS region to query. |
| `GATEWAY_AWS_ACCESS_KEY_ID` | — | AWS access key ID. Optional if using an instance role. |
| `GATEWAY_AWS_SECRET_ACCESS_KEY` | — | AWS secret access key. Optional if using an instance role. |

```env
GATEWAY_AWS_ENABLED=true
GATEWAY_AWS_REGION=us-east-1
GATEWAY_AWS_ACCESS_KEY_ID=<key-id>
GATEWAY_AWS_SECRET_ACCESS_KEY=<secret-key>
```

### Enabling both adapters

Both adapters can run simultaneously. Routes from each source are stored with a `gatewayType` discriminator (`kong` or `aws`) so they can be distinguished in the UI and API responses.

```env
GATEWAY_KONG_ENABLED=true
GATEWAY_KONG_URL=http://kong-admin:8001

GATEWAY_AWS_ENABLED=true
GATEWAY_AWS_REGION=eu-west-1
```

---

## Route Synchronization

### How it works

A background cron job runs every **15 minutes** and calls each enabled adapter. Each adapter fetches the current set of routes from its upstream source and upserts them into the `gateway_routes` table keyed on `externalId`.

Routes that no longer exist upstream are marked stale on the next sync cycle.

### Manual trigger

A sync can be triggered on demand without waiting for the next scheduled run:

```http
POST /api/v1/gateway/sync
Authorization: Bearer <token>
```

### Stored fields

| Field | Description |
|---|---|
| `externalId` | Identifier assigned by the gateway (Kong route ID or AWS API ID). |
| `name` | Human-readable name from the gateway. |
| `paths` | Array of path patterns the route matches. |
| `methods` | Array of HTTP methods (e.g., `["GET", "POST"]`). |
| `tags` | Tags or labels attached to the route in the gateway. |
| `gatewayType` | Source adapter: `kong` or `aws`. |
| `syncedAt` | Timestamp of the last successful sync for this route. |
| `componentId` | Nullable FK to a catalog component (see [Linking Components to Routes](#linking-components-to-routes)). |

---

## Health Checks

A separate cron job runs every **5 minutes** and performs a lightweight probe against each known route. Results are stored in the `api_health_checks` table.

### Status values

| Status | Meaning |
|---|---|
| `up` | Route responded within the expected latency threshold. |
| `degraded` | Route responded but latency exceeded the warning threshold. |
| `down` | Route did not respond or returned an error. |

The `latencyMs` field records the round-trip time in milliseconds for each check.

### Manual trigger

```http
POST /api/v1/gateway/health/check
Authorization: Bearer <token>
```

---

## REST API Reference

All endpoints require a valid JWT bearer token unless noted otherwise.

### List routes

```http
GET /api/v1/gateway/routes
Authorization: Bearer <token>
```

Query parameters:

| Parameter | Type | Description |
|---|---|---|
| `gatewayType` | string | Filter by adapter: `kong` or `aws`. |
| `componentId` | string (UUID) | Filter routes linked to a specific component. |
| `page` | number | Page number (default: `1`). |
| `limit` | number | Results per page (default: `20`, max: `100`). |

Example response:

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "externalId": "route-abc123",
      "name": "payments-api",
      "paths": ["/v1/payments"],
      "methods": ["GET", "POST"],
      "tags": ["payments", "v1"],
      "gatewayType": "kong",
      "syncedAt": "2025-01-15T10:30:00.000Z",
      "componentId": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Get a single route

```http
GET /api/v1/gateway/routes/:id
Authorization: Bearer <token>
```

Returns a single route by its Farm UUID. Returns `404` if not found.

---

### Trigger route sync

```http
POST /api/v1/gateway/sync
Authorization: Bearer <token>
```

Triggers an immediate sync across all enabled adapters. Returns a summary of routes upserted and any adapter errors encountered.

Example response:

```json
{
  "synced": 37,
  "errors": []
}
```

---

### List health check results

```http
GET /api/v1/gateway/health
Authorization: Bearer <token>
```

Returns the latest health check result for each route.

Example response:

```json
{
  "data": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "routeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "up",
      "latencyMs": 42,
      "checkedAt": "2025-01-15T10:35:00.000Z"
    }
  ]
}
```

---

### Trigger health check

```http
POST /api/v1/gateway/health/check
Authorization: Bearer <token>
```

Triggers an immediate health check across all synced routes. Returns a summary of results.

---

## AWS IAM Policy

The following minimal IAM policy grants the permissions required by the AWS adapter. Attach it to the IAM user or role whose credentials are provided via environment variables.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["apigateway:GET"],
      "Resource": "arn:aws:apigateway:*::/restapis*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:GetMetricStatistics"],
      "Resource": "*"
    }
  ]
}
```

!!! note
    `cloudwatch:GetMetricStatistics` is used to retrieve request count and latency metrics for health enrichment. It can be omitted if CloudWatch integration is not required, but the health check will then rely solely on direct probes.

---

## Kong Setup Notes

- The Kong Admin API must be reachable from the Farm API process. In Kubernetes, expose it as an internal `ClusterIP` service on port `8001` and set `GATEWAY_KONG_URL` to the service DNS name.
- If Kong RBAC is enabled, create a dedicated admin token with read-only access to routes and services, and provide it via `GATEWAY_KONG_API_KEY`.
- The adapter calls `GET /routes` and `GET /services` on the Admin API. Ensure these endpoints are not blocked by network policy.

!!! warning
    Never expose the Kong Admin API to the public internet. It must remain on a private network or be protected by network policy.

---

## Frontend

The **Gateway Routes** tab appears on the component detail page in the Farm web UI. It lists all routes linked to that component and their current health status.

When no routes are linked to the component yet, the tab displays an empty state with a prompt to run a sync or map routes manually.

---

## Linking Components to Routes

Routes are stored with a nullable `componentId` foreign key referencing the catalog component they belong to. This mapping is not populated automatically during sync — the gateway does not carry enough metadata to reliably identify which Farm component owns a given route.

### Manual mapping

Use a `PATCH` request to associate a route with a component after the fact:

```http
PATCH /api/v1/gateway/routes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "componentId": "<component-uuid>"
}
```

Once linked, the route appears under the component's Gateway Routes tab and its health status contributes to the component's overall health summary.

### Future auto-mapping

Automatic matching based on route tags, service names, or component annotations is planned. See [ROADMAP.md](https://github.com/Ops-Talks/farm/blob/main/ROADMAP.md) for the current status.
