# Kubernetes Operator and CRD Discovery

Farm extends its Kubernetes integration with automatic component registration via pod annotations, discovery of Custom Resource Definitions (CRDs) installed in connected clusters, and real-time Argo Rollouts status monitoring.

## Overview

| Capability | Description |
|------------|-------------|
| Annotation auto-registration | Workloads annotated with `farm.io/*` labels are automatically synced to the Farm catalog |
| CRD discovery | Installed Operators and their CRDs are surfaced in the component detail page |
| Argo Rollouts status | Canary and blue-green rollout progress is displayed in the Environments view |

---

## Annotation Auto-Registration

Farm polls all Kubernetes Deployments, StatefulSets, and Services every 60 seconds. When a workload carries a `farm.io/component` annotation, Farm automatically creates or updates the matching catalog component.

### Annotation Contract

```yaml
metadata:
  annotations:
    farm.io/component: "payments-service"   # Component name in Farm catalog
    farm.io/owner: "platform-team"          # Team slug (matched to Farm Team)
    farm.io/catalog-url: "https://..."      # Optional: link to catalog-info.yaml
    farm.io/environment: "production"       # Environment slug in Farm
```

### Behavior

| Annotation | Effect |
|------------|--------|
| `farm.io/component` | Required. Creates the component if it does not exist; updates `metadata.k8sAnnotationSync = true` if it does |
| `farm.io/owner` | Sets the `owner` field on the component |
| `farm.io/catalog-url` | Triggers a catalog-info.yaml fetch and sync |
| `farm.io/environment` | Links the deployment record to the specified environment |

Only workloads with `farm.io/component` are processed. All other annotations are optional.

---

## CRD Discovery

Farm queries the `apiextensions.k8s.io/v1` API to list all Custom Resource Definitions installed in the connected cluster and surfaces them in the component detail page under the **CRDs** tab.

### Well-Known Operators

Farm recognizes and labels CRDs from the following Operator groups:

| API Group | Operator |
|-----------|----------|
| `monitoring.coreos.com` | Prometheus Operator |
| `cert-manager.io` | Cert-Manager |
| `argoproj.io` | Argo Rollouts |
| `kafka.strimzi.io` | Strimzi Kafka |

CRDs from unrecognized groups are listed under their API group name.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/kubernetes/crds` | List all CRDs in the cluster |
| `GET` | `/api/v1/kubernetes/crds/:group` | Filter by API group, e.g. `monitoring.coreos.com` |

### UI

The component detail page includes a **CRDs** tab with a filterable table showing Kind, Group, Operator, Version, and Scope for each discovered CRD.

---

## Argo Rollouts

Farm polls `argoproj.io/v1alpha1` Rollout resources every 30 seconds and streams status changes to the frontend via WebSocket.

### Supported Strategies

**Canary:**
- Current canary weight (0–100%)
- Progress bar displayed in the rollout card

**Blue-Green:**
- Active revision hash
- Preview revision hash

**Analysis Runs:**
- Per-analysis-run name and phase

### API Endpoint

```
GET /api/v1/kubernetes/rollouts?namespace=production&componentId=<uuid>
```

| Query Parameter | Description |
|-----------------|-------------|
| `namespace` | Filter by Kubernetes namespace |
| `componentId` | Filter by Farm component UUID |

### WebSocket Event

When a rollout phase changes, Farm emits a `rollout.updated` WebSocket event to all connected clients. The Environments page refreshes the rollout cards automatically every 30 seconds.

### Graceful Degradation

If the `argoproj.io/v1alpha1` CRD is not installed in the cluster, Farm handles the resulting 404 response silently and returns an empty rollout list. No errors are surfaced to the user.

---

## Requirements

- Kubernetes cluster connection configured via `KUBECONFIG_PATH` or in-cluster config
- Argo Rollouts controller installed in the cluster (only required for rollout status)
- The Farm API service account must have `list`/`watch` permissions on:
  - `apps/v1 Deployments`, `StatefulSets`
  - `v1 Services`, `Secrets`
  - `apiextensions.k8s.io/v1 CustomResourceDefinitions`
  - `argoproj.io/v1alpha1 Rollouts` (optional)

### RBAC Example

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: farm-reader
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["list", "watch"]
  - apiGroups: [""]
    resources: ["services", "secrets"]
    verbs: ["list", "watch"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["list"]
  - apiGroups: ["argoproj.io"]
    resources: ["rollouts"]
    verbs: ["list", "watch"]
```

### Environment Variables

```env
# Path to a kubeconfig file. Leave empty to use in-cluster config.
KUBECONFIG_PATH=/home/user/.kube/config
```

See [Environment Variables](../developer-guide/setup.md#environment-variables) for the full list.
