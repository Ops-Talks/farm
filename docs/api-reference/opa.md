# OPA API

The OPA API provides endpoints for checking Open Policy Agent server reachability, evaluating policies on demand, and retrieving persisted evaluation results linked to catalog components.

## Base Path

`/api/v1/opa`

## Prerequisites

- An OPA server must be running and accessible (e.g. `opa run --server`)
- `OPA_URL` environment variable must point to the OPA server base URL (default: `http://localhost:8181`)
- All endpoints require JWT authentication

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/opa/status` | Check OPA server reachability | JWT |
| `POST` | `/api/v1/opa/evaluate` | Evaluate an OPA policy with a given input document | JWT |
| `GET` | `/api/v1/opa/results/:componentId` | List stored OPA evaluation results for a component | JWT |

---

## Check OPA Status

```http
GET /api/v1/opa/status
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "reachable": true,
  "url": "http://localhost:8181"
}
```

When the OPA server is unreachable:

```json
{
  "reachable": false,
  "url": "http://localhost:8181"
}
```

---

## Evaluate a Policy

```http
POST /api/v1/opa/evaluate
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyPath` | string | Yes | OPA policy path to evaluate, e.g. `data/app/rbac/allow` |
| `input` | object | Yes | Arbitrary input document passed to the policy |
| `componentId` | string | No | Catalog component UUID. When provided, the result is persisted to the database. |

```json
{
  "policyPath": "data/app/rbac/allow",
  "input": {
    "user": "alice",
    "action": "read",
    "resource": "reports"
  },
  "componentId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Response (200)

```json
{
  "policyPath": "data/app/rbac/allow",
  "allowed": true,
  "violations": []
}
```

When the policy denies the request:

```json
{
  "policyPath": "data/app/rbac/allow",
  "allowed": false,
  "violations": [
    { "message": "User 'alice' does not have 'write' permission on 'reports'" }
  ]
}
```

Results are automatically saved to the database when `componentId` is included. Persisted results can be viewed on the OPA Evaluation tab of the component detail page.

---

## List Evaluation Results

Returns all persisted OPA evaluation results for the given catalog component, ordered by evaluation time descending.

```http
GET /api/v1/opa/results/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `componentId` | UUID of the catalog component |

### Response (200)

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "componentId": "550e8400-e29b-41d4-a716-446655440001",
    "policyPath": "data/app/rbac/allow",
    "allowed": true,
    "violations": [],
    "evaluatedAt": "2025-06-01T12:00:00Z"
  },
  {
    "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "componentId": "550e8400-e29b-41d4-a716-446655440001",
    "policyPath": "data/security/deny",
    "allowed": false,
    "violations": [
      { "message": "Image tag is not pinned to a digest" }
    ],
    "evaluatedAt": "2025-05-30T09:00:00Z"
  }
]
```

---

## Gatekeeper Integration

Kubernetes Gatekeeper ConstraintTemplates and constraint violations are readable from the cluster via the Kubernetes API. See the [Kubernetes API Reference](kubernetes.md) for the following endpoints:

- `GET /api/v1/kubernetes/gatekeeper/enabled` - Check if Gatekeeper is installed
- `GET /api/v1/kubernetes/gatekeeper/constraint-templates` - List ConstraintTemplates
- `GET /api/v1/kubernetes/gatekeeper/violations` - List constraint violations

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPA_URL` | Yes | Base URL of the OPA server (default: `http://localhost:8181`) |

---

## Error Responses

| Status | Cause |
|--------|-------|
| 400 | Missing required fields in the request body |
| 401 | Missing or invalid JWT token |
| 404 | Component not found (when `componentId` is provided) |
| 503 | OPA server unreachable |
