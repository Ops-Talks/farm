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
     +----------+------------+-----------+------------+--------+
     |          |            |           |            |        |
     v          v            v           v            v        v
 +--------+ +--------+ +-----------+ +---------+ +--------+ +------+
 |  Auth  | |Catalog | |  Docs     | |  Envs   | |Plugin  | |Teams |
 | Module | | Module | |  Module   | | Module  | |Manager | |Module|
 +--------+ +--------+ +-----------+ +---------+ +--------+ +------+
     |          |            |           |            |        |
     +----------+------------+-----------+------------+--------+
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

- `src/common/filters/http-exception.filter.ts` - Standardized error response handling
- `src/common/logger/logger.config.ts` - Winston logger configuration
- `src/common/health/health.controller.ts` - Terminus health indicators

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

Use the `kindGroup` query parameter on catalog endpoints to filter components by domain (e.g., `GET /api/catalog/components?kindGroup=infra`).

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

## Request Flow

1. **HTTP Request**: Client sends HTTP request to the NestJS application
2. **Routing**: NestJS routes the request to the appropriate controller
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
  "path": "/api/catalog/components",
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

- `GET /api/catalog/components` -- component listing
- `GET /api/catalog/components/:id` -- component detail
- `GET /api/plugins` -- plugin listing
- `GET /api/plugins/menu-items` -- plugin menu items
- `GET /api/plugins/routes` -- plugin route contributions

Cache invalidation is triggered automatically on component create, update, delete, and YAML registration operations via `cacheManager.clear()`.

## Observability

Farm includes integrated observability with Prometheus metrics and OpenTelemetry tracing. See the [Observability Guide](observability.md) for full details.

- **Prometheus metrics** are exposed at `GET /api/metrics` (request counters, latency histograms, Node.js process metrics).
- **OpenTelemetry traces** are exported via OTLP HTTP when `OTEL_ENABLED=true` (auto-instrumented HTTP, Express, and TypeORM spans).
- **Log-trace correlation** injects `trace_id` and `span_id` into Winston log entries in production mode.

## Future Architecture Considerations

- **Event Bus**: Add event-driven communication between modules.
- **Job Queues**: Add BullMQ for background processing of catalog discovery and notifications.
