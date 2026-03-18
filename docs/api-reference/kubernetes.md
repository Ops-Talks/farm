# Kubernetes API

The Kubernetes API provides endpoints for discovering workloads, Custom Resource Definitions (CRDs), and Argo Rollout statuses from a connected Kubernetes cluster.

## Base Path

`/api/v1/kubernetes`

## Prerequisites

Set the `KUBECONFIG_PATH` environment variable to a valid kubeconfig file, or run Farm inside a Kubernetes cluster with appropriate in-cluster RBAC permissions. All endpoints return empty arrays when Kubernetes is not configured.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/kubernetes/workloads` | List all discovered Kubernetes workloads | JWT |
| `GET` | `/api/v1/kubernetes/workloads/match/:componentName` | Match workloads for a catalog component | JWT |
| `GET` | `/api/v1/kubernetes/crds` | List all CRDs in the cluster | JWT |
| `GET` | `/api/v1/kubernetes/crds/:group` | List CRDs filtered by API group | JWT |
| `GET` | `/api/v1/kubernetes/rollouts` | List Argo Rollout statuses | JWT |

## List Workloads

Returns all Kubernetes `Deployment` resources across all namespaces.

```http
GET /api/v1/kubernetes/workloads
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "name": "my-service",
    "namespace": "production",
    "replicas": 3,
    "readyReplicas": 3,
    "image": "my-org/my-service:2.4.0",
    "labels": {
      "app": "my-service",
      "farm.io/component": "my-service"
    }
  }
]
```

## Match Component Workloads

Finds Kubernetes workloads that match a given catalog component name by comparing the workload name and label values.

```http
GET /api/v1/kubernetes/workloads/match/my-service
Authorization: Bearer <token>
```

Returns the same `KubernetesWorkload` array filtered to entries that match the component name.

## List CRDs

Returns all Custom Resource Definitions installed in the cluster with well-known operator display names resolved from the API group.

```http
GET /api/v1/kubernetes/crds
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "name": "rollouts.argoproj.io",
    "group": "argoproj.io",
    "kind": "Rollout",
    "scope": "Namespaced",
    "versions": ["v1alpha1"],
    "operatorName": "Argo Rollouts"
  },
  {
    "name": "certificates.cert-manager.io",
    "group": "cert-manager.io",
    "kind": "Certificate",
    "scope": "Namespaced",
    "versions": ["v1"],
    "operatorName": "cert-manager"
  }
]
```

### CrdResource Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full CRD name (`kind.group`) |
| `group` | string | API group (e.g., `argoproj.io`) |
| `kind` | string | Resource kind (e.g., `Rollout`) |
| `scope` | string | `Namespaced` or `Cluster` |
| `versions` | string[] | Served API versions |
| `operatorName` | string | Human-readable operator name resolved from the API group |

## List CRDs by Group

Filters CRDs by API group.

```http
GET /api/v1/kubernetes/crds/argoproj.io
Authorization: Bearer <token>
```

Returns the same `CrdResource` array filtered to entries belonging to the specified group.

## List Argo Rollouts

Returns Argo Rollout custom resources, optionally filtered by namespace. Returns an empty array when the Argo Rollouts CRD is not installed.

```http
GET /api/v1/kubernetes/rollouts?namespace=production
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | No | Filter rollouts by Kubernetes namespace |

### Response (200)

```json
[
  {
    "name": "my-service",
    "namespace": "production",
    "phase": "Healthy",
    "replicas": 3,
    "readyReplicas": 3,
    "currentStepIndex": 2,
    "totalSteps": 4
  }
]
```

### ArgoRolloutStatus Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Rollout resource name |
| `namespace` | string | Kubernetes namespace |
| `phase` | string | Rollout phase (`Healthy`, `Progressing`, `Degraded`, `Paused`) |
| `replicas` | number | Desired replica count |
| `readyReplicas` | number | Ready replica count |
| `currentStepIndex` | number | Current canary step index (0-based) |
| `totalSteps` | number | Total number of canary steps defined |

## Automatic Annotation Sync

Every 60 seconds, Farm scans catalog components with a `farm.io/kubernetes-name` annotation and updates their linked workload status automatically. This sync runs as a scheduled cron job inside `KubernetesModule` and does not require manual API calls.

## Real-Time Rollout Events

When a rollout status changes, Farm emits a `rollout.updated` WebSocket event to all connected clients. The `RolloutStatusCard` component on the Environments page subscribes to this event and updates without a page refresh.
