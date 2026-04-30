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
     +----------+-------+--------+-------+----------+--------+---------+
     |          |       |        |       |          |        |         |
     v          v       v        v       v          v        v         v
  +------+ +-------+ +------+ +-----+ +--------+ +------+ +-----+ +--------+
  | Auth | |Catalog| | Docs | | Env | |Pipeline| | SLOs | | K8s | |  ...   |
  +------+ +-------+ +------+ +-----+ +--------+ +------+ +-----+ +--------+
                             |
                             v
                    +------------------+
                    |  Common Layer    |
                    | (Filters/Pipes/  |
                    |  Guards/Logger)  |
                    +------------------+
                             |
                             v
              +--------------+--------------+
              |                             |
     +--------+--------+        +----------+---------+
     |   PostgreSQL 16  |        |    Redis Cache      |
     | (TypeORM, UUID   |        |  (BullMQ queues,    |
     |  primary keys,   |        |   response cache)   |
     |  migrations)     |        +--------------------+
     +------------------+
```

## Module Structure

Farm consists of 34 feature modules and a shared common layer. All feature modules live under `apps/api/src/modules/`.

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

Handles user authentication, OAuth, and Keycloak OIDC integration.

**Responsibilities:**

- User registration with password strength validation
- JWT login and refresh token rotation (40-byte hex, stored hashed)
- OAuth 2.0 social login (GitHub, Google) via Passport strategies
- Keycloak OIDC login and hourly group-to-team synchronization
- User listing (admin only)

### Catalog Module

Manages the software component catalog, serving Dev, Infra, Data, and Security teams.

**Responsibilities:**

- Component CRUD operations
- Component lifecycle management (planned, experimental, production, deprecated, decommissioned)
- YAML-driven component registration and remote discovery (`catalog-info.yaml`)
- 23 component kinds across four domain groups: `dev`, `infra`, `data`, `security`
- Component dependency tracking (ManyToMany self-referential)

Use the `kindGroup` query parameter on catalog endpoints to filter components by domain (e.g., `GET /api/v1/catalog/components?kindGroup=infra`).

### Documentation Module

Manages technical documentation associated with components.

**Responsibilities:**

- Documentation CRUD with content fetched from URLs or provided inline
- Markdown rendering with HTML sanitization
- Navigation tree building (`parentId` / `order` hierarchy)
- Title-based search with relevance scoring

### Environments Module

Manages deployment environments and tracks component deployments.

**Responsibilities:**

- Environment CRUD (development, staging, production, sandbox)
- Deployment recording with status state machine (pending, in_progress, succeeded, failed, rolled_back)
- Deployment matrix view and latest-deployment lookup

### Teams Module

Team ownership and membership management.

**Responsibilities:**

- Team CRUD (types: dev, infra, security, data, platform, other)
- User membership management (ManyToMany join table)
- Component ownership association

### Organization Module

Multi-tenant org isolation and org-level role management.

**Responsibilities:**

- Organization CRUD (name, slug, ownerId)
- Member invite and role management (OWNER, ADMIN, MEMBER)
- `OrgContextInterceptor` stamps `req.organizationId` from `X-Organization-Id` header

### Audit Log Module

Immutable audit trail of all resource mutations across the platform.

### Plugin Manager Module

Plugin registry and discovery, including `plugin.json` manifest processing for menu and route contributions.

### Analytics Module

Catalog health dashboards, DORA engineering metrics, platform usage reports, and CSV export.

### Alerting Module

PromQL-based alerting rule management. Rules can be linked to catalog components or environments.

### Dashboard Module

Custom dashboard builder with configurable widget grids. Supports multiple widget types with per-dashboard layout persistence.

### SLO Module

Service Level Objectives definition with error budget tracking and automated burn-rate alerts.

### Incident Module

Incident lifecycle management: creation, status transitions, timeline updates, and post-mortem link tracking.

### Pipelines Module

Multi-stage pipeline definition and execution. Runs stream real-time logs to clients via Socket.IO WebSocket.

### Service Template Module

Golden path template management with variable substitution, dry-run scaffold preview, and VCS push (GitHub).

### Environment Request Module

Self-service environment provisioning workflow: request, approval/rejection, TTL management.

### Helm Module

Helm release discovery and sync from connected Kubernetes clusters via `KUBECONFIG_PATH`.

### Kubernetes Module

Kubernetes workload discovery, CRD listing, Argo Rollout status, and Kyverno PolicyReport / ClusterPolicyReport reader.

### Istio Module

Istio detection, VirtualService listing and traffic weight management, PeerAuthentication / AuthorizationPolicy listing, and Prometheus-backed traffic metrics (RPS, error rate, P99 latency).

### Linkerd Module

Linkerd 2.x detection, ServerAuthorization / AuthorizationPolicy / ServiceProfile listing, Prometheus-backed traffic metrics (RPS, failure rate, P50/P95/P99 latency), and service topology graph.

### OPA Module

Open Policy Agent policy evaluation and result persistence. Results can be linked to catalog components and are stored in the database for historical review.

### Search Module

Cross-entity quick search across catalog components, teams, documentation pages, environments, and pipelines. Results are scoped to the active organization when the `X-Organization-Id` header is present.

### Features Module

Feature availability aggregator that reports which integrations (kubernetes, cost, registry, helm, istio, linkerd) are currently active and reachable.

### Setup Module

Admin setup checklist with dismissible items to guide initial platform configuration.

### FinOps Module

OpenCost integration for per-component and per-team cost data. A BullMQ-based scheduler syncs cost records from OpenCost on a configurable schedule (`COST_SYNC_CRON`).

### Registry Module

Container registry adapter supporting DockerHub, ECR (AWS), GCR/Artifact Registry, and Harbor. Provides repository browsing, tag listing, manifest inspection, and vulnerability scanning. A background BullMQ processor syncs vulnerability results and persists them per catalog component.

### Integrations Module

CI/CD platform integrations:

- **ArgoCD**: Application listing, detail, and sync trigger
- **CircleCI**: Pipeline listing and trigger
- **Jenkins**: Job listing and build trigger
- **TravisCI**: Repository and build listing
- **Webhook Receiver**: Inbound webhook endpoint for external CI/CD push events

### Cloud Module

AWS, GCP, and Azure cloud resource discovery, monthly cost aggregation, and secret resolution from provider vaults.

### Tag Policy Module

Tag governance rules (required tags, allowed values) with compliance audit and ClusterPolicy YAML export for Kyverno.

### Elasticsearch Module

Full-text search integration using the `@elastic/elasticsearch` client. Maintains a shared `farm-search` index with configurable boost weights per field (title, tags, description). All methods degrade gracefully when `ELASTICSEARCH_URL` is not set. Provides a reindex endpoint to rebuild the search index on demand.

### Elasticsearch Index Module

Per-component Elasticsearch index linking and live stats (Phase 35). Allows catalog components to be associated with one or more Elasticsearch index patterns (with optional per-component cluster URL). Exposes:

- Component-scoped CRUD at `GET/POST /api/v1/components/:id/elasticsearch-indices` and `DELETE /api/v1/components/:id/elasticsearch-indices/:indexId`
- Live cluster stats per component at `GET /api/v1/components/:id/elasticsearch-indices/stats` (doc count, index size, health)
- Admin cross-component overview at `GET /api/v1/elasticsearch/indices` (all components grouped, batched per unique cluster URL to avoid N+1 requests)

### Gateway Module

API gateway integration: Kong and AWS API Gateway route discovery, health checks, and sync.

### API Specs Module

API specification lifecycle: OpenAPI / AsyncAPI spec ingestion, version diff, breaking-change detection, and consumer tracking.

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
3. **Organization Context**: `OrgContextInterceptor` validates the `X-Organization-Id` header and stamps `req.organizationId`
4. **YAML Processing**: If registering via YAML, the `CatalogService` uses `js-yaml` to parse and validate the `catalog-info.yaml` content.
5. **Validation**: DTOs validate incoming request data
6. **Controller**: Controller method handles the request
7. **Service**: Service performs business logic and interacts with repositories
8. **Storage**: Data is persisted in a PostgreSQL database (in-memory SQLite for tests)
9. **Response**: Result is returned to the client

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
