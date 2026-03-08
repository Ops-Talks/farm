# Environments API

The Environments API provides endpoints for managing deployment environments (e.g., development, staging, production).

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/environments` | List all environments (ordered by display order) | JWT |
| `GET` | `/api/environments/:id` | Get an environment by ID | JWT |
| `POST` | `/api/environments` | Create a new environment | JWT + Admin |
| `PATCH` | `/api/environments/:id` | Update an environment | JWT + Admin |
| `DELETE` | `/api/environments/:id` | Delete an environment | JWT + Admin |

## Environment Types

| Type | Description |
|------|-------------|
| `development` | Local or shared development environment |
| `staging` | Pre-production testing environment |
| `production` | Live production environment |
| `sandbox` | Isolated experimental environment |

## Creating an Environment

```bash
curl -X POST http://localhost:3000/api/environments \
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

Environments are returned sorted by the `order` field:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/environments
```

## Updating an Environment

```bash
curl -X PATCH http://localhost:3000/api/environments/{id} \
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
curl -X DELETE http://localhost:3000/api/environments/{id} \
  -H "Authorization: Bearer <token>"
```
