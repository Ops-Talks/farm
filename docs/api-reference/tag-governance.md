# Tag Governance API

Base path: `/api/v1`

All endpoints require authentication via `Authorization: Bearer {token}`.

## Tag Policies

### List Tag Policies

```
GET /tag-policies?orgId={orgId}
```

Returns all tag policies for the organization.

**Response:**
```json
[
  {
    "id": "uuid",
    "orgId": "uuid",
    "resourceType": "k8s-deployment",
    "requiredKeys": ["team", "owner", "env"],
    "severity": "warning",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Create Tag Policy

```
POST /tag-policies
```

Requires admin role.

**Body:**
```json
{
  "orgId": "uuid",
  "resourceType": "aws-ec2",
  "requiredKeys": ["team", "owner"],
  "severity": "error"
}
```

### Update Tag Policy

```
PATCH /tag-policies/:id
```

Requires admin role. Partial update — only provided fields are changed.

### Delete Tag Policy

```
DELETE /tag-policies/:id
```

Requires admin role.

### Export as Kyverno ClusterPolicy

```
GET /tag-policies/:id/export/kyverno
```

Requires admin role.

**Response:**
```json
{
  "yaml": "apiVersion: kyverno.io/v1\nkind: ClusterPolicy\n...",
  "filename": "farm-require-tags-k8s-deployment.yaml"
}
```

## Resource Violations

### List Violations

```
GET /tag-policies/violations?orgId={orgId}&provider={provider}&resourceType={resourceType}&resolved={true|false}&skip={n}&take={n}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orgId` | string (required) | Organization ID |
| `provider` | string | Filter by provider (`aws`, `gcp`, `azure`, `kubernetes`) |
| `resourceType` | string | Filter by resource type |
| `resolved` | boolean | `true` = resolved only, `false` = open only, omit = all |
| `skip` | number | Pagination offset (default 0) |
| `take` | number | Page size (default 20, max 100) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "orgId": "uuid",
      "resourceId": "us-east-1/i-0abc123",
      "resourceType": "aws-ec2",
      "provider": "aws",
      "missingKeys": ["team", "owner"],
      "linkedComponentId": "uuid",
      "detectedAt": "2025-01-01T00:00:00.000Z",
      "resolvedAt": null
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 20
}
```

### Resolve Violation

```
PATCH /tag-policies/violations/:id/resolve
```

Marks a violation as resolved by setting `resolvedAt` to the current timestamp.

## Compliance Summary

### Get Compliance Summary

```
GET /tag-policies/compliance/summary?orgId={orgId}
```

**Response:**
```json
{
  "complianceRate": 87.5,
  "totalResources": 240,
  "openViolations": 30,
  "resolvedToday": 5,
  "byProvider": {
    "aws": { "total": 100, "violations": 12, "rate": 88 },
    "gcp": { "total": 80, "violations": 8, "rate": 90 },
    "azure": { "total": 60, "violations": 10, "rate": 83 }
  },
  "byResourceType": {
    "aws-ec2": { "total": 50, "violations": 6, "rate": 88 }
  }
}
```

## Trigger Compliance Audit

```
POST /tag-policies/audit/trigger
```

Requires admin role. Enqueues an immediate compliance audit job for the organization.

**Body:**
```json
{ "orgId": "uuid" }
```

**Response:** `{ "queued": true }`
