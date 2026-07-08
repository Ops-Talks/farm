# Tag Governance

Farm's tag governance feature enforces resource tagging standards across cloud providers and Kubernetes clusters. It detects missing required tags on deployed resources and reports violations with remediation hints.

## Overview

Tag governance consists of two components:

- **Tag Policies** -- define which tags are required for a given resource type and how strictly violations are enforced
- **Compliance Audit** -- a background job that scans resources against all active policies and records violations

## Tag Policies

A tag policy specifies:

| Field | Description |
|-------|-------------|
| `resourceType` | The type of resource to audit (e.g., `aws-ec2`, `k8s-deployment`, `*` for all) |
| `requiredKeys` | List of tag/label keys that must be present on matching resources |
| `severity` | `warning` (audit only) or `error` (strict enforcement) |

### Managing Policies

Navigate to **Compliance → Tag Policies** to view, create, edit, and delete policies.

Admin users can:
- Create new policies with the **Add Policy** button
- Edit existing policies by clicking the edit icon on a policy card
- Delete policies via the delete icon (requires confirmation)
- Export a policy as a Kyverno ClusterPolicy YAML (see [Kyverno Integration](kyverno-integration.md))

### Resource Types

| Value | Description |
|-------|-------------|
| `aws-ec2` | AWS EC2 instances |
| `aws-s3` | AWS S3 buckets |
| `aws-rds` | AWS RDS database instances |
| `gcp-instance` | GCP Compute Engine instances |
| `gcp-bucket` | GCP Cloud Storage buckets |
| `azure-vm` | Azure Virtual Machines |
| `azure-storage` | Azure Storage Accounts |
| `k8s-deployment` | Kubernetes Deployments |
| `k8s-pod` | Kubernetes Pods |
| `k8s-service` | Kubernetes Services |
| `*` | All resource types |

## Compliance Dashboard

Navigate to **Compliance** to view the current compliance state across all organizations.

The dashboard shows:

- **Compliance Rate** -- percentage of resources with no open violations (green ≥90%, amber ≥70%, red <70%)
- **Total Resources** -- count of all audited resources
- **Open Violations** -- count of unresolved tag violations
- **Resolved Today** -- violations resolved in the last 24 hours
- **By Provider** breakdown -- per-cloud-provider compliance rate with progress bars
- **By Resource Type** breakdown -- per-type compliance rate
- **Violations Table** -- paginated list of all violations with filters by provider, resource type, and resolution status

### Resolving Violations

Each violation entry in the table has a **Resolve** button. Resolving a violation records the `resolvedAt` timestamp. Violations are re-raised on the next audit cycle if the tag is still missing.

Each resource violation on the catalog component detail page (under the **Violations** tab) includes a **Remediation Hints** panel showing suggested label values:

- `farm:component → {component-name}`
- `farm:team → {owner-name}`
- `farm:environment → (see environments)`

## Compliance Audit

The audit runs automatically every **6 hours** via a cron job. It:

1. Loads all active tag policies for the organization
2. Scans cloud resources from all connected providers (AWS, GCP, Azure)
3. Compares each resource's tags against matching policies
4. Records a `ResourceViolation` for each missing required key
5. Marks previously open violations as resolved if the tag is now present

### Manual Audit

Trigger an immediate audit from the Compliance Dashboard using the **Run Audit Now** button (admin only).

## Environment Variables

No additional environment variables are required for tag governance beyond the cloud provider credentials already configured. See [Cloud Providers](cloud-providers.md) for setup.
