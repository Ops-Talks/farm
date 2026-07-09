# IaC API

The IaC API provides endpoints for ingesting infrastructure-as-code run reports, stack definitions, module drift data, and resource topologies, as well as querying that data from the Farm dashboard.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v1/iac/runs/ingest` | Ingest a plan or apply run report from Cultivator or CI | IAC_INGEST_TOKEN |
| `POST` | `/api/v1/iac/stacks/import` | Bulk-import stack definitions from Cultivator discovery output | IAC_INGEST_TOKEN |
| `POST` | `/api/v1/iac/module-drift/ingest` | Ingest module drift data from Agronomist | IAC_INGEST_TOKEN |
| `POST` | `/api/v1/iac/stacks/:id/resources/ingest` | Atomically replace the resource topology for a stack | IAC_INGEST_TOKEN |
| `GET` | `/api/v1/iac/stacks` | List all stacks with optional `?environment=` and `?componentId=` filters | JWT |
| `GET` | `/api/v1/iac/stacks/:id` | Get a single stack by UUID | JWT |
| `GET` | `/api/v1/iac/stacks/:id/runs` | List paginated run history for a stack | JWT |
| `GET` | `/api/v1/iac/stacks/:id/resources` | Get the resource topology for a stack | JWT |
| `GET` | `/api/v1/iac/dashboard` | Get the IaC dashboard summary grouped by environment | JWT |
| `GET` | `/api/v1/iac/module-drift` | List all module drift records ordered newest first | JWT |

## Authentication

The IaC API uses two distinct authentication mechanisms depending on the caller.

### JWT Bearer (user-facing endpoints)

All `GET` endpoints require a JWT issued by the Farm auth service. Pass the token in the `Authorization` header:

```yaml
Authorization: Bearer <jwt>
```

### IAC_INGEST_TOKEN (machine-to-machine ingest endpoints)

Ingest endpoints are called by automated tooling (Cultivator, Agronomist, CI pipelines) and use a dedicated token mechanism instead of JWT. They validate a static bearer token configured on the API server via the `IAC_INGEST_TOKEN` environment variable.

```yaml
Authorization: Bearer <iac-ingest-token>
```

Generate a secure token for your deployment with:

```bash
openssl rand -hex 32
```

Set the resulting value as `IAC_INGEST_TOKEN` in the API server environment. All ingest endpoints return `401` if the header is absent or the token does not match.

## Ingesting a Run Report

Records a completed Terraform or OpenTofu plan or apply run. Called by Cultivator or a CI pipeline after each run completes.

```bash
curl -X POST http://localhost:3000/api/v1/iac/runs/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <iac-ingest-token>" \
  -d '{
    "stackName": "core-networking",
    "environment": "production",
    "provider": "terraform",
    "type": "apply",
    "status": "succeeded",
    "resourceChanges": { "add": 2, "change": 1, "destroy": 0 },
    "triggeredBy": "github-actions",
    "pipelineUrl": "https://github.com/acme/infra/actions/runs/123",
    "startedAt": "2026-04-01T10:00:00Z",
    "finishedAt": "2026-04-01T10:04:30Z",
    "durationMs": 270000
  }'
```

### Response (201)

Returns the persisted `IacRun` object.

```json
{
  "id": "uuid",
  "stackName": "core-networking",
  "environment": "production",
  "provider": "terraform",
  "type": "apply",
  "status": "succeeded",
  "resourceChanges": { "add": 2, "change": 1, "destroy": 0 },
  "triggeredBy": "github-actions",
  "pipelineUrl": "https://github.com/acme/infra/actions/runs/123",
  "startedAt": "2026-04-01T10:00:00Z",
  "finishedAt": "2026-04-01T10:04:30Z",
  "durationMs": 270000,
  "createdAt": "2026-04-01T10:00:00Z"
}
```

## Importing Stacks

Bulk-upserts IaC stack definitions from a Cultivator discovery run. Records are matched by `name` + `environment`; existing records are updated in place. The `componentId` and `externalToolUrl` fields are preserved on an update unless they are explicitly re-sent in the payload.

```bash
curl -X POST http://localhost:3000/api/v1/iac/stacks/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <iac-ingest-token>" \
  -d '{
    "stacks": [
      {
        "name": "core-networking",
        "environment": "production",
        "provider": "terraform",
        "repositoryUrl": "https://github.com/acme/infra",
        "basePath": "stacks/core-networking",
        "externalToolUrl": "https://app.terraform.io/app/acme/workspaces/core-networking"
      }
    ]
  }'
```

### Response (201)

```json
{
  "created": 1,
  "updated": 0
}
```

## Ingesting Module Drift

Records outdated module references detected by an Agronomist scan. Farm computes `versionsBehind` automatically from the semver distance between `currentRef` and `latestRef`. Non-semver refs (e.g., commit SHAs or branch names) default to `versionsBehind: 1`.

```bash
curl -X POST http://localhost:3000/api/v1/iac/module-drift/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <iac-ingest-token>" \
  -d '{
    "modules": [
      {
        "stackPath": "stacks/networking/main.tf",
        "moduleName": "terraform-aws-modules/vpc/aws",
        "sourceUrl": "https://registry.terraform.io/terraform-aws-modules/vpc/aws",
        "currentRef": "v3.14.0",
        "latestRef": "v3.19.0"
      }
    ]
  }'
```

Returns `201` with an empty body.

## Listing Stacks

Returns all IaC stacks. Each record includes the most recent run summary as `latestRun`. Supports optional query parameters to narrow results.

| Parameter | Type | Description |
|-----------|------|-------------|
| `environment` | `string` | Filter by environment name (e.g., `production`) |
| `componentId` | `string` (UUID) | Filter by linked Service Catalog component |

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/stacks?environment=production"
```

### Response (200)

```json
[
  {
    "id": "uuid",
    "name": "core-networking",
    "environment": "production",
    "provider": "terraform",
    "repositoryUrl": "https://github.com/acme/infra",
    "basePath": "stacks/core-networking",
    "externalToolUrl": "https://app.terraform.io/app/acme/workspaces/core-networking",
    "componentId": "uuid or null",
    "latestRun": {
      "id": "uuid",
      "type": "apply",
      "status": "succeeded",
      "resourceChanges": { "add": 0, "change": 1, "destroy": 0 },
      "triggeredBy": "github-actions",
      "startedAt": "2026-04-01T10:00:00Z",
      "durationMs": 270000
    },
    "createdAt": "2026-04-01T00:00:00Z",
    "updatedAt": "2026-04-01T10:05:00Z"
  }
]
```

## Getting a Stack

Returns a single IaC stack by its UUID, including the most recent run summary.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/stacks/{id}"
```

Returns `404` if no stack with the given ID exists.

## Listing Runs for a Stack

Returns paginated run history for a specific stack, ordered newest first.

| Parameter | Type | Default | Maximum |
|-----------|------|---------|---------|
| `page` | `number` | `1` | — |
| `limit` | `number` | `20` | `100` |

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/stacks/{id}/runs?page=1&limit=20"
```

### Response (200)

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "apply",
      "status": "succeeded",
      "resourceChanges": { "add": 2, "change": 1, "destroy": 0 },
      "triggeredBy": "github-actions",
      "pipelineUrl": "https://github.com/acme/infra/actions/runs/123",
      "startedAt": "2026-04-01T10:00:00Z",
      "finishedAt": "2026-04-01T10:04:30Z",
      "durationMs": 270000,
      "createdAt": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 42
}
```

Returns `404` if no stack with the given ID exists.

## IaC Dashboard

Returns a summary of all stacks grouped by environment, intended for the Farm dashboard overview page.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/dashboard"
```

Returns `200` with a `DashboardDto` containing per-environment stack summaries.

## Module Drift Records

Returns all module drift records ordered by detection time, newest first.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/module-drift"
```

Returns `200` with an array of `IacModuleDrift` records.

## Ingesting Resource Topology

Atomically replaces the full resource topology (nodes and edges) for a stack. The previous topology for the stack is deleted before the new one is inserted, so each call represents the complete current state.

```bash
curl -X POST http://localhost:3000/api/v1/iac/stacks/{id}/resources/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <iac-ingest-token>" \
  -d '{
    "resources": [
      {
        "address": "aws_vpc.main",
        "type": "aws_vpc",
        "provider": "aws",
        "name": "main"
      }
    ],
    "dependencies": [
      {
        "sourceAddress": "aws_subnet.public",
        "targetAddress": "aws_vpc.main"
      }
    ]
  }'
```

Returns `201` with an empty body. Returns `404` if no stack with the given ID exists.

## Getting Resource Topology

Returns the resource topology for a stack as a graph of nodes and directed edges.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac/stacks/{id}/resources"
```

### Response (200)

```json
{
  "nodes": [
    {
      "address": "aws_vpc.main",
      "type": "aws_vpc",
      "provider": "aws",
      "name": "main"
    }
  ],
  "edges": [
    {
      "source": "aws_subnet.public",
      "target": "aws_vpc.main"
    }
  ]
}
```

Returns `404` if no stack with the given ID exists.

## Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Request body failed validation (any endpoint) |
| `401` | `Authorization` header is missing or the token does not match `IAC_INGEST_TOKEN` (ingest endpoints only) |
| `404` | The requested stack UUID does not exist |
| `500` | Unexpected server error |



