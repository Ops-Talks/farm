# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.3] - 2026-03-18

### Changed
- fix:(coverage) reports back to generates.

## [0.10.2] - 2026-03-18

### Changed
- - GET /api/v1/auth/users now requires JWT + admin role (was unauthenticated)    - POST /api/v1/traces/ingest now requires JWT (was unauthenticated)    - /api/docs protected with HTTP Basic Auth middleware; credentials      configurable via SWAGGER_USER / SWAGGER_PASSWORD (default: farm/farm)    - Add swagger.user and swagger.password to configuration.ts and Joi schema    - Document SWAGGER_USER and SWAGGER_PASSWORD in .env.example.

## [0.10.1] - 2026-03-18

### Changed
- feat:(web) FARM-E29 done.
- feat:(web) FARM-E29 done.
- feat:(web) FARM-E29 done.

## [0.10.0] - 2026-03-17

### Added
- **web**: FARM-S120 replace useState data fetching with TanStack Query v5   QueryProvider (makeQueryClient, staleTime 60s, retry 1) wraps the   protected layout. Client components migrated from useState+useEffect   to useQuery/useMutation. Eliminates react-hooks/set-state-in-effect   lint warnings permanently. Deps: @tanstack/react-query.
- **web**: FARM-S123 lazy-load heavy components with next/dynamic.
- **web**: FARM-S121 error boundaries for all protected feature routes.
- **web**: FARM-S118 OpenTelemetry client-side instrumentation.
- **api**: FARM-S118 OTLP ingest proxy for browser traces.
- **web**: FARM-S91 run list pagination, stats panel, and run comparison.
- **api**: FARM-S91 paginated pipeline run history with stats and comparison.

### Changed
- mark FARM-E31 DONE and update NEXT_STEPS for v0.9.3.
- **web**: FARM-S122 colocate test files with source components   All 32 test files moved from src/__tests__/ flat mirror to alongside their source files (*.test.tsx colocated with *.tsx). Zero import changes needed — all tests use @/ alias. vitest.config.ts: setup. Files updated to src/test/setup.ts. 309/309 tests pass.
- update ROADMAP and NEXT_STEPS for v0.9.3 deliveries.

### Fixed
- **api**: FARM-T59 fix deployments matrix 500 on PostgreSQL     TypeORM getMatrix() used raw string concatenation for correlated     subquery, producing 'd.createdAt = SELECT MAX(...)' which PostgreSQL     rejects. Replaced with .subQuery() so TypeORM wraps it in parentheses.     SQLite tolerated the invalid syntax; PostgreSQL does not.

## [0.9.13] - 2026-03-17

### Added
- **web**: pipeline run actions, dashboard widget, and WebSocket notifications (FARM-E26).
- **pipelines**: add approve, reject, and cancel run endpoints (FARM-E26).
- **types**: add WAITING_APPROVAL to PipelineRunStatus enum (FARM-E26).

### Changed
- **web**: add notification-listener and run-detail test coverage (FARM-E26).
- **api**: add organization controller and pipeline processor specs (FARM-E25/E26).
- add organizations guide, update pipelines and catalog docs (FARM-E25/E26).
- update CHANGELOG and ROADMAP for FARM-E26 pipeline UI completion.

## [0.9.12] - 2026-03-17

### Changed
- feat:(members)  FARM-S85 — Member Management (Backend).

## [0.9.11] - 2026-03-17

### Added
- **web**: inject X-Organization-Id header in all API requests (FARM-E25).
- **org**: enforce multi-tenant org scoping via X-Organization-Id header (FARM-E25).

### Changed
- add multi-tenancy guide and update architecture docs (FARM-E25).

## [0.9.10] - 2026-03-17

### Security
- **multer**: upgraded to `2.1.1` via `@nestjs/platform-express@11.1.17` — resolves ReDoS vulnerability (CVE-2025-47944).
- **flatted**: upgraded to `3.4.1` — resolves prototype pollution vulnerability.
- **file-type**: upgraded to `21.3.2` — resolves ReDoS vulnerability (CVE-2024-4067).
- Migrated E2E test database driver from `sqlite3` (deprecated, 9 HIGH vulnerabilities) to `better-sqlite3@12` — reduces audit findings from 17 to 9, eliminates all HIGH severity issues in production dependencies.

### Fixed
- **email**: Handlebars templates (`*.hbs`) were not copied to `dist/` during build, causing `EmailService` to silently fail in production and Docker. Added `assets` declaration to `nest-cli.json`.
- **docker**: fix monorepo build and PostgreSQL migration compatibility.
- **config**: added `"better-sqlite3"` to the Joi `DATABASE_TYPE` allowlist to prevent config validation errors in E2E test startup.

### Changed
- Dependency version alignment across workspace packages.

## [0.9.2] - 2026-03-16

### Added
- **auth**: add GitHub and Google OAuth strategies (FARM-S113).

## [0.9.1] - 2026-03-16

### Changed
- Update index docs.

## [0.9.0] - 2026-03-16

### Added
- FARM-S113: Playwright E2E test suite for frontend authentication, catalog, deployments, and teams flows.
- FARM-S86 frontend: Complete frontend implementation with all pages and components.
- FARM-S87: Social authentication with GitHub and Google OAuth providers.
- FARM-E27: Validation improvements and release pipeline fixes.
- FARM-E28: Integrations module foundation.

### Fixed
- Release pipeline configuration and Makefile targets.
- Test suite stability across API and frontend.

## [0.8.6] - 2026-03-15

### Changed
- Bump to v0.8.6.

## [0.8.5] - 2026-03-15

### Changed
- Bump to v0.8.5.

## [0.8.4] - 2026-03-15

### Changed
- Bump to v0.8.4.

## [0.8.3] - 2026-03-15

### Fixed
- use --increment instead of --release-version in make release target.

## [0.8.1] - 2026-03-15

### Fixed
- **next.config.ts**: Removed invalid `telemetryDisabled` property (not a valid Next.js option); telemetry remains disabled via `NEXT_TELEMETRY_DISABLED=1` in Dockerfile and env files.
- **release-it config**: Set `requireCleanWorkingDir: false` and added `commitFiles` for monorepo compatibility where `CHANGELOG.md` lives at the repo root.
- **Documentation**: Updated all `src/` path references to `apps/api/src/` across developer guides; added `AuditLog` module to architecture docs and API reference.

## [0.8.0] - 2026-03-15

### Changed
- Monorepo workspace setup and project structure consolidation.

## [0.7.0] - 2026-03-15

### Added
- **Audit log module**: Immutable audit trail (`core-audit-log` plugin) with `AuditLog` entity, service, controller, and migration.
- **Notification queue processor**: `NotificationProcessor` with email and webhook support via BullMQ.
- **Catalog discovery processor**: `CatalogDiscoveryProcessor` for async catalog ingestion jobs.
- **Telemetry tracing**: OpenTelemetry tracing setup (`tracing.ts`) gated behind `OTEL_ENABLED=false` by default.
- **Metrics interceptor**: Prometheus HTTP metrics (`http_requests_total`, `http_request_duration_seconds`) via `MetricsInterceptor`.
- **Request logger middleware**: Structured request/response logging middleware.

### Changed
- **Monorepo restructure**: API source moved to `apps/api/`, web source to `apps/web/`; config files (`Dockerfile`, `tsconfig.json`, `nest-cli.json`, `eslint.config.mjs`) relocated accordingly.
- **`.gitignore`**: Fixed `dist/` and `coverage/` patterns to apply to all subdirectories (previously only matched repo root).
- **`.release-it.json`**: Moved to `apps/api/`; fixed `CHANGELOG.md` path to `../../CHANGELOG.md`.
- **Next.js telemetry disabled**: `NEXT_TELEMETRY_DISABLED=1` added to `next.config.ts`, `apps/web/.env.local`, and `apps/web/.env.example`.
- **`.env.example`**: Synced with all current configuration variables (`JWT_SECRET`, `ALLOWED_ORIGINS`, Redis, SMTP, OTEL).

### Fixed
- **Teams page crash**: `teams.list()` and `environments.list()` API client methods now correctly typed as `Promise<PaginatedResponse<T>>`; `TeamsClient` extracts `.data` from paginated response preventing `TypeError: allTeams.filter is not a function`.
- **Dashboard quick-stats**: Teams and environments counts now use `.total` instead of `.length` on paginated responses.
- **AuditLog entity**: Changed `payload` column from `jsonb` (PostgreSQL-only) to `simple-json` for SQLite E2E test compatibility.
- **Plugins E2E test**: Updated expected plugin count from 5 to 6 to include `core-audit-log`.
- **Lint errors**: Fixed `require-await`, `no-unsafe-return`, `no-unsafe-member-access`, and `no-require-imports` violations across test files.
- **Lint warnings**: Typed `Job<T>` generics in `notification.processor.spec.ts` and `catalog-discovery.processor.spec.ts`.

## [0.6.2] - 2026-03-08

### Added
- **Frontend test suite**: 101 tests across 11 files using Vitest + React Testing Library covering API client, WebSocket client, auth context, auth guard, dashboard widgets, and all page components.
- **Makefile targets**: `check-back`, `check-front`, and `web-test` targets; `check` now runs both backend and frontend checks.

### Changed
- **Developer Guide restructured**: Split into Backend and Frontend sub-sections; moved backend docs into `developer-guide/backend/` and created `developer-guide/frontend/` with architecture and testing guides.
- **Project description**: Updated across all files to canonical text: "Farm is an open-source full stack portal providing a centralized hub for managing software components, technical documentation, and team infrastructure."
- **ADR-001 removed**: Front-end technology stack content absorbed into `developer-guide/frontend/architecture.md`.

## [0.6.1] - 2026-03-08

### Added
- **Email service**: Integrated `nodemailer` with SMTP transport and `handlebars` template engine for transactional email notifications. Opt-in via `SMTP_HOST` environment variable with graceful degradation when not configured.
- **Email templates**: Welcome email and deployment notification templates with shared HTML layout, located in `src/common/email/templates/`.
- **NotificationProcessor email integration**: The BullMQ notification processor now sends emails via EmailService for `type: "email"` jobs, using the specified Handlebars template and context.
- **EmailModule**: Global module providing EmailService across the application with SMTP connection verification on startup.
- **Front-end foundation**: Next.js 16 application with React 19, TypeScript strict mode, Tailwind CSS 4, and Shadcn/ui component library in `web/` directory.
- **API client**: Type-safe HTTP client with JWT token management, automatic 401 refresh, and typed API methods for all backend endpoints.
- **WebSocket client**: Socket.IO client with JWT auth handshake, automatic reconnection with exponential backoff, and typed event subscription matching `FarmEvent` enum.
- **Login page**: Authentication form with error handling and session token storage.
- **Dashboard page**: System health overview displaying API health status with per-check detail cards, auto-refresh every 30 seconds.
- **Landing page**: Farm portal home with feature navigation cards.
- **Front-end Docker**: Multi-stage Dockerfile (`web/Dockerfile`) and `web` service in `docker-compose.yml` on port 3001.
- **ADR-001**: Architecture Decision Record documenting front-end stack selection (Next.js + Shadcn/ui + Tailwind CSS).
- **Authentication UI (FARM-E18)**: AuthProvider context with `useAuth()` hook, client-side route guard (`AuthGuard`), and app shell layout with sidebar navigation and user menu with sign-out.
- **Route groups**: Next.js `(protected)` route group wrapping Dashboard, Catalog, Deployments, and Teams pages with `AuthGuard` and `AppShell` layout.
- **Placeholder pages**: Catalog, Deployments, and Teams stub pages under the protected layout.
- **Dashboard panels (FARM-E19)**: Enhanced dashboard with four panels: quick stats (component/team/environment/deployment counts), system health (color-coded indicators with byte formatting), real-time activity feed (WebSocket event subscriptions), and background queue info (Bull Board link).
- **Catalog list page (FARM-E20)**: Component data table with name, kind, lifecycle, owner, tags columns. KindGroup filter tabs (All/Dev/Infra/Data/Security), client-side name search, pagination, and WebSocket live refresh on component changes.
- **Catalog detail page**: Dynamic `/catalog/[id]` route displaying component metadata, lifecycle badge, owner, tags, links, external metadata, dependency graph, and recent deployment history.
- **Component registration form**: Form-based and YAML import modes for `POST /catalog/components` and `POST /catalog/register-yaml`. Includes kind/lifecycle selects, tag input with preview, and validation error display.
- **API client extensions**: Added `catalog.registerYaml()` and `catalog.discoverFromLocation()` methods. Updated `listComponents` to use `kindGroup` filter matching backend API.
- **Deployment matrix page (FARM-E21)**: Visual grid with components as rows, environments as columns, color-coded cells by deployment status (succeeded/pending/in-progress/failed/rolled-back). KindGroup filter tabs and WebSocket live refresh on deployment changes.
- **Deployment history page**: Filterable deployment list at `/deployments/history` with status tabs, component/environment links, version, deployer, and pagination.
- **Deployment matrix types**: Added `DeploymentMatrixRow` and `DeploymentMatrixEnvironment` interfaces. Fixed deployment API routes from `/v1/environments/deployments` to `/v1/deployments`. Added `deployments.latest()` method.
- **Queue management API (FARM-E22)**: REST endpoints at `/api/v1/queues` for listing queues with job counts, inspecting individual queue stats, listing/filtering jobs by status, viewing job details (payload, result, errors, stack trace), and retrying failed jobs. Admin-only with Swagger documentation.
- **Queue dashboard page**: Queue overview at `/queues` with cards showing job counts by status (active/waiting/completed/failed/delayed), auto-refresh every 15 seconds, and Bull Board link.
- **Queue detail page**: Job listing at `/queues/:name` with status filter tabs, expandable job detail panels showing payload, result, errors, stack trace, and retry button for failed jobs.
- **Queue API client**: Added `queues.list()`, `queues.get()`, `queues.listJobs()`, `queues.getJob()`, `queues.retryJob()` methods and `QueueInfo`/`JobInfo` types.
- **Observability API (FARM-E23)**: REST endpoint at `/api/v1/observability/summary` returning process uptime, memory usage, HTTP request counts by status group, latency percentiles (p50/p90/p95/p99) from Prometheus histogram, and configurable Grafana URL. Admin-only with Swagger documentation.
- **Observability UI page**: Tabbed interface at `/observability` with Health (detailed component status, uptime, memory), Metrics (request counts, error rate, latency percentiles, Grafana dashboard link), and Traces (OpenTelemetry setup guide, Tempo/Grafana explore links, instrumented component overview).
- **GRAFANA_URL config**: Added `GRAFANA_URL` environment variable for linking to external Grafana instance from the observability dashboard.
- **Teams management UI (FARM-E24)**: Full team management with listing page showing team cards filtered by type (dev/infra/security/data/platform/other) with search, team detail page displaying members and owned components, team creation form, and inline editing/deletion for admins. Member management with add/remove actions using user search.
- **Teams API client**: Extended `teams` API client with `update()`, `delete()`, `getMembers()`, `addMember()`, `removeMember()`, and `getComponents()` methods.
- **Breadcrumb navigation (FARM-S83)**: Added path-based breadcrumb bar in the top header for contextual navigation across all pages.
- **Dark mode support**: Wired up `next-themes` ThemeProvider with system/light/dark modes and a theme toggle in the user dropdown menu.
- **Documentation browser (FARM-S82)**: Full documentation viewer at `/docs` with tree sidebar navigation per component, rendered Markdown content display, search by title with relevance scores, and admin create/edit/delete forms. Integrated `@tailwindcss/typography` for styled prose rendering.
- **Documentation API client**: Added `docs.list()`, `docs.get()`, `docs.getContent()`, `docs.getRendered()`, `docs.search()`, `docs.tree()`, `docs.create()`, `docs.update()`, `docs.delete()` methods and `DocumentationEntry`/`DocumentationTreeNode`/`DocumentationSearchResult` types.

## [0.6.0] - 2026-03-08

### Added
- **BullMQ job processing**: Integrated `@nestjs/bullmq` and `bullmq` for async background job processing using Redis.
- **Catalog discovery queue**: `POST /catalog/locations` now enqueues an async BullMQ job instead of processing synchronously, with graceful sync fallback when Redis is unavailable.
- **CatalogDiscoveryProcessor**: Dedicated BullMQ processor for async YAML catalog ingestion from git repositories.
- **NotificationProcessor**: Placeholder BullMQ processor for future email/webhook notification support.
- **Bull Board dashboard**: Queue monitoring UI at `/api/admin/queues` via `@bull-board/nestjs` and `@bull-board/express`.
- **QueuesModule**: Centralized queue module with conditional loading -- BullMQ/Bull Board skipped in test mode to prevent Redis connection leaks.
- **Database seeder**: Idempotent seed runner (`npm run seed` / `make seed`) with initial data: 2 users (admin + developer), 2 teams, 3 components (service, library, website), 2 environments (development, staging). Guarded against production execution.
- **API versioning**: Enabled URI-based versioning (`/api/v1/...`) via `VersioningType.URI` with `defaultVersion: '1'`. Health (`/api/health`) and root (`/api`) endpoints remain version-neutral. All E2E tests updated to versioned paths.

### Changed
- **TypeScript strict mode**: Enabled `noImplicitAny`, `strictBindCallApply`, `strictFunctionTypes`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`, and `noFallthroughCasesInSwitch` in tsconfig.json. Combined with existing `strictNullChecks`, the project now enforces near-full TypeScript strict mode (only `strictPropertyInitialization` excluded for NestJS DTO/entity compatibility).
- **WebSocket real-time events**: Added `EventsGateway` (`/events` namespace) with JWT-authenticated handshake via Socket.IO. Emits `component.created`, `component.updated`, `component.deleted`, `deployment.created`, and `deployment.updated` events. Clients connect with `io("ws://host:port/events", { auth: { token: "jwt" } })`.

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
- **Observability stack**: Added `docker-compose.observability.yml` with Grafana (port 3002), Prometheus (port 9090), and Grafana Tempo (ports 3200/4318) for metrics visualization and distributed trace inspection.
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
