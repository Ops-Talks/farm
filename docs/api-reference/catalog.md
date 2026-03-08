# Catalog API

The Catalog API provides endpoints for managing software components in the Farm catalog.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/catalog/components` | List all components | JWT |
| `GET` | `/api/catalog/components/:id` | Get a component by ID | JWT |
| `POST` | `/api/catalog/components` | Create a new component | JWT + Admin |
| `PATCH` | `/api/catalog/components/:id` | Update a component | JWT + Admin |
| `DELETE` | `/api/catalog/components/:id` | Delete a component | JWT + Admin |
| `POST` | `/api/catalog/register-yaml` | Register a component from YAML | JWT + Admin |
| `POST` | `/api/catalog/locations` | Discover components from a git repo | JWT + Admin |

## Filtering by Domain Group

The `GET /api/catalog/components` endpoint supports a `kindGroup` query parameter to filter components by team domain:

| Value | Kinds Included |
|-------|---------------|
| `dev` | service, library, website, api, component, system, domain, resource |
| `infra` | pipeline, queue, database, storage, cluster, network |
| `data` | dataset, data-pipeline, ml-model |
| `security` | secret, policy, certificate |

**Example:**

```bash
# List only infrastructure components
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/catalog/components?kindGroup=infra
```

## Pagination

All list endpoints return paginated responses. The following query parameters are supported:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | integer | `0` | Number of records to skip |
| `take` | integer | `20` | Number of records to return (max 100) |

**Example:**

```bash
# List components with pagination and filtering
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/catalog/components?kindGroup=infra&skip=0&take=10"
```

### Paginated Response Format

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "my-service",
      "kind": "service",
      "owner": "platform-engineering",
      "lifecycle": "production"
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 10
}
```

## Caching

The following GET endpoints use automatic response caching:

| Endpoint | Cached | TTL |
|----------|--------|-----|
| `GET /api/catalog/components` | Yes | Configured via `CACHE_TTL` env var (default: 30s) |
| `GET /api/catalog/components/:id` | Yes | Configured via `CACHE_TTL` env var (default: 30s) |

Cache is automatically invalidated when components are created, updated, deleted, or registered via YAML. No manual cache management is required.
