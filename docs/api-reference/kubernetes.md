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
| `GET` | `/api/v1/kubernetes/operators` | List OLM operators | JWT |
| `GET` | `/api/v1/kubernetes/operators/:name` | Get a single operator | JWT |
| `GET` | `/api/v1/kubernetes/operators/:name/custom-resources` | List operator's custom resource instances | JWT |
| `GET` | `/api/v1/kubernetes/operators/:name/bindings` | List operator-component bindings | JWT |
| `POST` | `/api/v1/kubernetes/operators/:name/bindings` | Create an operator-component binding | JWT |
| `DELETE` | `/api/v1/kubernetes/operators/:name/bindings` | Remove an operator-component binding | JWT |
| `GET` | `/api/v1/kubernetes/nodes/runtimes` | List node container runtimes | JWT |
| `GET` | `/api/v1/kubernetes/nodes/:nodeName/crio-metrics` | Get CRI-O metrics for a node | JWT |

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

## OLM Operators

Discovers Operator Lifecycle Manager (OLM) operators installed in the cluster by querying `ClusterServiceVersion` custom resources.

### List Operators

```http
GET /api/v1/kubernetes/operators
Authorization: Bearer <token>
```

Returns an array of `OperatorInfo` objects. Returns an empty array when OLM is not installed (404 from the API is handled gracefully).

#### Response (200)

```json
[
  {
    "name": "prometheus-operator.v0.65.1",
    "displayName": "Prometheus Operator",
    "version": "0.65.1",
    "namespace": "monitoring",
    "phase": "Succeeded",
    "description": "Manages Prometheus monitoring instances",
    "provider": "Red Hat",
    "createdAt": "2024-01-01T00:00:00Z",
    "customResourceDefinitions": [
      {
        "name": "prometheuses.monitoring.coreos.com",
        "version": "v1",
        "kind": "Prometheus",
        "description": "Prometheus instance"
      }
    ]
  }
]
```

### Get Operator

```http
GET /api/v1/kubernetes/operators/:name
Authorization: Bearer <token>
```

Returns a single `OperatorInfo` or `null` when not found.

### List Operator Custom Resources

```http
GET /api/v1/kubernetes/operators/:name/custom-resources
Authorization: Bearer <token>
```

Returns an array of `CustomResourceInstance` objects discovered from the operator's owned CRDs.

#### Response (200)

```json
[
  {
    "name": "my-prometheus",
    "namespace": "monitoring",
    "kind": "Prometheus",
    "apiVersion": "monitoring.coreos.com/v1",
    "conditions": [
      { "type": "Available", "status": "True", "message": "Running" }
    ],
    "createdAt": "2024-06-01T00:00:00Z"
  }
]
```

## Operator Bindings

Link catalog components to OLM operators for traceability.

### List Bindings

```http
GET /api/v1/kubernetes/operators/:name/bindings
Authorization: Bearer <token>
```

Returns an array of `OperatorBinding` objects with component relations loaded.

### Create Binding

```http
POST /api/v1/kubernetes/operators/:name/bindings
Authorization: Bearer <token>
Content-Type: application/json

{
  "operatorNamespace": "monitoring",
  "componentId": "550e8400-e29b-41d4-a716-446655440001"
}
```

Returns the created `OperatorBinding` (201). Throws `409 Conflict` if a binding with the same operator name, namespace, and component already exists.

### Remove Binding

```http
DELETE /api/v1/kubernetes/operators/:name/bindings
Authorization: Bearer <token>
Content-Type: application/json

{
  "operatorNamespace": "monitoring",
  "componentId": "550e8400-e29b-41d4-a716-446655440001"
}
```

Returns `204 No Content` on success. Throws `404 Not Found` if no matching binding exists.

## Node Runtimes

Surfaces container runtime information from Kubernetes nodes.

### List Node Runtimes

```http
GET /api/v1/kubernetes/nodes/runtimes
Authorization: Bearer <token>
```

#### Response (200)

```json
[
  {
    "nodeName": "worker-1",
    "runtimeName": "containerd",
    "runtimeVersion": "1.7.2",
    "kernelVersion": "5.15.0-100",
    "osImage": "Ubuntu 22.04.3 LTS",
    "architecture": "amd64"
  },
  {
    "nodeName": "worker-2",
    "runtimeName": "cri-o",
    "runtimeVersion": "1.28.0",
    "kernelVersion": "5.15.0-100",
    "osImage": "Red Hat Enterprise Linux 9.2",
    "architecture": "amd64"
  }
]
```

### Get CRI-O Metrics

```http
GET /api/v1/kubernetes/nodes/:nodeName/crio-metrics
Authorization: Bearer <token>
```

Returns `available: true` when the node uses CRI-O runtime. Currently indicates detection only; actual metrics scraping requires a monitoring agent.

#### Response (200)

```json
{
  "nodeName": "worker-2",
  "available": true
}
```
