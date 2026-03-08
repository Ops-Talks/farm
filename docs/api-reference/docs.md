# Documentation API

The Documentation API provides endpoints for managing technical documentation associated with catalog components.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/docs` | List documentation entries (paginated) | JWT |
| `GET` | `/api/v1/docs/tree` | Get hierarchical documentation tree | JWT |
| `GET` | `/api/v1/docs/search` | Search documentation by query | JWT |
| `GET` | `/api/v1/docs/:id` | Get a documentation entry by ID | JWT |
| `GET` | `/api/v1/docs/:id/content` | Get raw content of a documentation entry | JWT |
| `GET` | `/api/v1/docs/:id/rendered` | Get rendered HTML of a documentation entry | JWT |
| `POST` | `/api/v1/docs` | Create a new documentation entry | JWT + Admin |
| `PATCH` | `/api/v1/docs/:id` | Update a documentation entry | JWT + Admin |
| `DELETE` | `/api/v1/docs/:id` | Delete a documentation entry | JWT + Admin |

## Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Title of the documentation entry |
| `sourceUrl` | string | Yes | URL to the documentation source (e.g., Markdown file in a repo) |
| `componentId` | UUID | Yes | ID of the associated catalog component |
| `parentId` | UUID | No | ID of the parent documentation entry (for nesting) |
| `order` | integer | No | Display order among sibling entries |

## Pagination

List endpoints return paginated responses with `skip` and `take` query parameters (defaults: `skip=0`, `take=20`, max `take=100`).

You can also filter by `componentId`:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/docs?componentId=<uuid>&skip=0&take=10"
```

### Paginated Response (200)

```json
{
  "data": [
    {
      "id": "...",
      "title": "Getting Started",
      "sourceUrl": "https://github.com/org/repo/blob/main/docs/getting-started.md",
      "componentId": "...",
      "parentId": null,
      "order": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 15,
  "skip": 0,
  "take": 10
}
```

## Creating Documentation

```bash
curl -X POST http://localhost:3000/api/v1/docs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Getting Started",
    "sourceUrl": "https://github.com/org/repo/blob/main/docs/getting-started.md",
    "componentId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

## Documentation Tree

Returns the hierarchical documentation tree for a component:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/docs/tree?componentId=<uuid>"
```

## Search

Search documentation entries by query string:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/docs/search?q=getting+started"
```

## Deleting Documentation

```bash
curl -X DELETE http://localhost:3000/api/docs/{id} \
  -H "Authorization: Bearer <token>"
```

Returns `204 No Content` on success.
