# Incident API

The Incident API provides endpoints for tracking production incidents, managing their lifecycle through status transitions, recording timeline entries, and creating post-mortem analyses.

## Base URL

```text
/api/v1/incidents
/api/v1/post-mortems
```

## Authentication

All endpoints require a valid JWT token via `Authorization: Bearer <token>` header.

## Incident Endpoints

### List Incidents

```http
GET /api/v1/incidents
```

**Query Parameters:**

| Parameter  | Type   | Description                          |
|------------|--------|--------------------------------------|
| `severity` | string | Filter by severity (P1-P4)          |
| `status`   | string | Filter by status                     |
| `skip`     | number | Pagination offset (default: 0)       |
| `take`     | number | Page size (default: 20)              |

**Response:** `200 OK` — Paginated list of incidents.

### Create Incident

```http
POST /api/v1/incidents
```

**Requires:** `admin` role.

**Request Body:**

| Field                     | Type     | Required | Description                         |
|---------------------------|----------|----------|-------------------------------------|
| `title`                   | string   | Yes      | Short title summarizing the incident |
| `severity`                | string   | Yes      | One of: `P1`, `P2`, `P3`, `P4`     |
| `description`             | string   | No       | Detailed description                 |
| `commanderUserId`         | string   | No       | UUID of the incident commander       |
| `affectedComponentIds`    | string[] | No       | UUIDs of affected components         |
| `affectedEnvironmentIds`  | string[] | No       | UUIDs of affected environments       |

**Response:** `201 Created`

### Get Incident

```http
GET /api/v1/incidents/:id
```

Returns the incident with all relations (affected components, environments, updates).

**Response:** `200 OK`

### Update Incident

```http
PATCH /api/v1/incidents/:id
```

**Requires:** `admin` role. Accepts partial updates.

**Response:** `200 OK`

### Update Incident Status

```http
PATCH /api/v1/incidents/:id/status
```

**Requires:** `admin` role. Validates allowed status transitions.

**Request Body:**

| Field     | Type   | Required | Description                      |
|-----------|--------|----------|----------------------------------|
| `status`  | string | Yes      | Target status                    |
| `message` | string | No       | Message for the timeline entry   |

**Allowed Transitions:**

| From            | To                                          |
|-----------------|---------------------------------------------|
| `open`          | `investigating`, `identified`, `resolved`   |
| `investigating` | `identified`, `resolved`                    |
| `identified`    | `resolved`                                  |
| `resolved`      | (terminal state)                            |

**Response:** `200 OK`

### Delete Incident

```http
DELETE /api/v1/incidents/:id
```

**Requires:** `admin` role.

**Response:** `204 No Content`

## Timeline Endpoints

### Create Timeline Entry

```http
POST /api/v1/incidents/:id/updates
```

Creates a manual timeline entry. Available to any authenticated user.

**Request Body:**

| Field      | Type   | Required | Description               |
|------------|--------|----------|---------------------------|
| `message`  | string | Yes      | Update message            |
| `authorId` | string | No       | UUID of the entry author  |

**Response:** `201 Created`

### Get Timeline

```http
GET /api/v1/incidents/:id/timeline
```

Returns all timeline entries for an incident, ordered chronologically.

**Response:** `200 OK` — Array of IncidentUpdate objects.

## Post-Mortem Endpoints

### Create Post-Mortem

```http
POST /api/v1/post-mortems
```

**Requires:** `admin` role. Each incident can have at most one post-mortem.

**Request Body:**

| Field                 | Type                   | Required | Description                        |
|-----------------------|------------------------|----------|------------------------------------|
| `incidentId`          | string                 | Yes      | UUID of the related incident       |
| `rootCause`           | string                 | Yes      | Root cause analysis                |
| `contributingFactors` | string[]               | No       | List of contributing factors       |
| `actionItems`         | ActionItem[]           | No       | Follow-up action items             |
| `body`                | string                 | No       | Full post-mortem write-up          |

**ActionItem Object:**

| Field      | Type    | Description                |
|------------|---------|----------------------------|
| `title`    | string  | Action item description    |
| `assignee` | string  | Assigned person (optional) |
| `done`     | boolean | Completion status          |

**Response:** `201 Created`

### Get Post-Mortem

```http
GET /api/v1/post-mortems/:id
```

**Response:** `200 OK`

### Get Post-Mortem by Incident

```http
GET /api/v1/post-mortems/by-incident/:incidentId
```

**Response:** `200 OK`

### Update Post-Mortem

```http
PATCH /api/v1/post-mortems/:id
```

**Requires:** `admin` role.

**Response:** `200 OK`

### Approve Post-Mortem

```http
PATCH /api/v1/post-mortems/:id/approve
```

**Requires:** `admin` role. Sets the `approvedBy` and `approvedAt` fields. The approving user is derived from the JWT token.

**Response:** `200 OK`

## WebSocket Events

The following events are emitted via the WebSocket gateway when incidents are created or status changes occur:

| Event                      | Payload                                                |
|---------------------------|--------------------------------------------------------|
| `INCIDENT_CREATED`         | `{ incidentId, title, severity }`                     |
| `INCIDENT_STATUS_CHANGED`  | `{ incidentId, previousStatus, newStatus, updatedBy }` |

## Enums

### IncidentSeverity

| Value | Description |
|-------|-------------|
| `P1`  | Critical    |
| `P2`  | High        |
| `P3`  | Medium      |
| `P4`  | Low         |

### IncidentStatus

| Value           | Description                     |
|-----------------|---------------------------------|
| `open`          | Incident reported, not yet triaged |
| `investigating` | Team is investigating           |
| `identified`    | Root cause identified           |
| `resolved`      | Incident resolved               |


