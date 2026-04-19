# IaC Modules API

The IaC Modules API provides endpoints for managing the Infrastructure-as-Code module catalog. Modules represent reusable Terraform, OpenTofu, or Pulumi configurations stored in source repositories. The catalog tracks module metadata, versioned variable and output declarations discovered by syncing against the source repository, and optional associations to catalog components.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/iac-modules` | List all modules (optional `search`, `provider`, `engine` filters) | JWT |
| `POST` | `/api/v1/iac-modules` | Create a new module | JWT |
| `GET` | `/api/v1/iac-modules/:id` | Get a module by UUID | JWT |
| `GET` | `/api/v1/iac-modules/:id/versions` | List versions for a module (semver descending) | JWT |
| `PATCH` | `/api/v1/iac-modules/:id` | Partially update a module | JWT |
| `DELETE` | `/api/v1/iac-modules/:id` | Delete a module and all its versions | JWT |
| `POST` | `/api/v1/iac-modules/:id/sync` | Sync metadata from source repository | JWT |
| `POST` | `/api/v1/iac-modules/:id/link-component` | Link the module to a catalog component | JWT |
| `DELETE` | `/api/v1/iac-modules/:id/unlink-component` | Remove the component association | JWT |
| `GET` | `/api/v1/iac-modules/component/:componentId` | List all modules linked to a catalog component | JWT |

## Providers

| Value | Description |
|-------|-------------|
| `aws` | Amazon Web Services |
| `gcp` | Google Cloud Platform |
| `azure` | Microsoft Azure |
| `kubernetes` | Kubernetes cluster resources |
| `mongodb` | MongoDB Atlas or self-hosted |
| `postgres` | PostgreSQL database |
| `mysql` | MySQL database |
| `github` | GitHub organization resources |
| `cloudflare` | Cloudflare DNS and network resources |
| `generic` | Provider-agnostic or multi-provider modules |

## Engines

| Value | Description |
|-------|-------------|
| `terraform` | HashiCorp Terraform |
| `opentofu` | OpenTofu (open-source Terraform fork) |
| `pulumi` | Pulumi (general-purpose IaC SDK) |

## Module Lifecycle

The recommended workflow for a new module is:

1. **Create** — Register the module with `POST /api/v1/iac-modules`, supplying a name, provider, engine, and source repository URL. At this point no version data exists.
2. **Sync** — Trigger `POST /api/v1/iac-modules/:id/sync`. The service discovers new semver tags, shallow-clones each one, and parses `variables.tf` and `outputs.tf` into structured metadata persisted as version records. The `latestVersion` field on the module is updated automatically.
3. **Link to component** — Optionally associate the module with a catalog component using `POST /api/v1/iac-modules/:id/link-component`. This allows consumers to discover which modules belong to a given component via `GET /api/v1/iac-modules/component/:componentId`.

Re-running sync at any time picks up new tags without duplicating existing version records.

## Listing Modules

Returns all modules in the catalog. Supports optional filtering by a free-text search term, provider, and engine. See the [Filters](#filters) section for details.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules"
```

### Response (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "vpc",
    "provider": "aws",
    "engine": "terraform",
    "description": "Standard VPC module for AWS workloads",
    "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
    "latestVersion": "v2.3.0",
    "componentId": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
]
```

## Creating a Module

```bash
curl -X POST http://localhost:3000/api/v1/iac-modules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "vpc",
    "provider": "aws",
    "engine": "terraform",
    "description": "Standard VPC module for AWS workloads",
    "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc"
  }'
```

The `engine`, `description`, and `componentId` fields are optional. A module created without an engine can have one assigned later via `PATCH`. The `latestVersion` field is `null` until the first sync is run.

Returns `409 Conflict` if a module with the same `name` and `provider` combination already exists.

### Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "vpc",
  "provider": "aws",
  "engine": "terraform",
  "description": "Standard VPC module for AWS workloads",
  "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
  "latestVersion": null,
  "componentId": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

## Getting a Module by ID

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010"
```

### Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "vpc",
  "provider": "aws",
  "engine": "terraform",
  "description": "Standard VPC module for AWS workloads",
  "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
  "latestVersion": "v2.3.0",
  "componentId": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-04-01T00:00:00.000Z"
}
```

## Listing Versions for a Module

Returns all version records for a module ordered by version descending (latest first). Each record contains the structured variable and output declarations parsed from the HCL source at that tag.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010/versions"
```

### Response (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "moduleId": "550e8400-e29b-41d4-a716-446655440010",
    "version": "v2.3.0",
    "variablesMeta": [
      {
        "name": "vpc_cidr",
        "type": "string",
        "description": "CIDR block for the VPC",
        "default": "10.0.0.0/16",
        "required": false,
        "validation": null
      },
      {
        "name": "enable_dns_hostnames",
        "type": "bool",
        "description": "Whether to enable DNS hostnames in the VPC",
        "default": "true",
        "required": false,
        "validation": null
      }
    ],
    "outputsMeta": [
      {
        "name": "vpc_id",
        "description": "The ID of the created VPC",
        "value": "aws_vpc.main.id"
      }
    ],
    "syncedAt": "2026-04-01T00:00:00.000Z",
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
]
```

### Variable metadata fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Variable name as declared in `variables.tf` |
| `type` | `string \| null` | HCL type expression (e.g., `string`, `list(string)`) |
| `description` | `string \| null` | Description string from the variable block |
| `default` | `string \| null` | Default value serialized to string; `null` if no default is declared |
| `required` | `boolean` | `true` when no default is declared and the variable must be supplied by the caller |
| `validation` | `object \| null` | Validation block with `condition` and `errorMessage` strings, or `null` if absent |

### Output metadata fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Output name as declared in `outputs.tf` |
| `description` | `string \| null` | Description string from the output block |
| `value` | `string \| null` | HCL value expression serialized to string |

## Updating a Module

All fields are optional. Only the fields included in the request body are changed.

```bash
curl -X PATCH http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "description": "Updated description for the VPC module",
    "engine": "opentofu"
  }'
```

### Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "vpc",
  "provider": "aws",
  "engine": "opentofu",
  "description": "Updated description for the VPC module",
  "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
  "latestVersion": "v2.3.0",
  "componentId": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-05-01T00:00:00.000Z"
}
```

## Deleting a Module

Deletes the module and cascades the deletion to all associated version records.

```bash
curl -X DELETE http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer <token>"
```

Returns `204 No Content` on success with an empty body.

## Syncing Module Metadata

Triggers a metadata sync against the source repository. The service discovers new semver tags that are not yet stored, shallow-clones each one, and parses `variables.tf` and `outputs.tf` into structured metadata. The `latestVersion` field on the parent module is updated to reflect the highest semver tag found.

Sync is idempotent: re-running it against a module that already has up-to-date versions returns `newVersions: 0` without modifying existing records.

```bash
curl -X POST http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010/sync \
  -H "Authorization: Bearer <token>"
```

### Response (200)

```json
{
  "newVersions": 2,
  "latestVersion": "v2.3.0"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `newVersions` | `number` | Count of new version records created during this sync run |
| `latestVersion` | `string \| null` | The highest semver tag now known for the module; `null` if the repository has no tags |

## Linking a Module to a Component

Associates the module with a catalog component by storing the component UUID in the `componentId` field. Only one component association is supported per module at a time. Calling this endpoint on a module that already has a `componentId` replaces the existing association.

```bash
curl -X POST http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010/link-component \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "componentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

### Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "vpc",
  "provider": "aws",
  "engine": "terraform",
  "description": "Standard VPC module for AWS workloads",
  "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
  "latestVersion": "v2.3.0",
  "componentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-05-01T00:00:00.000Z"
}
```

## Unlinking a Module from Its Component

Removes the component association, setting `componentId` back to `null`. No request body is required.

```bash
curl -X DELETE http://localhost:3000/api/v1/iac-modules/550e8400-e29b-41d4-a716-446655440010/unlink-component \
  -H "Authorization: Bearer <token>"
```

### Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "vpc",
  "provider": "aws",
  "engine": "terraform",
  "description": "Standard VPC module for AWS workloads",
  "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
  "latestVersion": "v2.3.0",
  "componentId": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-05-01T00:00:00.000Z"
}
```

## Getting Modules by Component

Returns all modules whose `componentId` matches the given catalog component UUID.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules/component/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Response (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "vpc",
    "provider": "aws",
    "engine": "terraform",
    "description": "Standard VPC module for AWS workloads",
    "sourceRepoUrl": "https://github.com/acme/terraform-aws-vpc",
    "latestVersion": "v2.3.0",
    "componentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
]
```

Returns an empty array when no modules are linked to the given component.

## Filters

The `GET /api/v1/iac-modules` endpoint accepts three optional query parameters that can be combined freely.

### search

Filters modules by a case-insensitive substring match against the `name` and `description` fields.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules?search=vpc"
```

### provider

Filters modules to a specific provider. The value must be one of the valid `IacProvider` enum members listed in the [Providers](#providers) table.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules?provider=aws"
```

### engine

Filters modules to a specific IaC engine. The value must be one of the valid `IacEngine` enum members listed in the [Engines](#engines) table.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules?engine=terraform"
```

### Combined filters

All three parameters can be combined in a single request.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/iac-modules?search=vpc&provider=aws&engine=terraform"
```

## Error Responses

All error responses follow the standard `ErrorResponseDto` envelope.

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | Request body or query parameters failed validation |
| `401 Unauthorized` | Missing or invalid JWT Bearer token |
| `404 Not Found` | The specified module UUID does not exist |
| `409 Conflict` | A module with the same `name` and `provider` already exists (create only) |
| `500 Internal Server Error` | Unexpected server-side error |

### Example error body

```json
{
  "statusCode": 404,
  "message": "IacModule not found",
  "error": "Not Found",
  "timestamp": "2026-05-01T12:00:00.000Z",
  "path": "/api/v1/iac-modules/00000000-0000-0000-0000-000000000000"
}
```
