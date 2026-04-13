# Kubernetes API

The Kubernetes API provides endpoints for discovering and inspecting workloads, Custom Resource Definitions (CRDs), Argo Rollout statuses, Gatekeeper constraint templates and violations, Dragonfly distributed cache instances, Flux GitOps bindings, KEDA scaled objects, and node runtime environments from a connected Kubernetes cluster.

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
| `GET` | `/api/v1/kubernetes/gatekeeper/enabled` | Check if Gatekeeper is installed | JWT |
| `GET` | `/api/v1/kubernetes/gatekeeper/constraint-templates` | List Gatekeeper ConstraintTemplates | JWT |
| `GET` | `/api/v1/kubernetes/gatekeeper/violations` | List Gatekeeper constraint violations | JWT |
| `GET` | `/api/v1/kubernetes/dragonfly/status` | Dragonfly P2P status | JWT |
| `GET` | `/api/v1/kubernetes/dragonfly/tasks` | List Dragonfly tasks | JWT |
| `GET` | `/api/v1/kubernetes/dragonfly/peers` | List Dragonfly peers | JWT |
| `GET` | `/api/v1/kubernetes/dragonfly/metrics` | Dragonfly metrics | JWT |
| `GET` | `/api/v1/kubernetes/flux/status` | Flux installation status | JWT |
| `GET` | `/api/v1/kubernetes/flux/kustomizations` | List Flux Kustomizations | JWT |
| `GET` | `/api/v1/kubernetes/flux/helm-releases` | List Flux HelmReleases | JWT |
| `GET` | `/api/v1/kubernetes/flux/sources` | List Flux sources | JWT |
| `GET` | `/api/v1/kubernetes/components/:componentId/flux-bindings` | List Flux bindings for a component | JWT |
| `POST` | `/api/v1/kubernetes/flux/binding` | Create a Flux binding | JWT |
| `DELETE` | `/api/v1/kubernetes/flux/binding/:id` | Remove a Flux binding | JWT |
| `GET` | `/api/v1/kubernetes/keda/status` | KEDA installation status | JWT |
| `GET` | `/api/v1/kubernetes/keda/scaled-objects` | List ScaledObjects | JWT |
| `GET` | `/api/v1/kubernetes/keda/scaled-jobs` | List ScaledJobs | JWT |
| `GET` | `/api/v1/kubernetes/keda/scaled-objects/:namespace/:name/triggers` | List triggers for a ScaledObject | JWT |
| `GET` | `/api/v1/kubernetes/components/:componentId/keda-bindings` | List KEDA bindings for a component | JWT |
| `POST` | `/api/v1/kubernetes/keda/binding` | Create a KEDA binding | JWT |
| `DELETE` | `/api/v1/kubernetes/keda/binding/:id` | Remove a KEDA binding | JWT |
| `GET` | `/api/v1/kubernetes/available` | Check if Kubernetes is configured | JWT |

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

---

## Gatekeeper

Reads Open Policy Agent Gatekeeper resources from the cluster.

### Check Gatekeeper Status

```http
GET /api/v1/kubernetes/gatekeeper/enabled
Authorization: Bearer <token>
```

#### Response (200)

```json
{ "enabled": true }
```

### List ConstraintTemplates

```http
GET /api/v1/kubernetes/gatekeeper/constraint-templates
Authorization: Bearer <token>
```

#### Response (200)

```json
[
  {
    "name": "K8sRequiredLabels",
    "crd": "k8srequiredlabels.constraints.gatekeeper.sh",
    "createdAt": "2025-01-10T08:00:00Z"
  }
]
```

### List Violations

```http
GET /api/v1/kubernetes/gatekeeper/violations
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `kind` | string | No | Filter violations by constraint kind |
| `namespace` | string | No | Filter violations by namespace |

#### Response (200)

```json
[
  {
    "kind": "K8sRequiredLabels",
    "name": "my-deployment",
    "namespace": "production",
    "message": "Missing required label: team"
  }
]
```

---

## Dragonfly P2P

Reads Dragonfly P2P resources from the cluster.

### Get Dragonfly Status

```http
GET /api/v1/kubernetes/dragonfly/status
Authorization: Bearer <token>
```

#### Response (200)

```json
{ "installed": true, "version": "v2.1.0" }
```

### List Dragonfly Tasks

```http
GET /api/v1/kubernetes/dragonfly/tasks
Authorization: Bearer <token>
```

### List Dragonfly Peers

```http
GET /api/v1/kubernetes/dragonfly/peers
Authorization: Bearer <token>
```

### Get Dragonfly Metrics

```http
GET /api/v1/kubernetes/dragonfly/metrics
Authorization: Bearer <token>
```

All Dragonfly endpoints return an empty result when the Dragonfly CRDs are not installed in the cluster.

---

## Flux GitOps

Reads Flux CD resources from the cluster and manages component-to-Flux bindings.

### Get Flux Status

```http
GET /api/v1/kubernetes/flux/status
Authorization: Bearer <token>
```

#### Response (200)

```json
{ "installed": true, "version": "v2.2.0" }
```

### List Kustomizations

```http
GET /api/v1/kubernetes/flux/kustomizations
Authorization: Bearer <token>
```

#### Response (200)

```json
[
  {
    "name": "apps",
    "namespace": "flux-system",
    "path": "./clusters/production/apps",
    "ready": true,
    "lastAppliedRevision": "main@sha1:abc123"
  }
]
```

### List HelmReleases

```http
GET /api/v1/kubernetes/flux/helm-releases
Authorization: Bearer <token>
```

#### Response (200)

```json
[
  {
    "name": "payment-service",
    "namespace": "payments",
    "chart": "payment-service",
    "version": "2.4.0",
    "ready": true
  }
]
```

### List Flux Sources

```http
GET /api/v1/kubernetes/flux/sources
Authorization: Bearer <token>
```

Returns all `GitRepository`, `HelmRepository`, and `OCIRepository` sources in the cluster.

### List Flux Bindings for a Component

```http
GET /api/v1/kubernetes/components/:componentId/flux-bindings
Authorization: Bearer <token>
```

### Create Flux Binding

```http
POST /api/v1/kubernetes/flux/binding
Authorization: Bearer <token>
Content-Type: application/json

{
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "kustomizationName": "apps",
  "namespace": "flux-system"
}
```

Returns the created binding (201).

### Remove Flux Binding

```http
DELETE /api/v1/kubernetes/flux/binding/:id
Authorization: Bearer <token>
```

Returns `204 No Content` on success.

---

## KEDA

Reads KEDA (Kubernetes Event-Driven Autoscaling) resources from the cluster and manages component-to-KEDA bindings.

### Get KEDA Status

```http
GET /api/v1/kubernetes/keda/status
Authorization: Bearer <token>
```

#### Response (200)

```json
{ "installed": true, "version": "v2.13.0" }
```

### List ScaledObjects

```http
GET /api/v1/kubernetes/keda/scaled-objects
Authorization: Bearer <token>
```

#### Response (200)

```json
[
  {
    "name": "payment-service-scaler",
    "namespace": "payments",
    "scaleTargetRef": { "name": "payment-service" },
    "minReplicaCount": 1,
    "maxReplicaCount": 20,
    "ready": true
  }
]
```

### List ScaledJobs

```http
GET /api/v1/kubernetes/keda/scaled-jobs
Authorization: Bearer <token>
```

### List ScaledObject Triggers

```http
GET /api/v1/kubernetes/keda/scaled-objects/:namespace/:name/triggers
Authorization: Bearer <token>
```

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `namespace` | Kubernetes namespace |
| `name` | ScaledObject name |

#### Response (200)

```json
[
  {
    "type": "kafka",
    "metadata": {
      "bootstrapServers": "kafka:9092",
      "topic": "payments",
      "lagThreshold": "50"
    }
  }
]
```

### List KEDA Bindings for a Component

```http
GET /api/v1/kubernetes/components/:componentId/keda-bindings
Authorization: Bearer <token>
```

### Create KEDA Binding

```http
POST /api/v1/kubernetes/keda/binding
Authorization: Bearer <token>
Content-Type: application/json

{
  "componentId": "550e8400-e29b-41d4-a716-446655440001",
  "scaledObjectName": "payment-service-scaler",
  "namespace": "payments"
}
```

Returns the created binding (201).

### Remove KEDA Binding

```http
DELETE /api/v1/kubernetes/keda/binding/:id
Authorization: Bearer <token>
```

Returns `204 No Content` on success.

---

## Availability Check

```http
GET /api/v1/kubernetes/available
Authorization: Bearer <token>
```

### Response (200)

```json
{ "available": true }
```

Returns `{ "available": false }` when `KUBECONFIG_PATH` is not configured or the cluster is unreachable.
