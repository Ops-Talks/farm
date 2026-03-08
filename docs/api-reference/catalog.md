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
