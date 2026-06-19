# Environments API

The Environments API provides endpoints for managing deployment environments (e.g., development, staging, production).

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/environments` | List all environments (ordered by display order) | JWT |
| `GET` | `/api/v1/environments/:id` | Get an environment by ID | JWT |
| `POST` | `/api/v1/environments` | Create a new environment | JWT + Admin |
| `PATCH` | `/api/v1/environments/:id` | Update an environment | JWT + Admin |
| `DELETE` | `/api/v1/environments/:id` | Delete an environment | JWT + Admin |

## Environment Types

| Type | Description |
|------|-------------|
| `development` | Local or shared development environment |
| `staging` | Pre-production testing environment |
| `production` | Live production environment |
| `sandbox` | Isolated experimental environment |

## Creating an Environment

```bash
curl -X POST http://localhost:3000/api/v1/environments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "production",
    "description": "Production environment for all services",
    "type": "production",
    "order": 3,
    "metadata": {
      "region": "us-east-1",
      "provider": "aws"
    }
  }'
```

## Listing Environments

Environments are returned sorted by the `order` field. Supports pagination via `skip` and `take` query parameters (defaults: `skip=0`, `take=20`, max `take=100`).

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/environments?skip=0&take=20"
```

### Paginated Response (200)

```json
{
  "data": [
    {
      "id": "...",
      "name": "production",
      "type": "production",
      "order": 3
    }
  ],
  "total": 4,
  "skip": 0,
  "take": 20
}
```

## Updating an Environment

```bash
curl -X PATCH http://localhost:3000/api/v1/environments/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "description": "Updated description",
    "order": 5
  }'
```

## Deleting an Environment

Deleting an environment will cascade-delete all associated deployments.

```bash
curl -X DELETE http://localhost:3000/api/v1/environments/{id} \
  -H "Authorization: Bearer <token>"
```



