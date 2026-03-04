# Documentation API

The Documentation API provides endpoints for managing technical documentation associated with catalog components.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/docs | Create documentation |
| GET | /api/docs | List all documentation |
| GET | /api/docs/:id | Get specific documentation |
| PATCH | /api/docs/:id | Update documentation |
| DELETE | /api/docs/:id | Delete documentation |

## Data Types

### Documentation

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| title | string | Documentation title |
| content | string | Documentation content (Markdown) |
| componentId | string | Associated component UUID |
| author | string | Author name or team |
| version | string | Version string |
| createdAt | string (ISO 8601) | Creation timestamp |
| updatedAt | string (ISO 8601) | Last update timestamp |

## Create Documentation

Create a new documentation entry.

```
POST /api/docs
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Documentation title |
| content | string | Yes | Documentation content |
| componentId | string | Yes | Associated component UUID |
| author | string | Yes | Author name or team |
| version | string | No | Version string (default: 1.0.0) |

### Response

**Status Code**: 201 Created

Returns the created documentation.

### Example

```bash
curl -X POST http://localhost:3000/api/docs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Service API Guide",
    "content": "# User Service API\n\n## Overview\n\nThis guide covers the User Service API...",
    "componentId": "550e8400-e29b-41d4-a716-446655440000",
    "author": "platform-team",
    "version": "1.0.0"
  }'
```

Response:

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "User Service API Guide",
  "content": "# User Service API\n\n## Overview\n\nThis guide covers the User Service API...",
  "componentId": "550e8400-e29b-41d4-a716-446655440000",
  "author": "platform-team",
  "version": "1.0.0",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

## List Documentation

Retrieve all documentation entries, optionally filtered by component.

```
GET /api/docs
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| componentId | string | No | Filter by component UUID |

### Response

**Status Code**: 200 OK

Returns an array of documentation entries.

### Example: List All

```bash
curl http://localhost:3000/api/docs
```

### Example: Filter by Component

```bash
curl "http://localhost:3000/api/docs?componentId=550e8400-e29b-41d4-a716-446655440000"
```

Response:

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "title": "User Service API Guide",
    "content": "# User Service API...",
    "componentId": "550e8400-e29b-41d4-a716-446655440000",
    "author": "platform-team",
    "version": "1.0.0",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
]
```

## Get Documentation

Retrieve a specific documentation entry by ID.

```
GET /api/docs/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Documentation UUID |

### Response

**Status Code**: 200 OK

Returns the documentation entry.

**Error**: 404 Not Found if the documentation does not exist.

### Example

```bash
curl http://localhost:3000/api/docs/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

## Update Documentation

Update an existing documentation entry.

```
PATCH /api/docs/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Documentation UUID |

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Documentation title |
| content | string | Documentation content |
| componentId | string | Associated component UUID |
| author | string | Author name or team |
| version | string | Version string |

### Response

**Status Code**: 200 OK

Returns the updated documentation entry.

**Error**: 404 Not Found if the documentation does not exist.

### Example

```bash
curl -X PATCH http://localhost:3000/api/docs/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# User Service API\n\n## Updated Overview\n\nThis is the updated content...",
    "version": "1.1.0"
  }'
```

## Delete Documentation

Remove a documentation entry.

```
DELETE /api/docs/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Documentation UUID |

### Response

**Status Code**: 204 No Content

**Error**: 404 Not Found if the documentation does not exist.

### Example

```bash
curl -X DELETE http://localhost:3000/api/docs/7c9e6679-7425-40de-944b-e07fc1f90ae7
```
