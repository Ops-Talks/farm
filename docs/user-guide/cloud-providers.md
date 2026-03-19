# Cloud Provider Integrations

Farm integrates with AWS, GCP, and Azure to provide cloud resource discovery, cost visibility, and cloud-native deployments directly from the pipeline builder.

## Overview

The Cloud Provider Integrations feature (FARM-E38) enables:

- **Resource Discovery** — automatically discover tagged cloud resources and link them to catalog components
- **Cost Visibility** — view monthly cloud spend per environment on the Environments page
- **Cloud Deployments** — deploy workloads to ECS, Lambda, Cloud Run, and Azure Container Apps from the pipeline builder
- **Secret Resolution** — reference secrets from AWS Secrets Manager, GCP Secret Manager, and Azure Key Vault in pipeline configurations

## Connecting a Cloud Provider

Navigate to **Integrations > Cloud Providers** to connect your accounts.

### AWS

Required fields:

| Field | Description |
|-------|-------------|
| Access Key ID | IAM user or role access key |
| Secret Access Key | Corresponding secret key |
| Region | Default AWS region (e.g. `us-east-1`) |

The IAM identity must have the following minimum permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "tag:GetResources",
        "ce:GetCostAndUsage",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "lambda:UpdateFunctionCode",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*"
    }
  ]
}
```

### GCP

Required fields:

| Field | Description |
|-------|-------------|
| Service Account JSON | Full JSON key file content for a GCP service account |
| Project ID | GCP project identifier |

The service account must have the following roles:

- `roles/cloudasset.viewer` — resource discovery
- `roles/run.admin` — Cloud Run deployments
- `roles/secretmanager.secretAccessor` — secret resolution
- `roles/billing.viewer` — cost visibility (optional)

### Azure

Required fields:

| Field | Description |
|-------|-------------|
| Tenant ID | Azure Active Directory tenant identifier |
| Client ID | Service principal application (client) ID |
| Client Secret | Service principal client secret value |
| Subscription ID | Azure subscription identifier |

The service principal must have the following role assignments:

- `Reader` — resource discovery
- `Contributor` on the target resource group — Container Apps deployments
- `Key Vault Secrets User` — secret resolution
- `Cost Management Reader` — cost visibility (optional)

## Resource Discovery

Farm tags-based discovery finds resources across your cloud accounts that are tagged with Farm-specific metadata:

| Provider | Tag Key | Tag Value |
|----------|---------|-----------|
| AWS | `farm:component` or `farm:environment` | component name or environment name |
| GCP | `farm_component` or `farm_environment` | component name or environment name |
| Azure | `farm:component` or `farm:environment` | component name or environment name |

Discovered resources are visible on the **Cloud Resources** tab of each catalog component.

To trigger discovery, Farm queries the cloud provider APIs at request time. No background polling is required.

## Cost Visibility

The **Environments** page displays a monthly spend summary widget showing:

- Grand total across all connected providers
- Per-provider cost breakdown with progress bars
- Per-environment cost table

Cost data is retrieved from:

- **AWS** — Cost Explorer API (grouped by `farm:environment` tag)
- **GCP** — Cloud Billing API (placeholder data when BigQuery export is not configured)
- **Azure** — Cost Management query API (grouped by `farm:environment` tag)

## Cloud Deployments in Pipelines

Add cloud deploy stages to any pipeline in the Pipeline Builder. Four engine types are available under the **Cloud Deploy** stage group:

### aws-ecs

Deploys a new container image to an existing ECS service.

| Field | Description |
|-------|-------------|
| Cluster | ECS cluster name |
| Service | ECS service name |
| Image | Full container image URI (e.g. `123456.dkr.ecr.us-east-1.amazonaws.com/app:latest`) |
| Region | AWS region override (optional) |
| Credential ID | Integration credential ID (optional — uses org default) |

### aws-lambda

Updates the function code of an existing Lambda function.

| Field | Description |
|-------|-------------|
| Function Name | Lambda function name or ARN |
| Image URI | ECR image URI for container image functions (optional) |
| S3 Bucket | S3 bucket for zip deployments (optional) |
| S3 Key | S3 object key for zip deployments (optional) |
| Region | AWS region override (optional) |
| Credential ID | Integration credential ID (optional) |

### gcp-cloud-run

Deploys a new container image to an existing Cloud Run service.

| Field | Description |
|-------|-------------|
| Service | Cloud Run service name |
| Region | GCP region (e.g. `us-central1`) |
| Image | Container image URI |
| Project ID | GCP project ID override (optional) |
| Credential ID | Integration credential ID (optional) |

### azure-container-apps

Deploys a new container image to an existing Azure Container App.

| Field | Description |
|-------|-------------|
| App Name | Container App name |
| Resource Group | Azure resource group |
| Image | Container image URI |
| Subscription ID | Azure subscription ID override (optional) |
| Credential ID | Integration credential ID (optional) |

## Secret Resolution in Pipeline Configs

Pipeline stage configurations can reference secrets using the following formats. Farm resolves them at runtime before executing the stage.

| Provider | Format |
|----------|--------|
| AWS Secrets Manager | `arn:aws:secretsmanager:{region}:{account}:secret:{name}` |
| GCP Secret Manager | `gcp:projects/{project}/secrets/{name}/versions/{version}` |
| Azure Key Vault | `azure:{vaultUrl}:{secretName}` |

Example pipeline stage config with secret reference:

```json
{
  "type": "aws-ecs",
  "config": {
    "cluster": "production",
    "service": "my-api",
    "image": "arn:aws:secretsmanager:us-east-1:123456:secret:prod/ecr-image"
  }
}
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/cloud/resources` | Discover resources (query: `orgId`, `provider`) |
| `GET` | `/api/v1/cloud/cost` | Get aggregated cost (query: `orgId`, `days`) |
| `POST` | `/api/v1/cloud/secrets/resolve` | Resolve a secret reference |
| `GET` | `/api/v1/cloud/providers/:orgId` | List connected providers for an organization |

All endpoints require a valid JWT in the `Authorization: Bearer` header.
