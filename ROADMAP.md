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

## Completed Phases Archive

All phases below are complete and released. Detailed story/task breakdowns have been removed to keep this file maintainable. See git history and release notes for full implementation details.

| Phase | Epics | Stories | Release | Status |
|-------|-------|---------|---------|--------|
| Phase 1: Backend Core | 7 | 32 | v0.1.0 - v0.4.4 | `DONE` |
| Phase 2: Production Hardening | 8 | 34 | v0.4.5 - v0.6.0 | `DONE` |
| Phase 3: Backend Completion | 1 | 1 | v0.7.0 | `DONE` |
| Phase 4: Front-End Foundation | 1 | 3 | v0.8.0 | `DONE` |
| Phase 5: Front-End Core Pages | 7 | 12 | v0.9.0 | `DONE` |
| Phase 5.5: Front-End Quality and Hardening | 3 | 10 | v0.10.0 | `DONE` |
| Phase 5.6: E2E Testing | 1 | 1 | v0.10.1 | `DONE` |
| Phase 5.7: Backend Bug Fixes | 1 | 2 | v0.10.2 | `DONE` |
| Phase 6: Advanced Features | 13 | 58 | v0.11.0 - v0.12.0 | `DONE` |
| Phase 7: Frontend Hardening | 1 | 5 | v0.12.1 - v0.12.2 | `DONE` |
| Phase 8: Frontend Visual Refresh | 1 | 5 | v0.12.0 | `DONE` |
| Phase 9: Security Testing | 1 | 3 | v0.12.0 | `DONE` |
| Phase 10: Test Coverage Hardening | 1 | 8 | v0.12.0 | `DONE` |

---

## Phase 11: API Management `TODO`

### FARM-E47: API Catalog and Lifecycle Management `TODO`

> Treat APIs as first-class citizens alongside software components. Each component can register one or more API specifications (OpenAPI 3.x, AsyncAPI 2.x). Specs are versioned, diffed for breaking changes, and browsable via an embedded spec viewer in the frontend.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S185 | Story | API specification ingestion per component (OpenAPI 3.x and AsyncAPI 2.x, stored as raw YAML/JSON with format auto-detection) | `TODO` |
| FARM-S186 | Story | API version registry and deprecation tracking (version field, status: active/deprecated/sunset, sunset date) | `TODO` |
| FARM-S187 | Story | API changelog and breaking change detection (diff two spec versions, flag added/removed/modified operations) | `TODO` |
| FARM-S188 | Story | API consumer registry (which teams/components consume which API, ManyToMany with metadata) | `TODO` |
| FARM-S189 | Story | Frontend API catalog browser (list specs, embedded Swagger UI, version switcher, deprecation badge) | `TODO` |

#### FARM-S185 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T60 | Task | Create `ApiSpec` entity (`id`, `componentId`, `name`, `format`: openapi/asyncapi, `version`, `spec` JSONB, `status`) with migration | `TODO` |
| FARM-T61 | Task | `POST /api/v1/components/:id/api-specs` with multipart YAML/JSON upload and format auto-detection via spec structure | `TODO` |
| FARM-T62 | Task | Unit tests for `ApiSpecService` (create, findAll, findOne, remove) and e2e tests for upload and retrieval endpoints | `TODO` |

#### FARM-S186 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T63 | Task | Add `deprecatedAt`, `sunsetAt`, `status` enum (active/deprecated/sunset) columns to `ApiSpec` entity | `TODO` |
| FARM-T64 | Task | `PATCH /api/v1/api-specs/:id` endpoint to update status and sunset date; emit WebSocket `api-spec:deprecated` event | `TODO` |

#### FARM-S187 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T65 | Task | `SpecDiffService`: parse two OpenAPI documents, compare paths/operations/schemas, categorize changes as breaking/non-breaking | `TODO` |
| FARM-T66 | Task | `GET /api/v1/api-specs/:id/diff?compareWith=:otherId` returning structured changelog array with change type and location | `TODO` |

#### FARM-S188 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T67 | Task | Create `ApiConsumer` join entity (`apiSpecId`, `consumerComponentId`, `consumerTeamId`, `addedAt`); unique constraint per pair | `TODO` |
| FARM-T68 | Task | `POST/DELETE /api/v1/api-specs/:id/consumers` and `GET /api/v1/components/:id/consumed-apis` endpoints | `TODO` |

#### FARM-S189 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T69 | Task | Add `api-specs` tab to component detail page; list all specs with version badge, format badge, and status indicator | `TODO` |
| FARM-T70 | Task | Embed `swagger-ui-react` for OpenAPI specs and AsyncAPI Playground for AsyncAPI specs in the spec viewer panel | `TODO` |
| FARM-T71 | Task | Version switcher dropdown; breaking change diff panel rendered between any two selected versions | `TODO` |

---

### FARM-E48: API Gateway Integration `TODO`

> Surface gateway-level metadata (routes, rate limits, upstream health) inside Farm without replacing the gateway. A pluggable adapter interface allows multiple gateway backends; Kong is the first implementation.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S190 | Story | Gateway adapter interface with Kong admin API adapter as first implementation | `TODO` |
| FARM-S191 | Story | Route inventory sync -- pull routes/services from gateway, persist as `GatewayRoute` entities, map to catalog components | `TODO` |
| FARM-S192 | Story | API health check aggregation -- poll registered API upstream endpoints on a schedule, surface uptime and latency per API | `TODO` |

#### FARM-S190 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T72 | Task | Define `IGatewayAdapter` interface (`getRoutes()`, `getServices()`, `getHealth()`); `KongAdapter` implementation using Kong Admin API | `TODO` |
| FARM-T73 | Task | `GatewayModule` config env vars (`GATEWAY_TYPE`, `GATEWAY_URL`, `GATEWAY_API_KEY`); conditional adapter registration in DI | `TODO` |

#### FARM-S191 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T74 | Task | Create `GatewayRoute` entity (`externalId`, `name`, `paths`, `methods`, `componentId` FK nullable, `syncedAt`) | `TODO` |
| FARM-T75 | Task | BullMQ sync job (scheduled every 15 min): fetch routes from adapter, upsert `GatewayRoute` rows, emit WebSocket event on changes | `TODO` |

#### FARM-S192 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T76 | Task | `ApiHealthCheck` entity (`apiSpecId`, `url`, `status`: up/degraded/down, `latencyMs`, `checkedAt`) | `TODO` |
| FARM-T77 | Task | Health check BullMQ job (every 5 min): HTTP HEAD/GET each registered API URL, store result, emit event on status change | `TODO` |

---

## Phase 12: Multi-tenancy `TODO`

### FARM-E49: Workspace Isolation `TODO`

> Introduce a Workspace entity as the top-level tenant boundary. All major resources (components, teams, environments, documentation, pipelines) are workspace-scoped. Existing data migrates to a seeded "default" workspace without downtime.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S193 | Story | `Workspace` entity and CRUD API (name, slug, logoUrl, settings JSONB, createdBy) | `TODO` |
| FARM-S194 | Story | Resource scoping -- add `workspaceId` FK to all major entities; all list and detail endpoints enforce workspace context | `TODO` |
| FARM-S195 | Story | Data migration: seed default workspace, backfill `workspaceId` on all existing rows | `TODO` |
| FARM-S196 | Story | Frontend workspace switcher (replaces org switcher in app shell, persists active workspace to localStorage) | `TODO` |

#### FARM-S193 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T78 | Task | Create `Workspace` entity with slug uniqueness constraint; `WorkspaceModule` with full CRUD service and controller | `TODO` |
| FARM-T79 | Task | `GET /api/v1/workspaces/current` resolving from JWT claims; workspace slug as optional route prefix for scoped resources | `TODO` |

#### FARM-S194 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T80 | Task | Add nullable `workspaceId` UUID FK with index to: `Component`, `Team`, `Environment`, `Documentation`, `Pipeline`, `AlertingRule` entities | `TODO` |
| FARM-T81 | Task | Add `WorkspaceGuard` to inject `workspaceId` from `X-Workspace-ID` request header into all scoped service calls | `TODO` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST201 | Sub-task | Generate single TypeORM migration covering `workspaceId` column additions across all 6 entities | `TODO` |
| FARM-ST202 | Sub-task | Update all `QueryBuilder` and `findOptions` in services to filter by `workspaceId` when present | `TODO` |
| FARM-ST203 | Sub-task | Update all e2e tests to include `X-Workspace-ID` header in requests | `TODO` |
| FARM-ST204 | Sub-task | Add workspace-scoped authorization unit tests for each service | `TODO` |

#### FARM-S195 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T82 | Task | TypeORM data migration: INSERT default workspace row, then UPDATE each scoped table SET workspace_id = default_id WHERE workspace_id IS NULL | `TODO` |

#### FARM-S196 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T83 | Task | Replace `OrgSwitcher` component with `WorkspaceSwitcher`; fetch user workspaces from API, store active workspace ID in localStorage | `TODO` |
| FARM-T84 | Task | Thread active workspace ID through all API client calls as `X-Workspace-ID` request header via fetch interceptor | `TODO` |

---

### FARM-E50: Workspace-Scoped RBAC `TODO`

> Per-workspace roles (owner, admin, member, viewer) complement the existing global admin/user roles. Workspace owners can invite members, assign roles, and manage workspace settings independently.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S197 | Story | `WorkspaceMember` entity (workspaceId, userId, role: owner/admin/member/viewer, joinedAt) with unique constraint | `TODO` |
| FARM-S198 | Story | Workspace-scoped `@WorkspaceRoles()` decorator and guard; protect all workspace-owned endpoints | `TODO` |
| FARM-S199 | Story | Workspace invitation flow (invite by email -> signed token link -> accept/decline -> member created) | `TODO` |
| FARM-S200 | Story | Frontend: workspace settings page with member list, role assignment dropdown, and pending invitations panel | `TODO` |

#### FARM-S197 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T85 | Task | Create `WorkspaceMember` entity and `WorkspaceRole` enum; unique constraint on (workspaceId, userId) pair | `TODO` |
| FARM-T86 | Task | `GET /workspaces/:slug/members`, `PATCH /workspaces/:slug/members/:userId` (role change), `DELETE` (remove member) | `TODO` |

#### FARM-S199 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T87 | Task | `WorkspaceInvitation` entity (email, tokenHash, role, expiresAt, status: pending/accepted/declined); 48-hour TTL | `TODO` |
| FARM-T88 | Task | `POST /workspaces/:slug/invitations` sends email via notification processor; `POST /invitations/:token/accept` creates member row | `TODO` |

---

## Phase 13: Observability 2.0 `TODO`

### FARM-E51: SLO / SLA Management `TODO`

> Define Service Level Objectives per component. Track error budget consumption and burn rate over rolling windows. Auto-generate alerting rules from SLO configuration.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S201 | Story | `Slo` entity and CRUD API (name, targetPercent, metricType: availability/latency/error-rate, window: 7d/30d/90d, componentId) | `TODO` |
| FARM-S202 | Story | Error budget calculation -- query Prometheus, compute consumed budget vs remaining percentage and burn rate | `TODO` |
| FARM-S203 | Story | Auto-generate alerting rules from SLO (fast-burn and slow-burn rules per SLO, managed via alerting module) | `TODO` |
| FARM-S204 | Story | Frontend SLO dashboard (health gauge per SLO, burn rate sparkline, error budget progress bar, 30-day history chart) | `TODO` |

#### FARM-S201 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T89 | Task | Create `Slo` entity with `SloMetricType` and `SloWindow` enums; `SloModule` with CRUD API and migration | `TODO` |
| FARM-T90 | Task | Unit tests for `SloService`; e2e tests for CRUD endpoints including componentId foreign key validation | `TODO` |

#### FARM-S202 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T91 | Task | `SloCalculatorService`: query Prometheus HTTP API using metricType-to-PromQL mapping, compute availability % over window | `TODO` |
| FARM-T92 | Task | `GET /api/v1/slos/:id/budget` returning `{ targetPercent, currentPercent, budgetRemaining, burnRate, status }` | `TODO` |

#### FARM-S203 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T93 | Task | On SLO create/update auto-create two `AlertingRule` records: fast-burn (2% budget in 1 h) and slow-burn (5% in 6 h), flagged `autoGenerated: true` | `TODO` |
| FARM-T94 | Task | SLO delete cascades to its auto-generated alerting rules; manual rules for the same component are unaffected | `TODO` |

---

### FARM-E52: Incident Management `TODO`

> Lightweight incident lifecycle inside Farm: declare, update, resolve, and write post-mortems. Each incident is linked to affected components and environments with a structured update timeline.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S205 | Story | `Incident` entity and API (title, severity: P1-P4, status: open/investigating/identified/resolved, affected components and environments) | `TODO` |
| FARM-S206 | Story | Incident timeline -- ordered event log with author, timestamp, message, and status change snapshot | `TODO` |
| FARM-S207 | Story | Post-mortem document linked to incident (rootCause, contributingFactors, actionItems JSONB array, Markdown body, approvedBy) | `TODO` |
| FARM-S208 | Story | Frontend: incident list with severity filter, incident detail with live timeline, post-mortem editor with action item checklist | `TODO` |

#### FARM-S205 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T95 | Task | Create `Incident` entity with `IncidentSeverity` and `IncidentStatus` enums; ManyToMany to `Component` and `Environment` | `TODO` |
| FARM-T96 | Task | CRUD API; `PATCH /incidents/:id/status` validates allowed transitions (open -> investigating -> identified -> resolved) | `TODO` |
| FARM-T97 | Task | Emit WebSocket events `incident:created` and `incident:status-changed` on state transitions | `TODO` |

#### FARM-S206 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T98 | Task | `IncidentUpdate` entity (incidentId, authorId, message, previousStatus, newStatus, createdAt); auto-created on every status change | `TODO` |
| FARM-T99 | Task | `POST /incidents/:id/updates` for manual timeline entries; `GET /incidents/:id/timeline` ordered by `createdAt ASC` | `TODO` |

#### FARM-S207 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T100 | Task | `PostMortem` entity (1:1 with Incident, rootCause, contributingFactors text[], actionItems JSONB, body Markdown, approvedBy userId) | `TODO` |
| FARM-T101 | Task | `PATCH /post-mortems/:id/approve` sets approvedBy and approvedAt; restricted to admin or incident creator | `TODO` |

---

### FARM-E53: Custom Dashboard Builder `TODO`

> Users compose custom dashboards from a library of reusable widgets. Layouts persist to the database and can be shared workspace-wide or kept private.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S209 | Story | `Dashboard` and `DashboardWidget` entities (dashboard: name, owner, visibility; widget: type, gridX/Y/W/H, configJSON) | `TODO` |
| FARM-S210 | Story | Widget type library: MetricGraph, ComponentHealth, DeploymentFeed, QueueStatus, SloGauge, AlertSummary, TeamActivity, UptimeChart | `TODO` |
| FARM-S211 | Story | Frontend dashboard builder with drag-and-drop grid (`react-grid-layout`), widget picker panel, and per-widget config drawer | `TODO` |
| FARM-S212 | Story | Dashboard sharing (public read-only link with signed token, workspace-scoped visibility toggle) | `TODO` |

#### FARM-S209 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T102 | Task | Create `Dashboard` and `DashboardWidget` entities; `DashboardModule` with CRUD for both; migration | `TODO` |
| FARM-T103 | Task | `PATCH /dashboards/:id/layout` bulk-updates widget positions in a single transaction (`[{widgetId, x, y, w, h}]`) | `TODO` |

#### FARM-S210 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T104 | Task | Define `WidgetType` enum and per-type config schema (TypeScript interfaces); validate `configJSON` against schema on widget create/update | `TODO` |
| FARM-T105 | Task | `GET /dashboards/:id/widgets/:widgetId/data` routes to the appropriate data source based on widget type | `TODO` |

#### FARM-S211 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T106 | Task | Install `react-grid-layout`; build `DashboardGrid` component with responsive breakpoints (12-col desktop, 6-col tablet, 2-col mobile) | `TODO` |
| FARM-T107 | Task | `WidgetPicker` side panel: categorized widget list with preview card; drag from panel onto grid to add | `TODO` |
| FARM-T108 | Task | Per-widget `ConfigDrawer`: dynamic form rendered from widget type config schema; save persists via `PATCH /widgets/:id` | `TODO` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST205 | Sub-task | Widget rendering components (one per WidgetType): fetch data, handle loading and error states, render chart or list | `TODO` |
| FARM-ST206 | Sub-task | Auto-save layout on change with 1-second debounce to avoid excessive API calls during drag | `TODO` |
| FARM-ST207 | Sub-task | Empty dashboard state with "Add your first widget" CTA and shortcut to widget picker | `TODO` |

---

## Phase 14: AI / Intelligence `TODO`

### FARM-E54: AI-Assisted Search and Discovery `TODO`

> Semantic search across catalog, documentation, and API specs using vector embeddings. Natural language queries return ranked, faceted results. LLM summarization reduces time-to-understanding for documentation pages.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S213 | Story | Embedding pipeline -- generate embeddings on create/update via BullMQ job, store in pgvector; extension enabled via migration | `TODO` |
| FARM-S214 | Story | Semantic search API (`POST /api/v1/search/semantic`) -- vector similarity search over component, documentation, and API spec embeddings | `TODO` |
| FARM-S215 | Story | AI doc summarization -- LLM generates a 3-sentence summary per documentation page on ingestion; shown in doc detail header | `TODO` |
| FARM-S216 | Story | Frontend: unified search bar with semantic/keyword toggle, result type facets (components, docs, APIs), keyboard navigation | `TODO` |

#### FARM-S213 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T109 | Task | Enable `pgvector` extension via TypeORM migration; add `embedding vector(1536)` column to `Component`, `Documentation`, `ApiSpec` | `TODO` |
| FARM-T110 | Task | `EmbeddingService`: calls OpenAI Embeddings API (`text-embedding-3-small`), returns `number[]`; injectable and fully mockable in tests | `TODO` |
| FARM-T111 | Task | BullMQ `EmbeddingJob` processor: triggered after component/doc/api-spec create or update; calls `EmbeddingService`, persists vector | `TODO` |

#### FARM-S214 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T112 | Task | `SemanticSearchService.search(query, types[], limit)`: embed query string, run `ORDER BY embedding <=> $1 LIMIT $2` via raw QueryBuilder | `TODO` |
| FARM-T113 | Task | `POST /api/v1/search/semantic` controller; request DTO: `{ query: string, types?: string[], limit?: number }` | `TODO` |

#### FARM-S215 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T114 | Task | `SummarizationService`: calls OpenAI Chat API (`gpt-4o-mini`) with system prompt instructing a 3-sentence summary; injectable | `TODO` |
| FARM-T115 | Task | Add `summary` text column to `Documentation`; populate via BullMQ job on create/update alongside embedding generation | `TODO` |

---

### FARM-E55: Dependency Intelligence `TODO`

> Automated analysis of the component dependency graph. Detect circular dependencies, calculate the blast radius of a failing component, and surface dependency health scores in the catalog.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S217 | Story | Dependency graph builder -- construct directed adjacency graph from `component_dependencies` join table, cached in Redis | `TODO` |
| FARM-S218 | Story | Circular dependency detection -- iterative DFS with back-edge detection, surface detected cycles as catalog warnings per component | `TODO` |
| FARM-S219 | Story | Blast radius analysis -- BFS from a given node, return affected component list with hop distance and estimated risk score | `TODO` |
| FARM-S220 | Story | Frontend: interactive D3 force-directed dependency graph with cycle highlighting and blast radius overlay on hover | `TODO` |

#### FARM-S217 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T116 | Task | `DependencyGraphService.build()`: load all `component_dependencies` rows, construct adjacency list in-memory, cache in Redis (TTL 5 min) | `TODO` |
| FARM-T117 | Task | Invalidate Redis graph cache on component dependency create or delete events via event emitter | `TODO` |

#### FARM-S218 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T118 | Task | Implement iterative DFS cycle detection on the adjacency list; return array of cycle paths as string[][] | `TODO` |
| FARM-T119 | Task | `GET /api/v1/components/:id/dependency-cycles` and `GET /api/v1/catalog/cycles` (all cycles across catalog) | `TODO` |

#### FARM-S219 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T120 | Task | `BlastRadiusService.compute(componentId)`: BFS traversal collecting downstream nodes with hop count; risk score = sum of hop-weighted node counts | `TODO` |
| FARM-T121 | Task | `GET /api/v1/components/:id/blast-radius` returning `{ affectedCount, riskScore, components: [{ id, name, hops }] }` | `TODO` |

---

### FARM-E56: Anomaly Detection `TODO`

> Baseline-learning anomaly detection on key metrics (error rate, latency p99, queue depth). Surfaces deviations automatically without manual threshold configuration.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S221 | Story | Metric baseline learner -- rolling 7-day mean and standard deviation per metric per component, recalculated daily via BullMQ CRON | `TODO` |
| FARM-S222 | Story | Anomaly scoring job -- runs every 5 min, computes Z-score against baseline, emits `anomaly:detected` WebSocket event when Z-score exceeds 3 | `TODO` |
| FARM-S223 | Story | `AnomalyAlert` entity and API (componentId, metricName, score, severity, suppressedUntil, acknowledgedBy) | `TODO` |
| FARM-S224 | Story | Frontend: anomaly feed widget for custom dashboards, per-component anomaly history tab in component detail page | `TODO` |

#### FARM-S221 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T122 | Task | `MetricBaseline` entity (`componentId`, `metricName`, `mean`, `stddev`, `sampleCount`, `computedAt`); unique on (componentId, metricName) | `TODO` |
| FARM-T123 | Task | `BaselineLearnerJob` (BullMQ CRON daily at 02:00 UTC): query Prometheus for 7-day data, compute mean/stddev per component, upsert baseline rows | `TODO` |

#### FARM-S222 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T124 | Task | `AnomalyScorerJob` (BullMQ CRON every 5 min): fetch current metric values from Prometheus, compute Z-score against stored baseline | `TODO` |
| FARM-T125 | Task | On Z-score > 3: create `AnomalyAlert` record, emit `anomaly:detected` event with payload `{ componentId, metric, score, severity }` | `TODO` |

---

## Phase 15: Developer Self-Service `TODO`

### FARM-E57: Service Templates and Golden Paths `TODO`

> Curated service templates (NestJS API, Next.js app, Go service, Python worker) scaffold a new repository with CI, Dockerfile, catalog-info.yaml, and tests included. The scaffolded repository is automatically registered in Farm as a catalog component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S225 | Story | `ServiceTemplate` entity and CRUD API (name, description, language, framework, tags, repositoryUrl, variables JSONB schema) | `TODO` |
| FARM-S226 | Story | Scaffolding BullMQ job processor -- clone template, substitute variables, push to target org/repo via GitHub API | `TODO` |
| FARM-S227 | Story | Frontend golden path wizard (select template -> configure variables -> review -> trigger scaffold -> real-time progress) | `TODO` |
| FARM-S228 | Story | Auto-registration on scaffold completion -- create catalog component, documentation stub, and default SLO for the new service | `TODO` |

#### FARM-S225 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T126 | Task | Create `ServiceTemplate` entity; `ServiceTemplateModule` with CRUD API; seed 4 built-in templates on startup if table is empty | `TODO` |
| FARM-T127 | Task | `TemplateVariable` schema: `{ key, label, description, default, required, pattern }` array stored as JSONB; validated before scaffold | `TODO` |

#### FARM-S226 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T128 | Task | `ScaffoldJob` BullMQ processor: clone template via `simple-git`, replace `{{VARIABLE}}` tokens in all text files and filenames recursively | `TODO` |
| FARM-T129 | Task | Push scaffolded code to new GitHub repo via REST API (create repo + initial commit); store `ScaffoldRequest` entity with status tracking | `TODO` |
| FARM-T130 | Task | Rollback on failure: delete partially created repo if push fails; notify requestor via WebSocket `scaffold:failed` event | `TODO` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST208 | Sub-task | Require `GITHUB_SCAFFOLD_TOKEN` env var with `repo` and `admin:org` scopes; document in env var reference | `TODO` |
| FARM-ST209 | Sub-task | Dry-run mode: `POST /scaffold/dry-run` returns rendered file tree diff without creating any remote resources | `TODO` |
| FARM-ST210 | Sub-task | Unit tests for variable substitution: nested directories, binary file passthrough, missing required variable validation | `TODO` |

#### FARM-S227 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T131 | Task | Multi-step wizard with stepper UI: step 1 template picker, step 2 variable form (dynamic from template config), step 3 review, step 4 progress | `TODO` |
| FARM-T132 | Task | WebSocket subscription on step 4 to receive real-time `scaffold:progress` and `scaffold:complete` events | `TODO` |

---

### FARM-E58: Self-Service Environment Provisioning `TODO`

> Developers request ephemeral or persistent environments through an approval workflow. Farm provisions the environment via a pluggable cloud adapter and enforces TTL expiry automatically.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S229 | Story | `EnvironmentRequest` entity and API (requestor, type, size/tier, TTL hours, status: pending/approved/provisioning/active/expired/rejected) | `TODO` |
| FARM-S230 | Story | Approval workflow -- workspace admins receive WebSocket notification; approve/reject with comment; decision enqueues provisioning job | `TODO` |
| FARM-S231 | Story | Provisioning adapter interface (`IProvisioningAdapter`) with AWS EKS namespace adapter as first implementation | `TODO` |
| FARM-S232 | Story | TTL expiry BullMQ CRON job -- checks active environments past TTL, triggers deprovisioning, sends 1-hour expiry warning | `TODO` |
| FARM-S233 | Story | Frontend: environment request form, request status tracker with progress steps, approver inbox with batch approve/reject | `TODO` |

#### FARM-S229 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T133 | Task | Create `EnvironmentRequest` entity with `EnvironmentRequestStatus` enum; `EnvironmentRequestModule` CRUD API | `TODO` |
| FARM-T134 | Task | Status transition guard: valid paths only (pending -> approved, pending -> rejected, approved -> provisioning, provisioning -> active, active -> expired) | `TODO` |

#### FARM-S230 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T135 | Task | `POST /environment-requests/:id/approve` and `/reject` -- require `WorkspaceRole.admin`; emit `env-request:decided` WebSocket event | `TODO` |
| FARM-T136 | Task | On approval, enqueue `ProvisioningJob` with environment request ID and resolved adapter config from workspace settings | `TODO` |

#### FARM-S231 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T137 | Task | Define `IProvisioningAdapter` interface: `provision(request): Promise<ProvisioningResult>` and `deprovision(envId): Promise<void>` | `TODO` |
| FARM-T138 | Task | `EksNamespaceAdapter`: create Kubernetes namespace, apply resource quota, store kubeconfig secret in AWS SSM Parameter Store | `TODO` |
| FARM-T139 | Task | `ProvisioningJob` BullMQ processor: call adapter, update request to `active`, create `Environment` record, emit WebSocket event | `TODO` |

#### FARM-S232 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T140 | Task | `TtlExpiryJob` (BullMQ CRON every 30 min): query active requests where `approvedAt + ttlHours < NOW()`, call adapter `deprovision()` | `TODO` |
| FARM-T141 | Task | 1-hour pre-expiry warning: schedule a delayed BullMQ job at provision time to notify requestor 60 min before TTL | `TODO` |

---

## Phase 16: Kubernetes Operators `TODO`

### FARM-E59: Kubernetes Operators Integration `TODO`

> Extend Farm's existing Kubernetes integration to surface Operators as first-class infrastructure components alongside Helm releases. Operators installed via OLM (Operator Lifecycle Manager) are discovered automatically, their managed Custom Resources are inventoried, and each Operator can be linked to a catalog component for full traceability.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S237 | Story | Operator discovery via OLM ClusterServiceVersions with status (healthy / degraded / failing) | `TODO` |
| FARM-S238 | Story | Custom Resource inventory -- list CR instances per operator with spec and status conditions | `TODO` |
| FARM-S239 | Story | Operator-to-component binding -- link installed operators to catalog components | `TODO` |
| FARM-S240 | Story | Frontend Operators browser -- list operators, CR viewer, component link | `TODO` |
| FARM-S241 | Story | CRI-O container runtime visibility -- detect runtime per node, surface version info and storage metrics | `TODO` |

#### FARM-S237 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T151 | Task | OLM adapter in `KubernetesService`: list `ClusterServiceVersions` across all namespaces via `/apis/operators.coreos.com/v1alpha1/clusterserviceversions`; map to `OperatorInfo` (name, displayName, version, namespace, phase, description) | `TODO` |
| FARM-T152 | Task | `GET /api/kubernetes/operators` endpoint returning all discovered operators with phase badge (Succeeded / Failed / Pending); unit + e2e tests | `TODO` |

#### FARM-S238 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T153 | Task | CRD discovery: extract `spec.customresourcedefinitions.owned` from each CSV; query `/apis/{group}/{version}/{plural}` for CR instances via `KubernetesService` | `TODO` |
| FARM-T154 | Task | `GET /api/kubernetes/operators/:name/custom-resources` returning CR instances (name, namespace, kind, status conditions); unit + e2e tests | `TODO` |

#### FARM-S239 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T155 | Task | `OperatorBinding` entity (`operatorName`, `operatorNamespace`, `componentId` FK → Component, `addedAt`); unique constraint on `(operatorName, operatorNamespace, componentId)`; TypeORM migration | `TODO` |
| FARM-T156 | Task | `POST /api/kubernetes/operators/:name/binding` and `DELETE /api/kubernetes/operators/:name/binding` to associate / disassociate an operator with a catalog component; unit + e2e tests | `TODO` |

#### FARM-S240 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T157 | Task | Operators list page at `/operators` with status badge, version, description, and linked component chip; reuse `FilterTabs` and `EmptyState` shared components | `TODO` |
| FARM-T158 | Task | Operator detail panel: installed CRDs list, CR instances table with status conditions, binding selector to link/unlink a catalog component | `TODO` |
| FARM-T159 | Task | Add "Operators" section to Component detail overview tab when one or more operators are bound to the component; show operator name, phase, and link to detail panel | `TODO` |

#### FARM-S241 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T169 | Task | Detect CRI-O via Kubernetes Node `.status.nodeInfo.containerRuntimeVersion` (value starts with `crio://`); `GET /api/kubernetes/runtime` returning runtime type, version, and count per node | `TODO` |
| FARM-T170 | Task | Surface CRI-O storage stats by scraping the CRI-O metrics endpoint (port 9090 default) via `KubernetesService` pod proxy: image layer cache hit rate, storage usage per node | `TODO` |
| FARM-T171 | Task | Frontend: runtime info badge per node in the Kubernetes section (runtime name + version); dedicated "Runtime" card in cluster overview showing dominant runtime and version distribution across nodes | `TODO` |

---

## Phase 17: Container Registry Integration `TODO`

### FARM-E60: Container Registry Integration `TODO`

> Surface container image metadata and vulnerability scan results inside Farm alongside each catalog component. A pluggable adapter interface supports AWS ECR, GCP Artifact Registry, Docker Hub, and Harbor as first-class implementations. Platform engineers get a single place to answer "what image is running, when was it pushed, and does it have critical CVEs?" without leaving the portal.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S242 | Story | Registry adapter interface with ECR, GCP Artifact Registry, and Docker Hub implementations | `TODO` |
| FARM-S243 | Story | Container image metadata on components -- registry, image name, latest tag, digest, and pushed date synced from adapter | `TODO` |
| FARM-S244 | Story | Vulnerability surface -- pull CVE scan results from registry, surface critical/high counts in component detail and a dedicated security sub-tab | `TODO` |
| FARM-S245 | Story | Dragonfly (d7y.io) cluster detection and health monitoring -- detect Manager, Scheduler, and dfget daemon components; surface version and health status | `TODO` |
| FARM-S246 | Story | Dragonfly P2P pull task metrics and peer topology -- show active P2P tasks, acceleration stats, and peer distribution per image pull | `TODO` |
| FARM-S247 | Story | Harbor adapter -- HarborAdapter implementing IRegistryAdapter with native Trivy scan results and replication rules visibility | `TODO` |

#### FARM-S242 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T160 | Task | Define `IRegistryAdapter` interface (`listRepositories()`, `listTags(repo)`, `getManifest(repo, tag)`, `getScanResults(repo, tag)`); config env vars `REGISTRY_TYPE`, `REGISTRY_URL`, `REGISTRY_CREDENTIALS` | `TODO` |
| FARM-T161 | Task | `EcrAdapter` (AWS SDK v3), `GcrAdapter` (Artifact Registry REST API), `DockerHubAdapter` (Docker Hub API v2 with token auth); each implementing `IRegistryAdapter` | `TODO` |
| FARM-T162 | Task | `RegistryModule` with conditional adapter registration based on `REGISTRY_TYPE`; `GET /api/registry/repositories` and `GET /api/registry/repositories/:name/tags` endpoints; unit + e2e tests | `TODO` |

#### FARM-S243 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T163 | Task | Add `containerImage` JSONB column to `Component` entity (`registry`, `image`, `latestTag`, `digest`, `pushedAt`); TypeORM migration | `TODO` |
| FARM-T164 | Task | `POST /api/catalog/components/:id/container-image` to set or sync image metadata from registry; BullMQ job (every 15 min) to refresh `latestTag` and `digest` automatically | `TODO` |
| FARM-T165 | Task | Container image card in Component detail overview tab: registry badge, image name, latest tag, digest (truncated), pushed date | `TODO` |

#### FARM-S244 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T166 | Task | `ContainerVulnerability` entity (`componentId`, `registry`, `image`, `tag`, `severity`: critical/high/medium/low, `cveId`, `packageName`, `fixedVersion`, `scannedAt`); TypeORM migration | `TODO` |
| FARM-T167 | Task | Vulnerability sync BullMQ job: fetch scan results from adapter, upsert `ContainerVulnerability` rows, emit WebSocket `container:vulnerability-found` event on new critical findings | `TODO` |
| FARM-T168 | Task | Vulnerabilities summary card in Component detail: critical/high/medium/low counts with color badges; full CVE table in dedicated "Security" sub-tab with severity filter and fixed-version column | `TODO` |

#### FARM-S245 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T172 | Task | Dragonfly detection: query Kubernetes for `Deployment` or `DaemonSet` resources with label `app.kubernetes.io/name=dragonfly`; identify Manager, Scheduler, and dfget (dfdaemon) pods; map to `DragonflyInfo` (component, namespace, version, ready replicas) | `TODO` |
| FARM-T173 | Task | `GET /api/kubernetes/dragonfly/status` returning installation status (not-installed / degraded / healthy), component breakdown, and version; unit + e2e tests | `TODO` |
| FARM-T174 | Task | Frontend: Dragonfly health card in the Kubernetes section showing overall status badge, component list (Manager / Scheduler / dfget), and version | `TODO` |

#### FARM-S246 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T175 | Task | Scrape Dragonfly Manager metrics endpoint (`/metrics`) via `KubernetesService` pod proxy; parse P2P task counters (total tasks, succeeded, failed, in-progress) and peer counts | `TODO` |
| FARM-T176 | Task | `GET /api/kubernetes/dragonfly/tasks` returning recent P2P pull tasks (image, peer count, bytes transferred, acceleration ratio, duration); `GET /api/kubernetes/dragonfly/peers` returning active peer list | `TODO` |
| FARM-T177 | Task | Frontend: Dragonfly pull metrics panel with task table (image, peers, acceleration ratio badge, status) and a sparkline chart of P2P vs. direct-pull bytes over the last 24 hours | `TODO` |

#### FARM-S247 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T178 | Task | `HarborAdapter` implementing `IRegistryAdapter` using Harbor API v2 (`/api/v2.0/repositories`, `/api/v2.0/projects/{project}/repositories/{repository}/artifacts/{reference}/scan`); config via `REGISTRY_TYPE=harbor`, `HARBOR_URL`, `HARBOR_USERNAME`, `HARBOR_PASSWORD`; unit + e2e tests | `TODO` |
| FARM-T179 | Task | Harbor replication rules: `GET /api/registry/harbor/replications` listing active replication rules (source registry, destination registry, filter, trigger type, last execution status) via Harbor API v2 `/api/v2.0/replication/policies` | `TODO` |
| FARM-T180 | Task | Frontend: Harbor badge in the registry adapter selector; replication rules table in the Container Registry section showing source → destination with trigger type and last execution status badge | `TODO` |

---

## Phase 18: GitOps and Autoscaling `TODO`

### FARM-E61: Flux GitOps Integration `TODO`

> Surface Flux v2 GitOps resources (Kustomizations, HelmReleases, GitRepositories) inside Farm so Platform Engineers can answer reconciliation status, drift, and source provenance questions without leaving the portal. Each Flux resource can be bound to a catalog component for full traceability.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S248 | Story | Flux installation detection and Kustomization reconciliation status | `TODO` |
| FARM-S249 | Story | HelmRelease CRD visibility -- surface Flux-managed Helm releases with reconciliation state and last applied revision | `TODO` |
| FARM-S250 | Story | GitRepository and OCIRepository source tracking -- source URL, branch, last fetched commit, ready condition | `TODO` |
| FARM-S251 | Story | Frontend Flux dashboard -- reconciliation status board, drift alerts, FluxBinding to catalog components | `TODO` |

#### FARM-S248 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T181 | Task | Detect Flux v2 installation by querying `flux-system` namespace for controller deployments (source-controller, kustomize-controller, helm-controller, notification-controller); `GET /api/kubernetes/flux/status` returning installed controllers and versions | `TODO` |
| FARM-T182 | Task | List `Kustomization` CRDs (`kustomizations.kustomize.toolkit.fluxcd.io`): name, namespace, path, ready condition, last applied revision, suspend status; `GET /api/kubernetes/flux/kustomizations`; unit + e2e tests | `TODO` |

#### FARM-S249 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T183 | Task | List `HelmRelease` CRDs (`helmreleases.helm.toolkit.fluxcd.io`): name, namespace, chart name, chart version, ready condition, last applied revision; `GET /api/kubernetes/flux/helm-releases`; unit + e2e tests | `TODO` |
| FARM-T184 | Task | `FluxBinding` entity (`resourceKind`: kustomization/helmrelease, `resourceName`, `resourceNamespace`, `componentId` FK → Component); `POST/DELETE /api/kubernetes/flux/binding`; TypeORM migration; unit + e2e tests | `TODO` |

#### FARM-S250 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T185 | Task | List `GitRepository` and `OCIRepository` sources: URL, branch/tag, last fetched commit SHA, ready condition; `GET /api/kubernetes/flux/sources`; unit + e2e tests | `TODO` |
| FARM-T186 | Task | WebSocket event `flux:reconciliation-failed` emitted when a Kustomization or HelmRelease transitions to a failed ready condition; poll interval 60s via BullMQ scheduled job | `TODO` |

#### FARM-S251 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T187 | Task | Flux dashboard page at `/gitops` listing all Kustomizations and HelmReleases with ready badge (ready / suspended / failed), last revision, namespace; `FilterTabs` for resource type | `TODO` |
| FARM-T188 | Task | Flux resource detail panel: source info (URL, branch, last commit), conditions list, events timeline, linked component chip | `TODO` |
| FARM-T189 | Task | "GitOps" section in Component detail overview tab when a `FluxBinding` exists: resource name, type badge, reconciliation status, last applied revision | `TODO` |

---

### FARM-E62: KEDA Autoscaling Visibility `TODO`

> Expose KEDA ScaledObjects and ScaledJobs inside Farm so Platform Engineers can understand what drives autoscaling decisions for each component -- scaler type, current metric value vs target, active/idle/fallback status -- and link each scaled workload to its catalog component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S252 | Story | ScaledObject and ScaledJob discovery with active scaler detection and ready condition | `TODO` |
| FARM-S253 | Story | Scaler detail -- source type (Kafka, SQS, Prometheus, Redis, BullMQ, etc.), current metric value, target, current vs min/max replicas | `TODO` |
| FARM-S254 | Story | Frontend KEDA dashboard and component integration | `TODO` |

#### FARM-S252 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T190 | Task | Detect KEDA installation via `keda-operator` deployment; list `ScaledObject` CRDs (`scaledobjects.keda.sh`): name, namespace, target deployment, min/max replicas, ready condition, active flag; `GET /api/kubernetes/keda/scaled-objects`; unit + e2e tests | `TODO` |
| FARM-T191 | Task | List `ScaledJob` CRDs (`scaledjobs.keda.sh`): name, namespace, job template ref, min/max replica count, ready condition; `GET /api/kubernetes/keda/scaled-jobs`; unit + e2e tests | `TODO` |

#### FARM-S253 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T192 | Task | For each ScaledObject, extract trigger list from spec: scaler type, metadata (Kafka topic + consumer group lag, SQS queue name + queueLength, Prometheus query + threshold, Redis list length); `GET /api/kubernetes/keda/scaled-objects/:name/triggers` | `TODO` |
| FARM-T193 | Task | `KedaBinding` entity (`scaledObjectName`, `scaledObjectNamespace`, `componentId` FK → Component); `POST/DELETE /api/kubernetes/keda/binding`; TypeORM migration; unit + e2e tests | `TODO` |

#### FARM-S254 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T194 | Task | KEDA section in Kubernetes page: ScaledObjects list with active badge (active / idle / fallback), current replicas / max replicas chip, scaler type badge; `FilterTabs` for ScaledObject vs ScaledJob | `TODO` |
| FARM-T195 | Task | ScaledObject detail panel: trigger list with current metric value vs target, replica count history sparkline (last 1h), pause/resume button (admin) toggling `autoscaling.keda.sh/paused` annotation | `TODO` |
| FARM-T196 | Task | "Autoscaling" section in Component detail overview tab when a `KedaBinding` exists: scaler type badge, current replicas, active status, link to ScaledObject detail panel | `TODO` |

---

## Phase 19: FinOps `TODO`

### FARM-E63: Infracost Pipeline Integration `TODO`

> Integrate Infracost into Farm pipelines to surface estimated infrastructure cost changes before they reach production. A new `InfracostExecutor` stage runs `infracost diff` as part of CI, stores the cost delta in the pipeline run, and alerts when a change exceeds a configurable budget threshold per component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S255 | Story | InfracostExecutor pipeline stage -- run `infracost diff` in CI, store cost delta JSON in pipeline run metadata | `TODO` |
| FARM-S256 | Story | Component cost estimate -- persist latest Infracost estimate per component with monthly cost breakdown and history | `TODO` |
| FARM-S257 | Story | Cost change alerting -- configurable `costBudgetUsd` per component; WebSocket alert when a pipeline run delta exceeds the threshold | `TODO` |

#### FARM-S255 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T197 | Task | `InfracostExecutor` implementing the pipeline stage executor interface: run `infracost diff --path . --format json` via `spawn`; parse `totalMonthlyCost`, `diffMonthlyCost`, and `projects[]`; store result in pipeline run `metadata.infracost`; unit tests | `TODO` |
| FARM-T198 | Task | Add `infracost` to `PipelineStageKind` enum; stage config fields: `terraformDir` (path, default `.`), `costThreshold` (optional USD decimal, triggers warning log if exceeded); update Swagger docs | `TODO` |

#### FARM-S256 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T199 | Task | `CostEstimate` entity (`componentId` FK → Component, `estimatedMonthlyCost` decimal, `currency` varchar default USD, `pipelineRunId` FK nullable, `breakdown` JSONB, `measuredAt`); TypeORM migration | `TODO` |
| FARM-T200 | Task | `upsertCostEstimate(componentId, data)` in a new `FinOpsService`; `GET /api/catalog/components/:id/cost-estimate` endpoint; called by `InfracostExecutor` on successful run; unit + e2e tests | `TODO` |

#### FARM-S257 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T201 | Task | `costBudgetUsd` nullable decimal column on `Component` entity; included in `UpdateComponentDto` so it can be set via `PATCH /api/catalog/components/:id`; migration | `TODO` |
| FARM-T202 | Task | Budget check in `InfracostExecutor`: when `diffMonthlyCost > costBudgetUsd`, emit WebSocket `cost:budget-exceeded` event with `{ componentId, delta, pipelineRunId }` via `EventsGateway` | `TODO` |
| FARM-T203 | Task | Frontend: cost estimate card in Component detail overview tab showing estimated monthly cost, diff from previous run (green/red delta badge), last updated timestamp; budget exceeded warning banner when threshold is breached | `TODO` |

---

### FARM-E64: OpenCost Component Cost Visibility `TODO`

> Query OpenCost's allocation API to surface real Kubernetes compute costs per component, team, and namespace. Platform Engineers can set monthly budgets per component, receive alerts when actual spend exceeds them, and explore costs across the platform from a dedicated FinOps dashboard.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S258 | Story | OpenCost adapter -- connect to OpenCost `/model/allocation` API; query actual cost by `app` label matching component name | `TODO` |
| FARM-S259 | Story | Real cost per component -- CPU, memory, storage, and network cost breakdown synced daily; history endpoint for sparklines | `TODO` |
| FARM-S260 | Story | Cost dashboard -- team-level and namespace-level cost aggregation; top-N most expensive components table | `TODO` |
| FARM-S261 | Story | Actual cost alerts -- budget threshold per component; alert and notification panel entry when monthly actual spend exceeds budget | `TODO` |

#### FARM-S258 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T204 | Task | `OpenCostService`: `OPENCOST_URL` env var; `getAllocation(labelSelector, window)` method calling `/model/allocation?window=7d&aggregate=label:app&filterLabels=app:<value>`; unit tests with mocked `globalThis.fetch` | `TODO` |
| FARM-T205 | Task | `GET /api/cost/components/:id/actual` returning 7d and 30d actual cost breakdown (`cpuCost`, `memoryCost`, `pvCost`, `networkCost`, `totalCost`) by querying OpenCost with the component `name` as label value; e2e tests | `TODO` |

#### FARM-S259 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T206 | Task | `ActualCost` entity (`componentId` FK, `window` varchar, `cpuCost`, `memoryCost`, `pvCost`, `networkCost`, `totalCost` decimals, `currency`, `syncedAt`); BullMQ daily sync job refreshing costs for all components with an active deployment; TypeORM migration | `TODO` |
| FARM-T207 | Task | `GET /api/cost/components/:id/history` returning daily cost series for the last 30 days for sparkline rendering; unit + e2e tests | `TODO` |

#### FARM-S260 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T208 | Task | `GET /api/cost/teams/:id/summary` aggregating `ActualCost` rows for all components owned by team; `GET /api/cost/summary` returning top-N most expensive components platform-wide; unit + e2e tests | `TODO` |
| FARM-T209 | Task | Cost dashboard page at `/cost` with two views: "By Component" (sortable table with monthly cost, trend sparkline, budget usage bar) and "By Team" (team cost cards); `FilterTabs` for view switching | `TODO` |

#### FARM-S261 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T210 | Task | `costBudgetUsd` on `Component` (shared with FARM-T201) used by OpenCost budget checks; single migration covers both Infracost and OpenCost budget field if not yet added | `TODO` |
| FARM-T211 | Task | Post-sync budget check in `FinOpsService`: when 30d `ActualCost.totalCost > costBudgetUsd`, emit WebSocket `cost:actual-budget-exceeded` and create an alerting record; unit tests | `TODO` |
| FARM-T212 | Task | Frontend: budget progress bar in cost dashboard (`$340 of $500 monthly budget used`); red border on component card when budget exceeded; notification panel entry for budget breach events | `TODO` |

---

## Phase 20: Service Mesh Expansion `TODO`

### FARM-E65: Linkerd Integration `TODO`

> Mirror the existing Istio integration for Linkerd 2.x. Surface Linkerd control plane health, traffic metrics (RPS / error rate / latency) from Prometheus using Linkerd labels, mTLS auto-rotation status, authorization policies (`policy.linkerd.io`), and Service Profiles (per-route retry and timeout config). Three new tabs in the Component detail page mirror the Istio Traffic, Security, and Canary tabs.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S262 | Story | Linkerd control plane detection and health -- identify installed components (controller, identity, proxy-injector, destination) in the `linkerd` namespace | `TODO` |
| FARM-S263 | Story | Traffic metrics -- RPS, error rate, and P50/P95/P99 latency per component from Prometheus using Linkerd metric labels; topology edges from `request_total{dst_deployment!=""}` | `TODO` |
| FARM-S264 | Story | mTLS, authorization policies, and Service Profiles -- `ServerAuthorization`, `AuthorizationPolicy` CRDs from `policy.linkerd.io`; `ServiceProfile` CRDs with per-route retry and timeout config | `TODO` |
| FARM-S265 | Story | Frontend Linkerd tabs in Component detail -- LinkerdTrafficTab, LinkerdSecurityTab, LinkerdServiceProfileTab; tabs visible only when Linkerd is detected | `TODO` |

#### FARM-S262 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T213 | Task | `LinkerdService.isLinkerdEnabled()`: query `linkerd` namespace for control plane deployments (linkerd-controller, linkerd-identity, linkerd-proxy-injector, linkerd-destination); graceful `false` when namespace absent or CRDs not installed | `TODO` |
| FARM-T214 | Task | `LinkerdModule` with `LinkerdService`, `LinkerdMetricsService`, and `LinkerdController`; register in `app.module.ts`; `GET /api/linkerd/status` returning `{ installed, components: [{ name, ready, version }] }`; unit tests | `TODO` |

#### FARM-S263 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T215 | Task | `LinkerdMetricsService`: query Prometheus `request_total{deployment=X,namespace=Y,direction="inbound"}` for RPS and error rate; `response_latency_ms_bucket` for P50/P95/P99; reuse `KubernetesService.queryPrometheus()` | `TODO` |
| FARM-T216 | Task | `GET /api/linkerd/components/:namespace/:name/metrics/rps`, `/error-rate`, `/latency`; `GET /api/linkerd/topology` building edges from `request_total` with `dst_deployment` label; same `IstioTopologyEdge` interface shape; unit + e2e tests | `TODO` |

#### FARM-S264 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T217 | Task | List `ServerAuthorization` (`serverauthorizations.policy.linkerd.io/v1beta1`) and `AuthorizationPolicy` (`authorizationpolicies.policy.linkerd.io/v1alpha1`) CRDs per namespace via `CustomObjectsApi`; `GET /api/linkerd/authorization-policies`; unit + e2e tests | `TODO` |
| FARM-T218 | Task | List `ServiceProfile` CRDs (`serviceprofiles.linkerd.io/v1alpha2`): name, namespace, routes array (name, condition path/method, isRetryable, timeout, retryBudget); `GET /api/linkerd/service-profiles`; unit + e2e tests | `TODO` |

#### FARM-S265 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T219 | Task | Frontend `LinkerdTrafficTab`: RPS line chart, error rate gauge, latency P50/P95/P99 table -- reuse `PromQLChartCard` and `MiniLineChart` shared components from `IstioTrafficTab` | `TODO` |
| FARM-T220 | Task | Frontend `LinkerdSecurityTab`: mTLS status badge per namespace (auto-mTLS always-on indicator), `ServerAuthorization` and `AuthorizationPolicy` table with allowed/denied routes -- mirror `IstioSecurityTab` layout | `TODO` |
| FARM-T221 | Task | Frontend `LinkerdServiceProfileTab`: `ServiceProfile` list with per-route table (path, method, retryable badge, timeout chip) and per-route RPS/error-rate fetched from metrics endpoint | `TODO` |
| FARM-T222 | Task | Add `linkerd-traffic`, `linkerd-security`, `linkerd-profile` tabs to `ComponentDetailClient.tsx`; fetch Linkerd status on mount and render tabs only when `status.installed === true`; tests for all three tab components | `TODO` |

---

## Summary

| Phase | Epics | Stories | Status |
|-------|-------|---------|--------|
| Phase 1: Backend Core | 7 | 32 | `DONE` |
| Phase 2: Production Hardening | 8 | 34 | `DONE` |
| Phase 3: Backend Completion | 1 | 1 | `DONE` |
| Phase 4: Front-End Foundation | 1 | 3 | `DONE` |
| Phase 5: Front-End Core Pages | 7 | 12 | `DONE` |
| Phase 5.5: Front-End Quality and Hardening | 3 | 10 | `DONE` |
| Phase 5.6: E2E Testing | 1 | 1 | `DONE` |
| Phase 5.7: Backend Bug Fixes | 1 | 2 | `DONE` |
| Phase 6: Advanced Features | 13 | 58 | `DONE` |
| Phase 7: Frontend Hardening | 1 | 5 | `DONE` |
| Phase 8: Frontend Visual Refresh | 1 | 5 | `DONE` |
| Phase 9: Security Testing | 1 | 3 | `DONE` |
| Phase 10: Test Coverage Hardening | 1 | 8 | `DONE` |
| Phase 11: API Management | 2 | 8 | `TODO` |
| Phase 12: Multi-tenancy | 2 | 8 | `TODO` |
| Phase 13: Observability 2.0 | 3 | 12 | `TODO` |
| Phase 14: AI / Intelligence | 3 | 12 | `TODO` |
| Phase 15: Developer Self-Service | 2 | 9 | `TODO` |
| Phase 16: Kubernetes Operators | 1 | 5 | `TODO` |
| Phase 17: Container Registry Integration | 1 | 6 | `TODO` |
| Phase 18: GitOps and Autoscaling | 2 | 7 | `TODO` |
| Phase 19: FinOps | 2 | 7 | `TODO` |
| Phase 20: Service Mesh Expansion | 1 | 4 | `TODO` |
| **Total** | **66** | **252** | |
