# Audit Log API

The Audit Log API provides read access to the immutable audit trail of all resource mutations performed within the Farm platform.

## Base Path

`/api/v1/audit-logs`

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/audit-logs` | List audit log entries with optional filters | JWT + Admin |

## List Audit Log Entries

```http
GET /api/v1/audit-logs
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resourceType` | string | No | Filter by resource type (e.g., `Component`, `Team`, `Environment`) |
| `resourceId` | string (UUID) | No | Filter by specific resource UUID |
| `actorId` | string (UUID) | No | Filter by the user who performed the action |
| `limit` | number | No | Maximum number of entries to return (default: `100`) |

### Response (200)

Returns an array of audit log entries ordered newest first.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "actor": "jane.doe",
    "actorId": "550e8400-e29b-41d4-a716-446655440010",
    "action": "CREATE",
    "resourceType": "Component",
    "resourceId": "550e8400-e29b-41d4-a716-446655440020",
    "payload": {
      "before": null,
      "after": { "name": "my-service", "kind": "service" }
    },
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Action Values

| Action | Description |
|--------|-------------|
| `CREATE` | Resource was created |
| `UPDATE` | Resource was modified |
| `DELETE` | Resource was deleted |
| `LOGIN` | User authenticated |
| `REGISTER` | User registered |

## Access Control

All audit log endpoints require:
- A valid JWT Bearer token (`JwtAuthGuard`)
- The `admin` role (`RolesGuard`)

Regular users cannot query audit logs. Requests without the admin role return `403 Forbidden`.

## Organization Scoping

When the `X-Organization-Id` request header is provided, results are automatically scoped to the specified organization.

## Real-Time Events

New audit log entries are broadcast in real time over WebSocket as `audit_log.created` events. Frontend clients subscribed to the Farm WebSocket gateway receive these notifications automatically.


