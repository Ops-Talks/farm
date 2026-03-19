# Cloud Integrations API

Base path: `/api/v1/cloud`

All endpoints require authentication via `Authorization: Bearer <token>`.

---

## GET /resources

Discover cloud resources across connected providers for an organization.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `orgId` | Yes | Organization ID |
| `provider` | No | Filter by provider: `aws`, `gcp`, or `azure` |

**Response `200 OK`**

```json
[
  {
    "provider": "aws",
    "resourceId": "arn:aws:ecs:us-east-1:123456789:service/prod/my-api",
    "resourceType": "ecs:service",
    "name": "my-api",
    "region": "us-east-1",
    "tags": {
      "farm:component": "my-api",
      "farm:environment": "production"
    },
    "linkedComponentId": "comp-uuid"
  }
]
```

Returns an empty array when no providers are connected.

---

## GET /cost

Get aggregated monthly cloud spend across all connected providers.

**Query Parameters**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `orgId` | Yes | — | Organization ID |
| `days` | No | `30` | Number of days to look back |

**Response `200 OK`**

```json
{
  "total": 245.80,
  "currency": "USD",
  "byProvider": {
    "aws": 180.50,
    "gcp": 45.30,
    "azure": 20.00
  },
  "entries": [
    {
      "provider": "aws",
      "environment": "production",
      "cost": 120.00,
      "currency": "USD"
    },
    {
      "provider": "aws",
      "environment": "staging",
      "cost": 60.50,
      "currency": "USD",
      "component": "my-api"
    }
  ]
}
```

Returns `{ total: 0, byProvider: {}, entries: [] }` when no providers are connected.

---

## POST /secrets/resolve

Resolve a secret reference string to its plain-text value.

**Request Body**

```json
{
  "ref": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db-password",
  "orgId": "org-uuid"
}
```

Supported reference formats:

| Provider | Format |
|----------|--------|
| AWS Secrets Manager | `arn:aws:secretsmanager:{region}:{account}:secret:{name}` |
| GCP Secret Manager | `gcp:projects/{project}/secrets/{name}/versions/{version}` |
| Azure Key Vault | `azure:{vaultUrl}:{secretName}` |

**Response `200 OK`**

```json
{
  "value": "super-secret-value"
}
```

**Response `400 Bad Request`**

```json
{
  "statusCode": 400,
  "message": "Unrecognized secret reference format"
}
```

---

## GET /providers/:orgId

List cloud providers that have active credentials configured for an organization.

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `orgId` | Organization ID |

**Response `200 OK`**

```json
["aws", "azure"]
```

Returns an empty array when no credentials are configured.
