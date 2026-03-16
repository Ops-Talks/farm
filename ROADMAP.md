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

## Phase 3: Backend Completion `DONE`

### FARM-E16: Communication and Notifications `DONE`

> Email service for transactional notifications.

#### FARM-S67: Email Service `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T01 | Task | Install and configure Nodemailer | `DONE` |
| FARM-T02 | Task | Create EmailModule and EmailService | `DONE` |
| FARM-T03 | Task | Implement email templates with Handlebars | `DONE` |
| FARM-T04 | Task | Integrate email with notification queue | `DONE` |
| FARM-T05 | Task | Unit and E2E tests | `DONE` |
| FARM-T06 | Task | Documentation | `DONE` |

---

## Phase 4: Front-End Foundation `DONE`

### FARM-E17: Tech Stack and Project Setup `DONE`

> Select front-end framework, configure project, and establish build tooling.

#### FARM-S68: Front-End Stack Selection `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T07 | Task | Evaluate and select primary front-end framework | `DONE` |
| FARM-T08 | Task | Select UI component library | `DONE` |

Decision documented in ADR-001: Next.js 16 (React 19) + Shadcn/ui + Tailwind CSS 4.

#### FARM-S69: Project Configuration `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T09 | Task | Create `web/` directory with Next.js application | `DONE` |
| FARM-T10 | Task | Configure shared API types in `web/src/types/` | `DONE` |

Backend remains at project root; front-end in `web/` directory with independent `package.json`.

#### FARM-S70: Front-End Build and Tooling `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T11 | Task | Initialize front-end application with TypeScript strict mode | `DONE` |
| FARM-T12 | Task | Docker and Makefile integration | `DONE` |
| FARM-T13 | Task | API client and integration layer (JWT, refresh, interceptors) | `DONE` |
| FARM-T14 | Task | Socket.IO client setup with typed event handlers | `DONE` |

---

## Phase 5: Front-End Core Pages `DONE`

### FARM-E18: Authentication UI `DONE`

> Login page, token management, and route protection.

#### FARM-S71: Login and Auth Flow `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T15 | Task | Login page | `DONE` |
| FARM-ST57 | Sub-task | Create login form component (username, password) | `DONE` |
| FARM-ST58 | Sub-task | Implement `POST /api/v1/auth/login` integration | `DONE` |
| FARM-ST59 | Sub-task | Store access and refresh tokens securely | `DONE` |
| FARM-ST60 | Sub-task | Handle login errors (invalid credentials, rate limited) | `DONE` |
| FARM-ST61 | Sub-task | Redirect to dashboard on successful login | `DONE` |
| FARM-T16 | Task | Protected routes | `DONE` |
| FARM-ST62 | Sub-task | Create auth guard / route middleware | `DONE` |
| FARM-ST63 | Sub-task | Redirect unauthenticated users to `/login` | `DONE` |
| FARM-ST64 | Sub-task | Implement role-based route access (admin vs user) | `DONE` |
| FARM-T17 | Task | Token lifecycle management | `DONE` |
| FARM-ST65 | Sub-task | Implement silent token refresh using `POST /api/v1/auth/refresh` | `DONE` |
| FARM-ST66 | Sub-task | Handle refresh token expiry (force re-login) | `DONE` |
| FARM-ST67 | Sub-task | Implement logout (clear tokens, disconnect WebSocket) | `DONE` |

### FARM-E19: Dashboard `DONE`

> High-level overview of system health, queues, and recent activity.

#### FARM-S72: Dashboard Page `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T18 | Task | System health panel | `DONE` |
| FARM-ST68 | Sub-task | Fetch `GET /api/health` and display status indicators | `DONE` |
| FARM-ST69 | Sub-task | Show database, memory, and disk health with color coding | `DONE` |
| FARM-ST70 | Sub-task | Auto-refresh health status on interval | `DONE` |
| FARM-T19 | Task | Queue status panel | `DONE` |
| FARM-ST71 | Sub-task | Display active BullMQ queues with job counts | `DONE` |
| FARM-ST72 | Sub-task | Show waiting, active, completed, and failed job totals | `DONE` |
| FARM-ST73 | Sub-task | Link to full queues page for details | `DONE` |
| FARM-T20 | Task | Recent activity feed | `DONE` |
| FARM-ST74 | Sub-task | Subscribe to WebSocket events for real-time updates | `DONE` |
| FARM-ST75 | Sub-task | Display recent component and deployment events | `DONE` |
| FARM-ST76 | Sub-task | Show timestamp, event type, and affected resource | `DONE` |
| FARM-T21 | Task | Quick stats summary | `DONE` |
| FARM-ST77 | Sub-task | Fetch total components, teams, environments, and deployments | `DONE` |
| FARM-ST78 | Sub-task | Display stat cards with counts | `DONE` |

### FARM-E20: Catalog UI `DONE`

> Component listing, detail view, and registration interface.

#### FARM-S73: Component Listing `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T22 | Task | Component list page | `DONE` |
| FARM-ST79 | Sub-task | Fetch `GET /api/v1/catalog/components` with pagination | `DONE` |
| FARM-ST80 | Sub-task | Implement data table with sorting and pagination controls | `DONE` |
| FARM-ST81 | Sub-task | Add kind group filter tabs (Dev, Infra, Data, Security) | `DONE` |
| FARM-ST82 | Sub-task | Add search input for component name filtering | `DONE` |
| FARM-ST83 | Sub-task | Subscribe to WebSocket for live component updates | `DONE` |

#### FARM-S74: Component Detail View `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T23 | Task | Component detail page | `DONE` |
| FARM-ST84 | Sub-task | Fetch `GET /api/v1/catalog/components/:id` and display metadata | `DONE` |
| FARM-ST85 | Sub-task | Show lifecycle badge, owner team, tags, and contact info | `DONE` |
| FARM-ST86 | Sub-task | Display linked documentation (from Documentation module) | `DONE` |
| FARM-ST87 | Sub-task | Show deployment history for the component | `DONE` |
| FARM-ST88 | Sub-task | Display dependency graph (if dependencies exist) | `DONE` |

#### FARM-S75: Component Registration `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T24 | Task | Component creation form | `DONE` |
| FARM-ST89 | Sub-task | Create form with all component fields and validation | `DONE` |
| FARM-ST90 | Sub-task | Implement `POST /api/v1/catalog/components` submission | `DONE` |
| FARM-ST91 | Sub-task | Add YAML import option (`POST /api/v1/catalog/register-yaml`) | `DONE` |
| FARM-ST92 | Sub-task | Add repository discovery trigger (`POST /api/v1/catalog/locations`) | `DONE` |

### FARM-E21: Deployment Matrix UI `DONE`

> Visual deployment matrix and deployment tracking interface.

#### FARM-S76: Deployment Matrix View `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T25 | Task | Deployment matrix page | `DONE` |
| FARM-ST93 | Sub-task | Fetch `GET /api/v1/deployments/matrix` with filters | `DONE` |
| FARM-ST94 | Sub-task | Render matrix grid (components as rows, environments as columns) | `DONE` |
| FARM-ST95 | Sub-task | Color-code cells by deployment status | `DONE` |
| FARM-ST96 | Sub-task | Add filters by kind group, owner, and lifecycle | `DONE` |
| FARM-ST97 | Sub-task | Subscribe to WebSocket for real-time deployment status updates | `DONE` |

#### FARM-S77: Deployment History `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T26 | Task | Deployment list and detail pages | `DONE` |
| FARM-ST98 | Sub-task | Fetch `GET /api/v1/deployments` with filters (component, environment, status) | `DONE` |
| FARM-ST99 | Sub-task | Display deployment timeline with status transitions | `DONE` |
| FARM-ST100 | Sub-task | Show deployment metadata and version info | `DONE` |

### FARM-E22: Jobs and Queues UI `DONE`

> BullMQ queue monitoring and job management interface.

#### FARM-S78: Queue Dashboard `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T27 | Task | Queue overview page | `DONE` |
| FARM-ST101 | Sub-task | List all BullMQ queues with job counts by status | `DONE` |
| FARM-ST102 | Sub-task | Display queue health indicators | `DONE` |
| FARM-ST103 | Sub-task | Provide link to Bull Board (`/api/admin/queues`) for advanced management | `DONE` |

#### FARM-S79: Job History `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T28 | Task | Job listing and detail view | `DONE` |
| FARM-ST104 | Sub-task | List recent jobs per queue with status badges | `DONE` |
| FARM-ST105 | Sub-task | Show job payload, result, and error details | `DONE` |
| FARM-ST106 | Sub-task | Implement job retry action for failed jobs | `DONE` |

### FARM-E23: Observability UI `DONE`

> Health checks, metrics visualization, and trace inspection.

#### FARM-S80: Health and Metrics Page `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T29 | Task | Health check display | `DONE` |
| FARM-ST107 | Sub-task | Fetch and render `GET /api/health` with detailed component status | `DONE` |
| FARM-ST108 | Sub-task | Display uptime, memory usage, and disk space | `DONE` |
| FARM-T30 | Task | Grafana integration | `DONE` |
| FARM-ST109 | Sub-task | Embed or link to Grafana Farm API Overview dashboard | `DONE` |
| FARM-ST110 | Sub-task | Display key metrics inline (request rate, p95 latency, error rate) | `DONE` |
| FARM-T31 | Task | Trace viewer | `DONE` |
| FARM-ST111 | Sub-task | Link to Grafana Tempo for distributed trace inspection | `DONE` |
| FARM-ST112 | Sub-task | Display recent traces with duration and status (future iteration) | `DONE` |

### FARM-E24: Teams and Settings UI `DONE`

> Team management, user settings, and platform administration.

#### FARM-S81: Team Management Page `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T32 | Task | Team listing and detail | `DONE` |
| FARM-ST113 | Sub-task | Fetch `GET /api/v1/teams` and display team cards | `DONE` |
| FARM-ST114 | Sub-task | Show team members, owned components, and type badge | `DONE` |
| FARM-ST115 | Sub-task | Implement team creation and editing forms (admin only) | `DONE` |
| FARM-ST116 | Sub-task | Add/remove member actions | `DONE` |

#### FARM-S82: Documentation Browser `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T33 | Task | Documentation viewer | `DONE` |
| FARM-ST117 | Sub-task | Fetch documentation tree (`GET /api/v1/docs/tree`) for navigation sidebar | `DONE` |
| FARM-ST118 | Sub-task | Render Markdown content from `GET /api/v1/docs/:id/rendered` | `DONE` |
| FARM-ST119 | Sub-task | Implement documentation search (`GET /api/v1/docs/search`) | `DONE` |
| FARM-ST120 | Sub-task | Create/edit documentation form (admin only) | `DONE` |

#### FARM-S83: Navigation Layout `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T34 | Task | Global navigation structure | `DONE` |
| FARM-ST121 | Sub-task | Implement sidebar with sections: Dashboard, Catalog, Deployments, Docs, Queues, Observability, Teams, Settings | `DONE` |
| FARM-ST122 | Sub-task | Add top bar with user info, notifications, and logout | `DONE` |
| FARM-ST123 | Sub-task | Implement breadcrumb navigation | `DONE` |
| FARM-ST124 | Sub-task | Support dark mode toggle | `DONE` |

---

## Phase 5.5: Front-End Quality and Hardening `DONE`

> Issues, enhancements, and test coverage discovered during deep frontend analysis.

### FARM-E30: Front-End Testing Infrastructure `DONE`

> Set up Vitest + React Testing Library and create comprehensive unit tests for all frontend code.

#### FARM-S103: Test Framework Setup `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T35 | Task | Install and configure Vitest with React Testing Library | `DONE` |
| FARM-ST125 | Sub-task | Install vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom | `DONE` |
| FARM-ST126 | Sub-task | Configure vitest.config.ts with jsdom, path aliases, and setup file | `DONE` |
| FARM-ST127 | Sub-task | Create test setup file with jest-dom matchers and global mocks (next/navigation, next-themes) | `DONE` |
| FARM-ST128 | Sub-task | Add `test` and `test:coverage` scripts to web/package.json | `DONE` |

#### FARM-S104: API Client and Utility Tests `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T36 | Task | Unit tests for api-client.ts | `DONE` |
| FARM-ST129 | Sub-task | Test token storage (setTokens, clearTokens, getAccessToken) with sessionStorage mock | `DONE` |
| FARM-ST130 | Sub-task | Test request() wrapper (success, error, 204 handling) | `DONE` |
| FARM-ST131 | Sub-task | Test automatic 401 token refresh flow | `DONE` |
| FARM-ST132 | Sub-task | Test ApiError class construction and message formatting | `DONE` |
| FARM-ST133 | Sub-task | Test toQueryString helper with various input shapes | `DONE` |
| FARM-ST134 | Sub-task | Test all API namespace methods (auth, catalog, deployments, teams, queues, docs, health, observability) | `DONE` |
| FARM-T37 | Task | Unit tests for ws-client.ts | `DONE` |
| FARM-ST135 | Sub-task | Test subscribe/unsubscribe with mocked socket.io-client | `DONE` |
| FARM-ST136 | Sub-task | Test disconnect and isConnected | `DONE` |
| FARM-ST137 | Sub-task | Test reconnection and listener re-registration | `DONE` |

#### FARM-S105: Auth and Provider Tests `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T38 | Task | Unit tests for AuthContext and AuthProvider | `DONE` |
| FARM-ST138 | Sub-task | Test login flow (calls API, stores tokens, sets user, redirects) | `DONE` |
| FARM-ST139 | Sub-task | Test logout flow (clears tokens, disconnects WS, redirects) | `DONE` |
| FARM-ST140 | Sub-task | Test session restoration from sessionStorage | `DONE` |
| FARM-ST141 | Sub-task | Test hasRole helper | `DONE` |
| FARM-T39 | Task | Unit tests for AuthGuard component | `DONE` |
| FARM-ST142 | Sub-task | Test redirect to /login when not authenticated | `DONE` |
| FARM-ST143 | Sub-task | Test role-based redirect when insufficient permissions | `DONE` |
| FARM-ST144 | Sub-task | Test children render when authenticated | `DONE` |

#### FARM-S106: Page Component Tests `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T40 | Task | Login page tests | `DONE` |
| FARM-ST145 | Sub-task | Test form rendering (username, password, submit button) | `DONE` |
| FARM-ST146 | Sub-task | Test form submission calls login | `DONE` |
| FARM-ST147 | Sub-task | Test error display on failed login | `DONE` |
| FARM-ST148 | Sub-task | Test loading state during submission | `DONE` |
| FARM-T41 | Task | Dashboard page tests | `DONE` |
| FARM-ST149 | Sub-task | Test QuickStats renders stat cards with fetched data | `DONE` |
| FARM-ST150 | Sub-task | Test HealthPanel renders health status badges | `DONE` |
| FARM-ST151 | Sub-task | Test HealthPanel shows API Unreachable on error | `DONE` |
| FARM-ST152 | Sub-task | Test ActivityFeed shows empty state and renders events | `DONE` |
| FARM-T42 | Task | Catalog page tests | `DONE` |
| FARM-ST153 | Sub-task | Test component list rendering with pagination | `DONE` |
| FARM-ST154 | Sub-task | Test kind group filter tabs | `DONE` |
| FARM-ST155 | Sub-task | Test search input filtering | `DONE` |
| FARM-ST156 | Sub-task | Test component detail page rendering | `DONE` |
| FARM-ST157 | Sub-task | Test component creation form validation and submission | `DONE` |
| FARM-T43 | Task | Deployment pages tests | `DONE` |
| FARM-ST158 | Sub-task | Test deployment matrix rendering with status colors | `DONE` |
| FARM-ST159 | Sub-task | Test deployment history table with pagination | `DONE` |
| FARM-ST160 | Sub-task | Test status filter tabs | `DONE` |
| FARM-T44 | Task | Teams pages tests | `DONE` |
| FARM-ST161 | Sub-task | Test team listing with type filter and search | `DONE` |
| FARM-ST162 | Sub-task | Test team detail page (members, components, edit/delete) | `DONE` |
| FARM-ST163 | Sub-task | Test team creation form | `DONE` |
| FARM-T45 | Task | Queues pages tests | `DONE` |
| FARM-ST164 | Sub-task | Test queue list rendering with job counts | `DONE` |
| FARM-ST165 | Sub-task | Test queue detail page with job list and retry action | `DONE` |
| FARM-T46 | Task | Observability page tests | `DONE` |
| FARM-ST166 | Sub-task | Test health tab rendering | `DONE` |
| FARM-ST167 | Sub-task | Test metrics tab with formatted values | `DONE` |
| FARM-ST168 | Sub-task | Test tab switching | `DONE` |
| FARM-T47 | Task | Docs page tests | `DONE` |
| FARM-ST169 | Sub-task | Test documentation tree sidebar rendering | `DONE` |
| FARM-ST170 | Sub-task | Test doc content viewer with rendered markdown | `DONE` |
| FARM-ST171 | Sub-task | Test documentation search | `DONE` |

#### FARM-S107: Layout and Navigation Tests `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T48 | Task | AppShell layout tests | `DONE` |
| FARM-ST172 | Sub-task | Test sidebar navigation links and active state | `DONE` |
| FARM-ST173 | Sub-task | Test breadcrumb rendering for nested routes | `DONE` |
| FARM-ST174 | Sub-task | Test user dropdown menu (display name, email, roles, sign out) | `DONE` |
| FARM-ST175 | Sub-task | Test dark mode theme cycling | `DONE` |

### FARM-E31: Front-End Bug Fixes `DONE`

> Issues identified during frontend codebase analysis.

#### FARM-S108: Runtime and Configuration Bugs `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T49 | Task | Fix QueuePanel hardcoded NEXT_PUBLIC_API_URL reference | `DONE` |
| FARM-ST176 | Sub-task | QueuePanel uses `process.env.NEXT_PUBLIC_API_URL` to build Bull Board URL; should use relative `/api` path like other components | `DONE` |
| FARM-T50 | Task | Fix WebSocket client hardcoded localhost URL | `DONE` |
| FARM-ST177 | Sub-task | ws-client.ts uses `process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000"` which breaks in Docker; needs a relative or configurable approach | `DONE` |
| FARM-T51 | Task | Phase 5 summary row still shows TODO in ROADMAP | `DONE` |
| FARM-ST178 | Sub-task | Update Phase 5 status from `TODO` to `DONE` in summary table | `DONE` |

### FARM-E32: Front-End Enhancements `DONE`

> UX improvements, missing features, and architectural enhancements.

#### FARM-S109: Error Handling and Loading States `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T52 | Task | Add Next.js error boundaries | `DONE` |
| FARM-ST179 | Sub-task | Create `app/(protected)/error.tsx` global error boundary | `DONE` |
| FARM-ST180 | Sub-task | Create `app/(protected)/not-found.tsx` for 404 pages | `DONE` |
| FARM-ST181 | Sub-task | Create `app/(protected)/loading.tsx` with skeleton loading | `DONE` |
| FARM-T53 | Task | Add per-page loading.tsx files | `DONE` |
| FARM-ST182 | Sub-task | Create loading states for catalog, teams, deployments, queues, observability, docs pages | `DONE` |

#### FARM-S110: Accessibility and UX Improvements `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T54 | Task | Keyboard navigation improvements | `DONE` |
| FARM-ST183 | Sub-task | Add proper aria-labels to all interactive elements | `DONE` |
| FARM-ST184 | Sub-task | Ensure focus management on page transitions | `DONE` |
| FARM-ST185 | Sub-task | Add skip-to-content link for screen readers | `DONE` |
| FARM-T55 | Task | Toast notifications for mutations | `DONE` |
| FARM-ST186 | Sub-task | Add success/error toasts for create, update, delete operations across all pages | `DONE` |
| FARM-ST187 | Sub-task | Sonner extended to catalog, teams, deployments, queues | `DONE` |

#### FARM-S111: Mobile Responsiveness `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T56 | Task | Mobile navigation improvements | `DONE` |
| FARM-ST188 | Sub-task | Replace horizontal mobile nav buttons with hamburger menu (Sheet component) | `DONE` |
| FARM-ST189 | Sub-task | Ensure all tables are horizontally scrollable on small screens | `DONE` |
| FARM-ST190 | Sub-task | Test and fix all pages at 375px, 768px, and 1024px breakpoints | `DONE` |

#### FARM-S112: Component Architecture Improvements `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T57 | Task | Extract reusable page patterns | `DONE` |
| FARM-ST191 | Sub-task | Create shared PageHeader component (title, description, action buttons) | `DONE` |
| FARM-ST192 | Sub-task | Create shared FilterTabs component (used by catalog, deployments, teams) | `DONE` |
| FARM-ST193 | Sub-task | Create shared EmptyState component with consistent styling | `DONE` |
| FARM-ST194 | Sub-task | Create shared ConfirmDialog component for delete actions | `DONE` |
| FARM-T58 | Task | Decompose large page files | `DONE` |
| FARM-ST195 | Sub-task | Split docs/page.tsx (651 lines) into separate TreeSidebar, DocViewer, DocForm, SearchPanel components | `DONE` |
| FARM-ST196 | Sub-task | Split observability/page.tsx (529 lines) into HealthTab, MetricsTab, TracesTab components in separate files | `DONE` |
| FARM-ST197 | Sub-task | Split teams/[id]/page.tsx into TeamEditForm, MembersSection, ComponentsSection components | `DONE` |
| FARM-ST198 | Sub-task | Split queues/[name]/page.tsx into JobDetailPanel, JobList, queue-utils components | `DONE` |

---

## Phase 5.6: E2E Testing `TODO`

### FARM-E33: End-to-End Test Suite `TODO`

> Playwright-based E2E coverage for critical user flows.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S113 | Story | Playwright E2E test suite for critical user flows | `TODO` |

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
| FARM-S115 | Story | Per-user and per-role rate limiting | `TODO` |

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
| FARM-S116 | Story | WebSocket real-time notification broadcasting | `TODO` |

### FARM-E28: Integrations and Extensibility `TODO`

> Third-party integrations and plugin marketplace.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S96 | Story | GitHub/GitLab repository integration | `TODO` |
| FARM-S114 | Story | OAuth2 social login (GitHub, Google) | `TODO` |
| FARM-S97 | Story | Slack/Teams notification channels | `TODO` |
| FARM-S117 | Story | Email domain event wiring to system events | `TODO` |
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
| Phase 3: Backend Completion | 1 | 1 | `DONE` |
| Phase 4: Front-End Foundation | 1 | 3 | `DONE` |
| Phase 5: Front-End Core Pages | 7 | 12 | `DONE` |
| Phase 5.5: Front-End Quality | 3 | 10 | `DONE` |
| Phase 5.6: E2E Testing | 1 | 1 | `TODO` |
| Phase 6: Advanced Features | 5 | 24 | `TODO` |
| **Total** | **33** | **117** | |
