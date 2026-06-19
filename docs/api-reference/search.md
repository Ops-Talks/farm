# Search API

The Search API provides a quick search endpoint that queries catalog components, teams, documentation, environments, and pipelines in a single request.

## Base Path

`/api/v1/search`

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/search/quick` | Quick search across all entity types | JWT |

---

## Quick Search

Searches across catalog components, teams, documentation pages, environments, and pipelines. When the `X-Organization-Id` request header is present, results are scoped to that organization.

```http
GET /api/v1/search/quick?q=payment&limit=10
Authorization: Bearer <token>
X-Organization-Id: <org-id>   (optional)
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query string. Minimum 2 characters. |
| `limit` | number | No | Maximum number of results to return (default: `10`, max: `100`) |

### Response (200)

Returns an array of `QuickSearchResult` objects ordered by relevance.

```json
[
  {
    "type": "component",
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "payment-service",
    "description": "Handles payment processing and refunds",
    "url": "/catalog/components/550e8400-e29b-41d4-a716-446655440001"
  },
  {
    "type": "team",
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "payments-team",
    "description": "Owns all payment-related services",
    "url": "/teams/7c9e6679-7425-40de-944b-e07fc1f90ae7"
  },
  {
    "type": "documentation",
    "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "name": "Payment Service Architecture",
    "url": "/docs/3f2504e0-4f89-11d3-9a0c-0305e82c3301"
  }
]
```

### QuickSearchResult Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Entity type: `component`, `team`, `documentation`, `environment`, `pipeline` |
| `id` | string | UUID of the matched entity |
| `name` | string | Display name of the entity |
| `description` | string | Short description. Omitted from the response when not available (not returned as `null`). |
| `url` | string | Relative URL to the entity detail page in the Farm UI. Always present. |

---

## Error Responses

| Status | Cause |
|--------|-------|
| 401 | Missing or invalid JWT token |


