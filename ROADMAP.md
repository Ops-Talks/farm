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

## Phase 5.6: E2E Testing `DONE`

### FARM-E33: End-to-End Test Suite `DONE`

> Playwright-based E2E coverage for critical user flows.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S113 | Story | Playwright E2E test suite for critical user flows | `DONE` |

---

## Phase 5.7: Backend Bug Fixes `DONE`

### FARM-E34: Known Backend Issues `DONE`

> Bugs identified in production-like environments after feature completion.

#### FARM-S114: Deployments API Bugs `DONE`

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T59 | Task | Fix `GET /api/v1/deployments/matrix` returning HTTP 500 on PostgreSQL | `DONE` |
| FARM-ST199 | Sub-task | Investigate `QueryFailedError: syntax error at or near "SELECT"` in `DeploymentsService.getMatrix()` raw SQL query | `DONE` |
| FARM-ST200 | Sub-task | Rewrite or fix the raw SQL in `getMatrix()` to be PostgreSQL-compatible and add E2E test coverage | `DONE` |

**Fixed in 2026-03-17:** Replaced raw string-concatenated subquery with TypeORM `.subQuery()` in `DeploymentsService.getMatrix()`. The old pattern produced `d.createdAt = SELECT MAX(...)` (invalid on PostgreSQL); `.subQuery()` emits `(SELECT MAX(...))` with required parentheses. 41 tests passing.

---

## Phase 6: Advanced Features `TODO`

### FARM-E25: Multi-Tenant and RBAC `DONE`

> Organization-level isolation and fine-grained permissions.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S84 | Story | Organization entity, tenant isolation, and query scoping enforcement via `OrgContextInterceptor` + `X-Organization-Id` header | `DONE` |
| FARM-S85 | Story | Fine-grained permission system — member management endpoints (`GET/POST/PATCH/DELETE /organizations/:id/members`) with role-hierarchy enforcement | `DONE` |
| FARM-S86 | Story | Team-scoped catalog filtering — `?teamId=` filter on `GET /catalog` scopes components by owning team | `DONE` |
| FARM-S87 | Story | Organization settings page — full member management UI (list, add, change role, remove) | `DONE` |
| FARM-S115 | Story | Per-user rate limiting (`PerUserThrottlerGuard` global, stricter limits on auth endpoints) | `DONE` |

**Delivered in v0.9.11 (2026-03-17):**
- `OrgContextInterceptor`: validates `X-Organization-Id` header, verifies `UserOrganization` membership, stamps `req.organizationId` globally.
- Two-tier RBAC: global `RolesGuard` (admin/user from JWT) + org-level `OrgRolesGuard` (OWNER=3 / ADMIN=2 / MEMBER=1 hierarchy).
- Catalog, Teams, Environments, AuditLog services scope queries by `organizationId` when the header is present.
- Frontend `api-client.ts` automatically injects `X-Organization-Id` from `sessionStorage`.
- `PerUserThrottlerGuard` globally registered; auth endpoints override with `5/min` login and `10/min` refresh limits.

### FARM-E26: Workflow and Pipeline UI `DONE`

> Visual pipeline builder and execution monitoring.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S88 | Story | Pipeline definition CRUD (backend) — `Pipeline` + `PipelineRun` entities, full REST API | `DONE` |
| FARM-S89 | Story | Visual pipeline builder (drag-and-drop stages) — `stage-builder.tsx` with HTML5 drag-and-drop, all four stage types | `DONE` |
| FARM-S90 | Story | Pipeline execution monitoring with real-time logs (BullMQ + WebSocket) — live log viewer, approval/cancel/retrigger actions, dashboard widget, WebSocket toast notifications | `DONE` |
| FARM-S91 | Story | Pipeline history and run comparison | `DONE` |

**Delivered in 2026-03-17 (FARM-S91):**
- `GET /api/v1/pipelines/:id/runs` now paginated with `skip/take/status` query params, returns `{ data, total, skip, take }`.
- `GET /api/v1/pipelines/:id/runs/stats` — aggregate stats: total, byStatus, successRate, avgDurationMs, lastRunAt.
- `GET /api/v1/pipelines/:id/runs/compare?a=:runIdA&b=:runIdB` — diff of two runs with per-stage status, duration, delta, and `changed` flag.
- Frontend: `RunStatsPanel` (4 stat cards), pagination + status filter in `RunList`, `RunComparison` Sheet with side-by-side stage diff.

### FARM-E27: Deep Observability Integration `DONE`

> Native metrics rendering and alerting within the portal.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S92 | Story | Per-component metrics dashboards (PromQL-powered) | `DONE` |
| FARM-S93 | Story | Alerting rules configuration UI | `DONE` |
| FARM-S94 | Story | Trace waterfall visualization (native, not Grafana iframe) | `DONE` |
| FARM-S95 | Story | Log aggregation viewer with search and filtering | `DONE` |
| FARM-S116 | Story | WebSocket real-time notification broadcasting | `DONE` |
| FARM-S118 | Story | OpenTelemetry Web instrumentation (browser spans + trace propagation) | `DONE` |

**Delivered in 2026-03-17 (FARM-S118):**
- `src/lib/tracing.ts`: `initTracing()` with `WebTracerProvider`, `BatchSpanProcessor`, `OTLPTraceExporter`, `ZoneContextManager`, auto-instrumentations for fetch/XHR/document-load; `traceparent` header injected in all requests.
- `src/components/tracing-init.tsx`: `'use client'` component rendered in root layout, calls `initTracing()` on mount.
- `src/instrumentation.ts`: Next.js native hook (server no-op — backend handles server tracing).
- `apps/api/src/common/observability/traces-ingest.controller.ts`: `POST /api/v1/traces/ingest` OTLP proxy forwarding browser spans to Tempo. 6 tests covering proxy, env override, 502 fallback.

### FARM-E28: Integrations and Extensibility `DONE`

> Third-party integrations and plugin marketplace.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S96 | Story | GitHub/GitLab repository integration | `DONE` |
| FARM-S114 | Story | OAuth2 social login (GitHub, Google) | `DONE` |
| FARM-S97 | Story | Slack/Teams notification channels | `DONE` |
| FARM-S117 | Story | Email domain event wiring to system events | `DONE` |
| FARM-S98 | Story | Kubernetes cluster discovery and status | `DONE` |
| FARM-S99 | Story | Plugin marketplace UI (install/uninstall/configure) | `DONE` |

### FARM-E29: Data and Analytics `DONE`

> Platform usage analytics and reporting.
> Delivered 2026-03-18: all 3 stories complete — 519 API tests, 333 web tests, 0 lint errors.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S100 | Story | Service catalog analytics (ownership coverage, lifecycle distribution) | `DONE` |
| FARM-S101 | Story | Deployment frequency and lead time metrics (DORA) | `DONE` |
| FARM-S102 | Story | Platform usage reports (API calls, active users, popular components) | `DONE` |

### FARM-E31: Frontend Architecture Hardening `DONE`

> Align `apps/web` with Bulletproof React principles for scalability and maintainability.
> Delivered 2026-03-18: all 5 stories complete — 309 tests, 0 lint errors.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S119 | Story | Adopt React Hook Form for all forms (login, create component, team member, pipeline stages) | `DONE` |
| FARM-S120 | Story | Adopt TanStack Query (React Query) for server state — replace manual useState + refetch with query/mutation hooks | `DONE` |
| FARM-S121 | Story | Add React Error Boundary components at feature level (catalog, teams, deployments, observability) | `DONE` |
| FARM-S122 | Story | Colocate tests with features — migrate `src/__tests__/` to colocated `*.test.tsx` alongside source files | `DONE` |
| FARM-S123 | Story | Introduce `next/dynamic` for heavy components (charts, trace waterfall, metrics widgets) | `DONE` |

### FARM-E34: Authentication Modernization (Better Auth) `TODO`

> Migrate the authentication layer from the current custom Passport.js/JWT stack to [Better Auth](https://better-auth.com), a TypeScript-first, framework-agnostic auth library with a rich plugin ecosystem.

#### Background and Analysis (2026-03-17)

A detailed gap analysis was produced comparing the current implementation against Better Auth. Summary of findings:

**Current stack:**
- Backend: NestJS + Passport.js (jwt / local / github / google strategies), custom JWT (1h) + opaque refresh tokens (bcrypt-hashed hex-40), `User` entity with `roles: string[]`, `oauthProvider`, `oauthProviderId`.
- Frontend: manual `AuthContext` + `sessionStorage` token management, custom 401 retry/refresh logic in `api-client.ts`, `AuthGuard` component.

**Better Auth capabilities that replace custom code:**
- Native email/password, GitHub, and Google OAuth (no Passport needed).
- Managed session rotation and refresh (removes ~60 lines of manual retry logic from `api-client.ts`).
- `organization` plugin natively covers multi-tenant organization and role hierarchy (OWNER/ADMIN/MEMBER).
- `createAuthClient()` React client with `useSession()` hook replaces `AuthContext`.
- NestJS adapter via community package `@thallesp/nestjs-better-auth`.

**Key risks identified:**
- Login uses `username`, Better Auth defaults to `email`. Requires the `username` plugin.
- NestJS integration is **community-maintained** (not official), introducing long-term maintenance risk.
- Better Auth requires schema migration: new tables `session`, `account`, `verification` and removal of `User.refreshToken`, `User.oauthProvider`, `User.oauthProviderId`.
- The Organization module delivered in FARM-E25 (v0.9.11) has a schema incompatible with Better Auth's `organization` plugin; a parallel migration plan is needed.
- Full-stack migration `bodyParser: false` in `main.ts` is required, which may affect other middleware.

**Recommended approach:** two-phase migration — frontend-only first (lower risk), then backend if the NestJS adapter matures.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S124 | Story | Frontend-only Better Auth client migration: replace `AuthContext`, `api-client.ts` auth logic, and `AuthGuard` with `createAuthClient()` and `useSession()` hook | `TODO` |
| FARM-S125 | Story | Backend Better Auth integration: replace Passport strategies with Better Auth instance (`@thallesp/nestjs-better-auth`), disable body parser, migrate guards to `@AllowAnonymous()` pattern | `TODO` |
| FARM-S126 | Story | Schema migration: add Better Auth tables (`session`, `account`, `verification`), migrate existing users and OAuth accounts, remove deprecated `User` columns | `TODO` |
| FARM-S127 | Story | Username login plugin: configure Better Auth `username` plugin so existing username-based accounts continue to work without requiring email login | `TODO` |
| FARM-S128 | Story | Organization module alignment: evaluate replacing FARM-E25 `OrgContextInterceptor` + `OrganizationModule` with Better Auth `organization` plugin, or maintaining both | `TODO` |

### FARM-E35: CI/CD External Integrations `TODO`

> Integrate Farm with external CI/CD platforms so teams can monitor builds, trigger pipelines, and view deployment status directly from the developer portal — without switching context between tools.

#### Background

Farm already has GitHub/GitLab VCS integration (FARM-S96) and Kubernetes cluster discovery (FARM-S98). This epic extends that foundation to cover two of the most common CI/CD platforms: **ArgoCD** (GitOps CD for Kubernetes) and **CircleCI** (hosted CI/CD).

Integration credentials (API tokens, instance URLs) are stored per-organization in the database — encrypted — following the same pattern already used for GitHub and Slack tokens. No secrets in environment variables.

Both integrations are HTTP-only (no heavy SDK required). ArgoCD connects via its REST API. CircleCI uses its v2 API and webhook push model.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S129 | Story | ArgoCD: connect to ArgoCD instance (URL + token per org), list Applications and display health/sync status in the Environments module | `TODO` |
| FARM-S130 | Story | ArgoCD: trigger Application sync from Farm UI; display manifest diff and sync history per deployment | `TODO` |
| FARM-S131 | Story | CircleCI: connect to CircleCI (API token per org), list pipeline runs per Component (matched by `vcsUrl`), display build status | `TODO` |
| FARM-S132 | Story | CircleCI: trigger pipeline from Farm UI; receive status webhooks (`POST /api/v1/webhooks/circleci`) and push real-time updates via WebSocket | `TODO` |
| FARM-S133 | Story | Jenkins: connect to Jenkins instance (URL + user + API token per org), list jobs and build history per Component (matched by `vcsUrl` or job name) | `TODO` |
| FARM-S134 | Story | Jenkins: trigger build from Farm UI; receive webhook notifications (`POST /api/v1/webhooks/jenkins`) and push real-time status updates via WebSocket | `TODO` |
| FARM-S162 | Story | Travis CI: connect to Travis CI (API token per org, supports travis.com and self-hosted), list builds per Component (matched by `vcsUrl`), display build status and logs | `TODO` |
| FARM-S163 | Story | Travis CI: trigger build restart from Farm UI; receive webhook notifications (`POST /api/v1/webhooks/travisci`) and push real-time status updates via WebSocket | `TODO` |
| FARM-S135 | Story | CI/CD unified tab on Component detail page: show GitHub Actions + CircleCI + Jenkins + Travis CI builds + ArgoCD Application status in one view | `TODO` |
| FARM-S160 | Story | Pipeline `build` stage type: add `"build"` to `PipelineStage.type`; implement executor that builds OCI images using `config.engine` (`docker` \| `buildah` \| `podman`) with configurable `dockerfile`, `context`, `tag`, and `push` options | `TODO` |
| FARM-S161 | Story | Build stage UI: add `build` stage card to the visual pipeline builder (`stage-builder.tsx`) with fields for engine selection, Dockerfile path, image tag template (supports `{{version}}` and `{{commitSha}}`), and registry push toggle | `TODO` |

#### Implementation Notes

- **ArgoCD**: REST API at `{argocd-url}/api/v1/applications`. Auth via `Authorization: Bearer <token>`. Existing `KubernetesModule` provides cluster context but ArgoCD connects independently via HTTP.
- **CircleCI**: v2 API at `https://circleci.com/api/v2`. Pipeline trigger: `POST /project/{slug}/pipeline`. Webhooks: Farm registers a `POST /api/v1/webhooks/circleci` receiver endpoint.
- **Component link**: `Component.vcsUrl` field already exists — used to match CircleCI projects. A new nullable `argocdApp` field on `Component` links to an ArgoCD Application name.
- **Jenkins**: REST API at `{jenkins-url}/api/json`. Auth via HTTP Basic (`user:api-token`). Job trigger: `POST /job/{jobName}/build`. Webhooks: Farm registers `POST /api/v1/webhooks/jenkins` (Generic Webhook Trigger plugin on Jenkins side).
- **Travis CI**: REST API v3 at `https://api.travis-ci.com` (cloud) or `{travis-url}/api` (self-hosted Enterprise). Auth via `Authorization: token <api-token>`. Builds listed via `GET /repo/{slug}/builds`. Restart trigger: `POST /build/{id}/restart`. Webhooks: Travis CI sends `POST` to a configurable URL — Farm registers `POST /api/v1/webhooks/travisci`. `IntegrationCredential` type enum extended with `travisci`.
- **Credential storage**: New `IntegrationCredential` entity (org-scoped, type enum: `argocd | circleci | jenkins | travisci | github | slack`, encrypted value column).
- **Build stage engines**: `docker` requires a Docker daemon socket (suitable for VMs and local dev). `buildah` and `podman` run daemonless and rootless — preferred when Farm executes inside a Kubernetes pod. Engine is selected per-stage via `config.engine`; defaults to `docker` if omitted. `containerd` is intentionally excluded — it is the cluster runtime (managed by Kubernetes) and not a build tool; Farm reaches it indirectly through the existing `KubernetesModule`.
- **Image tag templates**: `{{version}}` resolves to the Pipeline trigger version; `{{commitSha}}` resolves to the short Git SHA from `Component.vcsUrl`. Rendered at execution time by the `BuildStageExecutor`.

---

### FARM-E36: Helm Integration `DONE`

> Track Helm chart metadata per component, import live Helm releases as deployments, and execute real `helm upgrade` operations from Farm pipelines.

#### Background

Farm already has Kubernetes cluster discovery (FARM-S98), an Environments/Deployments module, and a Pipeline engine with a `deploy` stage type (currently simulated). Helm is the dominant Kubernetes package manager — integrating it closes the loop between the component catalog and what is actually running in each cluster.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S136 | Story | Add `helmChart` metadata to `Component` entity (`repo`, `chart`, `version`, `valuesRef`); expose field in catalog UI and `catalog-info.yaml` discovery | `DONE` |
| FARM-S137 | Story | Helm release discovery: query helm releases via Kubernetes Secrets and import as Deployment records | `DONE` |
| FARM-S138 | Story | Pipeline `deploy` stage real executor: when `config.engine = "helm"`, run `helm upgrade --install` | `DONE` |

#### Implementation Notes

- **Helm release storage**: Helm 3 stores release state as Kubernetes Secrets in the release namespace (`type: helm.sh/release.v1`). Farm reads them via the existing `@kubernetes/client-node` integration — no Helm CLI required on the server.
- **Values files**: Referenced by URL or stored inline in the stage config. Secrets (passwords, tokens) should reference Kubernetes Secrets by name rather than embedding values.
- **Pipeline executor**: The `PipelineProcessor` stage dispatcher checks `config.engine` and delegates to a `HelmDeployExecutor` service that wraps `@kubernetes/client-node` exec or calls the Helm REST API if a Helm Controller (e.g., Flux HelmRelease) is present.

---

### FARM-E37: Kubernetes Operator and CRD Discovery `DONE`

> Ship a Farm Kubernetes Operator for auto-registering components via pod annotations, and enable discovery of resources managed by popular in-cluster Operators (Prometheus, Cert-Manager, Argo Rollouts, Strimzi).

#### Background

Farm already syncs `catalog-info.yaml` files from URLs (Backstage-compatible discovery). A Farm Operator extends this by watching Kubernetes workload annotations in real time — no YAML file needed. Additionally, clusters often run Operators (Prometheus Operator, Cert-Manager, Strimzi) whose Custom Resources contain valuable context that developers need — Farm surfaces these alongside the component that owns them.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S139 | Story | Annotation auto-registration: watches Deployments/StatefulSets/Services for farm.io/* annotations and syncs to Farm catalog | `DONE` |
| FARM-S140 | Story | CRD discovery: detect installed Operators in connected clusters and display Custom Resources in component detail | `DONE` |
| FARM-S141 | Story | Argo Rollouts integration: display Rollout resource status (canary weight, bluegreen revisions, analysis runs) | `DONE` |

#### Implementation Notes

- **Farm Operator runtime**: Deployed as a separate container in the target cluster. Uses `controller-runtime` (Go) or `operator-sdk`. Communicates with Farm API using a long-lived service account token stored as a cluster Secret.
- **Annotation contract**:
  ```yaml
  metadata:
    annotations:
      farm.io/component: "my-service"         # Component name in Farm
      farm.io/owner: "platform-team"          # Team slug
      farm.io/catalog-url: "https://..."      # Optional — link to catalog-info.yaml
      farm.io/environment: "production"       # Environment slug in Farm
  ```
- **CRD discovery**: Uses `apiextensions.k8s.io/v1` CRD list + label-based resource fetching. Farm maintains a mapping of well-known Operator CRD groups to display templates.
- **Argo Rollouts**: Uses the `argoproj.io/v1alpha1` API group. Rollout status is polled (30s interval) and cached; WebSocket push on status change.

---

### FARM-E38: Cloud Provider Integrations `TODO`

> Connect Farm to AWS, GCP, and Azure to discover infrastructure resources, display cost visibility per environment, execute real cloud deploy stages in pipelines, and resolve secrets from managed secret stores.

#### Background

Farm's Environments module tracks deployments and Kubernetes clusters. Cloud providers extend this to managed services (RDS, Lambda, Cloud Run, Azure Container Apps) and give platform teams cost attribution and secret management without embedding credentials in pipeline configs.

Credentials are stored per-organization using the `IntegrationCredential` entity introduced in FARM-E35 — extended here to support cloud provider credential types (`aws-iam-role`, `gcp-service-account`, `azure-service-principal`).

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S142 | Story | AWS: connect account (IAM role via assume-role or access key per org), discover tagged resources (ECS, Lambda, RDS, S3, SQS) and register them in the Catalog as `kind: Infrastructure` linked to the owning Component | `TODO` |
| FARM-S143 | Story | GCP: connect project (service account JSON per org), discover resources via Cloud Asset API (Cloud Run, Cloud SQL, Pub/Sub, GCS) and register as `kind: Infrastructure` | `TODO` |
| FARM-S144 | Story | Azure: connect subscription (service principal per org), discover resources via Resource Manager API (Container Apps, Azure SQL, Service Bus, Blob) and register as `kind: Infrastructure` | `TODO` |
| FARM-S145 | Story | Cost visibility: dashboard widget showing monthly spend per environment, sourced from AWS Cost Explorer, GCP Billing API, or Azure Cost Management; drill-down by component and team | `TODO` |
| FARM-S146 | Story | Pipeline `deploy` stage real executors: `aws-ecs` (update service image), `aws-lambda` (publish function version), `gcp-cloud-run` (deploy revision), `azure-container-apps` (update container app) | `TODO` |
| FARM-S147 | Story | Secrets resolver: reference AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault secrets by ARN/path in pipeline stage configs — resolved at execution time, never stored in Farm database | `TODO` |

#### Implementation Notes

- **AWS auth**: Prefer IAM roles with `sts:AssumeRole` over long-lived access keys. Farm stores the role ARN; assumes it at request time via AWS SDK v3 `STSClient`.
- **GCP auth**: Service account JSON stored encrypted in `IntegrationCredential`. Used via `google-auth-library`.
- **Azure auth**: Service principal (`clientId`, `clientSecret`, `tenantId`) stored encrypted. Used via `@azure/identity` `ClientSecretCredential`.
- **Resource tagging**: Discovery queries filter by tag `farm:component` or `farm.io/component` — same annotation contract as the Kubernetes Operator (FARM-E37).
- **Cost granularity**: Cost Explorer / Billing API returns cost grouped by tag. Requires `farm:environment` tag on all cloud resources for accurate attribution.
- **Pipeline executors**: Each executor is a strategy class implementing `DeployExecutor` interface, registered in a `DeployExecutorRegistry`. The `PipelineProcessor` dispatches by `config.engine`.

---

### FARM-E39: Resource Tagging Governance `TODO`

> Define mandatory tag/label policies per organization and automatically audit cloud resources and Kubernetes workloads for compliance — surfacing gaps directly in Farm's UI.

#### Background

As Farm discovers cloud resources (FARM-E38) and Kubernetes workloads (FARM-E37), it accumulates enough inventory to enforce tagging standards. This epic closes the governance loop: teams can define which tags are required, Farm checks compliance on a schedule, and engineers see violations in their component and environment views.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S148 | Story | Tag policy engine: allow org admins to define required tag keys per resource type (e.g., `team`, `component`, `environment` required on all ECS services and K8s Deployments); store policies in DB | `TODO` |
| FARM-S149 | Story | Compliance audit job: scheduled BullMQ job that evaluates all discovered resources against active policies, records violations (`ResourceViolation` entity), and emits a WebSocket event when the report completes | `TODO` |
| FARM-S150 | Story | Compliance dashboard: org-level view showing compliance percentage by provider, team, and resource type; per-component violation list with remediation hints (suggested tag values based on Component ownership) | `TODO` |

#### Implementation Notes

- **Policy storage**: `TagPolicy` entity (orgId, resourceType enum, requiredKeys string[], severity: warning/error).
- **Violation storage**: `ResourceViolation` entity (orgId, resourceId, resourceType, provider, missingKeys, detectedAt, resolvedAt nullable).
- **Remediation hints**: Farm knows `Component.owner`, `Component.teamId`, `Component.organizationId` — pre-fills suggested values for `team`, `component`, `environment` tags in the violation detail UI.
- **Scheduling**: Uses existing BullMQ infrastructure. Default cadence: every 6 hours, configurable per org.

---

### FARM-E40: Kyverno Policy Integration `TODO`

> Consume Kyverno `PolicyReport` CRDs to surface policy violations per component, and export Farm tag policies as ready-to-apply `ClusterPolicy` manifests — closing the governance loop between the portal and cluster enforcement.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S151 | Story | PolicyReport reader: watch `PolicyReport` and `ClusterPolicyReport` CRDs in connected clusters; map violations to Farm Components by namespace/labels and display them in the Component detail page alongside FARM-E39 violations | `TODO` |
| FARM-S152 | Story | ClusterPolicy export: allow org admins to export a Farm Tag Policy (FARM-E39) as a Kyverno `ClusterPolicy` YAML — downloadable from the compliance dashboard and optionally auto-applied to connected clusters | `TODO` |

#### Implementation Notes

- `PolicyReport` is in the `wgpolicyk8s.io/v1alpha2` API group. Farm reads them via `@kubernetes/client-node` custom objects API, same pattern as CRD discovery in FARM-E37.
- Violation deduplication: Farm checks if a Kyverno violation already exists as a `ResourceViolation` (FARM-E39) to avoid duplicates in the compliance view.
- ClusterPolicy export is read-only from Farm's perspective — it generates YAML, the admin applies it. Auto-apply requires cluster write permissions and an explicit opt-in toggle per org.

---

### FARM-E41: Keycloak / Enterprise SSO `TODO`

> Integrate Keycloak as an enterprise identity provider for Farm — enabling SSO login, automatic sync of Keycloak groups to Farm organizations and teams, and Keycloak client credentials as a secret source in pipeline configs.

#### Background

Farm's FARM-E34 evaluates Better Auth as a general auth modernization. Keycloak integration is a separate concern: many enterprises already run Keycloak (or another OIDC provider) and need Farm to federate into it rather than maintain a separate identity silo. These two tracks are complementary — Better Auth can act as the OIDC consumer while Keycloak is the provider.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S153 | Story | Keycloak OIDC login: add Keycloak as a configurable OIDC identity provider (per-org, via `KEYCLOAK_URL` + realm + client ID/secret); users authenticate via Keycloak SSO instead of creating Farm-local accounts | `TODO` |
| FARM-S154 | Story | Group sync: periodically sync Keycloak Groups/Roles to Farm Organizations and Teams via the Keycloak Admin REST API; support bidirectional role mapping (`keycloak-group → Farm Team`, `keycloak-role → OrgRole`) | `TODO` |
| FARM-S155 | Story | Client credentials resolver: allow pipeline stage configs to reference Keycloak service account tokens (`keycloak://realm/client`) as a secret source — token is fetched via `client_credentials` grant at execution time | `TODO` |

#### Implementation Notes

- **OIDC config**: Stored per-org in `IntegrationCredential` (type `keycloak`). Discovery via `{keycloak-url}/realms/{realm}/.well-known/openid-configuration`.
- **Group sync**: Scheduled BullMQ job (configurable interval, default 1h). Uses `GET /admin/realms/{realm}/groups` + `GET /admin/realms/{realm}/users/{id}/role-mappings`.
- **Conflict resolution**: If a user exists in Farm by email and also in Keycloak, accounts are merged on first SSO login.
- **Priority over FARM-E34**: Keycloak OIDC (S153) can be implemented without Better Auth migration — it is an additional Passport.js strategy (`passport-openidconnect`).

---

### FARM-E42: Istio Service Mesh Integration `TODO`

> Surface Istio traffic metrics, service topology, and security posture (mTLS, AuthorizationPolicy) in Farm's component and environment views — using data Istio already generates, with no additional instrumentation required.

#### Background

Farm already has Prometheus-powered metrics dashboards (FARM-S92) and distributed trace visualization (FARM-S94). Istio enriches both: it produces per-service HTTP traffic metrics (`istio_requests_total`, `istio_request_duration_milliseconds`) that Farm can query via the existing PromQL integration, and it generates a real-time service dependency graph that can auto-populate `Component.dependencies` in the Catalog.

All stories degrade gracefully — if Istio is not installed in the connected cluster, the relevant UI sections are hidden.

#### Stories

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S156 | Story | Traffic metrics per component: pre-built PromQL panels for Istio metrics (RPS, error rate, P50/P95/P99 latency) on the Component detail page — sourced from the existing Prometheus integration | `TODO` |
| FARM-S157 | Story | Service topology auto-discovery: query Istio `VirtualService` and traffic metrics to build a dependency graph; auto-update `Component.dependencies` with observed upstream/downstream services | `TODO` |
| FARM-S158 | Story | Security posture view: display `PeerAuthentication` mTLS mode and active `AuthorizationPolicy` rules per component/namespace; flag services with no authorization policy as a security warning | `TODO` |
| FARM-S159 | Story | Canary traffic control: display active `VirtualService` weight split (canary %) per environment; allow pipeline `deploy` stages to adjust weights via Istio API — complements Argo Rollouts (FARM-S141) | `TODO` |

#### Implementation Notes

- **Istio detection**: Farm checks for `networking.istio.io/v1alpha3` CRD group on cluster connect; sets a per-cluster `istioEnabled` flag that gates all Istio UI sections.
- **Metrics**: Reuses the `PrometheusService` from FARM-E27 — Istio metrics are just additional PromQL queries with `destination_workload` label selectors.
- **Topology**: `VirtualService.spec.http[].route[].destination.host` maps to service names. Cross-referenced with Farm Component names via `Component.vcsUrl` or explicit annotation.
- **mTLS / AuthorizationPolicy**: Read via `@kubernetes/client-node` custom objects API (`security.istio.io/v1beta1`).
- **Canary control**: Patch `VirtualService.spec.http[].route[].weight` via Kubernetes API. Requires cluster write permission — gated behind `OrgRole.ADMIN`.

---
|-------|-------|---------|--------|
| Phase 1: Backend Core | 7 | 32 | `DONE` |
| Phase 2: Production Hardening | 8 | 34 | `DONE` |
| Phase 3: Backend Completion | 1 | 1 | `DONE` |
| Phase 4: Front-End Foundation | 1 | 3 | `DONE` |
| Phase 5: Front-End Core Pages | 7 | 12 | `DONE` |
| Phase 5.5: Front-End Quality | 3 | 10 | `DONE` |
| Phase 5.6: E2E Testing | 1 | 1 | `DONE` |
| Phase 5.7: Backend Bug Fixes | 1 | 2 | `DONE` |
| Phase 6: Advanced Features | 14 | 63 | `PARTIAL` |
| Phase 7: Frontend Hardening | 1 | 5 | `TODO` |
| **Total** | **44** | **164** | |
