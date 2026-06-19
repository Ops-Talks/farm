# Pipelines API Reference

Base path: `/api/v1/pipelines`

All endpoints require a valid JWT bearer token. Include the `Authorization: Bearer <token>` header on every request.

---

## Pipeline Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "deploy-to-production",
  "description": "Runs tests, approval gate, then deploys.",
  "stages": [
    {
      "id": "stage-1",
      "name": "Run tests",
      "type": "script",
      "order": 1,
      "config": { "command": "npm test" }
    }
  ],
  "organizationId": null,
  "createdBy": "user-uuid",
  "createdAt": "2026-03-16T00:00:00.000Z",
  "updatedAt": "2026-03-16T00:00:00.000Z"
}
```

## Pipeline Run Object

```json
{
  "id": "run-uuid",
  "pipelineId": "pipeline-uuid",
  "status": "succeeded | queued | running | waiting_approval | failed | cancelled",
  "triggeredBy": "user-uuid",
  "startedAt": "2026-03-16T00:00:00.000Z",
  "finishedAt": "2026-03-16T00:00:05.000Z",
  "durationMs": 5000,
  "logs": "Stage 1 started...\nStage 1 succeeded.\n",
  "stageResults": [
    {
      "stageId": "stage-1",
      "status": "succeeded",
      "startedAt": "2026-03-16T00:00:00.000Z",
      "finishedAt": "2026-03-16T00:00:02.000Z",
      "output": ""
    }
  ],
  "createdAt": "2026-03-16T00:00:00.000Z",
  "updatedAt": "2026-03-16T00:00:05.000Z"
}
```

---

## Endpoints

### List Pipelines

`GET /api/v1/pipelines`

Returns all pipelines. Supports pagination and optional organization filter.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `organizationId` | UUID | Filter by organization |

**Response** `200 OK`

```json
{
  "data": [ /* Pipeline objects */ ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

### Create Pipeline

`POST /api/v1/pipelines`

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique pipeline name (2–100 chars) |
| `description` | string | No | Human-readable description |
| `stages` | PipelineStage[] | No | Ordered list of stages |

**Response** `201 Created` — the created Pipeline object.

**Error** `409 Conflict` — a pipeline with that name already exists.

---

### Get Pipeline

`GET /api/v1/pipelines/:id`

**Response** `200 OK` — the Pipeline object.

**Error** `404 Not Found`.

---

### Update Pipeline

`PATCH /api/v1/pipelines/:id`

**Request body** — any subset of `CreatePipelineDto` fields.

**Response** `200 OK` — the updated Pipeline object.

---

### Delete Pipeline

`DELETE /api/v1/pipelines/:id`

**Response** `204 No Content`.

---

### Trigger a Run

`POST /api/v1/pipelines/:id/trigger`

Enqueues a new pipeline execution. Returns immediately with the created run in `queued` status.

**Response** `201 Created` — the PipelineRun object with `status: "queued"`.

---

### List Runs

`GET /api/v1/pipelines/:id/runs`

Returns the last 50 runs for the pipeline, ordered by most recent first.

**Response** `200 OK`

```json
[ /* PipelineRun objects */ ]
```

---

### Get Run

`GET /api/v1/pipelines/:id/runs/:runId`

**Response** `200 OK` — the PipelineRun object including full `logs` and `stageResults`.

**Error** `404 Not Found` — run does not exist or does not belong to the pipeline.

---

## Run Actions

### Approve Run

`POST /api/v1/pipelines/:id/runs/:runId/approve`

Approves a run that is paused at an `approval` stage. The run must be in `waiting_approval` status. Execution resumes from the next stage after the approval gate.

- **Roles required**: `admin`
- **Response** `200 OK` — the updated PipelineRun object with `status: "running"`.
- **Error** `404 Not Found` — run does not exist or does not belong to this pipeline.
- **Error** `400 Bad Request` — run is not in `waiting_approval` status.

---

### Reject Run

`POST /api/v1/pipelines/:id/runs/:runId/reject`

Rejects a run paused at an `approval` stage. Sets the run status to `failed`.

- **Roles required**: `admin`
- **Response** `200 OK` — the updated PipelineRun object with `status: "failed"`.
- **Error** `400 Bad Request` — run is not in `waiting_approval` status.

---

### Cancel Run

`POST /api/v1/pipelines/:id/runs/:runId/cancel`

Cancels a run that is in `queued` or `running` status. The processor will abort before the next stage.

- **Roles required**: `admin`
- **Response** `200 OK` — the updated PipelineRun object with `status: "cancelled"`.
- **Error** `400 Bad Request` — run cannot be cancelled (already in a terminal state).

---

## Run Status

| Status | Description |
|--------|-------------|
| `queued` | Run created, waiting to start |
| `running` | Actively executing stages |
| `waiting_approval` | Paused at an approval stage, awaiting human action |
| `succeeded` | All stages completed successfully |
| `failed` | A stage failed or approval was rejected |
| `cancelled` | Run was cancelled before completion |

---

## WebSocket Events

Pipeline execution emits real-time events on the `/events` Socket.IO namespace.

| Event | Payload | Description |
|-------|---------|-------------|
| `pipeline.log` | `{ runId, stage, message }` | A log line emitted during stage execution |
| `pipeline.run.updated` | PipelineRun object (full) | Emitted when a run changes status, including transitions to `waiting_approval`, `succeeded`, `failed`, and `cancelled` |

See the [WebSocket documentation](../developer-guide/backend/websockets.md) for connection details.

---

## Stage Config Reference

Each stage type accepts specific `config` fields:

### `script`

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Shell command to execute |

### `approval`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Message shown to the approver |

### `deploy`

| Field | Type | Description |
|-------|------|-------------|
| `componentId` | UUID | Catalog component to deploy |
| `environmentId` | UUID | Target environment |

### `notify`

| Field | Type | Description |
|-------|------|-------------|
| `channel` | string | Notification channel (e.g., `#slack-channel`) |
| `message` | string | Message content |


