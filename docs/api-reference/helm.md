# Helm API

The Helm API provides endpoints for discovering Helm releases deployed in a Kubernetes cluster and synchronizing them as Farm deployment records.

## Base Path

`/api/v1/helm`

## Prerequisites

Helm release discovery reads Kubernetes Secrets of type `helm.sh/release.v1`. The `KUBECONFIG_PATH` environment variable must point to a valid kubeconfig file, or the API must be running inside a Kubernetes cluster with appropriate RBAC permissions.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/helm/releases` | List Helm releases discovered from the cluster | JWT |
| `POST` | `/api/v1/helm/releases/sync` | Sync Helm releases into Farm deployment records | JWT + Admin |

## List Helm Releases

```http
GET /api/v1/helm/releases
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | No | Filter releases by Kubernetes namespace. Omit to list releases from all namespaces. |

### Response (200)

```json
[
  {
    "name": "my-service",
    "namespace": "production",
    "chart": "my-service",
    "chartVersion": "1.2.3",
    "appVersion": "2.4.0",
    "status": "deployed",
    "revision": 5,
    "lastDeployed": "2025-01-15T10:30:00.000Z"
  }
]
```

### HelmRelease Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Helm release name |
| `namespace` | string | Kubernetes namespace |
| `chart` | string | Chart name |
| `chartVersion` | string | Chart version (semver) |
| `appVersion` | string | Application version embedded in the chart |
| `status` | string | Release status (`deployed`, `failed`, `pending-install`, `pending-upgrade`, `uninstalling`) |
| `revision` | number | Helm revision number (increments on each upgrade) |
| `lastDeployed` | string (ISO 8601) | Timestamp of the last deployment |

## Sync Helm Releases

Reads all Helm release Secrets from the cluster and upserts corresponding `Deployment` records in the Farm database. This enables the deployment matrix and history to reflect the actual state of the cluster.

```http
POST /api/v1/helm/releases/sync?namespace=production
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | No | Sync releases from a specific namespace. Omit to sync all namespaces. |

### Response (201)

```json
{
  "synced": 7,
  "errors": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `synced` | number | Number of deployment records created or updated |
| `errors` | string[] | List of non-fatal error messages encountered during sync |

### Access Control

Sync requires the `admin` role. Regular users receive `403 Forbidden`.

## How Release Discovery Works

Farm decodes Helm release Secrets using the following steps:

1. List all Kubernetes Secrets with label `owner=helm` and type `helm.sh/release.v1`
2. Base64-decode the `data.release` field
3. Gunzip the decoded bytes
4. Parse the resulting JSON to extract chart metadata and status

This is compatible with Helm 3 and does not require the `helm` CLI to be installed on the server.

## Pipeline Integration

Deploy stages in a Farm pipeline can use `engine: helm` to trigger a Helm upgrade via the `HelmDeployExecutor`. The executor runs `helm upgrade --install` with the specified chart and values. The `helm` CLI must be available in the server's `PATH` for this feature.

## Catalog Integration

Components with a `helmChart` field set in their `catalog-info.yaml` spec automatically display a Helm Chart Card on the component detail page.

```yaml
# catalog-info.yaml
spec:
  helm:
    chart: my-service
    repository: https://charts.example.com
    version: 1.2.3
    valuesFile: values-production.yaml
```


