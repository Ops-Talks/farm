# Helm Integration

Farm integrates with Helm 3 to discover live releases running in connected Kubernetes clusters and to execute real `helm upgrade --install` operations from pipeline deploy stages.

## Overview

| Capability | Description |
|------------|-------------|
| Chart metadata on components | Track the Helm chart backing a catalog component (`repo`, `chart`, `version`, `valuesRef`) |
| Release discovery | Read Helm release state directly from Kubernetes Secrets without requiring the Helm CLI on the Farm server |
| Deployment sync | Import discovered releases as `Deployment` records linked to Farm components and environments |
| Pipeline executor | Run `helm upgrade --install` as a real deploy stage inside a Farm pipeline |

---

## Helm Chart Metadata

Every catalog component can store optional Helm chart metadata under the `helmChart` field.

### Fields

| Field | Description |
|-------|-------------|
| `repo` | Helm repository URL, e.g. `https://charts.bitnami.com/bitnami` |
| `chart` | Chart name, e.g. `postgresql` |
| `version` | Chart version constraint, e.g. `12.1.0` |
| `valuesRef` | URL or Kubernetes Secret name pointing to the values file |

### catalog-info.yaml Discovery

The standard `catalog-info.yaml` file supports a `spec.helm` block that Farm reads during catalog sync:

```yaml
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: payments-service
spec:
  type: service
  lifecycle: production
  owner: platform-team
  helm:
    repo: https://charts.bitnami.com/bitnami
    chart: nginx
    version: "15.3.4"
    valuesRef: https://raw.githubusercontent.com/org/repo/main/values.production.yaml
```

### UI

The component detail page includes a **Helm** tab that displays the chart metadata when set. The component create form includes an optional **Helm Chart** section.

---

## Release Discovery

Farm reads Helm release state directly from Kubernetes Secrets — no Helm CLI required on the Farm server.

**How it works:**

Helm 3 stores each release revision as a Kubernetes Secret with:
- `type: helm.sh/release.v1`
- Label `owner=helm`

Farm reads these Secrets via the existing `@kubernetes/client-node` integration, decodes the base64-encoded gzip-compressed JSON payload, and extracts release metadata.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/helm/releases` | List all discovered Helm releases |
| `GET` | `/api/v1/helm/releases?namespace=production` | Filter by namespace |
| `POST` | `/api/v1/helm/releases/sync` | Import releases as Farm Deployment records (admin only) |

### Sync Behavior

`POST /api/v1/helm/releases/sync` matches each discovered release to a Farm component and environment by name, then creates or updates the corresponding `Deployment` record. The response includes the count of synced records and any per-release errors.

The **Environments** page displays a **Helm Releases** panel with a one-click **Sync Releases** button.

---

## Pipeline Deploy Stage

Farm pipelines support a `deploy` stage type with `config.engine: "helm"` to run a real `helm upgrade --install` command.

### Stage Configuration

```json
{
  "name": "Deploy to Production",
  "type": "deploy",
  "order": 3,
  "config": {
    "engine": "helm",
    "releaseName": "payments-service",
    "chart": "bitnami/nginx",
    "namespace": "production",
    "version": "15.3.4",
    "set": {
      "replicaCount": "3",
      "image.tag": "v2.1.0"
    }
  }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `engine` | Yes | Must be `"helm"` |
| `releaseName` | Yes | Helm release name |
| `chart` | Yes | Chart reference: `repo/chart` or local path |
| `namespace` | Yes | Target Kubernetes namespace |
| `version` | No | Specific chart version |
| `valuesFile` | No | URL or path to a values file |
| `set` | No | Additional `--set key=value` overrides |

### Availability

The executor requires the `helm` CLI to be available in `PATH` on the Farm API server. When `helm` is not found, the stage logs a warning and is marked as failed with a descriptive message — it does not crash the server.

---

## Requirements

- Kubernetes cluster connection configured via `KUBECONFIG_PATH` or in-cluster config (see [Kubernetes Setup](#kubernetes-setup))
- `helm` CLI installed on the Farm API server (only required for pipeline deploy stages)
- The Farm API service account must have read access to Secrets in the target namespaces

### Kubernetes Setup

Set the following environment variable to point Farm at your cluster:

```env
# Path to a kubeconfig file. Leave empty to use in-cluster config.
KUBECONFIG_PATH=/home/user/.kube/config
```

See [Environment Variables](../developer-guide/setup.md#environment-variables) for the full list.

---

## Deploying Farm on Kubernetes with Helm

For complete deployment instructions, parameters reference, security configuration, and production-ready setup, see the [Farm Helm Chart Reference](../../deploy/helm/farm/README.md).

Key topics covered:

- Quick Start (development and production)
- OCI Chart Distribution and Chart Signing
- Image Provenance and Container Security
- Database Migrations and Seed Jobs
- Secrets Management with External Secrets Operator
- Observability Integration (Prometheus, Grafana, Tempo, Loki)
- Complete Parameter Reference
- Upgrade Notes and Breaking Changes
- High-Availability Configuration (HPA, PDB, topology spread constraints)
