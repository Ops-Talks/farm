# Container Registry API

The Container Registry API provides endpoints for browsing repositories, inspecting image manifests, retrieving vulnerability scan results, and checking registry adapter availability.

## Base Path

`/api/v1/registry`

## Prerequisites

- A supported registry adapter must be configured via environment variables (DockerHub, ECR, GCR/Artifact Registry, or Harbor)
- All endpoints require JWT authentication

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/registry/repositories` | List all repositories in the configured registry | JWT |
| `GET` | `/api/v1/registry/harbor/replications` | List Harbor replication policies (Harbor adapter only) | JWT |
| `GET` | `/api/v1/registry/repositories/:name/tags` | List all tags for a repository | JWT |
| `GET` | `/api/v1/registry/repositories/:name/manifest/:tag` | Get manifest for a specific image tag | JWT |
| `GET` | `/api/v1/registry/repositories/:name/scan/:tag` | Get vulnerability scan results for an image tag | JWT |
| `GET` | `/api/v1/registry/components/:componentId/vulnerabilities` | List persisted vulnerabilities for a component | JWT |
| `GET` | `/api/v1/registry/components/:componentId/vulnerabilities/summary` | Vulnerability summary by severity | JWT |
| `POST` | `/api/v1/registry/components/:componentId/vulnerabilities/sync` | Queue a background vulnerability sync | JWT |
| `GET` | `/api/v1/registry/available` | Check if a registry adapter is configured | JWT |

---

## List Repositories

```http
GET /api/v1/registry/repositories
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "name": "my-org/payment-service",
    "uri": "registry.example.com/my-org/payment-service",
    "description": "Payment microservice"
  },
  {
    "name": "my-org/frontend",
    "uri": "registry.example.com/my-org/frontend"
  }
]
```

---

## List Harbor Replication Policies

Available only when the Harbor adapter is configured.

```http
GET /api/v1/registry/harbor/replications
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "id": 1,
    "name": "replicate-to-dr",
    "destNamespace": "dr-registry",
    "enabled": true,
    "trigger": { "type": "scheduled", "triggerSettings": { "cron": "0 2 * * *" } }
  }
]
```

---

## List Tags

The `:name` path parameter must be URL-encoded (e.g., `my-org%2Fpayment-service`).

```http
GET /api/v1/registry/repositories/my-org%2Fpayment-service/tags
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "tag": "v2.4.0",
    "digest": "sha256:abc123...",
    "sizeBytes": 45234567,
    "pushedAt": "2025-05-28T14:00:00Z"
  },
  {
    "tag": "latest",
    "digest": "sha256:abc123...",
    "sizeBytes": 45234567,
    "pushedAt": "2025-05-28T14:00:00Z"
  }
]
```

---

## Get Manifest

```http
GET /api/v1/registry/repositories/my-org%2Fpayment-service/manifest/v2.4.0
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "digest": "sha256:def456...",
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "sizeBytes": 7682,
  "pushedAt": "2025-05-28T14:00:00Z",
  "tags": ["v2.4.0", "latest"]
}
```

---

## Get Vulnerability Scan Results

Returns vulnerability scan results for a specific image tag directly from the registry adapter.

```http
GET /api/v1/registry/repositories/my-org%2Fpayment-service/scan/v2.4.0
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "status": "COMPLETE",
  "vulnerabilities": [
    {
      "cveId": "CVE-2024-12345",
      "severity": "HIGH",
      "packageName": "libssl",
      "installedVersion": "1.1.1t",
      "fixedVersion": "1.1.1u",
      "description": "Buffer overflow in OpenSSL libssl"
    },
    {
      "cveId": "CVE-2024-67890",
      "severity": "MEDIUM",
      "packageName": "curl",
      "installedVersion": "7.88.0",
      "fixedVersion": "7.88.1",
      "description": "SSRF vulnerability in curl"
    }
  ]
}
```

`status` values: `COMPLETE`, `PENDING`, `FAILED`, `UNSUPPORTED`.

Severity values: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`, `UNDEFINED`.

---

## List Component Vulnerabilities

Returns vulnerabilities that have been persisted to the database for a catalog component.

```http
GET /api/v1/registry/components/550e8400-e29b-41d4-a716-446655440001/vulnerabilities
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "componentId": "550e8400-e29b-41d4-a716-446655440001",
    "cveId": "CVE-2024-12345",
    "severity": "HIGH",
    "package": "libssl",
    "version": "1.1.1t",
    "fixedVersion": "1.1.1u",
    "description": "Buffer overflow in OpenSSL libssl",
    "syncedAt": "2025-06-01T08:00:00Z"
  }
]
```

---

## Vulnerability Summary

Returns vulnerability counts grouped by severity for a catalog component.

```http
GET /api/v1/registry/components/550e8400-e29b-41d4-a716-446655440001/vulnerabilities/summary
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "total": 14,
  "critical": 1,
  "high": 3,
  "medium": 7,
  "low": 2,
  "unknown": 1,
  "syncedAt": "2025-06-01T08:00:00Z"
}
```

---

## Queue Vulnerability Sync

Enqueues a background job to fetch and persist vulnerability scan results for a catalog component. Results appear on the component detail page Security tab once the job completes.

```http
POST /api/v1/registry/components/550e8400-e29b-41d4-a716-446655440001/vulnerabilities/sync
Authorization: Bearer <token>
```

### Response (200)

```json
{ "queued": true }
```

When the BullMQ queue is unavailable, the sync runs inline and returns:

```json
{ "queued": false, "count": 7 }
```

---

## Check Availability

```http
GET /api/v1/registry/available
Authorization: Bearer <token>
```

### Response (200)

```json
{ "available": true }
```

When no registry adapter is configured:

```json
{ "available": false }
```

---

## Supported Adapters

| Adapter | `REGISTRY_TYPE` value | Notes |
|---------|----------------------|-------|
| DockerHub | `dockerhub` | `REGISTRY_URL` sets the base URL (default: `https://hub.docker.com`) |
| ECR (AWS) | `ecr` | `REGISTRY_URL` is the AWS account ID; `REGISTRY_CREDENTIALS` is a JSON object with `accessKeyId`, `secretAccessKey`, and `region` |
| GCR / Artifact Registry | `gcr` | `REGISTRY_URL` is the GCP region (e.g. `us-central1`); `REGISTRY_CREDENTIALS` is the GCP service account JSON |
| Harbor | `harbor` | `REGISTRY_URL` is the Harbor base URL; `REGISTRY_CREDENTIALS` is a JSON object with `username` and `password` |

Refer to the setup guide for the full list of environment variables.

---

## Configuration

| Variable | Description |
|----------|-------------|
| `REGISTRY_TYPE` | Selects the registry adapter (`dockerhub`, `ecr`, `gcr`, `harbor`) |
| `REGISTRY_URL` | Registry base URL, account ID, or region depending on the adapter |
| `REGISTRY_CREDENTIALS` | JSON string with adapter-specific credentials (see adapter table above) |

---

## Error Responses

| Status | Cause |
|--------|-------|
| 400 | Invalid request parameters |
| 401 | Missing or invalid JWT token |
| 404 | Repository, tag, or component not found |
| 503 | Registry API unreachable or adapter not configured |


