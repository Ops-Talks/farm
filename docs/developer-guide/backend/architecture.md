# Architecture

This document describes the architecture of Farm, providing an overview of the system design and key components.

## Overview

Farm follows a modular architecture based on NestJS, a progressive Node.js framework. The application is organized into distinct modules, each responsible for a specific domain.

## High-Level Architecture

```
                    +------------------+
                    |   HTTP Client    |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   NestJS App     |
                    |  (Express/HTTP)  |
                    +--------+---------+
                             |
     +----------+------------+-----------+------------+--------+--------+
     |          |            |           |            |        |        |
     v          v            v           v            v        v        v
 +--------+ +--------+ +-----------+ +---------+ +--------+ +------+ +-----------+
 |  Auth  | |Catalog | |  Docs     | |  Envs   | |Plugin  | |Teams | | AuditLog  |
 | Module | | Module | |  Module   | | Module  | |Manager | |Module| |  Module   |
 +--------+ +--------+ +-----------+ +---------+ +--------+ +------+ +-----------+
     |          |            |           |            |        |        |
     +----------+------------+-----------+------------+--------+--------+
                             |
                             v
                    +------------------+
                    |  Common Layer    |
                    | (Filters/Pipes)  |
                    +------------------+
```

## Module Structure

Farm consists of the following modules and layers:

### Common Layer

The common layer provides cross-cutting concerns that are shared across all modules.

**Responsibilities:**

- **Structured Logging**: Uses Winston for JSON-formatted logs in production and pretty-printed logs in development.
- **Advanced Health Monitoring**: Uses Terminus to provide detailed health checks (Database, Memory, Disk).
- **Global Exception Filtering**: Standardized error response handling.
- **Custom Validation Pipes**: Ensuring data integrity across all endpoints.

**Files:**

- `apps/api/src/common/filters/http-exception.filter.ts` - Standardized error response handling
- `apps/api/src/common/logger/logger.config.ts` - Winston logger configuration
- `apps/api/src/common/health/health.controller.ts` - Terminus health indicators

### App Module

The root module that bootstraps the application and imports all feature modules.

**Responsibilities:**

- Application bootstrapping
- Global configuration and environment validation
- Global interceptors and filters registration

**Files:**

- `app.module.ts` - Module definition
- `app.controller.ts` - Root controller
- `app.service.ts` - Root service
- `main.ts` - Application entry point

### Auth Module

Handles user authentication and management.

**Responsibilities:**

- User registration with password strength validation
- User login and JWT token generation
- Refresh token mechanism with token rotation
- User listing

**Components:**

| Component | Purpose |
|-----------|---------|
| `AuthController` | HTTP endpoints for auth operations |
| `AuthService` | Business logic for authentication |
| `User` entity | User data structure |
| `RegisterUserDto` | Registration request validation |
| `LoginDto` | Login request validation |
| `RefreshTokenDto` | Refresh token request validation |

### Catalog Module

Manages the software component catalog, serving Dev, Infra, Data, and Security teams.

**Responsibilities:**

- Component CRUD operations
- Component lifecycle management (experimental, development, production, deprecated, end_of_life)
- Component metadata storage
- YAML-driven component registration
- Discovery of components from git repositories

**Component Kind Groups:**

The catalog organizes 23 component kinds across four domain groups, enabling multi-team usage:

| Domain Group | Audience | Component Kinds |
|-------------|----------|-----------------|
| `dev` | Development teams | service, library, website, api, component, system, domain, resource |
| `infra` | Infrastructure / SRE teams | pipeline, queue, database, storage, cluster, network |
| `data` | Data engineering teams | dataset, data_pipeline, ml_model |
| `security` | Security teams | secret, policy, certificate |

Use the `kindGroup` query parameter on catalog endpoints to filter components by domain (e.g., `GET /api/v1/catalog/components?kindGroup=infra`).

**Components:**

| Component | Purpose |
|-----------|---------|
| `CatalogController` | HTTP endpoints for catalog operations, including discovery |
| `CatalogService` | Business logic for catalog management and discovery |
| `Component` entity | Component data structure with dependency relations |
| `CreateComponentDto` | Create request validation |
| `UpdateComponentDto` | Update request validation |
| `CreateLocationDto` | DTO for triggering discovery |
| `RegisterComponentYamlDto` | DTO for manual YAML registration |

### Documentation Module

Manages technical documentation associated with components.

**Responsibilities:**

- Documentation CRUD operations
- Filtering by component
- Version management
- Markdown rendering with HTML sanitization
- Navigation tree building (parentId / order hierarchy)
- Title-based search with relevance scoring

**Components:**

| Component | Purpose |
|-----------|---------|
| `DocumentationController` | HTTP endpoints for documentation operations |
| `DocumentationService` | Business logic for documentation management |
| `Documentation` entity | Documentation data structure |
| `CreateDocumentationDto` | Create request validation |
| `UpdateDocumentationDto` | Update request validation |

### Environments Module

Manages deployment environments and tracks component deployments across those environments.

**Responsibilities:**

- Environment CRUD operations (development, staging, production, sandbox)
- Deployment recording and status tracking
- Deployment status machine (pending, in_progress, succeeded, failed, rolled_back)
- Component-Environment deployment matrix
- Latest deployment lookup per component

**Components:**

| Component | Purpose |
|-----------|---------|
| `EnvironmentsController` | HTTP endpoints for environment management |
| `EnvironmentsService` | Business logic for environments with name uniqueness validation |
| `Environment` entity | Environment data structure with type, order, and metadata |
| `DeploymentsController` | HTTP endpoints for deployment tracking, matrix, and latest views |
| `DeploymentsService` | Business logic for deployments with status transition validation |
| `Deployment` entity | Deployment data structure linking components to environments |
| `CreateEnvironmentDto` | Environment create request validation |
| `UpdateEnvironmentDto` | Environment update request validation |
| `CreateDeploymentDto` | Deployment create request validation |
| `UpdateDeploymentDto` | Deployment update request validation |

### Teams Module

The Teams module provides team ownership and membership management. Teams are categorized by type (dev, infra, security, data, platform, other) and can be associated with catalog components.

| Component | Purpose |
|-----------|---------|
| `TeamsController` | HTTP endpoints for team CRUD and member management |
| `TeamsService` | Business logic for teams with name uniqueness and member operations |
| `Team` entity | Team data structure with type, members (ManyToMany to User), and metadata |
| `CreateTeamDto` | Team create request validation |
| `UpdateTeamDto` | Team update request validation |

### Audit Log Module

The Audit Log module records an immutable trail of significant system actions (create, update, delete operations across all resources). It is registered as the `core-audit-log` plugin and lives at `apps/api/src/modules/audit-log/`.

| Component | Purpose |
|-----------|---------|
| `AuditLogController` | HTTP endpoints for querying the audit log |
| `AuditLogService` | Business logic for recording and retrieving audit entries |
| `AuditLog` entity | Audit entry data structure (actor, action, resource, timestamp) |

### Organization Module

The Organization module provides multi-tenant isolation and org-level role management. It is registered as the `core-organization` plugin at `apps/api/src/modules/organization/`.

| Component | Purpose |
|-----------|---------|
| `OrganizationController` | REST endpoints for org CRUD and membership |
| `OrganizationService` | Business logic: create org, manage members, assert roles |
| `Organization` entity | Org data (name, slug, ownerId) |
| `UserOrganization` entity | Join table: userId + organizationId + OrgRole |

## Multi-Tenancy and RBAC

Farm implements a two-tier RBAC model that combines global platform roles with per-organization roles. See the [Multi-Tenancy Guide](multi-tenancy.md) for full details and API examples.

### Global Roles (Tier 1)

Global roles are stored as a `string[]` on the `User` entity and included in the JWT payload. The `RolesGuard` enforces them using the `@Roles()` decorator.

| Role | Description |
|------|-------------|
| `admin` | Full platform access; can manage users, organizations, and all resources |
| `user` | Standard access; subject to org-level permissions for multi-tenant resources |

### Org Roles (Tier 2)

Org roles are stored in the `UserOrganization` join table and resolved at request time. The `OrgRolesGuard` enforces them using the `@OrgRoles()` decorator.

| Role | Numeric Weight | Description |
|------|---------------|-------------|
| `OWNER` | 3 | Full control over the organization, including deletion and ownership transfer |
| `ADMIN` | 2 | Can manage members and org resources |
| `MEMBER` | 1 | Read and contribute access to org resources |

Guards are combined on a controller method as follows:

```typescript
@UseGuards(JwtAuthGuard, OrgRolesGuard)
@OrgRoles("admin")
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) { ... }
```

### OrgContextInterceptor

`OrgContextInterceptor` is registered globally as `APP_INTERCEPTOR`. It runs on every request and performs the following steps:

1. Reads the `X-Organization-Id` request header.
2. If the header is present and the user is authenticated, queries the `UserOrganization` repository to verify membership.
3. If membership is confirmed, attaches `req.organizationId` for downstream controllers and services.
4. If membership is not found, throws `ForbiddenException("Not a member of this organization")`.
5. If the header is absent or the user is unauthenticated, sets `req.organizationId = undefined` (backward-compatible behavior).

### Multi-Tenant Query Scoping

The `organizationId` foreign key is nullable and indexed on the following entities: `Component`, `Team`, `Environment`, and `AuditLog`. Existing records without an organization affiliation remain accessible when no `X-Organization-Id` header is sent.

When `req.organizationId` is set, each service's `findAll()` method scopes its query to that organization. Controllers read `organizationId` from `req.organizationId` (injected by the interceptor), not from query parameters.

### Per-User Rate Limiting

`PerUserThrottlerGuard` replaces the default IP-based throttler for authenticated requests. It uses `userId` as the throttle key, ensuring limits apply per user regardless of IP address. Two named buckets are active simultaneously:

| Bucket | Limit |
|--------|-------|
| `short` | 5 requests per second |
| `long` | 100 requests per minute |

Auth endpoints apply stricter per-route overrides via `@Throttle()`.

## Request Flow

1. **HTTP Request**: Client sends HTTP request to the NestJS application
2. **Routing**: NestJS routes the request to the appropriate controller
2.5. **Organization Context**: `OrgContextInterceptor` validates the `X-Organization-Id` header and stamps `req.organizationId`
3. **YAML Processing**: If registering via YAML, the `CatalogService` uses `js-yaml` to parse and validate the `catalog-info.yaml` content.
4. **Validation**: DTOs validate incoming request data
5. **Controller**: Controller method handles the request
6. **Service**: Service performs business logic and interacts with repositories
7. **Storage**: Data is persisted in a PostgreSQL database (in-memory SQLite for tests)
8. **Response**: Result is returned to the client

## Data Storage

Farm uses **TypeORM** as its Object-Relational Mapper (ORM) to handle database interactions with **PostgreSQL**.

**Key features:**

- **Migrations**: Database schema changes are managed through formal migrations, ensuring consistency across environments.
- **Persistence**: Data survives application restarts in development and production.
- **Environment Flexibility**: Uses SQLite in-memory for unit and E2E tests, and PostgreSQL for Docker and production deployments.
- **Asynchronous**: All database operations are non-blocking and use `async/await`.

## Validation

Farm uses `class-validator` for request validation at the DTO level.

**Global Validation Pipe Configuration:**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

- `whitelist`: Strips properties that do not have any decorators in the DTO.
- `forbidNonWhitelisted`: Throws an error if non-whitelisted properties are present.
- `transform`: Automatically transforms payloads to be objects typed according to their DTO classes.
- `enableImplicitConversion`: Allows for automatic type conversion based on the TypeScript types in the DTO.

## API Prefix

All API endpoints are prefixed with `/api`:

```typescript
app.setGlobalPrefix("api");
```

## Error Handling

Farm uses a global exception filter (`AllExceptionsFilter`) to ensure all errors return a standardized JSON response.

**Response Format:**

```json
{
  "statusCode": 400,
  "timestamp": "2023-10-27T10:00:00.000Z",
  "path": "/api/v1/catalog/components",
  "message": "Validation failed"
}
```

The filter catches both built-in NestJS exceptions (like `NotFoundException`, `ConflictException`, etc.) and generic errors, logging them with the appropriate context and returning a clean response to the client.

## Caching Layer

Farm integrates `@nestjs/cache-manager` with Redis for response caching. The cache is configured globally via `CacheModule.registerAsync()` in `AppModule`:

- **Redis store** is used when `REDIS_HOST` is set (production/Docker).
- **In-memory store** is used as fallback when `REDIS_HOST` is empty (development/testing).
- **Cache TTL** is configurable via the `CACHE_TTL` environment variable (default: 30 seconds).

Cached endpoints:

- `GET /api/v1/catalog/components` -- component listing
- `GET /api/v1/catalog/components/:id` -- component detail
- `GET /api/v1/plugins` -- plugin listing
- `GET /api/v1/plugins/menu-items` -- plugin menu items
- `GET /api/v1/plugins/routes` -- plugin route contributions

Cache invalidation is triggered automatically on component create, update, delete, and YAML registration operations via `cacheManager.clear()`.

## Observability

Farm includes integrated observability with Prometheus metrics and OpenTelemetry tracing. See the [Observability Guide](observability.md) for full details.

- **Prometheus metrics** are exposed at `GET /api/metrics` (request counters, latency histograms, Node.js process metrics).
- **OpenTelemetry traces** are exported via OTLP HTTP when `OTEL_ENABLED=true` (auto-instrumented HTTP, Express, and TypeORM spans).
- **Log-trace correlation** injects `trace_id` and `span_id` into Winston log entries in production mode.

## Future Architecture Considerations

- **Event Bus**: Add event-driven communication between modules.
