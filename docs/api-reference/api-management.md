# API Catalog and Lifecycle Management

APIs are first-class citizens in Farm alongside software components. Each component can register one or more API specifications in OpenAPI 3.x or AsyncAPI 2.x format. This enables teams to track API versions, detect breaking changes, manage deprecation, and identify downstream consumers — all from a central location.

## API Specification Ingestion

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/catalog/components/:id/api-specs` | Register a new API spec for a component | JWT |
| `GET` | `/api/catalog/components/:id/api-specs` | List all specs for a component | JWT |
| `GET` | `/api/api-specs/:id` | Get a single API spec | JWT |
| `DELETE` | `/api/api-specs/:id` | Remove an API spec | JWT + Admin |

### Request Body Fields — POST

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the spec |
| `format` | `openapi` \| `asyncapi` | No | Explicitly sets the spec format; auto-detected from content if omitted |
| `version` | string | Yes | Version string (e.g., `1.0.0`, `2.3.1`) |
| `spec` | string | Yes | Raw YAML or JSON content of the specification |

The `format` field is optional. If provided, it explicitly sets the format. If omitted, Farm inspects the spec content to determine whether it is an OpenAPI or AsyncAPI document.

### Example — Register an OpenAPI Spec

```bash
curl -X POST http://localhost:3000/api/catalog/components/550e8400-e29b-41d4-a716-446655440001/api-specs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Service API",
    "format": "openapi",
    "version": "1.0.0",
    "spec": "openapi: 3.0.0\ninfo:\n  title: User Service\n  version: 1.0.0\npaths:\n  /users:\n    get:\n      summary: List users\n      responses:\n        \"200\":\n          description: OK\n  /users/{id}:\n    delete:\n      summary: Delete a user\n      responses:\n        \"204\":\n          description: No Content"
  }'
```

**Response:**

```json
{
  "id": "a1b2c3d4-0000-0000-0000-000000000001",
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "User Service API",
  "format": "openapi",
  "version": "1.0.0",
  "status": "active",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

## Version Registry and Deprecation

Use the `PATCH` endpoint to transition a spec through its lifecycle: `active` → `deprecated` → `sunset`.

### Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `PATCH` | `/api/api-specs/:id` | Update status and sunset date | JWT + Admin |

### Request Body Fields — PATCH

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `active` \| `deprecated` \| `sunset` | No | New lifecycle status |
| `sunsetAt` | ISO 8601 string | No | Date when the spec will be fully removed |
| `deprecatedAt` | ISO 8601 string | No | Date when deprecation took effect |

When `status` is set to `deprecated` and `deprecatedAt` is not provided in the request body, Farm automatically sets `deprecatedAt` to the current timestamp.

When a spec transitions to `deprecated` status, Farm emits a `api-spec:deprecated` WebSocket event to all connected clients.

### Example — Deprecate a Spec

```bash
curl -X PATCH http://localhost:3000/api/api-specs/a1b2c3d4-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "deprecated",
    "sunsetAt": "2025-07-01T00:00:00.000Z"
  }'
```

**Response:**

```json
{
  "id": "a1b2c3d4-0000-0000-0000-000000000001",
  "status": "deprecated",
  "deprecatedAt": "2025-01-15T10:30:00.000Z",
  "sunsetAt": "2025-07-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

## Breaking Change Detection

Farm can compare two versions of an API spec and classify each change as breaking or non-breaking.

### Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/api-specs/:id/diff?compareWith=:otherId` | Compare two spec versions | JWT |

### Response — SpecDiffResult

```json
{
  "totalChanges": 3,
  "breakingChanges": 1,
  "entries": [
    { "type": "removed", "breaking": true, "path": "DELETE /users/{id}", "detail": "Operation removed" },
    { "type": "added", "breaking": false, "path": "GET /users/{id}/profile", "detail": "New operation added" },
    { "type": "modified", "breaking": false, "path": "GET /users", "detail": "Operation modified" }
  ]
}
```

### Classification Rules

**Breaking changes:**

- A path was removed from the spec
- An operation (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) was removed from an existing path
- A required request parameter was removed

**Non-breaking changes:**

- A new path was added
- A new operation was added to an existing path
- A new optional parameter was added

**AsyncAPI:** The diff compares top-level `channels` keys using the same classification rules as OpenAPI paths.

## Consumer Registry

Track which components and teams depend on a given API spec. Use this information to assess the blast radius of a deprecation before it takes effect.

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/api-specs/:id/consumers` | Register a consumer | JWT + Admin |
| `DELETE` | `/api/api-specs/:id/consumers/:consumerId` | Remove a consumer | JWT + Admin |
| `GET` | `/api/catalog/components/:id/consumed-apis` | List all specs consumed by a component | JWT |

### Request Body Fields — POST /consumers

At least one of `consumerComponentId` or `consumerTeamId` must be provided. A component or team can only be registered once per spec; duplicate registrations are rejected.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `consumerComponentId` | UUID | Conditional | ID of the consuming component |
| `consumerTeamId` | UUID | Conditional | ID of the consuming team |

### Example — Register a Consumer

```bash
curl -X POST http://localhost:3000/api/api-specs/a1b2c3d4-0000-0000-0000-000000000001/consumers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "consumerComponentId": "550e8400-e29b-41d4-a716-446655440002"
  }'
```

### Use Case — Impact Assessment Before Deprecation

Before deprecating an API, query `/consumed-apis` to identify all downstream consumers that will be affected. This allows you to notify teams, set a realistic sunset date, and coordinate migrations before marking the spec as deprecated.

```bash
# Find all components that consume the spec's parent component's APIs
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/catalog/components/550e8400-e29b-41d4-a716-446655440001/consumed-apis
```

## Frontend

The "API Specs" tab appears on the component detail page and provides a full management interface without leaving the portal.

- The left panel lists all registered specs for the component, each showing the version string, format (`openapi` or `asyncapi`), and a status badge (`active`, `deprecated`, or `sunset`).
- The right panel renders a spec viewer. OpenAPI specs are displayed using Swagger UI. AsyncAPI specs are displayed as a formatted YAML or JSON viewer.
- The "Compare with version" dropdown triggers the diff endpoint for the selected spec pair and renders a table of changes, with breaking changes highlighted.
- The "+ Add Spec" button opens a dialog to upload or paste a new spec, specify the name, version, and format.
- "Deprecate" and "Delete" actions are available to admin users from the spec detail view, each requiring confirmation before proceeding.

## Authentication and Authorization

All API Catalog endpoints require a valid JWT in the `Authorization` header.

| Access Level | Endpoints |
|--------------|-----------|
| JWT (any authenticated user) | `GET /api/catalog/components/:id/api-specs`, `GET /api/api-specs/:id`, `GET /api/api-specs/:id/diff`, `GET /api/catalog/components/:id/consumed-apis` |
| JWT + Admin role | `POST /api/catalog/components/:id/api-specs`, `PATCH /api/api-specs/:id`, `DELETE /api/api-specs/:id`, `POST /api/api-specs/:id/consumers`, `DELETE /api/api-specs/:id/consumers/:consumerId` |

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/catalog/components/<id>/api-specs
```

## WebSocket Events

Farm emits real-time events over WebSocket when API spec state changes. Connect to the WebSocket gateway to receive live notifications.

| Event | Trigger | Payload |
|-------|---------|---------|
| `api-spec:deprecated` | A spec transitions to `deprecated` status | `{ id, componentId, name, version, status, deprecatedAt }` |

### Example Payload — api-spec:deprecated

```json
{
  "id": "a1b2c3d4-0000-0000-0000-000000000001",
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "User Service API",
  "version": "1.0.0",
  "status": "deprecated",
  "deprecatedAt": "2025-01-15T10:30:00.000Z"
}
```
