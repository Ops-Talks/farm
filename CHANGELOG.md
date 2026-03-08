# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **BullMQ job processing**: Integrated `@nestjs/bullmq` and `bullmq` for async background job processing using Redis.
- **Catalog discovery queue**: `POST /catalog/locations` now enqueues an async BullMQ job instead of processing synchronously, with graceful sync fallback when Redis is unavailable.
- **CatalogDiscoveryProcessor**: Dedicated BullMQ processor for async YAML catalog ingestion from git repositories.
- **NotificationProcessor**: Placeholder BullMQ processor for future email/webhook notification support.
- **Bull Board dashboard**: Queue monitoring UI at `/api/admin/queues` via `@bull-board/nestjs` and `@bull-board/express`.
- **QueuesModule**: Centralized queue module with conditional loading -- BullMQ/Bull Board skipped in test mode to prevent Redis connection leaks.

## [0.5.0] - 2026-03-08

### Added
- **Prometheus metrics**: Integrated `prom-client` and `@willsoto/nestjs-prometheus` with default process metrics, custom HTTP request counter (`http_requests_total`), and request duration histogram (`http_request_duration_seconds`) by method, route, and status code. Exposed at `GET /api/metrics`.
- **OpenTelemetry tracing**: Integrated `@opentelemetry/sdk-node` with auto-instrumentations for HTTP, Express, and TypeORM. Exports traces via OTLP HTTP to configurable endpoint. Opt-in via `OTEL_ENABLED=true` environment variable.
- **Log-trace correlation**: Winston log entries in production include `trace_id` and `span_id` fields from the active OpenTelemetry span for cross-referencing logs with distributed traces.
- **MetricsInterceptor**: Global NestJS interceptor that records per-request Prometheus metrics with route-level granularity.
- **Redis caching**: Integrated `@nestjs/cache-manager` with `@keyv/redis` for response caching. Falls back to in-memory cache when `REDIS_HOST` is not set.
- **Cache interceptors**: Applied `CacheInterceptor` to `GET /catalog/components`, `GET /catalog/components/:id`, and all plugin GET endpoints for reduced database load.
- **Cache invalidation**: Automatic cache clear on component create, update, delete, and YAML registration operations.
- **Redis Docker service**: Added `redis:7-alpine` service with healthcheck to `docker-compose.yml`; API depends on Redis health.
- **Observability stack**: Added `docker-compose.observability.yml` with Grafana (port 3001), Prometheus (port 9090), and Grafana Tempo (ports 3200/4318) for metrics visualization and distributed trace inspection.
- **Pre-provisioned Grafana dashboard**: Farm API Overview dashboard with request rate, latency percentiles (p50/p95/p99), error rate, duration heatmap, and recent traces panels -- provisioned automatically on startup.
- **Makefile targets**: Added `make up-observability` and `make down-observability` for one-command observability stack management.
- **Observability documentation**: New `docs/developer-guide/observability.md` covering stack architecture, quick start, dashboard panels, metrics reference, PromQL examples, and extension guides.

## [0.4.7] - 2026-03-08

### Fixed
- **Dockerfile**: Pre-create `logs/` directory with `node` ownership to prevent EACCES permission error when running as non-root user.

## [0.4.6] - 2026-03-08

### Added
- **Helmet security headers**: Installed `helmet` and applied via `app.use(helmet())` in `main.ts` for X-Frame-Options, Content-Security-Policy, and other HTTP security headers.
- **Graceful shutdown**: Enabled `app.enableShutdownHooks()` in `main.ts` to drain active connections and close the database pool cleanly on SIGTERM/SIGINT.
- **Swagger bearer auth**: Added `.addBearerAuth()` to Swagger DocumentBuilder so the UI exposes an Authorize button for JWT tokens.

### Changed
- **Dockerfile**: Added `USER node` directive in production stage to run container as non-root user.

## [0.4.5] - 2026-03-08

### Added
- **Pagination**: All list endpoints now return paginated responses (`data`, `total`, `skip`, `take`). Accepts `skip` (default 0) and `take` (default 20, max 100) query parameters. Applied to Catalog, Teams, Documentation, Environments, and Deployments modules.
- **Per-endpoint Query DTOs**: `ListComponentsQueryDto`, `ListDocumentationQueryDto`, `ListDeploymentsQueryDto` extend `PaginationQueryDto` with module-specific filter fields.
- **LoginResponseDto / RefreshResponseDto**: Typed response DTOs for auth endpoints with Swagger annotations.
- **Request Logger Middleware**: Logs HTTP method, path, status code, duration, and authenticated user ID. Excludes health check endpoints from logging.
- **DATABASE_POOL_SIZE**: New environment variable (default 10, range 1-100) for PostgreSQL connection pool configuration.
- **Docker HEALTHCHECK**: Dockerfile includes a health check using Node.js (compatible with Alpine images without curl).
- **Docker env var extraction**: `docker-compose.yml` credentials use `${VAR:-default}` pattern; `.env.example` template created.
- **E2E Tests for Teams**: CRUD lifecycle, member management, and component ownership tests.
- **E2E Tests for Plugin Manager**: List plugins, menu items, routes, auth, and non-admin rejection tests.
- **Auth edge case E2E tests**: Malformed JWT returns 401, non-admin user returns 403.
- **Jest coverage thresholds**: Enforced minimums (65% branches, 70% functions/lines/statements) in `package.json`.

### Changed
- **DTO validation**: `componentId` in `CreateDocumentationDto` changed from `@IsString()` to `@IsUUID()`. `dependencyIds` in `CreateComponentDto` changed from `@IsString({each:true})` to `@IsUUID("4",{each:true})`.
- **Test assertions**: Replaced trivial `toBeDefined()` checks with meaningful assertions in documentation and teams specs.

### Fixed
- **Docker build failure**: Fixed TypeScript strict compilation error in `RequestLoggerMiddleware` (TS2352 cast through `unknown`).
- **Docker startup failure**: Hardcoded `DATABASE_HOST: postgres` in `docker-compose.yml` to prevent `.env` file from overriding the container-internal hostname.
- **Express path syntax**: Updated middleware path from `"api/health(.*)"` to `"api/health{*path}"` for current path-to-regexp version.

### Documentation
- Updated API reference docs (catalog, teams, environments, deployments, documentation) with pagination parameters and response format.
- Expanded `docs/api-reference/docs.md` with full endpoint list, properties table, and usage examples.
- Added `DATABASE_POOL_SIZE` to environment variables table in setup guide.
- Added `.env.example` copy step to getting started guide.
- Updated coverage thresholds in testing guide to match actual configuration.
- Updated `docs/user-guide/documentation.md` with `sourceUrl` field and new endpoints.
- Updated `README.md` with Teams, Environments, and Deployments endpoint sections.

## [0.4.4] - 2026-03-08

### Fixed
- **Docker JWT_SECRET**: Added `JWT_SECRET` env var to `docker-compose.yml` for production mode compatibility.

### Changed
- **Documentation Sync**: Updated 9 documentation files to reflect current implementation (rate limiting, JWT auth, refresh tokens, password validation, memory thresholds, env vars).


## [0.4.3] - 2026-03-08

### Added
- **Refresh Token Mechanism**: `POST /auth/refresh` endpoint with token rotation, bcrypt-hashed storage, and replay attack detection (invalidates token on reuse).
- **Password Strength Validation**: `RegisterUserDto.password` requires lowercase, uppercase, and digit; `username` enforces length 2-50.
- **CORS Configuration**: Configurable `ALLOWED_ORIGINS` env var with wildcard and comma-separated URL support.
- **Rate Limiting on Auth Endpoints**: `@Throttle` on login (5/min), register (5/min), refresh (10/min) with Swagger rate limit headers; skips throttling in test environment.
- **Database Indexes**: Added `@Index()` on `Component.owner` and `Documentation.componentId` with migration.

### Changed
- **JWT Secret Enforcement**: `JWT_SECRET` is required with min 32 characters in production via Joi validation.
- **ThrottlerModule**: Uses `skipIf` callback to disable rate limiting in test environment.

### Fixed
- **N+1 Query Performance**: Rewrote `findLatestByComponent()` and `getMatrix()` in DeploymentsService from O(M*N) loops to single QueryBuilder queries with SQL-level filtering.
- **Swagger Version**: Reads version dynamically from `package.json` instead of hardcoded string.

## [0.4.2] - 2026-03-07

### Added
- **Multi-Team Catalog Expansion**: Extended component kinds for Dev, Infra, Data, and Security teams (23 kinds total) with ComponentKindGroup enum and lifecycle stages.
- **Environments and Deployments Module**: Full environment management with deployment lifecycle tracking, status transitions, and deployment matrix endpoint.
- **Teams and Ownership Module**: Team CRUD, member management (ManyToMany with Users), and component ownership via teamId foreign key.
- **TechDocs Enhancement**: Markdown rendering with `marked`, documentation tree hierarchy (parentId/order), and in-memory search endpoint.
- **Plugin System Evolution**: Plugin manifest support, menu item and route contribution registries, directory scanning for external plugins.
- **E2E Test Suite**: 22 end-to-end tests covering auth, catalog, catalog-yaml, documentation, environments, and deployments.
- **Database Migrations**: Added migrations for environments/deployments, teams/ownership, and documentation tree fields.

### Changed
- **Health Check Thresholds**: Increased memory thresholds from 150MB/300MB to 512MB/1024MB to prevent false failures in CI environments.
- **CI Pipeline**: Migrated from deprecated `codecov/test-results-action@v1` to `codecov/codecov-action@v5` with `report_type: test_results`.

### Fixed
- **TypeScript Build Errors**: Fixed 13 compilation errors caused by `ConfigService.get()` returning `string | undefined` in ThrottlerModule, JwtModule, JwtStrategy, and multiple spec files.
- **Type Safety**: Fixed mock type mismatches in auth, catalog, documentation, and teams spec files.
- **Docker/PostgreSQL Startup**: Removed explicit `type: "datetime"` from `Deployment.startedAt` and `Deployment.finishedAt` columns; TypeORM now infers the correct native type per database (`timestamp` for PostgreSQL, `datetime` for SQLite).

## [0.4.1] - 2026-03-07

### Added
- **JWT Authentication**: Replaced placeholder auth with robust JWT-based authentication using Passport.js.
  - Implemented `LocalStrategy` for login validation.
  - Implemented `JwtStrategy` for endpoint protection.
  - Added `JwtAuthGuard` to secure sensitive routes.
- **Role-Based Access Control (RBAC)**: Implemented role management.
  - Added `@Roles()` decorator and `RolesGuard`.
  - Restricted write operations (POST, PATCH, DELETE) in Catalog and Documentation to `admin` users.
- **Rate Limiting**: Integrated `@nestjs/throttler` for API protection.
  - Configured global rate limiting with configurable TTL and limit via environment variables.
- **Security Enhancements**:
  - Implemented automatic password hashing using `bcrypt` in the `User` entity.
  - Added `ApiBearerAuth` to Swagger documentation for all protected endpoints.
- **Configuration**: Added `JWT_SECRET`, `JWT_EXPIRATION`, `THROTTLE_TTL`, and `THROTTLE_LIMIT` to environment variables.

## [0.2.5] - 2026-03-05


### Added
- **Infrastructure Orchestration**: Created `docker-compose.yml` to manage API and PostgreSQL database.
- **Advanced Health Monitoring**: Integrated `@nestjs/terminus` for detailed system health checks.
  - New endpoints: `GET /api/health` providing status for Database, Memory, Disk, and Version.
  - Integrated Docker healthchecks in `docker-compose.yml` using the new endpoint.
- **Structured Logging**: Integrated `nest-winston` and `winston` for professional log management.
  - Configurable log levels via `LOG_LEVEL` environment variable.
  - JSON-formatted logs for production and pretty-printed logs for development.
  - Automatic log rotation for production via `winston-daily-rotate-file`.
- **Database Migrations**: Set up TypeORM migration strategy.
  - Added `src/config/typeorm-cli.config.ts` for migration management.
  - Generated initial migration for current schema.
  - Added npm scripts: `migration:generate`, `migration:run`, `migration:revert`.
- **Environment Configuration**: Added `.env` support and improved validation schema in `src/config/configuration.ts`.

### Changed
- **Makefile Improvements**: Updated `up-docker` and `down-docker` to use Docker Compose and added `down-docker-clean` for full environment reset.
- **Documentation**: Updated `README.md` with Docker instructions and new project roadmap in `NEXT_STEPS.md`.

## [0.2.4] - 2026-03-05
### Changed
- Updated ESLint configuration to ignore the unbound-method rule in test files.
- Synchronized package.json version to 0.2.4.
- Added /coverage to .gitignore and removed the coverage/ directory from version control.

### Fixed
- Adjusted Jest mocks in src/documentation/documentation.service.spec.ts for ESLint compliance.

## [0.2.4] - 2026-03-05

### Added
- **Gitignore Configuration**: Added agent configuration and project planning files to `.gitignore`:
  - `.github/agents/Farm-Developer.agent.md`: NestJS development standards agent configuration.
  - `NEXT_STEPS.md`: Project roadmap and improvement suggestions.

### Changed
- **Swagger Documentation**: Updated API documentation version from `0.2.3` to `0.2.4` in `src/main.ts` for consistency with package release.

## [0.2.3] - 2026-03-04

### Added
- **Swagger/OpenAPI Documentation**: Integrated `@nestjs/swagger` for comprehensive API documentation.
  - Added `@nestjs/swagger` and `swagger-ui-express` dependencies to `package.json`.
  - Configured `@nestjs/swagger` compiler plugin in `nest-cli.json`.
  - Initialized `SwaggerModule` in `src/main.ts` with title "Farm API" and version "0.2.3", served at `/api/docs`.
  - Applied OpenAPI decorators to `LoginDto` and `RegisterUserDto` in `src/auth/dto/`.
  - Documented API endpoints for `Auth`, `Catalog`, `Documentation`, and `Plugin Manager` modules.
  - Documented the `/health` check endpoint in `src/app.controller.ts`.

### Changed
- **DTO Inheritance**: Refactored `src/catalog/dto/update-component.dto.ts` and `src/documentation/dto/update-documentation.dto.ts` to use `@nestjs/swagger`'s `PartialType`.
- **Swagger Compatibility**: Converted `PluginMetadata` from interface to class in `src/plugin-manager/interfaces/plugin.interface.ts` for runtime reflection.
- **MkDocs Integration**: Updated static documentation to reference the new Swagger UI:
  - `docs/index.md`: Updated "Quick Start" to include Swagger UI link.
  - `docs/api-reference/index.md`: Added "Interactive Documentation" section pointing to `/api/docs`.
  - `docs/user-guide/getting-started.md`: Updated "Verifying the Installation" with Swagger UI check.
  - `docs/developer-guide/setup.md`: Added Swagger UI availability note to local development section.
- **API Reference Documentation Audit**: Audited `docs/api-reference/*.md` files to remove redundant API details, linking directly to Swagger UI for comprehensive endpoint and data model information.

## [0.2.2] - 2026-03-04

### Added
- **Docs Branding Asset**: Added `docs/img/farm01.svg` and configured it as project favicon.
- **Dockerized Test Workflow**: Added multi-stage `Dockerfile` with dedicated `test` and `production` targets.
- **Container Build Optimization**: Added `.dockerignore` for faster Docker builds.
- **Developer Commands**: Added Makefile targets for API validation via Docker (`test-docker`, `up-docker`, `down-docker`, `healthcheck`).

### Changed
- **Documentation Theme Customization**: Updated MkDocs Material configuration to support custom color tokens.
- **Visual Identity**: Applied Electric Indigo (`#6F00FF`) and Neon Fuchsia (`#FE59C2`) in `docs/stylesheets/extra.css`.
- **Header Styling**: Added gradient styling for header and tabs in documentation.
- **Homepage Content**: Updated `docs/index.md` to render the Farm logo in the page body.

### Fixed
- **MkDocs Color Configuration**: Replaced invalid theme color configuration approach with proper CSS variable overrides.

## [0.2.1] - 2026-03-04

### Added
- **System Discovery Documentation**: New guide for users to understand platform capabilities.
- **Plugin System Guide**: Detailed technical documentation for developers on how to extend Farm.
- **Plugins API Reference**: Documentation for the new `/api/plugins` discovery endpoint.
- **NestJS Development Standards**: Integrated specialized development guidelines in `.github/nestjs_instructions.md`.

### Changed
- **Developer Experience**: Updated setup guides with Docker and Makefile instructions.
- **Localization**: Translated Makefile commands and help messages to EN_US.
- **Documentation Structure**: Refined MkDocs navigation and indices for better discoverability.

## [0.2.0] - 2026-03-04

### Added
- **Plugin Manager Architecture**: Introduced a dynamic plugin system for modular extensibility.
  - `PluginManagerModule`: Handles dynamic registration of modules.
  - `PluginManagerService`: Centralized registry for plugin discovery.
  - `PluginManagerController`: API endpoint (`GET /api/plugins`) to list active features.
- Registered core modules (`Catalog`, `Documentation`, `Auth`) as plugins.

## [0.1.0] - 2026-03-04

### Added
- Initial NestJS project structure for Farm developer portal.
- **Catalog Module**: CRUD for software components (services, libraries, APIs).
- **Documentation Module**: Management of technical docs associated with components.
- **Auth Module**: Basic user registration and login functionality.
- **MkDocs Integration**: Comprehensive technical documentation using Material theme.
- **Docker Support**: `Dockerfile` and `docker-compose.docs.yml` for containerized deployment.
- **CI/CD**: GitHub Actions workflow for automatic documentation publishing to GitHub Pages.
- **Makefile**: Automation scripts for common tasks (build, test, docker, docs).

### Fixed
- MkDocs loading issues in production environments.
