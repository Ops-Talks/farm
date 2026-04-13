# OPA Policy Engine Integration

Farm integrates with a standalone Open Policy Agent server for on-demand policy evaluation. Submit a policy path and an input document to receive an allow/deny decision with optional violation details. Results linked to catalog components are persisted to the database for historical review.

## Overview

| Capability | Description |
|------------|-------------|
| OPA status check | Verify that the OPA server is reachable from Farm |
| On-demand evaluation | Submit any policy path and input document for immediate evaluation |
| Result persistence | Link evaluation results to catalog components for historical review |
| Gatekeeper integration | Read Gatekeeper ConstraintTemplates and violations from the cluster |

---

## Prerequisites

- An OPA server accessible from Farm (e.g. `opa run --server --addr :8181`)
- `OPA_URL` environment variable set to the OPA server base URL (default: `http://localhost:8181`)

---

## Checking OPA Status

Use `GET /api/v1/opa/status` to verify that the OPA server is reachable:

```http
GET /api/v1/opa/status
Authorization: Bearer <token>
```

```json
{
  "reachable": true,
  "url": "http://localhost:8181"
}
```

The OPA status badge is shown on the platform health page.

---

## Evaluating a Policy

Submit a policy evaluation request with a policy path and an input document:

```http
POST /api/v1/opa/evaluate
Authorization: Bearer <token>
Content-Type: application/json

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

| Field | Description |
|-------|-------------|
| `policyPath` | The OPA rule to evaluate, e.g. `data/app/rbac/allow` or `data/security/image_policy/deny` |
| `input` | Arbitrary JSON input document passed to the policy |
| `componentId` | Optional. When provided, the result is persisted to the database and visible on the component detail page. |

### Response

```json
{
  "policyPath": "data/app/rbac/allow",
  "allowed": true,
  "violations": []
}
```

When the policy denies the input:

```json
{
  "policyPath": "data/app/rbac/allow",
  "allowed": false,
  "violations": [
    "User 'alice' does not have 'write' permission on 'reports'"
  ]
}
```

---

## Viewing Persisted Results

When `componentId` is included in an evaluate request, the result is saved and displayed on the **OPA Evaluation** tab of the component detail page. This tab shows all evaluation results for that component, ordered by evaluation time descending.

Retrieve results programmatically:

```http
GET /api/v1/opa/results/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

Each result record includes:

| Field | Description |
|-------|-------------|
| `policyPath` | The policy path that was evaluated |
| `allowed` | Whether the policy allowed or denied the input |
| `violations` | Array of violation messages when the policy denied |
| `evaluatedAt` | Timestamp of when the evaluation was performed |

---

## Gatekeeper Integration

Kubernetes Gatekeeper ConstraintTemplates and constraint violations are readable from the cluster via the Kubernetes API. These endpoints are documented in the [Kubernetes API Reference](../api-reference/kubernetes.md):

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/kubernetes/gatekeeper/enabled` | Check if Gatekeeper is installed in the cluster |
| `GET /api/v1/kubernetes/gatekeeper/constraint-templates` | List all ConstraintTemplates |
| `GET /api/v1/kubernetes/gatekeeper/violations` | List constraint violations, filterable by namespace |

Gatekeeper violations appear alongside Kyverno PolicyReport results on the component detail page.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPA_URL` | Yes | Base URL of the OPA server (default: `http://localhost:8181`) |

---

## Related

- [Kyverno Integration](kyverno-integration.md)
- [OPA API Reference](../api-reference/opa.md)
- [Kubernetes API Reference](../api-reference/kubernetes.md)
