# Environment Requests API

The Environment Requests API provides endpoints for self-service environment provisioning with an approval workflow. Users can request ephemeral or persistent environments, and administrators can approve, reject, or expire them.

## Base URL

```
/api/v1/environment-requests
```

## Authentication

All endpoints require a valid JWT token via `Authorization: Bearer <token>` header.

## Endpoints

### List Requests

```http
GET /api/v1/environment-requests
```

**Query Parameters:**

| Parameter        | Type   | Description                                |
|------------------|--------|--------------------------------------------|
| `status`         | string | Filter by request status                   |
| `type`           | string | Filter by environment type                 |
| `requestedBy`    | string | Filter by requesting user UUID             |
| `organizationId` | string | Filter by organization UUID               |
| `skip`           | number | Pagination offset (default: 0)             |
| `take`           | number | Page size (default: 20)                    |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "feature-xyz-preview",
      "description": "Preview environment for feature XYZ",
      "type": "ephemeral",
      "tier": "small",
      "ttlHours": 48,
      "componentId": "uuid",
      "status": "pending",
      "statusMessage": null,
      "requestedBy": "uuid",
      "reviewedBy": null,
      "reviewComment": null,
      "expiresAt": null,
      "organizationId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 20
}
```

### Create Request

```http
POST /api/v1/environment-requests
```

**Request Body:**

| Field         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| `name`        | string | Yes      | Name for the requested environment                |
| `description` | string | No       | Human-readable justification for the request      |
| `type`        | string | Yes      | One of: `ephemeral`, `persistent`                 |
| `tier`        | string | Yes      | One of: `small`, `medium`, `large`                |
| `ttlHours`    | number | No       | Time to live in hours (required for ephemeral)    |
| `componentId` | string | No       | UUID of the component this environment serves     |

**Response:** `201 Created`

### Get Request

```http
GET /api/v1/environment-requests/:id
```

**Response:** `200 OK` with the environment request object.

### Update Request

```http
PATCH /api/v1/environment-requests/:id
```

Only requests in `pending` status can be updated.

**Request Body:**

| Field         | Type   | Required | Description                                    |
|---------------|--------|----------|------------------------------------------------|
| `name`        | string | No       | Updated environment name                       |
| `description` | string | No       | Updated description                            |
| `ttlHours`    | number | No       | Updated time to live in hours                  |

**Response:** `200 OK` with the updated request.

### Delete Request

```http
DELETE /api/v1/environment-requests/:id
```

**Requires:** `admin` role. Only requests in `pending` status can be deleted.

**Response:** `204 No Content`

### Approve Request

```http
POST /api/v1/environment-requests/:id/approve
```

**Requires:** `admin` role.

**Request Body:**

| Field     | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| `comment` | string | No       | Optional approval comment             |

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "feature-xyz-preview",
  "status": "active",
  "statusMessage": "Approved for provisioning",
  "reviewedBy": "uuid",
  "provisionedAt": "2024-01-01T00:00:05.000Z",
  "expiresAt": "2024-01-03T00:00:05.000Z",
  "updatedAt": "2024-01-01T00:00:05.000Z"
}
```

### Reject Request

```http
POST /api/v1/environment-requests/:id/reject
```

**Requires:** `admin` role.

**Request Body:**

| Field     | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| `comment` | string | No       | Optional rejection reason             |

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "feature-xyz-preview",
  "status": "rejected",
  "statusMessage": "Request rejected",
  "reviewedBy": "uuid",
  "reviewComment": "Use the existing staging environment instead",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Expire Request

```http
POST /api/v1/environment-requests/:id/expire
```

**Requires:** `admin` role. Only requests in `active` status can be expired.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "feature-xyz-preview",
  "status": "expired",
  "statusMessage": "Environment expired by administrator",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Status Transitions

Environment requests follow a defined state machine:

```
pending --> approved --> provisioning --> active --> expired
  |
  +--> rejected
```

| From           | To             | Trigger                              |
|----------------|----------------|--------------------------------------|
| `pending`      | `approved`     | Admin approves the request           |
| `pending`      | `rejected`     | Admin rejects the request            |
| `approved`     | `provisioning` | System begins environment setup      |
| `provisioning` | `active`       | Environment is ready for use         |
| `active`       | `expired`      | TTL elapsed or admin expires manually|

## Enums

### EnvironmentRequestStatus

| Value          | Description                                    |
|----------------|------------------------------------------------|
| `pending`      | Request submitted, awaiting admin review       |
| `approved`     | Request approved, awaiting provisioning        |
| `rejected`     | Request rejected by an administrator           |
| `provisioning` | Environment is being created                   |
| `active`       | Environment is running and available           |
| `expired`      | Environment has been torn down                 |

### EnvironmentType

| Value        | Description                                      |
|--------------|--------------------------------------------------|
| `ephemeral`  | Short-lived environment with a TTL               |
| `persistent` | Long-lived environment without automatic expiry  |

### EnvironmentTier

| Value    | Description                                        |
|----------|----------------------------------------------------|
| `small`  | Minimal resources for lightweight testing          |
| `medium` | Standard resources for integration testing         |
| `large`  | Full resources for performance and load testing    |
