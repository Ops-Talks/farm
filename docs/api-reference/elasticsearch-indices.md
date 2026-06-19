# Elasticsearch Indices API Reference

Endpoints for linking Elasticsearch index patterns to catalog components and inspecting live index statistics.

All endpoints require a valid JWT access token in the `Authorization: Bearer <token>` header.

Base path: `/api/v1`

---

## Component-scoped endpoints

### List indices linked to a component

```http
GET /components/:id/elasticsearch-indices
```

Returns all Elasticsearch index links registered for the given catalog component.

**Path parameters**

| Parameter | Description |
|---|---|
| `id` | Catalog component UUID |

**Response** `200 OK`

```json
[
  {
    "id": "3f2a...",
    "indexPattern": "logs-app-*",
    "esUrl": "https://es.example.com:9200",
    "description": "Application JSON logs",
    "componentId": "8c1b...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

> **Note:** `esUrl` and `description` are nullable — they will be `null` when not set on the linked index record.

---

### Live stats for all indices linked to a component

```http
GET /components/:id/elasticsearch-indices/stats
```

Returns live statistics fetched directly from the Elasticsearch cluster for each linked index. The current implementation queries stats per linked record, one index pattern at a time, using the effective `esUrl` for that record. If a cluster is unreachable, the affected entry returns `reachable: false` and no `stats` field.

**Path parameters**

| Parameter | Description |
|---|---|
| `id` | Catalog component UUID |

**Response** `200 OK`

```json
[
  {
    "indexId": "3f2a...",
    "indexPattern": "logs-app-*",
    "esUrl": "https://es.example.com:9200",
    "reachable": true,
    "stats": {
      "pattern": "logs-app-*",
      "index": "logs-app-2025.01.01",
      "docsCount": 1500000,
      "storeSize": "2gb",
      "health": "green",
      "status": "open"
    }
  }
]
```

---

### Link an index to a component

```http
POST /components/:id/elasticsearch-indices
```

Links an Elasticsearch index pattern to a catalog component.

**Path parameters**

| Parameter | Description |
|---|---|
| `id` | Catalog component UUID |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `indexPattern` | `string` | Yes | Elasticsearch index name or pattern (e.g. `logs-app-*`). Max 255 characters. |
| `esUrl` | `string` | No | Elasticsearch cluster URL. Overrides the global `ELASTICSEARCH_URL`. Must use `http` or `https`. |
| `description` | `string` | No | Free-form description of the linked index. Max 1000 characters. |

```json
{
  "indexPattern": "logs-app-*",
  "esUrl": "https://es.example.com:9200",
  "description": "Application JSON logs"
}
```

**Response** `201 Created` — returns the created index link object.

---

### Remove an index link

```http
DELETE /components/:id/elasticsearch-indices/:indexId
```

Removes an Elasticsearch index link from a catalog component. Does not modify the actual index in Elasticsearch.

**Path parameters**

| Parameter | Description |
|---|---|
| `id` | Catalog component UUID |
| `indexId` | `ComponentElasticsearchIndex` UUID |

**Response** `204 No Content`

---

## Admin cross-component overview

```http
GET /elasticsearch/indices
```

Admin-only. Returns every Elasticsearch index link across all components, grouped by owning component. Stats are fetched in batches per unique cluster URL (no N+1 queries). When an `X-Organization-Id` header is provided, the result is scoped to that organization.

**Required role:** `admin`

**Headers**

| Header | Description |
|---|---|
| `X-Organization-Id` | (Optional) Organization UUID. When present, limits results to that org's components. |

**Response** `200 OK`

```json
[
  {
    "componentId": "8c1b...",
    "componentName": "my-service",
    "indices": [
      {
        "indexId": "3f2a...",
        "indexPattern": "logs-app-*",
        "esUrl": "https://es.example.com:9200",
        "reachable": true,
        "stats": {
          "pattern": "logs-app-*",
          "index": "logs-app-2025.01.01",
          "docsCount": 1500000,
          "storeSize": "2gb",
          "health": "green",
          "status": "open"
        }
      }
    ]
  }
]
```

Components with no linked indices are omitted from the response.

---

## Error responses

All endpoints return errors in the standard Farm error envelope:

```json
{
  "statusCode": 404,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/components/unknown-id/elasticsearch-indices",
  "message": "Component not found"
}
```

| Status | Condition |
|---|---|
| `400` | Validation failed (invalid UUID, missing required field) |
| `401` | Missing or invalid JWT token |
| `403` | Insufficient role (admin-only endpoint accessed by non-admin) |
| `404` | Component or index link not found |


