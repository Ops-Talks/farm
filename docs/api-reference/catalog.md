# Catalog API

The Catalog API provides endpoints for managing software components in the Farm catalog.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/catalog/components | Create a new component |
| GET | /api/catalog/components | List all components |
| GET | /api/catalog/components/:id | Get a specific component |
| PATCH | /api/catalog/components/:id | Update a component |
| DELETE | /api/catalog/components/:id | Delete a component |

## Data Types

### Component

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| name | string | Component name |
| kind | ComponentKind | Type of component |
| description | string | Component description |
| owner | string | Owner team or individual |
| lifecycle | ComponentLifecycle | Lifecycle stage |
| tags | string[] | Tags for categorization |
| links | ComponentLink[] | External links |
| metadata | object | Custom key-value pairs |
| createdAt | string (ISO 8601) | Creation timestamp |
| updatedAt | string (ISO 8601) | Last update timestamp |

### ComponentKind

| Value | Description |
|-------|-------------|
| service | Backend service or microservice |
| library | Shared library or package |
| website | Frontend website or application |
| api | API definition or gateway |
| component | Generic software component |

### ComponentLifecycle

| Value | Description |
|-------|-------------|
| experimental | Under development, not production-ready |
| production | Stable and in active use |
| deprecated | Scheduled for removal |

## Create Component

Create a new component in the catalog.

```
POST /api/catalog/components
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Component name |
| kind | ComponentKind | Yes | Type of component |
| description | string | No | Component description |
| owner | string | Yes | Owner team or individual |
| lifecycle | ComponentLifecycle | No | Lifecycle stage (default: experimental) |
| tags | string[] | No | Tags for categorization |
| metadata | object | No | Custom key-value pairs |

### Response

**Status Code**: 201 Created

Returns the created component.

### Example

```bash
curl -X POST http://localhost:3000/api/catalog/components \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "kind": "service",
    "description": "Handles user management",
    "owner": "platform-team",
    "lifecycle": "production",
    "tags": ["backend", "auth"],
    "metadata": {
      "repository": "https://github.com/example/user-service"
    }
  }'
```

Response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "user-service",
  "kind": "service",
  "description": "Handles user management",
  "owner": "platform-team",
  "lifecycle": "production",
  "tags": ["backend", "auth"],
  "links": [],
  "metadata": {
    "repository": "https://github.com/example/user-service"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## List Components

Retrieve all components from the catalog.

```
GET /api/catalog/components
```

### Response

**Status Code**: 200 OK

Returns an array of all components.

### Example

```bash
curl http://localhost:3000/api/catalog/components
```

Response:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "user-service",
    "kind": "service",
    "description": "Handles user management",
    "owner": "platform-team",
    "lifecycle": "production",
    "tags": ["backend", "auth"],
    "links": [],
    "metadata": {},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## Get Component

Retrieve a specific component by ID.

```
GET /api/catalog/components/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Component UUID |

### Response

**Status Code**: 200 OK

Returns the component.

**Error**: 404 Not Found if the component does not exist.

### Example

```bash
curl http://localhost:3000/api/catalog/components/550e8400-e29b-41d4-a716-446655440000
```

## Update Component

Update an existing component.

```
PATCH /api/catalog/components/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Component UUID |

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Component name |
| kind | ComponentKind | Type of component |
| description | string | Component description |
| owner | string | Owner team or individual |
| lifecycle | ComponentLifecycle | Lifecycle stage |
| tags | string[] | Tags for categorization |
| metadata | object | Custom key-value pairs |

### Response

**Status Code**: 200 OK

Returns the updated component.

**Error**: 404 Not Found if the component does not exist.

### Example

```bash
curl -X PATCH http://localhost:3000/api/catalog/components/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "lifecycle": "deprecated",
    "description": "This service is being phased out"
  }'
```

## Delete Component

Remove a component from the catalog.

```
DELETE /api/catalog/components/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Component UUID |

### Response

**Status Code**: 204 No Content

**Error**: 404 Not Found if the component does not exist.

### Example

```bash
curl -X DELETE http://localhost:3000/api/catalog/components/550e8400-e29b-41d4-a716-446655440000
```
