# ROADMAP

Farm project roadmap organized using JIRA-like hierarchy.

## Hierarchy

| Level | Prefix | Description |
|-------|--------|-------------|
| Epic | `FARM-E##` | Large feature area spanning multiple stories |
| Story | `FARM-S##` | Deliverable user-facing capability within an epic |
| Task | `FARM-T##` | Technical work item within a story |
| Sub-task | `FARM-ST##` | Granular implementation step within a task |

## Status

| Label | Description |
|-------|-------------|
| `DONE` | Completed and released |
| `IN PROGRESS` | Currently being worked on |
| `TODO` | Planned, not yet started |
| `BLOCKED` | Cannot proceed until a dependency is resolved |

---

## Phase 1: Backend Core (v0.1.0 -- v0.4.4) `DONE`

### FARM-E01: Platform Foundation `DONE`

> NestJS project scaffolding, configuration, Docker, and CI/CD.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S01 | Story | NestJS project initialization with TypeScript | `DONE` |
| FARM-S02 | Story | TypeORM and PostgreSQL integration | `DONE` |
| FARM-S03 | Story | Docker multi-stage build (dev, test, production) | `DONE` |
| FARM-S04 | Story | Makefile automation (build, test, docker, docs) | `DONE` |
| FARM-S05 | Story | Environment configuration with Joi validation | `DONE` |
| FARM-S06 | Story | GitHub Actions CI/CD workflow | `DONE` |
| FARM-S07 | Story | MkDocs documentation site with Material theme | `DONE` |

### FARM-E02: Authentication and Authorization `DONE`

> JWT-based auth with Passport, refresh tokens, and role-based access control.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S08 | Story | User registration with bcrypt password hashing | `DONE` |
| FARM-S09 | Story | JWT login with Passport Local and JWT strategies | `DONE` |
| FARM-S10 | Story | Refresh token rotation with replay attack detection | `DONE` |
| FARM-S11 | Story | Role-based access control (admin, user) | `DONE` |
| FARM-S12 | Story | Rate-limited auth endpoints (throttle guard) | `DONE` |

### FARM-E03: Software Catalog `DONE`

> Multi-domain component catalog with YAML registration and async discovery.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S13 | Story | Component CRUD with 28 component kinds across 4 domains | `DONE` |
| FARM-S14 | Story | Component lifecycle tracking (planned through decommissioned) | `DONE` |
| FARM-S15 | Story | YAML-based component registration | `DONE` |
| FARM-S16 | Story | Repository location discovery (async via BullMQ) | `DONE` |
| FARM-S17 | Story | Component filtering by kind group | `DONE` |

### FARM-E04: Team Management `DONE`

> Team CRUD, membership, and component ownership.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S18 | Story | Team CRUD with multi-domain types (Dev, Infra, Security, Data, Platform) | `DONE` |
| FARM-S19 | Story | Team membership management (add/remove users) | `DONE` |
| FARM-S20 | Story | Component ownership by teams | `DONE` |

### FARM-E05: Environments and Deployments `DONE`

> Environment management, deployment tracking, and matrix views.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S21 | Story | Environment CRUD (Dev, Staging, Production) | `DONE` |
| FARM-S22 | Story | Deployment recording with status transitions | `DONE` |
| FARM-S23 | Story | Deployment matrix view (latest version per component per environment) | `DONE` |
| FARM-S24 | Story | Latest deployment per environment query | `DONE` |

### FARM-E06: Technical Documentation Engine `DONE`

> Hierarchical documentation with Markdown rendering and search.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S25 | Story | Documentation CRUD with hierarchical parent/child structure | `DONE` |
| FARM-S26 | Story | Markdown rendering with HTML sanitization | `DONE` |
| FARM-S27 | Story | Full-text search with relevance scoring | `DONE` |
| FARM-S28 | Story | Documentation tree navigation endpoint | `DONE` |
| FARM-S29 | Story | Component-scoped documentation filtering | `DONE` |

### FARM-E07: Plugin Architecture `DONE`

> Dynamic plugin system for modular extensibility.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S30 | Story | Plugin manager module with dynamic registration | `DONE` |
| FARM-S31 | Story | Plugin discovery API with menu items and routes | `DONE` |
| FARM-S32 | Story | Core modules registered as plugins (Catalog, Docs, Auth, Environments, Teams) | `DONE` |

---

## Phase 2: Production Hardening (v0.4.5 -- v0.6.0) `DONE`

### FARM-E08: API Quality `DONE`

> Swagger documentation, pagination, versioning, and validation.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S33 | Story | Swagger/OpenAPI documentation at `/api/docs` | `DONE` |
| FARM-S34 | Story | Pagination framework for all list endpoints | `DONE` |
| FARM-S35 | Story | URI-based API versioning (`/api/v1/`) | `DONE` |
| FARM-S36 | Story | DTO validation with class-validator (UUID, email, length) | `DONE` |
| FARM-S37 | Story | Swagger bearer auth button for JWT testing | `DONE` |

### FARM-E09: Security Hardening `DONE`

> HTTP security headers, non-root container, graceful shutdown.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S38 | Story | Helmet HTTP security headers | `DONE` |
| FARM-S39 | Story | Non-root Docker container (USER node) | `DONE` |
| FARM-S40 | Story | Graceful shutdown hooks (SIGTERM/SIGINT) | `DONE` |
| FARM-S41 | Story | CORS configuration with allowed origins | `DONE` |

### FARM-E10: Observability `DONE`

> Prometheus metrics, OpenTelemetry tracing, Grafana dashboards.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S42 | Story | Prometheus metrics (`http_requests_total`, `http_request_duration_seconds`) | `DONE` |
| FARM-S43 | Story | OpenTelemetry distributed tracing with OTLP export | `DONE` |
| FARM-S44 | Story | Log-trace correlation (trace_id/span_id in Winston logs) | `DONE` |
| FARM-S45 | Story | Grafana + Prometheus + Tempo observability stack (`docker-compose.observability.yml`) | `DONE` |
| FARM-S46 | Story | Pre-provisioned Grafana dashboard (request rate, latency percentiles, error rate) | `DONE` |
| FARM-S47 | Story | Health monitoring with Terminus (database, memory, disk) | `DONE` |

### FARM-E11: Caching and Performance `DONE`

> Redis-backed response caching with automatic invalidation.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S48 | Story | Redis caching with in-memory fallback | `DONE` |
| FARM-S49 | Story | Cache interceptors on catalog and plugin GET endpoints | `DONE` |
| FARM-S50 | Story | Automatic cache invalidation on write operations | `DONE` |

### FARM-E12: Background Processing `DONE`

> BullMQ job queues with Bull Board monitoring dashboard.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S51 | Story | BullMQ integration with Redis | `DONE` |
| FARM-S52 | Story | Catalog discovery processor (async YAML ingestion) | `DONE` |
| FARM-S53 | Story | Notification processor (placeholder for future use) | `DONE` |
| FARM-S54 | Story | Bull Board dashboard at `/api/admin/queues` | `DONE` |

### FARM-E13: Real-Time Communication `DONE`

> WebSocket events gateway with JWT-authenticated handshake.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S55 | Story | Socket.IO events gateway on `/events` namespace | `DONE` |
| FARM-S56 | Story | JWT-authenticated WebSocket handshake | `DONE` |
| FARM-S57 | Story | Component lifecycle events (created, updated, deleted) | `DONE` |
| FARM-S58 | Story | Deployment status events (created, updated) | `DONE` |

### FARM-E14: Code Quality and Developer Experience `DONE`

> TypeScript strict mode, database seeding, structured logging.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S59 | Story | Near-full TypeScript strict mode (7 strict flags) | `DONE` |
| FARM-S60 | Story | Database seeder with sample data (`npm run seed`) | `DONE` |
| FARM-S61 | Story | Structured logging with Winston (rotation, levels, JSON) | `DONE` |
| FARM-S62 | Story | Request logger middleware (method, path, status, duration) | `DONE` |

### FARM-E15: Testing Infrastructure `DONE`

> Unit and E2E test suites with coverage thresholds.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S63 | Story | Unit test suite (184+ tests across all modules) | `DONE` |
| FARM-S64 | Story | E2E test suite (40 tests covering all API endpoints) | `DONE` |
| FARM-S65 | Story | Coverage thresholds (65% branches, 70% functions/lines/statements) | `DONE` |
| FARM-S66 | Story | Docker-based test execution (`make test-docker`) | `DONE` |

---

## Phase 3: Backend Completion `TODO`

### FARM-E16: Communication and Notifications `TODO`

> Email service for transactional notifications.

#### FARM-S67: Email Service `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T01 | Task | Install and configure Nodemailer | `TODO` |
| FARM-ST01 | Sub-task | Add `nodemailer` and `@types/nodemailer` dependencies | `TODO` |
| FARM-ST02 | Sub-task | Create SMTP configuration in `src/config/configuration.ts` | `TODO` |
| FARM-ST03 | Sub-task | Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` to `.env.example` | `TODO` |
| FARM-T02 | Task | Create EmailModule and EmailService | `TODO` |
| FARM-ST04 | Sub-task | Create `src/common/email/email.module.ts` with ConfigModule import | `TODO` |
| FARM-ST05 | Sub-task | Create `src/common/email/email.service.ts` with Nodemailer transporter | `TODO` |
| FARM-ST06 | Sub-task | Implement `sendMail()` method with typed options | `TODO` |
| FARM-ST07 | Sub-task | Add connection verification on module init (`transporter.verify()`) | `TODO` |
| FARM-T03 | Task | Implement email templates with Handlebars | `TODO` |
| FARM-ST08 | Sub-task | Install `handlebars` dependency | `TODO` |
| FARM-ST09 | Sub-task | Create `src/common/email/templates/` directory | `TODO` |
| FARM-ST10 | Sub-task | Create welcome email template (`welcome.hbs`) | `TODO` |
| FARM-ST11 | Sub-task | Create password reset template (`password-reset.hbs`) | `TODO` |
| FARM-ST12 | Sub-task | Create deployment notification template (`deployment-notification.hbs`) | `TODO` |
| FARM-ST13 | Sub-task | Implement template compilation and rendering in EmailService | `TODO` |
| FARM-T04 | Task | Integrate email with notification queue | `TODO` |
| FARM-ST14 | Sub-task | Wire `NotificationProcessor` to call EmailService | `TODO` |
| FARM-ST15 | Sub-task | Define notification job payload interface | `TODO` |
| FARM-ST16 | Sub-task | Add email notification on deployment status change | `TODO` |
| FARM-T05 | Task | Unit and E2E tests | `TODO` |
| FARM-ST17 | Sub-task | Unit tests for EmailService (template rendering, send) | `TODO` |
| FARM-ST18 | Sub-task | Unit tests for NotificationProcessor with email integration | `TODO` |
| FARM-ST19 | Sub-task | E2E test for email notification trigger | `TODO` |
| FARM-T06 | Task | Documentation | `TODO` |
| FARM-ST20 | Sub-task | Create `docs/developer-guide/email.md` | `TODO` |
| FARM-ST21 | Sub-task | Update `docs/developer-guide/index.md` with email section | `TODO` |
| FARM-ST22 | Sub-task | Add email configuration to setup guide | `TODO` |
| FARM-ST23 | Sub-task | Update CHANGELOG.md and NEXT_STEPS.md | `TODO` |

---

## Phase 4: Front-End Foundation `TODO`

### FARM-E17: Tech Stack and Project Setup `TODO`

> Select front-end framework, configure monorepo, and establish build tooling.

#### FARM-S68: Front-End Stack Selection `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T07 | Task | Evaluate and select primary front-end framework | `TODO` |
| FARM-ST24 | Sub-task | Compare Next.js (React), Vue 3 + Vite, and SvelteKit for Farm use case | `TODO` |
| FARM-ST25 | Sub-task | Evaluate SSR/SSG/SPA tradeoffs for internal developer portal | `TODO` |
| FARM-ST26 | Sub-task | Assess component library ecosystem (tables, charts, forms, dark mode) | `TODO` |
| FARM-ST27 | Sub-task | Evaluate Socket.IO client integration per framework | `TODO` |
| FARM-ST28 | Sub-task | Document decision in ADR (Architecture Decision Record) | `TODO` |
| FARM-T08 | Task | Select UI component library | `TODO` |
| FARM-ST29 | Sub-task | Compare MUI, Chakra, Radix UI + Tailwind, Vuetify, Shadcn/ui | `TODO` |
| FARM-ST30 | Sub-task | Evaluate suitability for data-heavy console (tables, filters, dialogs) | `TODO` |
| FARM-ST31 | Sub-task | Verify dark mode support and theming capabilities | `TODO` |

#### FARM-S69: Monorepo Configuration `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T09 | Task | Restructure repository for monorepo | `TODO` |
| FARM-ST32 | Sub-task | Move existing backend to `apps/api/` (or equivalent structure) | `TODO` |
| FARM-ST33 | Sub-task | Create `apps/web/` for front-end application | `TODO` |
| FARM-ST34 | Sub-task | Create `packages/shared/` for shared TypeScript types and DTOs | `TODO` |
| FARM-ST35 | Sub-task | Update root `package.json` with workspaces configuration | `TODO` |
| FARM-ST36 | Sub-task | Update all import paths and build scripts | `TODO` |
| FARM-T10 | Task | Configure shared package | `TODO` |
| FARM-ST37 | Sub-task | Extract API response types from backend DTOs to shared package | `TODO` |
| FARM-ST38 | Sub-task | Generate API client from Swagger/OpenAPI spec (e.g., openapi-typescript) | `TODO` |
| FARM-ST39 | Sub-task | Set up shared TypeScript configuration (`tsconfig.base.json`) | `TODO` |

#### FARM-S70: Front-End Build and Tooling `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T11 | Task | Initialize front-end application | `TODO` |
| FARM-ST40 | Sub-task | Scaffold front-end app with framework CLI | `TODO` |
| FARM-ST41 | Sub-task | Configure TypeScript with strict mode | `TODO` |
| FARM-ST42 | Sub-task | Set up ESLint and Prettier (aligned with backend config) | `TODO` |
| FARM-ST43 | Sub-task | Configure environment variables (`API_BASE_URL`, `WS_URL`) | `TODO` |
| FARM-T12 | Task | Docker and CI integration | `TODO` |
| FARM-ST44 | Sub-task | Create front-end Dockerfile (multi-stage: build + nginx/node) | `TODO` |
| FARM-ST45 | Sub-task | Add `web` service to `docker-compose.yml` | `TODO` |
| FARM-ST46 | Sub-task | Add `make up-web`, `make build-web` Makefile targets | `TODO` |
| FARM-ST47 | Sub-task | Update GitHub Actions workflow for front-end build and tests | `TODO` |
| FARM-T13 | Task | API client and integration layer | `TODO` |
| FARM-ST48 | Sub-task | Create HTTP client wrapper with base URL configuration | `TODO` |
| FARM-ST49 | Sub-task | Implement JWT token storage (httpOnly cookie or secure storage) | `TODO` |
| FARM-ST50 | Sub-task | Add automatic `Authorization: Bearer` header injection | `TODO` |
| FARM-ST51 | Sub-task | Implement 401/403 interceptor with redirect to login | `TODO` |
| FARM-ST52 | Sub-task | Implement automatic token refresh on 401 | `TODO` |
| FARM-T14 | Task | Socket.IO client setup | `TODO` |
| FARM-ST53 | Sub-task | Install `socket.io-client` | `TODO` |
| FARM-ST54 | Sub-task | Create WebSocket connection manager with JWT auth handshake | `TODO` |
| FARM-ST55 | Sub-task | Implement reconnection logic with exponential backoff | `TODO` |
| FARM-ST56 | Sub-task | Create typed event handlers matching `FarmEvent` enum | `TODO` |

---

## Phase 5: Front-End Core Pages `TODO`

### FARM-E18: Authentication UI `TODO`

> Login page, token management, and route protection.

#### FARM-S71: Login and Auth Flow `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T15 | Task | Login page | `TODO` |
| FARM-ST57 | Sub-task | Create login form component (username, password) | `TODO` |
| FARM-ST58 | Sub-task | Implement `POST /api/v1/auth/login` integration | `TODO` |
| FARM-ST59 | Sub-task | Store access and refresh tokens securely | `TODO` |
| FARM-ST60 | Sub-task | Handle login errors (invalid credentials, rate limited) | `TODO` |
| FARM-ST61 | Sub-task | Redirect to dashboard on successful login | `TODO` |
| FARM-T16 | Task | Protected routes | `TODO` |
| FARM-ST62 | Sub-task | Create auth guard / route middleware | `TODO` |
| FARM-ST63 | Sub-task | Redirect unauthenticated users to `/login` | `TODO` |
| FARM-ST64 | Sub-task | Implement role-based route access (admin vs user) | `TODO` |
| FARM-T17 | Task | Token lifecycle management | `TODO` |
| FARM-ST65 | Sub-task | Implement silent token refresh using `POST /api/v1/auth/refresh` | `TODO` |
| FARM-ST66 | Sub-task | Handle refresh token expiry (force re-login) | `TODO` |
| FARM-ST67 | Sub-task | Implement logout (clear tokens, disconnect WebSocket) | `TODO` |

### FARM-E19: Dashboard `TODO`

> High-level overview of system health, queues, and recent activity.

#### FARM-S72: Dashboard Page `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T18 | Task | System health panel | `TODO` |
| FARM-ST68 | Sub-task | Fetch `GET /api/health` and display status indicators | `TODO` |
| FARM-ST69 | Sub-task | Show database, memory, and disk health with color coding | `TODO` |
| FARM-ST70 | Sub-task | Auto-refresh health status on interval | `TODO` |
| FARM-T19 | Task | Queue status panel | `TODO` |
| FARM-ST71 | Sub-task | Display active BullMQ queues with job counts | `TODO` |
| FARM-ST72 | Sub-task | Show waiting, active, completed, and failed job totals | `TODO` |
| FARM-ST73 | Sub-task | Link to full queues page for details | `TODO` |
| FARM-T20 | Task | Recent activity feed | `TODO` |
| FARM-ST74 | Sub-task | Subscribe to WebSocket events for real-time updates | `TODO` |
| FARM-ST75 | Sub-task | Display recent component and deployment events | `TODO` |
| FARM-ST76 | Sub-task | Show timestamp, event type, and affected resource | `TODO` |
| FARM-T21 | Task | Quick stats summary | `TODO` |
| FARM-ST77 | Sub-task | Fetch total components, teams, environments, and deployments | `TODO` |
| FARM-ST78 | Sub-task | Display stat cards with counts | `TODO` |

### FARM-E20: Catalog UI `TODO`

> Component listing, detail view, and registration interface.

#### FARM-S73: Component Listing `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T22 | Task | Component list page | `TODO` |
| FARM-ST79 | Sub-task | Fetch `GET /api/v1/catalog/components` with pagination | `TODO` |
| FARM-ST80 | Sub-task | Implement data table with sorting and pagination controls | `TODO` |
| FARM-ST81 | Sub-task | Add kind group filter tabs (Dev, Infra, Data, Security) | `TODO` |
| FARM-ST82 | Sub-task | Add search input for component name filtering | `TODO` |
| FARM-ST83 | Sub-task | Subscribe to WebSocket for live component updates | `TODO` |

#### FARM-S74: Component Detail View `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T23 | Task | Component detail page | `TODO` |
| FARM-ST84 | Sub-task | Fetch `GET /api/v1/catalog/components/:id` and display metadata | `TODO` |
| FARM-ST85 | Sub-task | Show lifecycle badge, owner team, tags, and contact info | `TODO` |
| FARM-ST86 | Sub-task | Display linked documentation (from Documentation module) | `TODO` |
| FARM-ST87 | Sub-task | Show deployment history for the component | `TODO` |
| FARM-ST88 | Sub-task | Display dependency graph (if dependencies exist) | `TODO` |

#### FARM-S75: Component Registration `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T24 | Task | Component creation form | `TODO` |
| FARM-ST89 | Sub-task | Create form with all component fields and validation | `TODO` |
| FARM-ST90 | Sub-task | Implement `POST /api/v1/catalog/components` submission | `TODO` |
| FARM-ST91 | Sub-task | Add YAML import option (`POST /api/v1/catalog/register-yaml`) | `TODO` |
| FARM-ST92 | Sub-task | Add repository discovery trigger (`POST /api/v1/catalog/locations`) | `TODO` |

### FARM-E21: Deployment Matrix UI `TODO`

> Visual deployment matrix and deployment tracking interface.

#### FARM-S76: Deployment Matrix View `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T25 | Task | Deployment matrix page | `TODO` |
| FARM-ST93 | Sub-task | Fetch `GET /api/v1/deployments/matrix` with filters | `TODO` |
| FARM-ST94 | Sub-task | Render matrix grid (components as rows, environments as columns) | `TODO` |
| FARM-ST95 | Sub-task | Color-code cells by deployment status | `TODO` |
| FARM-ST96 | Sub-task | Add filters by kind group, owner, and lifecycle | `TODO` |
| FARM-ST97 | Sub-task | Subscribe to WebSocket for real-time deployment status updates | `TODO` |

#### FARM-S77: Deployment History `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T26 | Task | Deployment list and detail pages | `TODO` |
| FARM-ST98 | Sub-task | Fetch `GET /api/v1/deployments` with filters (component, environment, status) | `TODO` |
| FARM-ST99 | Sub-task | Display deployment timeline with status transitions | `TODO` |
| FARM-ST100 | Sub-task | Show deployment metadata and version info | `TODO` |

### FARM-E22: Jobs and Queues UI `TODO`

> BullMQ queue monitoring and job management interface.

#### FARM-S78: Queue Dashboard `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T27 | Task | Queue overview page | `TODO` |
| FARM-ST101 | Sub-task | List all BullMQ queues with job counts by status | `TODO` |
| FARM-ST102 | Sub-task | Display queue health indicators | `TODO` |
| FARM-ST103 | Sub-task | Provide link to Bull Board (`/api/admin/queues`) for advanced management | `TODO` |

#### FARM-S79: Job History `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T28 | Task | Job listing and detail view | `TODO` |
| FARM-ST104 | Sub-task | List recent jobs per queue with status badges | `TODO` |
| FARM-ST105 | Sub-task | Show job payload, result, and error details | `TODO` |
| FARM-ST106 | Sub-task | Implement job retry action for failed jobs | `TODO` |

### FARM-E23: Observability UI `TODO`

> Health checks, metrics visualization, and trace inspection.

#### FARM-S80: Health and Metrics Page `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T29 | Task | Health check display | `TODO` |
| FARM-ST107 | Sub-task | Fetch and render `GET /api/health` with detailed component status | `TODO` |
| FARM-ST108 | Sub-task | Display uptime, memory usage, and disk space | `TODO` |
| FARM-T30 | Task | Grafana integration | `TODO` |
| FARM-ST109 | Sub-task | Embed or link to Grafana Farm API Overview dashboard | `TODO` |
| FARM-ST110 | Sub-task | Display key metrics inline (request rate, p95 latency, error rate) | `TODO` |
| FARM-T31 | Task | Trace viewer | `TODO` |
| FARM-ST111 | Sub-task | Link to Grafana Tempo for distributed trace inspection | `TODO` |
| FARM-ST112 | Sub-task | Display recent traces with duration and status (future iteration) | `TODO` |

### FARM-E24: Teams and Settings UI `TODO`

> Team management, user settings, and platform administration.

#### FARM-S81: Team Management Page `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T32 | Task | Team listing and detail | `TODO` |
| FARM-ST113 | Sub-task | Fetch `GET /api/v1/teams` and display team cards | `TODO` |
| FARM-ST114 | Sub-task | Show team members, owned components, and type badge | `TODO` |
| FARM-ST115 | Sub-task | Implement team creation and editing forms (admin only) | `TODO` |
| FARM-ST116 | Sub-task | Add/remove member actions | `TODO` |

#### FARM-S82: Documentation Browser `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T33 | Task | Documentation viewer | `TODO` |
| FARM-ST117 | Sub-task | Fetch documentation tree (`GET /api/v1/docs/tree`) for navigation sidebar | `TODO` |
| FARM-ST118 | Sub-task | Render Markdown content from `GET /api/v1/docs/:id/rendered` | `TODO` |
| FARM-ST119 | Sub-task | Implement documentation search (`GET /api/v1/docs/search`) | `TODO` |
| FARM-ST120 | Sub-task | Create/edit documentation form (admin only) | `TODO` |

#### FARM-S83: Navigation Layout `TODO`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T34 | Task | Global navigation structure | `TODO` |
| FARM-ST121 | Sub-task | Implement sidebar with sections: Dashboard, Catalog, Deployments, Docs, Queues, Observability, Teams, Settings | `TODO` |
| FARM-ST122 | Sub-task | Add top bar with user info, notifications, and logout | `TODO` |
| FARM-ST123 | Sub-task | Implement breadcrumb navigation | `TODO` |
| FARM-ST124 | Sub-task | Support dark mode toggle | `TODO` |

---

## Phase 6: Advanced Features `TODO`

### FARM-E25: Multi-Tenant and RBAC `TODO`

> Organization-level isolation and fine-grained permissions.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S84 | Story | Organization entity and tenant isolation | `TODO` |
| FARM-S85 | Story | Fine-grained permission system (beyond admin/user roles) | `TODO` |
| FARM-S86 | Story | Team-scoped data access (users see only their team data) | `TODO` |
| FARM-S87 | Story | Organization settings and billing page | `TODO` |

### FARM-E26: Workflow and Pipeline UI `TODO`

> Visual pipeline builder and execution monitoring.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S88 | Story | Pipeline definition CRUD (backend) | `TODO` |
| FARM-S89 | Story | Visual pipeline builder (drag-and-drop stages) | `TODO` |
| FARM-S90 | Story | Pipeline execution monitoring with real-time logs | `TODO` |
| FARM-S91 | Story | Pipeline history and run comparison | `TODO` |

### FARM-E27: Deep Observability Integration `TODO`

> Native metrics rendering and alerting within the portal.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S92 | Story | Per-component metrics dashboards (PromQL-powered) | `TODO` |
| FARM-S93 | Story | Alerting rules configuration UI | `TODO` |
| FARM-S94 | Story | Trace waterfall visualization (native, not Grafana iframe) | `TODO` |
| FARM-S95 | Story | Log aggregation viewer with search and filtering | `TODO` |

### FARM-E28: Integrations and Extensibility `TODO`

> Third-party integrations and plugin marketplace.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S96 | Story | GitHub/GitLab repository integration | `TODO` |
| FARM-S97 | Story | Slack/Teams notification channels | `TODO` |
| FARM-S98 | Story | Kubernetes cluster discovery and status | `TODO` |
| FARM-S99 | Story | Plugin marketplace UI (install/uninstall/configure) | `TODO` |

### FARM-E29: Data and Analytics `TODO`

> Platform usage analytics and reporting.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S100 | Story | Service catalog analytics (ownership coverage, lifecycle distribution) | `TODO` |
| FARM-S101 | Story | Deployment frequency and lead time metrics (DORA) | `TODO` |
| FARM-S102 | Story | Platform usage reports (API calls, active users, popular components) | `TODO` |

---

## Summary

| Phase | Epics | Stories | Status |
|-------|-------|---------|--------|
| Phase 1: Backend Core | 7 | 32 | `DONE` |
| Phase 2: Production Hardening | 8 | 34 | `DONE` |
| Phase 3: Backend Completion | 1 | 1 | `TODO` |
| Phase 4: Front-End Foundation | 1 | 3 | `TODO` |
| Phase 5: Front-End Core Pages | 7 | 12 | `TODO` |
| Phase 6: Advanced Features | 5 | 19 | `TODO` |
| **Total** | **29** | **101** | |
