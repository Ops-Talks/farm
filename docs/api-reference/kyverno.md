# Kyverno API

Base path: `/api/v1`

All endpoints require authentication via `Authorization: Bearer {token}`.

These endpoints expose Kyverno PolicyReport data from the connected Kubernetes cluster. They return empty arrays if Kyverno is not installed (graceful degradation).

## PolicyReports

### List Namespace PolicyReports

```http
GET /kubernetes/policy-reports?namespace={namespace}
```

Lists all `PolicyReport` resources in the specified namespace.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `namespace` | string | Kubernetes namespace (default: `default`) |

**Response:**
```json
[
  {
    "name": "cpol-require-labels-pod-abc123",
    "namespace": "production",
    "resourceId": "production/my-api-pod-abc",
    "resourceType": "k8s-pod",
    "linkedComponentId": "uuid",
    "results": [
      {
        "policy": "require-farm-labels",
        "rule": "require-team-label",
        "status": "fail",
        "message": "Validation rule 'require-team-label' failed. Label 'team' is required.",
        "category": "Best Practices",
        "severity": "medium"
      }
    ]
  }
]
```

### List ClusterPolicyReports

```http
GET /kubernetes/cluster-policy-reports
```

Lists all `ClusterPolicyReport` resources in the cluster (cluster-scoped resources).

**Response:** Same shape as namespace PolicyReports, with `namespace` omitted.

## Result Status Values

| Status | Meaning |
|--------|---------|
| `pass` | Resource complies with the policy rule |
| `fail` | Resource violates the policy rule |
| `warn` | Soft violation (audit mode) |
| `error` | Policy evaluation error |
| `skip` | Rule was skipped for this resource |

## Component Label Mapping

Farm maps PolicyReport results to catalog components using Kubernetes labels:

```yaml
metadata:
  labels:
    farm.io/component: "my-service"   # preferred
    farm/component: "my-service"      # fallback
```

If neither label is present, Farm falls back to a fuzzy name match.

## Error Handling

All endpoints follow the standard Farm error format:

```json
{
  "statusCode": 503,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/kubernetes/policy-reports",
  "message": "Kubernetes connection not available"
}
```

If Kyverno CRDs are not installed (HTTP 404 from cluster), the API returns an empty array instead of an error.


