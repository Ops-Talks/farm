# Container Registry Integration

Farm connects to a container registry to list repositories, inspect image manifests, and surface vulnerability scan results alongside catalog components. Supported adapters: DockerHub, ECR (AWS), GCR / Artifact Registry, and Harbor.

## Overview

| Capability | Description |
|------------|-------------|
| Repository browsing | List all repositories in the configured registry |
| Tag listing | View all image tags for a repository with digest and size |
| Manifest inspection | Read the full image manifest for any tag |
| Vulnerability scanning | Fetch scan results from the registry adapter |
| Component vulnerability linking | Persist scan results for a catalog component and view them on the Security tab |
| Harbor replication policies | List Harbor replication policies (Harbor adapter only) |
| Availability check | Verify that a registry adapter is configured and reachable |

---

## Prerequisites

- A supported registry adapter must be configured via environment variables
- The adapter is selected by which environment variables are set (see [Configuration](#configuration))

---

## Supported Adapters

| Adapter | `REGISTRY_TYPE` value | Description |
|---------|----------------------|-------------|
| DockerHub | `dockerhub` | Public and private Docker Hub repositories |
| ECR (AWS) | `ecr` | Amazon Elastic Container Registry repositories |
| GCR / Artifact Registry | `gcr` | Google Container Registry and Google Artifact Registry |
| Harbor | `harbor` | Self-hosted Harbor registry with built-in vulnerability scanning and replication |

Detailed environment variable configuration for each adapter is described in the setup guide. Use `GET /api/v1/registry/available` to verify that an adapter is configured and reachable:

```http
GET /api/v1/registry/available
Authorization: Bearer <token>
```

```json
{ "available": true }
```

---

## Browsing Repositories

The registry page in Farm lists all repositories available in the configured registry. Click a repository to view its tags. For each tag, the digest, size, and push timestamp are shown.

---

## Inspecting Image Manifests

Click a tag to open the manifest view. The full image manifest is displayed, including:

- Schema version and media type
- Config layer digest and size
- All filesystem layers with their digests and sizes

---

## Vulnerability Scanning

### On-Demand Scan Results

For any repository tag, Farm fetches vulnerability data directly from the registry adapter using:

```http
GET /api/v1/registry/repositories/:name/scan/:tag
Authorization: Bearer <token>
```

Results include CVE ID, severity, affected package, installed version, and the fixed version when available.

### Severity Levels

| Severity | Description |
|----------|-------------|
| `CRITICAL` | Vulnerabilities requiring immediate attention |
| `HIGH` | Significant vulnerabilities that should be remediated promptly |
| `MEDIUM` | Moderate risk vulnerabilities |
| `LOW` | Low risk or informational findings |
| `UNKNOWN` | Severity not determined by the scanner |

---

## Component Vulnerability Linking

### Queuing a Sync

To associate vulnerability scan results with a specific catalog component, queue a background sync:

```http
POST /api/v1/registry/components/:componentId/vulnerabilities/sync
Authorization: Bearer <token>
```

The component must have a `containerImage` field configured (set via `PATCH /api/v1/catalog/components/:id`). If the field is missing, the endpoint returns 400 with `"Component has no container image configured"`.

The BullMQ job fetches scan results and persists them to the database. Results appear on the **Security** tab of the component detail page once the job completes.

### Viewing Results

The Security tab shows:

- A summary card with vulnerability counts by severity
- A full table of individual CVEs with package and version details

Retrieve the summary programmatically:

```http
GET /api/v1/registry/components/:componentId/vulnerabilities/summary
Authorization: Bearer <token>
```

```json
{
  "total": 14,
  "critical": 1,
  "high": 3,
  "medium": 7,
  "low": 2,
  "unknown": 1
}
```

---

## Harbor-Specific Features

When using the Harbor adapter, replication policies are available:

```http
GET /api/v1/registry/harbor/replications
Authorization: Bearer <token>
```

This endpoint returns all configured replication policies, including their name, destination namespace, enabled state, and trigger schedule.

---

## Configuration

| Variable | Description |
|----------|-------------|
| `REGISTRY_TYPE` | Selects the registry adapter (`dockerhub`, `ecr`, `gcr`, `harbor`) |
| `REGISTRY_URL` | Registry base URL, AWS account ID, or GCP region depending on the adapter |
| `REGISTRY_CREDENTIALS` | JSON string with adapter-specific credentials |

Refer to the setup guide for the complete list of adapter-specific environment variables.

---

## Related

- [Container Registry API Reference](../api-reference/registry.md)
- [Catalog](catalog.md)
