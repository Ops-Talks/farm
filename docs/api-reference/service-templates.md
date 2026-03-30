# Service Templates API

The Service Templates API provides endpoints for managing golden path templates, scaffolding new services, and previewing generated file trees.

## Base URL

```
/api/v1/service-templates
```

## Authentication

All endpoints require a valid JWT token via `Authorization: Bearer <token>` header.

## Endpoints

### List Templates

```http
GET /api/v1/service-templates
```

**Query Parameters:**

| Parameter        | Type   | Description                      |
|------------------|--------|----------------------------------|
| `language`       | string | Filter by programming language   |
| `framework`      | string | Filter by framework              |
| `organizationId` | string | Filter by organization UUID      |
| `skip`           | number | Pagination offset (default: 0)   |
| `take`           | number | Page size (default: 20)          |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "nestjs-api",
      "description": "Production-ready NestJS API with TypeORM, JWT auth, and health checks",
      "language": "typescript",
      "framework": "nestjs",
      "tags": ["backend", "api", "nestjs"],
      "repositoryUrl": "https://github.com/org/nestjs-template",
      "variables": [
        {
          "key": "SERVICE_NAME",
          "label": "Service Name",
          "description": "Name of the generated service",
          "default": "my-service",
          "required": true,
          "pattern": "^[a-z][a-z0-9-]*$"
        }
      ],
      "isBuiltIn": true,
      "organizationId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 20
}
```

### Create Template

```http
POST /api/v1/service-templates
```

**Requires:** `admin` role.

**Request Body:**

| Field           | Type               | Required | Description                                          |
|-----------------|--------------------|----------|------------------------------------------------------|
| `name`          | string             | Yes      | Unique template name                                 |
| `description`   | string             | No       | Human-readable description                           |
| `language`      | string             | Yes      | Programming language (e.g., `typescript`, `go`)      |
| `framework`     | string             | Yes      | Framework identifier (e.g., `nestjs`, `gin`)         |
| `tags`          | string[]           | No       | Searchable tags                                      |
| `repositoryUrl` | string             | Yes      | URL of the template repository                       |
| `variables`     | TemplateVariable[] | No       | List of configurable template variables              |

**Response:** `201 Created`

### Get Template

```http
GET /api/v1/service-templates/:id
```

**Response:** `200 OK` with the template object.

### Update Template

```http
PATCH /api/v1/service-templates/:id
```

**Requires:** `admin` role. Accepts partial updates with the same fields as creation.

**Response:** `200 OK` with the updated template.

### Delete Template

```http
DELETE /api/v1/service-templates/:id
```

**Requires:** `admin` role.

**Response:** `204 No Content`

### Scaffold from Template

```http
POST /api/v1/service-templates/:id/scaffold
```

Creates a scaffold request that generates a new service from the template.

**Request Body:**

| Field              | Type              | Required | Description                                      |
|--------------------|-------------------|----------|--------------------------------------------------|
| `targetRepository` | string            | Yes      | Target repository URL for the generated service  |
| `variables`        | Record<string, string> | No  | Key-value pairs matching template variables       |
| `dryRun`           | boolean           | No       | If true, preview only without writing (default: false) |

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "templateId": "uuid",
  "templateName": "nestjs-api",
  "targetRepository": "https://github.com/org/my-new-service",
  "variables": {
    "SERVICE_NAME": "my-new-service",
    "PORT": "3000",
    "DATABASE_TYPE": "postgres"
  },
  "status": "pending",
  "statusMessage": null,
  "requestedBy": "uuid",
  "dryRun": false,
  "renderedFiles": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Dry-Run Scaffold

```http
POST /api/v1/service-templates/:id/scaffold/dry-run
```

Previews the file tree that would be generated without creating any resources. Equivalent to calling the scaffold endpoint with `dryRun: true`.

**Request Body:**

| Field              | Type              | Required | Description                                      |
|--------------------|-------------------|----------|--------------------------------------------------|
| `targetRepository` | string            | Yes      | Target repository URL for the generated service  |
| `variables`        | Record<string, string> | No  | Key-value pairs matching template variables       |

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "templateId": "uuid",
  "templateName": "nestjs-api",
  "targetRepository": "https://github.com/org/my-new-service",
  "variables": {
    "SERVICE_NAME": "my-new-service",
    "PORT": "3000",
    "DATABASE_TYPE": "postgres"
  },
  "status": "completed",
  "statusMessage": "Dry-run completed successfully",
  "requestedBy": "uuid",
  "dryRun": true,
  "renderedFiles": [
    "package.json",
    "tsconfig.json",
    "src/main.ts",
    "src/app.module.ts",
    "src/app.controller.ts",
    "Dockerfile",
    "docker-compose.yml",
    ".github/workflows/ci.yml"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Entities

### ServiceTemplate

| Field           | Type               | Description                                    |
|-----------------|--------------------|------------------------------------------------|
| `id`            | string (UUID)      | Primary key                                    |
| `name`          | string             | Unique template name                           |
| `description`   | string             | Human-readable description                     |
| `language`      | string             | Programming language                           |
| `framework`     | string             | Framework identifier                           |
| `tags`          | string[]           | Searchable tags                                |
| `repositoryUrl` | string             | URL of the template repository                 |
| `variables`     | TemplateVariable[] | Configurable variables for scaffolding         |
| `isBuiltIn`     | boolean            | Whether the template ships with Farm           |
| `organizationId`| string (UUID)      | Organization scope                             |
| `createdAt`     | string (ISO 8601)  | Creation timestamp                             |
| `updatedAt`     | string (ISO 8601)  | Last update timestamp                          |

### TemplateVariable

| Field         | Type    | Description                                        |
|---------------|---------|----------------------------------------------------|
| `key`         | string  | Variable identifier used in template files         |
| `label`       | string  | Human-readable label for UI display                |
| `description` | string  | Explanation of what this variable controls         |
| `default`     | string  | Default value if not provided                      |
| `required`    | boolean | Whether the variable must be supplied              |
| `pattern`     | string  | Optional regex pattern for input validation        |

### ScaffoldRequest

| Field              | Type              | Description                                     |
|--------------------|-------------------|-------------------------------------------------|
| `id`               | string (UUID)     | Primary key                                     |
| `templateId`       | string (UUID)     | Reference to the source template                |
| `templateName`     | string            | Snapshot of the template name at request time    |
| `targetRepository` | string            | Target repository URL                           |
| `variables`        | Record<string, string> | Variable values used for rendering          |
| `status`           | ScaffoldRequestStatus | Current status of the scaffold operation    |
| `statusMessage`    | string            | Human-readable status detail                    |
| `requestedBy`      | string (UUID)     | User who initiated the request                  |
| `dryRun`           | boolean           | Whether this was a preview-only request         |
| `renderedFiles`    | string[]          | List of file paths generated (populated on completion) |
| `createdAt`        | string (ISO 8601) | Creation timestamp                              |
| `updatedAt`        | string (ISO 8601) | Last update timestamp                           |

## Built-in Templates

Farm ships with four built-in templates covering common service archetypes:

| Template          | Language   | Framework | Variables                              |
|-------------------|------------|-----------|----------------------------------------|
| `nestjs-api`      | TypeScript | NestJS    | `SERVICE_NAME`, `PORT`, `DATABASE_TYPE` |
| `nextjs-app`      | TypeScript | Next.js   | `APP_NAME`, `PORT`                     |
| `go-microservice` | Go         | Gin       | `SERVICE_NAME`, `PORT`                 |
| `python-worker`   | Python     | FastAPI   | `SERVICE_NAME`, `QUEUE_NAME`, `CONCURRENCY` |

## Enums

### ScaffoldRequestStatus

| Value         | Description                                  |
|---------------|----------------------------------------------|
| `pending`     | Request created, awaiting processing         |
| `in_progress` | Template is being rendered and files written |
| `completed`   | Scaffold operation finished successfully     |
| `failed`      | Scaffold operation encountered an error      |
