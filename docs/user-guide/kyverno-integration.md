# Kyverno Integration

Farm integrates with [Kyverno](https://kyverno.io/) to provide two-way policy synchronization between Farm's tag governance engine and Kubernetes policy enforcement.

## Overview

The integration covers two workflows:

1. **PolicyReport reader** — Farm reads Kyverno `PolicyReport` and `ClusterPolicyReport` CRDs from the cluster and surfaces violations on the relevant catalog component
2. **ClusterPolicy export** — Farm generates a Kyverno `ClusterPolicy` YAML from a Farm tag policy that can be applied to the cluster

## Prerequisites

- Kyverno installed in the target cluster (version 1.8+)
- Farm connected to the cluster via a valid kubeconfig (see [Kubernetes Operator](kubernetes-operator.md))
- Kyverno CRDs present: `wgpolicyk8s.io/v1alpha2`

## PolicyReport Reader

When Kyverno is installed and running in the connected cluster, Farm automatically reads `PolicyReport` and `ClusterPolicyReport` resources from the `wgpolicyk8s.io/v1alpha2` API group.

### Component Violations Tab

Navigate to any catalog component's detail page and select the **Kyverno** tab to view all PolicyReport results associated with that component.

Farm matches violations to components by:
1. The `farm.io/component` or `farm/component` label on the Kubernetes resource
2. Fuzzy match on resource name containing the component name

The tab shows:

| Column | Description |
|--------|-------------|
| Resource ID | Namespace/name of the resource |
| Resource Type | Kubernetes kind (e.g., `k8s-deployment`) |
| Policy | Kyverno policy name |
| Rule | Specific rule that failed |
| Status | `fail` (red), `warn` (amber), `pass` (green), `error` (red), `skip` (gray) |
| Message | Human-readable violation message |

A summary header shows the total count of failing results and warnings.

### API Endpoints

```
GET /api/v1/kubernetes/policy-reports?namespace={namespace}
GET /api/v1/kubernetes/cluster-policy-reports
```

Both endpoints return an array of `KyvernoPolicyReportResult` objects. They return an empty array if Kyverno is not installed (graceful degradation on 404).

### Labeling Resources for Component Mapping

To ensure Farm can link Kyverno violations to catalog components, add the following label to your Kubernetes workloads:

```yaml
metadata:
  labels:
    farm.io/component: "my-service"
    farm.io/team: "platform"
```

## ClusterPolicy Export

Farm can generate a Kyverno `ClusterPolicy` YAML from any Farm tag policy. This allows you to enforce the same tagging requirements at the Kubernetes admission level.

### Exporting a Policy

1. Navigate to **Compliance → Tag Policies**
2. On any policy card, click **Export YAML** (admin only)
3. The browser downloads a `.yaml` file ready to apply to the cluster

### Generated ClusterPolicy Structure

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: farm-require-tags-k8s-deployment
  annotations:
    farm.io/policy-id: "uuid"
    farm.io/generated-at: "2025-01-01T00:00:00.000Z"
spec:
  validationFailureAction: Audit   # or Enforce for severity=error
  rules:
    - name: require-farm-tags
      match:
        any:
          - resources:
              kinds:
                - Deployment
      validate:
        message: "Resource must have required Farm tags: team, owner"
        pattern:
          metadata:
            labels:
              team: "?*"
              owner: "?*"
```

### Validation Failure Action

| Farm Severity | Kyverno Action |
|--------------|----------------|
| `warning` | `Audit` (log only, do not block) |
| `error` | `Enforce` (block non-compliant resources) |

### API Endpoint

```
GET /api/v1/tag-policies/:id/export/kyverno
```

Returns `{ yaml: string, filename: string }`. Requires admin role.

## Graceful Degradation

If Kyverno is not installed in the cluster:
- The Kyverno tab on component detail shows an empty state (no errors)
- The PolicyReport endpoints return empty arrays
- All other Farm features continue to work normally
