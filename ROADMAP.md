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
| Phase 11: API Management | 2 | 8 | v0.13.0 | `DONE` |

---

## Phase 12: Multi-tenancy `DONE`

### FARM-E49: Workspace Isolation `DONE`

> Introduce a Workspace entity as the top-level tenant boundary. All major resources (components, teams, environments, documentation, pipelines) are workspace-scoped. Existing data migrates to a seeded "default" workspace without downtime.
>
> **Implementation note:** The codebase already implements this under the name "Organization" (`Organization` entity, `OrgContextInterceptor`, `OrgRolesGuard`, `X-Organization-Id` header). FARM-E49 completes the coverage gaps in modules added in Phase 11.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S193 | Story | `Workspace` entity and CRUD API (name, slug, logoUrl, settings JSONB, createdBy) | `DONE` |
| FARM-S194 | Story | Resource scoping -- add `workspaceId` FK to all major entities; all list and detail endpoints enforce workspace context | `DONE` |
| FARM-S195 | Story | Data migration: seed default workspace, backfill `workspaceId` on all existing rows | `DONE` |
| FARM-S196 | Story | Frontend workspace switcher (replaces org switcher in app shell, persists active workspace to localStorage) | `DONE` |

#### FARM-S193 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T78 | Task | Create `Workspace` entity with slug uniqueness constraint; `WorkspaceModule` with full CRUD service and controller | `DONE` |
| FARM-T79 | Task | `GET /api/v1/workspaces/current` resolving from JWT claims; workspace slug as optional route prefix for scoped resources | `DONE` |

#### FARM-S194 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T80 | Task | Add nullable `workspaceId` UUID FK with index to: `Component`, `Team`, `Environment`, `Documentation`, `Pipeline`, `AlertingRule` entities | `DONE` |
| FARM-T81 | Task | Add `WorkspaceGuard` to inject `workspaceId` from `X-Workspace-ID` request header into all scoped service calls | `DONE` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST201 | Sub-task | Generate single TypeORM migration covering `workspaceId` column additions across all 6 entities | `DONE` |
| FARM-ST202 | Sub-task | Update all `QueryBuilder` and `findOptions` in services to filter by `workspaceId` when present | `DONE` |
| FARM-ST203 | Sub-task | Update all e2e tests to include `X-Workspace-ID` header in requests | `DONE` |
| FARM-ST204 | Sub-task | Add workspace-scoped authorization unit tests for each service | `DONE` |

#### FARM-S195 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T82 | Task | TypeORM data migration: INSERT default workspace row, then UPDATE each scoped table SET workspace_id = default_id WHERE workspace_id IS NULL | `DONE` |

#### FARM-S196 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T83 | Task | Replace `OrgSwitcher` component with `WorkspaceSwitcher`; fetch user workspaces from API, store active workspace ID in localStorage | `DONE` |
| FARM-T84 | Task | Thread active workspace ID through all API client calls as `X-Workspace-ID` request header via fetch interceptor | `DONE` |

---

### FARM-E50: Workspace-Scoped RBAC `DONE`

> Per-workspace roles (owner, admin, member, viewer) complement the existing global admin/user roles. Workspace owners can invite members, assign roles, and manage workspace settings independently.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S197 | Story | `WorkspaceMember` entity (workspaceId, userId, role: owner/admin/member/viewer, joinedAt) with unique constraint | `DONE` |
| FARM-S198 | Story | Workspace-scoped `@WorkspaceRoles()` decorator and guard; protect all workspace-owned endpoints | `DONE` |
| FARM-S199 | Story | Workspace invitation flow (invite by email -> signed token link -> accept/decline -> member created) | `DONE` |
| FARM-S200 | Story | Frontend: workspace settings page with member list, role assignment dropdown, and pending invitations panel | `DONE` |

#### FARM-S197 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T85 | Task | Create `WorkspaceMember` entity and `WorkspaceRole` enum; unique constraint on (workspaceId, userId) pair | `DONE` |
| FARM-T86 | Task | `GET /workspaces/:slug/members`, `PATCH /workspaces/:slug/members/:userId` (role change), `DELETE` (remove member) | `DONE` |

#### FARM-S199 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T87 | Task | `OrgInvitation` entity (email, tokenHash, role, expiresAt, status: pending/accepted/declined); 48-hour TTL | `DONE` |
| FARM-T88 | Task | `POST /organizations/:id/invitations` sends email via notification queue; `POST /invitations/:token/accept` creates member row | `DONE` |

---

## Phase 13: Observability 2.0 `DONE`

### FARM-E51: SLO / SLA Management `DONE`

> Define Service Level Objectives per component. Track error budget consumption and burn rate over rolling windows. Auto-generate alerting rules from SLO configuration.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S201 | Story | `Slo` entity and CRUD API (name, targetPercent, metricType: availability/latency/error-rate, window: 7d/30d/90d, componentId) | `DONE` |
| FARM-S202 | Story | Error budget calculation -- query Prometheus, compute consumed budget vs remaining percentage and burn rate | `DONE` |
| FARM-S203 | Story | Auto-generate alerting rules from SLO (fast-burn and slow-burn rules per SLO, managed via alerting module) | `DONE` |
| FARM-S204 | Story | Frontend SLO dashboard (health gauge per SLO, burn rate sparkline, error budget progress bar, 30-day history chart) | `DONE` |

#### FARM-S201 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T89 | Task | Create `Slo` entity with `SloMetricType` and `SloWindow` enums; `SloModule` with CRUD API and migration | `DONE` |
| FARM-T90 | Task | Unit tests for `SloService`; e2e tests for CRUD endpoints including componentId foreign key validation | `DONE` |

#### FARM-S202 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T91 | Task | `SloCalculatorService`: query Prometheus HTTP API using metricType-to-PromQL mapping, compute availability % over window | `DONE` |
| FARM-T92 | Task | `GET /api/v1/slos/:id/budget` returning `{ targetPercent, currentPercent, budgetRemaining, burnRate, status }` | `DONE` |

#### FARM-S203 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T93 | Task | On SLO create/update auto-create two `AlertingRule` records: fast-burn (2% budget in 1 h) and slow-burn (5% in 6 h), flagged `autoGenerated: true` | `DONE` |
| FARM-T94 | Task | SLO delete cascades to its auto-generated alerting rules; manual rules for the same component are unaffected | `DONE` |

---

### FARM-E52: Incident Management `DONE`

> Lightweight incident lifecycle inside Farm: declare, update, resolve, and write post-mortems. Each incident is linked to affected components and environments with a structured update timeline.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S205 | Story | `Incident` entity and API (title, severity: P1-P4, status: open/investigating/identified/resolved, affected components and environments) | `DONE` |
| FARM-S206 | Story | Incident timeline -- ordered event log with author, timestamp, message, and status change snapshot | `DONE` |
| FARM-S207 | Story | Post-mortem document linked to incident (rootCause, contributingFactors, actionItems JSONB array, Markdown body, approvedBy) | `DONE` |
| FARM-S208 | Story | Frontend: incident list with severity filter, incident detail with live timeline, post-mortem editor with action item checklist | `DONE` |

#### FARM-S205 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T95 | Task | Create `Incident` entity with `IncidentSeverity` and `IncidentStatus` enums; ManyToMany to `Component` and `Environment` | `DONE` |
| FARM-T96 | Task | CRUD API; `PATCH /incidents/:id/status` validates allowed transitions (open -> investigating -> identified -> resolved) | `DONE` |
| FARM-T97 | Task | Emit WebSocket events `incident:created` and `incident:status-changed` on state transitions | `DONE` |

#### FARM-S206 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T98 | Task | `IncidentUpdate` entity (incidentId, authorId, message, previousStatus, newStatus, createdAt); auto-created on every status change | `DONE` |
| FARM-T99 | Task | `POST /incidents/:id/updates` for manual timeline entries; `GET /incidents/:id/timeline` ordered by `createdAt ASC` | `DONE` |

#### FARM-S207 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T100 | Task | `PostMortem` entity (1:1 with Incident, rootCause, contributingFactors text[], actionItems JSONB, body Markdown, approvedBy userId) | `DONE` |
| FARM-T101 | Task | `PATCH /post-mortems/:id/approve` sets approvedBy and approvedAt; restricted to admin or incident creator | `DONE` |

---

### FARM-E53: Custom Dashboard Builder `DONE`

> Users compose custom dashboards from a library of reusable widgets. Layouts persist to the database and can be shared workspace-wide or kept private.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S209 | Story | `Dashboard` and `DashboardWidget` entities (dashboard: name, owner, visibility; widget: type, gridX/Y/W/H, configJSON) | `DONE` |
| FARM-S210 | Story | Widget type library: MetricGraph, ComponentHealth, DeploymentFeed, QueueStatus, SloGauge, AlertSummary, TeamActivity, UptimeChart | `DONE` |
| FARM-S211 | Story | Frontend dashboard builder with drag-and-drop grid (`react-grid-layout`), widget picker panel, and per-widget config drawer | `DONE` |
| FARM-S212 | Story | Dashboard sharing (public read-only link with signed token, workspace-scoped visibility toggle) | `DONE` |

#### FARM-S209 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T102 | Task | Create `Dashboard` and `DashboardWidget` entities; `DashboardModule` with CRUD for both; migration | `DONE` |
| FARM-T103 | Task | `PATCH /dashboards/:id/layout` bulk-updates widget positions in a single transaction (`[{widgetId, x, y, w, h}]`) | `DONE` |

#### FARM-S210 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T104 | Task | Define `WidgetType` enum and per-type config schema (TypeScript interfaces); validate `configJSON` against schema on widget create/update | `DONE` |
| FARM-T105 | Task | `GET /dashboards/:id/widgets/:widgetId/data` routes to the appropriate data source based on widget type | `DONE` |

#### FARM-S211 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T106 | Task | Install `react-grid-layout`; build `DashboardGrid` component with responsive breakpoints (12-col desktop, 6-col tablet, 2-col mobile) | `DONE` |
| FARM-T107 | Task | `WidgetPicker` side panel: categorized widget list with preview card; drag from panel onto grid to add | `DONE` |
| FARM-T108 | Task | Per-widget `ConfigDrawer`: dynamic form rendered from widget type config schema; save persists via `PATCH /widgets/:id` | `DONE` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST205 | Sub-task | Widget rendering components (one per WidgetType): fetch data, handle loading and error states, render chart or list | `DONE` |
| FARM-ST206 | Sub-task | Auto-save layout on change with 1-second debounce to avoid excessive API calls during drag | `DONE` |
| FARM-ST207 | Sub-task | Empty dashboard state with "Add your first widget" CTA and shortcut to widget picker | `DONE` |

---

## Phase 14: AI / Intelligence `DEFERRED`

### FARM-E54: AI-Assisted Search and Discovery `DEFERRED`

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

### FARM-E55: Dependency Intelligence `DEFERRED`

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

### FARM-E56: Anomaly Detection `DEFERRED`

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

## Phase 15: Developer Self-Service `DONE`

### FARM-E57: Service Templates and Golden Paths `DONE`

> Curated service templates (NestJS API, Next.js app, Go service, Python worker) scaffold a new repository with CI, Dockerfile, catalog-info.yaml, and tests included. The scaffolded repository is automatically registered in Farm as a catalog component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S225 | Story | `ServiceTemplate` entity and CRUD API (name, description, language, framework, tags, repositoryUrl, variables JSONB schema) | `DONE` |
| FARM-S226 | Story | Scaffolding BullMQ job processor -- clone template, substitute variables, push to target org/repo via GitHub API | `DONE` |
| FARM-S227 | Story | Frontend golden path wizard (select template -> configure variables -> review -> trigger scaffold -> real-time progress) | `DONE` |
| FARM-S228 | Story | Auto-registration on scaffold completion -- create catalog component, documentation stub, and default SLO for the new service | `DONE` |
| FARM-S287 | Story | Multi-VCS scaffold adapter -- support GitLab, Gitea, and Bitbucket as push targets in addition to GitHub, resolved from workspace VCS integration settings | `TODO` |

#### FARM-S225 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T126 | Task | Create `ServiceTemplate` entity; `ServiceTemplateModule` with CRUD API; seed 4 built-in templates on startup if table is empty | `DONE` |
| FARM-T127 | Task | `TemplateVariable` schema: `{ key, label, description, default, required, pattern }` array stored as JSONB; validated before scaffold | `DONE` |

#### FARM-S226 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T128 | Task | `ScaffoldJob` BullMQ processor: clone template via `simple-git`, replace `{{VARIABLE}}` tokens in all text files and filenames recursively | `DONE` |
| FARM-T129 | Task | Push scaffolded code to new GitHub repo via REST API (create repo + initial commit); store `ScaffoldRequest` entity with status tracking | `DONE` |
| FARM-T130 | Task | Rollback on failure: delete partially created repo if push fails; notify requestor via WebSocket `scaffold:failed` event | `DONE` |

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST208 | Sub-task | Require `GITHUB_SCAFFOLD_TOKEN` env var with `repo` and `admin:org` scopes; document in env var reference | `DONE` |
| FARM-ST209 | Sub-task | Dry-run mode: `POST /scaffold/dry-run` returns rendered file tree diff without creating any remote resources | `DONE` |
| FARM-ST210 | Sub-task | Unit tests for variable substitution: nested directories, binary file passthrough, missing required variable validation | `DONE` |

#### FARM-S287 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T265 | Task | Define `IVcsAdapter` interface: `createRepository(name, org, private): Promise<{cloneUrl, htmlUrl}>` and `pushInitialCommit(cloneUrl, files): Promise<void>`; register adapters via `VcsAdapterFactory` keyed by `VcsProvider` enum (`github`, `gitlab`, `gitea`, `bitbucket`) | `TODO` |
| FARM-T266 | Task | `GitLabVcsAdapter`: use GitLab REST API (`POST /projects`) with `GITLAB_SCAFFOLD_TOKEN`; support self-hosted instances via `GITLAB_BASE_URL` env var | `TODO` |
| FARM-T267 | Task | `GiteaVcsAdapter`: use Gitea REST API (`POST /orgs/:org/repos`) with `GITEA_SCAFFOLD_TOKEN` and `GITEA_BASE_URL`; compatible with Forgejo | `TODO` |
| FARM-T268 | Task | `BitbucketVcsAdapter`: use Bitbucket Cloud REST API v2 (`POST /repositories/:workspace/:slug`) with OAuth2 app password credentials | `TODO` |
| FARM-T269 | Task | `WorkspaceVcsSettings` entity (workspaceId, provider, baseUrl, credentialsSecret); `ScaffoldJob` resolves adapter from workspace settings at runtime; UI shows provider picker in scaffold wizard step 3 | `TODO` |

#### FARM-S227 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T131 | Task | Multi-step wizard with stepper UI: step 1 template picker, step 2 variable form (dynamic from template config), step 3 review, step 4 progress | `DONE` |
| FARM-T132 | Task | WebSocket subscription on step 4 to receive real-time `scaffold:progress` and `scaffold:complete` events | `DONE` |

---

### FARM-E58: Self-Service Environment Provisioning `DONE`

> Developers request ephemeral or persistent environments through an approval workflow. Farm provisions the environment via a pluggable cloud adapter and enforces TTL expiry automatically.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S229 | Story | `EnvironmentRequest` entity and API (requestor, type, size/tier, TTL hours, status: pending/approved/provisioning/active/expired/rejected) | `DONE` |
| FARM-S230 | Story | Approval workflow -- workspace admins receive WebSocket notification; approve/reject with comment; decision enqueues provisioning job | `DONE` |
| FARM-S231 | Story | Provisioning adapter interface (`IProvisioningAdapter`) with AWS EKS namespace adapter as first implementation | `DONE` |
| FARM-S232 | Story | TTL expiry BullMQ CRON job -- checks active environments past TTL, triggers deprovisioning, sends 1-hour expiry warning | `DONE` |
| FARM-S233 | Story | Frontend: environment request form, request status tracker with progress steps, approver inbox with batch approve/reject | `DONE` |

#### FARM-S229 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T133 | Task | Create `EnvironmentRequest` entity with `EnvironmentRequestStatus` enum; `EnvironmentRequestModule` CRUD API | `DONE` |
| FARM-T134 | Task | Status transition guard: valid paths only (pending -> approved, pending -> rejected, approved -> provisioning, provisioning -> active, active -> expired) | `DONE` |

#### FARM-S230 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T135 | Task | `POST /environment-requests/:id/approve` and `/reject` -- require `WorkspaceRole.admin`; emit `env-request:decided` WebSocket event | `DONE` |
| FARM-T136 | Task | On approval, enqueue `ProvisioningJob` with environment request ID and resolved adapter config from workspace settings | `DONE` |

#### FARM-S231 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T137 | Task | Define `IProvisioningAdapter` interface: `provision(request): Promise<ProvisioningResult>` and `deprovision(envId): Promise<void>` | `DONE` |
| FARM-T138 | Task | `EksNamespaceAdapter`: create Kubernetes namespace, apply resource quota, store kubeconfig secret in AWS SSM Parameter Store | `DONE` |
| FARM-T139 | Task | `ProvisioningJob` BullMQ processor: call adapter, update request to `active`, create `Environment` record, emit WebSocket event | `DONE` |

#### FARM-S232 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T140 | Task | `TtlExpiryJob` (BullMQ CRON every 30 min): query active requests where `approvedAt + ttlHours < NOW()`, call adapter `deprovision()` | `DONE` |
| FARM-T141 | Task | 1-hour pre-expiry warning: schedule a delayed BullMQ job at provision time to notify requestor 60 min before TTL | `DONE` |

---

## Phase 16: Kubernetes Operators `DONE`

### FARM-E59: Kubernetes Operators Integration `DONE`

> Extend Farm's existing Kubernetes integration to surface Operators as first-class infrastructure components alongside Helm releases. Operators installed via OLM (Operator Lifecycle Manager) are discovered automatically, their managed Custom Resources are inventoried, and each Operator can be linked to a catalog component for full traceability.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S237 | Story | Operator discovery via OLM ClusterServiceVersions with status (healthy / degraded / failing) | `DONE` |
| FARM-S238 | Story | Custom Resource inventory -- list CR instances per operator with spec and status conditions | `DONE` |
| FARM-S239 | Story | Operator-to-component binding -- link installed operators to catalog components | `DONE` |
| FARM-S240 | Story | Frontend Operators browser -- list operators, CR viewer, component link | `DONE` |
| FARM-S241 | Story | CRI-O container runtime visibility -- detect runtime per node, surface version info and storage metrics | `DONE` |

#### FARM-S237 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T151 | Task | OLM adapter in `KubernetesService`: list `ClusterServiceVersions` across all namespaces via `/apis/operators.coreos.com/v1alpha1/clusterserviceversions`; map to `OperatorInfo` (name, displayName, version, namespace, phase, description) | `DONE` |
| FARM-T152 | Task | `GET /api/kubernetes/operators` endpoint returning all discovered operators with phase badge (Succeeded / Failed / Pending); unit + e2e tests | `DONE` |

#### FARM-S238 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T153 | Task | CRD discovery: extract `spec.customresourcedefinitions.owned` from each CSV; query `/apis/{group}/{version}/{plural}` for CR instances via `KubernetesService` | `DONE` |
| FARM-T154 | Task | `GET /api/kubernetes/operators/:name/custom-resources` returning CR instances (name, namespace, kind, status conditions); unit + e2e tests | `DONE` |

#### FARM-S239 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T155 | Task | `OperatorBinding` entity (`operatorName`, `operatorNamespace`, `componentId` FK → Component, `addedAt`); unique constraint on `(operatorName, operatorNamespace, componentId)`; TypeORM migration | `DONE` |
| FARM-T156 | Task | `POST /api/kubernetes/operators/:name/binding` and `DELETE /api/kubernetes/operators/:name/binding` to associate / disassociate an operator with a catalog component; unit + e2e tests | `DONE` |

#### FARM-S240 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T157 | Task | Operators list page at `/operators` with status badge, version, description, and linked component chip; reuse `FilterTabs` and `EmptyState` shared components | `DONE` |
| FARM-T158 | Task | Operator detail panel: installed CRDs list, CR instances table with status conditions, binding selector to link/unlink a catalog component | `DONE` |
| FARM-T159 | Task | Add "Operators" section to Component detail overview tab when one or more operators are bound to the component; show operator name, phase, and link to detail panel | `DONE` |

#### FARM-S241 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T169 | Task | Detect CRI-O via Kubernetes Node `.status.nodeInfo.containerRuntimeVersion` (value starts with `crio://`); `GET /api/kubernetes/runtime` returning runtime type, version, and count per node | `DONE` |
| FARM-T170 | Task | Surface CRI-O storage stats by scraping the CRI-O metrics endpoint (port 9090 default) via `KubernetesService` pod proxy: image layer cache hit rate, storage usage per node | `DONE` |
| FARM-T171 | Task | Frontend: runtime info badge per node in the Kubernetes section (runtime name + version); dedicated "Runtime" card in cluster overview showing dominant runtime and version distribution across nodes | `DONE` |

---

## Phase 17: Container Registry Integration `DONE`

### FARM-E60: Container Registry Integration `DONE`

> Surface container image metadata and vulnerability scan results inside Farm alongside each catalog component. A pluggable adapter interface supports AWS ECR, GCP Artifact Registry, Docker Hub, and Harbor as first-class implementations. Platform engineers get a single place to answer "what image is running, when was it pushed, and does it have critical CVEs?" without leaving the portal.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S242 | Story | Registry adapter interface with ECR, GCP Artifact Registry, and Docker Hub implementations | `DONE` |
| FARM-S243 | Story | Container image metadata on components -- registry, image name, latest tag, digest, and pushed date synced from adapter | `DONE` |
| FARM-S244 | Story | Vulnerability surface -- pull CVE scan results from registry, surface critical/high counts in component detail and a dedicated security sub-tab | `DONE` |
| FARM-S245 | Story | Dragonfly (d7y.io) cluster detection and health monitoring -- detect Manager, Scheduler, and dfget daemon components; surface version and health status | `DONE` |
| FARM-S246 | Story | Dragonfly P2P pull task metrics and peer topology -- show active P2P tasks, acceleration stats, and peer distribution per image pull | `DONE` |
| FARM-S247 | Story | Harbor adapter -- HarborAdapter implementing IRegistryAdapter with native Trivy scan results and replication rules visibility | `DONE` |

#### FARM-S242 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T160 | Task | Define `IRegistryAdapter` interface (`listRepositories()`, `listTags(repo)`, `getManifest(repo, tag)`, `getScanResults(repo, tag)`); config env vars `REGISTRY_TYPE`, `REGISTRY_URL`, `REGISTRY_CREDENTIALS` | `DONE` |
| FARM-T161 | Task | `EcrAdapter` (AWS SDK v3), `GcrAdapter` (Artifact Registry REST API), `DockerHubAdapter` (Docker Hub API v2 with token auth); each implementing `IRegistryAdapter` | `DONE` |
| FARM-T162 | Task | `RegistryModule` with conditional adapter registration based on `REGISTRY_TYPE`; `GET /api/registry/repositories` and `GET /api/registry/repositories/:name/tags` endpoints; unit + e2e tests | `DONE` |

#### FARM-S243 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T163 | Task | Add `containerImage` JSONB column to `Component` entity (`registry`, `image`, `latestTag`, `digest`, `pushedAt`); TypeORM migration | `DONE` |
| FARM-T164 | Task | `POST /api/catalog/components/:id/container-image` to set or sync image metadata from registry; BullMQ job (every 15 min) to refresh `latestTag` and `digest` automatically | `DONE` |
| FARM-T165 | Task | Container image card in Component detail overview tab: registry badge, image name, latest tag, digest (truncated), pushed date | `DONE` |

#### FARM-S244 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T166 | Task | `ContainerVulnerability` entity (`componentId`, `registry`, `image`, `tag`, `severity`: critical/high/medium/low, `cveId`, `packageName`, `fixedVersion`, `scannedAt`); TypeORM migration | `DONE` |
| FARM-T167 | Task | Vulnerability sync BullMQ job: fetch scan results from adapter, upsert `ContainerVulnerability` rows, emit WebSocket `container:vulnerability-found` event on new critical findings | `DONE` |
| FARM-T168 | Task | Vulnerabilities summary card in Component detail: critical/high/medium/low counts with color badges; full CVE table in dedicated "Security" sub-tab with severity filter and fixed-version column | `DONE` |

#### FARM-S245 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T172 | Task | Dragonfly detection: query Kubernetes for `Deployment` or `DaemonSet` resources with label `app.kubernetes.io/name=dragonfly`; identify Manager, Scheduler, and dfget (dfdaemon) pods; map to `DragonflyInfo` (component, namespace, version, ready replicas) | `DONE` |
| FARM-T173 | Task | `GET /api/kubernetes/dragonfly/status` returning installation status (not-installed / degraded / healthy), component breakdown, and version; unit + e2e tests | `DONE` |
| FARM-T174 | Task | Frontend: Dragonfly health card in the Kubernetes section showing overall status badge, component list (Manager / Scheduler / dfget), and version | `DONE` |

#### FARM-S246 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T175 | Task | Scrape Dragonfly Manager metrics endpoint (`/metrics`) via `KubernetesService` pod proxy; parse P2P task counters (total tasks, succeeded, failed, in-progress) and peer counts | `DONE` |
| FARM-T176 | Task | `GET /api/kubernetes/dragonfly/tasks` returning recent P2P pull tasks (image, peer count, bytes transferred, acceleration ratio, duration); `GET /api/kubernetes/dragonfly/peers` returning active peer list | `DONE` |
| FARM-T177 | Task | Frontend: Dragonfly pull metrics panel with task table (image, peers, acceleration ratio badge, status) and a sparkline chart of P2P vs. direct-pull bytes over the last 24 hours | `DONE` |

#### FARM-S247 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T178 | Task | `HarborAdapter` implementing `IRegistryAdapter` using Harbor API v2 (`/api/v2.0/repositories`, `/api/v2.0/projects/{project}/repositories/{repository}/artifacts/{reference}/scan`); config via `REGISTRY_TYPE=harbor`, `HARBOR_URL`, `HARBOR_USERNAME`, `HARBOR_PASSWORD`; unit + e2e tests | `DONE` |
| FARM-T179 | Task | Harbor replication rules: `GET /api/registry/harbor/replications` listing active replication rules (source registry, destination registry, filter, trigger type, last execution status) via Harbor API v2 `/api/v2.0/replication/policies` | `DONE` |
| FARM-T180 | Task | Frontend: Harbor badge in the registry adapter selector; replication rules table in the Container Registry section showing source → destination with trigger type and last execution status badge | `DONE` |

---

## Phase 18: GitOps and Autoscaling `DONE`

### FARM-E61: Flux GitOps Integration `DONE`

> Surface Flux v2 GitOps resources (Kustomizations, HelmReleases, GitRepositories) inside Farm so Platform Engineers can answer reconciliation status, drift, and source provenance questions without leaving the portal. Each Flux resource can be bound to a catalog component for full traceability.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S248 | Story | Flux installation detection and Kustomization reconciliation status | `DONE` |
| FARM-S249 | Story | HelmRelease CRD visibility -- surface Flux-managed Helm releases with reconciliation state and last applied revision | `DONE` |
| FARM-S250 | Story | GitRepository and OCIRepository source tracking -- source URL, branch, last fetched commit, ready condition | `DONE` |
| FARM-S251 | Story | Frontend Flux dashboard -- reconciliation status board, drift alerts, FluxBinding to catalog components | `DONE` |

#### FARM-S248 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T181 | Task | Detect Flux v2 installation by querying `flux-system` namespace for controller deployments (source-controller, kustomize-controller, helm-controller, notification-controller); `GET /api/kubernetes/flux/status` returning installed controllers and versions | `DONE` |
| FARM-T182 | Task | List `Kustomization` CRDs (`kustomizations.kustomize.toolkit.fluxcd.io`): name, namespace, path, ready condition, last applied revision, suspend status; `GET /api/kubernetes/flux/kustomizations`; unit + e2e tests | `DONE` |

#### FARM-S249 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T183 | Task | List `HelmRelease` CRDs (`helmreleases.helm.toolkit.fluxcd.io`): name, namespace, chart name, chart version, ready condition, last applied revision; `GET /api/kubernetes/flux/helm-releases`; unit + e2e tests | `DONE` |
| FARM-T184 | Task | `FluxBinding` entity (`resourceKind`: kustomization/helmrelease, `resourceName`, `resourceNamespace`, `componentId` FK → Component); `POST/DELETE /api/kubernetes/flux/binding`; TypeORM migration; unit + e2e tests | `DONE` |

#### FARM-S250 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T185 | Task | List `GitRepository` and `OCIRepository` sources: URL, branch/tag, last fetched commit SHA, ready condition; `GET /api/kubernetes/flux/sources`; unit + e2e tests | `DONE` |
| FARM-T186 | Task | WebSocket event `flux:reconciliation-failed` emitted when a Kustomization or HelmRelease transitions to a failed ready condition; poll interval 60s via NestJS schedule cron | `DONE` |

#### FARM-S251 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T187 | Task | Flux dashboard page at `/gitops` listing all Kustomizations and HelmReleases with ready badge (ready / suspended / failed), last revision, namespace; `FilterTabs` for resource type | `DONE` |
| FARM-T188 | Task | Flux resource detail panel: source info (URL, branch, last commit), conditions list, events timeline, linked component chip | `DONE` |
| FARM-T189 | Task | "GitOps" section in Component detail overview tab when a `FluxBinding` exists: resource name, type badge, reconciliation status, last applied revision | `DONE` |

---

### FARM-E62: KEDA Autoscaling Visibility `DONE`

> Expose KEDA ScaledObjects and ScaledJobs inside Farm so Platform Engineers can understand what drives autoscaling decisions for each component -- scaler type, current metric value vs target, active/idle/fallback status -- and link each scaled workload to its catalog component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S252 | Story | ScaledObject and ScaledJob discovery with active scaler detection and ready condition | `DONE` |
| FARM-S253 | Story | Scaler detail -- source type (Kafka, SQS, Prometheus, Redis, BullMQ, etc.), current metric value, target, current vs min/max replicas | `DONE` |
| FARM-S254 | Story | Frontend KEDA dashboard and component integration | `DONE` |

#### FARM-S252 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T190 | Task | Detect KEDA installation via `keda-operator` deployment; list `ScaledObject` CRDs (`scaledobjects.keda.sh`): name, namespace, target deployment, min/max replicas, ready condition, active flag; `GET /api/kubernetes/keda/scaled-objects`; unit + e2e tests | `DONE` |
| FARM-T191 | Task | List `ScaledJob` CRDs (`scaledjobs.keda.sh`): name, namespace, job template ref, min/max replica count, ready condition; `GET /api/kubernetes/keda/scaled-jobs`; unit + e2e tests | `DONE` |

#### FARM-S253 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T192 | Task | For each ScaledObject, extract trigger list from spec: scaler type, metadata (Kafka topic + consumer group lag, SQS queue name + queueLength, Prometheus query + threshold, Redis list length); `GET /api/kubernetes/keda/scaled-objects/:namespace/:name/triggers` | `DONE` |
| FARM-T193 | Task | `KedaBinding` entity (`scaledObjectName`, `scaledObjectNamespace`, `componentId` FK → Component); `POST/DELETE /api/kubernetes/keda/binding`; TypeORM migration; unit + e2e tests | `DONE` |

#### FARM-S254 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T194 | Task | KEDA tab in Observability page: ScaledObjects list with active badge (active / idle / paused), min/max replicas chip, scaler type badge; `FilterTabs` for ScaledObject vs ScaledJob | `DONE` |
| FARM-T195 | Task | ScaledObject detail panel: trigger list with type badge and metadata key-value pairs | `DONE` |
| FARM-T196 | Task | "Autoscaling" section in Component detail overview tab when a `KedaBinding` exists: scaledObjectName, namespace, bound date | `DONE` |

---

## Phase 19: FinOps `DONE`

### FARM-E63: Infracost Pipeline Integration `DONE`

> Integrate Infracost into Farm pipelines to surface estimated infrastructure cost changes before they reach production. A new `InfracostExecutor` stage runs `infracost diff` as part of CI, stores the cost delta in the pipeline run, and alerts when a change exceeds a configurable budget threshold per component.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S255 | Story | Pipeline infrastructure for Infracost: `metadata` JSONB column on `PipelineRun`, `'infracost'` stage type added to `PipelineStage.type` union, `InfracostExecutor` wired in `PipelinesModule` | `DONE` |
| FARM-S293 | Story | `InfracostExecutor` implementation: binary availability check, spawn `infracost diff`, stream logs, parse JSON output, persist result to `run.metadata.infracost` | `DONE` |
| FARM-S294 | Story | Component cost estimate backend: `CostEstimate` entity, `FinOpsModule` with `FinOpsService.upsertCostEstimate()`, `GET /api/catalog/components/:id/cost-estimate` endpoint | `DONE` |
| FARM-S257 | Story | Infracost cost alerting backend: `costBudgetUsd` field on `Component`, `cost:budget-exceeded` WebSocket event, budget check in `InfracostExecutor` | `DONE` |
| FARM-S295 | Story | Infracost frontend integration: `getCostEstimate()` in `api-client.ts`, `CostEstimateCard` component, budget exceeded warning banner in Component detail | `DONE` |

#### FARM-S255 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T285 | Task | Add `metadata` JSONB nullable column to `PipelineRun` entity; generate TypeORM migration `AddPipelineRunMetadata` | `DONE` |
| FARM-T286 | Task | Add `'infracost'` to `PipelineStage.type` union; provide `InfracostExecutor` in `PipelinesModule` providers; add `else if (stage.type === 'infracost')` branch to `PipelineProcessor` | `DONE` |

##### FARM-T285 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST211 | Sub-task | Add `@Column({ type: 'simple-json', nullable: true }) metadata: Record<string, unknown> \| null` to `PipelineRun` entity | `DONE` |
| FARM-ST212 | Sub-task | Run `npm run migration:generate` to produce `AddPipelineRunMetadata` migration; verify generated up/down SQL | `DONE` |

##### FARM-T286 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST213 | Sub-task | Extend `PipelineStage.type` union in `pipeline.entity.ts` to include `'infracost'` | `DONE` |
| FARM-ST214 | Sub-task | Add `InfracostExecutor` to `PipelinesModule` `providers` array and inject into `PipelineProcessor` via `@Optional()` | `DONE` |
| FARM-ST215 | Sub-task | Add `else if (stage.type === 'infracost' && this.infracostExecutor)` branch to `PipelineProcessor` stage dispatch (after the existing `'build'` branch) | `DONE` |

#### FARM-S293 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T197 | Task | `InfracostExecutor.execute()`: check binary availability, spawn `infracost diff --path <terraformDir> --format json`, stream log lines via `emitLog`, parse stdout JSON, persist result to `run.metadata.infracost`; unit tests | `DONE` |
| FARM-T198 | Task | `InfracostStageConfig` interface (`terraformDir` default `'.'`, optional `costThreshold: number`); update `@ApiProperty` examples on `PipelineStage` to document `infracost` type | `DONE` |

##### FARM-T197 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST216 | Sub-task | Define `InfracostStageConfig` interface and `InfracostResult` interface (`totalMonthlyCost`, `diffMonthlyCost`, `currency`, `projects: InfracostProject[]`) | `DONE` |
| FARM-ST217 | Sub-task | Implement `isInfracostAvailable()` using `execFile('infracost', ['--version'])` — same pattern as `BuildStageExecutor.isEngineAvailable()` | `DONE` |
| FARM-ST218 | Sub-task | Spawn `infracost diff --path <terraformDir> --format json`; stream each stdout line via `emitLog` callback; collect full stdout for parsing | `DONE` |
| FARM-ST219 | Sub-task | Parse collected stdout JSON into `InfracostResult`; handle malformed output and non-zero exit code gracefully with a descriptive error message | `DONE` |
| FARM-ST220 | Sub-task | Persist parsed result to `run.metadata.infracost` via `PipelineRun` repository `save()`; return `{ success: true, output }` | `DONE` |
| FARM-ST221 | Sub-task | Unit tests: mock `execFile`, assert `InfracostResult` shape, verify metadata persistence, test graceful failure path when binary missing or JSON invalid | `DONE` |

#### FARM-S294 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T199 | Task | `CostEstimate` entity (`componentId` FK → Component, `estimatedMonthlyCost` decimal, `currency` default `'USD'`, `pipelineRunId` FK nullable, `breakdown` JSONB, `measuredAt`); TypeORM migration | `DONE` |
| FARM-T200 | Task | Create `FinOpsModule` with `FinOpsService`; implement `upsertCostEstimate(componentId, data)`; add `GET /api/catalog/components/:id/cost-estimate` to `CatalogController`; call `upsertCostEstimate` from `InfracostExecutor` on success; unit + e2e tests | `DONE` |

##### FARM-T199 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST222 | Sub-task | Define `CostEstimate` entity with UUID PK, `componentId` FK, `pipelineRunId` FK (nullable), `estimatedMonthlyCost` decimal, `currency` varchar, `breakdown` simple-json, and `measuredAt` timestamp | `DONE` |
| FARM-ST223 | Sub-task | Generate TypeORM migration `CreateCostEstimateTable`; verify up/down SQL | `DONE` |

##### FARM-T200 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST224 | Sub-task | Create `FinOpsModule` importing `TypeOrmModule.forFeature([CostEstimate, ActualCost])`; provide `FinOpsService`; register in `AppModule` | `DONE` |
| FARM-ST225 | Sub-task | Implement `FinOpsService.upsertCostEstimate(componentId, data)`: find-or-create `CostEstimate` by `componentId`, update fields, `save` | `DONE` |
| FARM-ST226 | Sub-task | Add `GET /api/catalog/components/:id/cost-estimate` endpoint to `CatalogController`; inject `FinOpsService` via constructor | `DONE` |
| FARM-ST227 | Sub-task | Call `FinOpsService.upsertCostEstimate()` from `InfracostExecutor.execute()` after a successful parse | `DONE` |
| FARM-ST228 | Sub-task | Unit tests for `FinOpsService.upsertCostEstimate()` (find-or-create path); e2e test asserting `GET /api/catalog/components/:id/cost-estimate` returns persisted data | `DONE` |

#### FARM-S257 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T201 | Task | `costBudgetUsd` nullable decimal column on `Component` entity; add optional `costBudgetUsd` to `UpdateComponentDto`; TypeORM migration (shared with FARM-T210) | `DONE` |
| FARM-T202 | Task | Add `COST_BUDGET_EXCEEDED` to `FarmEvent`, `CostBudgetExceededPayload` interface, and `emitCostBudgetExceeded()` to `EventsGateway`; implement budget check in `InfracostExecutor` post-parse; unit tests | `DONE` |

##### FARM-T201 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST229 | Sub-task | Add `@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) costBudgetUsd: number \| null` to `Component` entity | `DONE` |
| FARM-ST230 | Sub-task | Add optional `@IsOptional() @IsNumber() costBudgetUsd?: number` to `UpdateComponentDto` with `@ApiPropertyOptional` decorator | `DONE` |
| FARM-ST231 | Sub-task | Generate migration `AddCostBudgetUsdToComponent`; this single migration satisfies both FARM-T201 (Infracost) and FARM-T210 (OpenCost) | `DONE` |

##### FARM-T202 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST232 | Sub-task | Add `COST_BUDGET_EXCEEDED = 'cost:budget-exceeded'` to `FarmEvent` enum in `events.interfaces.ts` | `DONE` |
| FARM-ST233 | Sub-task | Define `CostBudgetExceededPayload` interface (`componentId`, `delta`, `pipelineRunId`, `timestamp`) in `events.interfaces.ts` | `DONE` |
| FARM-ST234 | Sub-task | Add `emitCostBudgetExceeded(payload: CostBudgetExceededPayload)` method to `EventsGateway` | `DONE` |
| FARM-ST235 | Sub-task | In `InfracostExecutor.execute()` post-parse: load `component.costBudgetUsd` from `ComponentRepository`; call `eventsGateway.emitCostBudgetExceeded()` when `diffMonthlyCost > costBudgetUsd` | `DONE` |
| FARM-ST236 | Sub-task | Unit tests: verify event emitted when delta exceeds threshold; verify no event when under threshold or `costBudgetUsd` is null | `DONE` |

#### FARM-S295 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T203 | Task | Add `getCostEstimate()` to `api-client.ts`; `CostEstimateCard` component (monthly cost chip, green/red delta badge, timestamp); dismissible budget exceeded warning banner; integration in Component detail overview tab; unit tests | `DONE` |

##### FARM-T203 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST237 | Sub-task | Add `getCostEstimate(componentId: string): Promise<CostEstimate>` to `api-client.ts`; unit test with mocked fetch | `DONE` |
| FARM-ST238 | Sub-task | `CostEstimateCard` component: estimated monthly cost chip, green/red `diffMonthlyCost` delta badge, `measuredAt` relative timestamp | `DONE` |
| FARM-ST239 | Sub-task | Budget exceeded warning banner: rendered when `diffMonthlyCost > costBudgetUsd`; dismissible with local state | `DONE` |
| FARM-ST240 | Sub-task | Integrate `CostEstimateCard` and optional warning banner into Component detail overview tab; unit tests for both components | `DONE` |

---

### FARM-E64: OpenCost Component Cost Visibility `DONE`

> Query OpenCost's allocation API to surface real Kubernetes compute costs per component, team, and namespace. Platform Engineers can set monthly budgets per component, receive alerts when actual spend exceeds them, and explore costs across the platform from a dedicated FinOps dashboard.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S258 | Story | FinOps module bootstrap and OpenCost adapter: `CostController` at `/api/cost`, `OPENCOST_URL` config, `OpenCostService`, `GET /api/cost/components/:id/actual` endpoint | `DONE` |
| FARM-S296 | Story | ActualCost sync backend: `ActualCost` entity, BullMQ daily sync job for all components with active deployments, `GET /api/cost/components/:id/history` endpoint | `DONE` |
| FARM-S297 | Story | Cost summary API endpoints: `GET /api/cost/teams/:id/summary` and `GET /api/cost/summary?limit=N` | `DONE` |
| FARM-S260 | Story | Cost dashboard frontend: `/cost` page with "By Component" sortable table (sparkline, budget bar) and "By Team" cost cards; sidebar nav entry | `DONE` |
| FARM-S261 | Story | Actual cost alerting backend: post-sync budget check, `cost:actual-budget-exceeded` WebSocket event, alerting record creation | `DONE` |
| FARM-S298 | Story | Actual cost alerting frontend: `CostBudgetBar` component, red border on component card when budget exceeded, notification panel entry | `DONE` |

#### FARM-S258 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T287 | Task | Add `CostController` class with `@Controller('cost')` to `FinOpsModule`; add `OPENCOST_URL` to Joi config schema (default `http://localhost:9090`) | `DONE` |
| FARM-T204 | Task | `OpenCostService.getAllocation(labelSelector, window)` using `globalThis.fetch`; unit tests with capture-and-restore mock pattern | `DONE` |
| FARM-T205 | Task | `GET /api/cost/components/:id/actual` returning 7d and 30d cost breakdown (`cpuCost`, `memoryCost`, `pvCost`, `networkCost`, `totalCost`); e2e tests | `DONE` |

##### FARM-T287 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST241 | Sub-task | Create `CostController` with `@Controller('cost')` and `@UseGuards(JwtAuthGuard)`; add to `FinOpsModule` controllers array | `DONE` |
| FARM-ST242 | Sub-task | Add `OPENCOST_URL: Joi.string().uri().default('http://localhost:9090')` to config validation schema in `src/config/configuration.ts` | `DONE` |

##### FARM-T204 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST243 | Sub-task | Define `OpenCostAllocation` TypeScript interface (`cpuCost`, `memoryCost`, `pvCost`, `networkCost`, `totalCost`, `currency`) | `DONE` |
| FARM-ST244 | Sub-task | Implement `getAllocation(labelSelector, window)` building URL `/model/allocation?window=<window>&aggregate=label:app&filterLabels=app:<labelSelector>`; parse and return typed response | `DONE` |
| FARM-ST245 | Sub-task | Unit tests: use capture-and-restore `globalThis.fetch` pattern; assert allocation parsing; test HTTP error and empty-response handling | `DONE` |

##### FARM-T205 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST246 | Sub-task | Implement endpoint: look up `Component.name` by id, call `OpenCostService.getAllocation` for `7d` and `30d` windows, return combined DTO | `DONE` |
| FARM-ST247 | Sub-task | E2e tests with mocked `OpenCostService`; assert both `sevenDay` and `thirtyDay` fields present in response | `DONE` |

#### FARM-S296 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T206 | Task | `ActualCost` entity (`componentId` FK, `window` varchar, cost decimal fields, `currency`, `syncedAt`); BullMQ daily sync job refreshing all components with an active deployment; TypeORM migration | `DONE` |
| FARM-T207 | Task | `GET /api/cost/components/:id/history` returning last 30 `ActualCost` records ordered by `syncedAt` DESC for sparkline rendering; unit + e2e tests | `DONE` |

##### FARM-T206 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST248 | Sub-task | Define `ActualCost` entity with UUID PK, `componentId` FK, `window` varchar, decimal cost columns, `currency` varchar, `syncedAt` timestamp | `DONE` |
| FARM-ST249 | Sub-task | Generate TypeORM migration `CreateActualCostTable`; verify up/down SQL | `DONE` |
| FARM-ST250 | Sub-task | Implement `ActualCostSyncProcessor` BullMQ job: query all `Component` IDs with at least one active `Deployment`, call `OpenCostService.getAllocation('30d')` per component, upsert `ActualCost` record | `DONE` |
| FARM-ST251 | Sub-task | Register BullMQ CRON schedule in `FinOpsModule` (configurable via `COST_SYNC_CRON` env var, default `0 3 * * *`) | `DONE` |

##### FARM-T207 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST252 | Sub-task | Implement `GET /api/cost/components/:id/history` in `CostController`: query `ActualCost` by `componentId` ordered by `syncedAt` DESC, limit 30 | `DONE` |
| FARM-ST253 | Sub-task | Unit test for repository query ordering; e2e test asserting response array shape | `DONE` |

#### FARM-S297 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T208 | Task | `GET /api/cost/teams/:id/summary` aggregating latest `ActualCost` for all team components; `GET /api/cost/summary?limit=N` (default 10) returning top-N most expensive components platform-wide; unit + e2e tests | `DONE` |

##### FARM-T208 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST254 | Sub-task | Implement `GET /api/cost/teams/:id/summary`: load team's components, join with latest `ActualCost` per component, return `{ teamId, totalCost, currency, components[] }` | `DONE` |
| FARM-ST255 | Sub-task | Implement `GET /api/cost/summary?limit=N`: join latest `ActualCost` rows with `Component`, order by `totalCost` DESC, limit N | `DONE` |
| FARM-ST256 | Sub-task | Unit tests for aggregation queries; e2e tests for both endpoints asserting response shape | `DONE` |

#### FARM-S260 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T209 | Task | `/cost` page with `FilterTabs` ("By Component" / "By Team"); "By Component" sortable table with monthly cost, 30d sparkline, budget usage bar; "By Team" team cost cards; add cost methods to `api-client.ts`; sidebar nav entry; unit tests | `DONE` |

##### FARM-T209 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST257 | Sub-task | Add `/cost` route under protected layout; add "Cost" link to sidebar nav | `DONE` |
| FARM-ST258 | Sub-task | Add `getPlatformCostSummary(limit?)`, `getTeamCostSummary(teamId)`, `getComponentCostHistory(componentId)` to `api-client.ts`; unit tests | `DONE` |
| FARM-ST259 | Sub-task | "By Component" tab: sortable table (name, monthly cost, 30d sparkline column, budget usage progress bar) using `getPlatformCostSummary` and `getComponentCostHistory` | `DONE` |
| FARM-ST260 | Sub-task | "By Team" tab: team cost cards with total monthly cost and top-3 most expensive components list, using `getTeamCostSummary` | `DONE` |
| FARM-ST261 | Sub-task | Unit tests for `/cost` page, `FilterTabs` switching, and "By Component" table column sorting | `DONE` |

#### FARM-S261 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T210 | Task | `costBudgetUsd` on `Component` — shared migration with FARM-T201/ST231; no new migration required if FARM-S257 was implemented first | `DONE` |
| FARM-T211 | Task | Add `COST_ACTUAL_BUDGET_EXCEEDED` to `FarmEvent`, `CostActualBudgetExceededPayload` interface, and `emitCostActualBudgetExceeded()` to `EventsGateway`; post-sync budget check in `ActualCostSyncProcessor`; create alerting record; unit tests | `DONE` |

##### FARM-T211 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST262 | Sub-task | Add `COST_ACTUAL_BUDGET_EXCEEDED = 'cost:actual-budget-exceeded'` to `FarmEvent` enum | `DONE` |
| FARM-ST263 | Sub-task | Define `CostActualBudgetExceededPayload` interface (`componentId`, `totalCost`, `budgetUsd`, `timestamp`); add `emitCostActualBudgetExceeded()` to `EventsGateway` | `DONE` |
| FARM-ST264 | Sub-task | After each `ActualCost` upsert in `ActualCostSyncProcessor`: compare 30d `totalCost` vs `component.costBudgetUsd`; emit event and call `AlertingService.createAlert()` if exceeded | `DONE` |
| FARM-ST265 | Sub-task | Unit tests: verify event emitted on breach; verify alerting record created; verify no event when under threshold or `costBudgetUsd` is null | `DONE` |

#### FARM-S298 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T212 | Task | `CostBudgetBar` component (text label + percentage fill bar with color transitions); conditional red border on component detail card when budget exceeded; notification panel entry for `cost:actual-budget-exceeded`; unit tests | `DONE` |

##### FARM-T212 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST266 | Sub-task | `CostBudgetBar` component: `$X of $Y monthly budget used` label, percentage fill bar with green → yellow → red color transition at 75% and 100% thresholds | `DONE` |
| FARM-ST267 | Sub-task | Conditional red border and warning icon on component detail card header when 30d `totalCost > costBudgetUsd` | `DONE` |
| FARM-ST268 | Sub-task | Subscribe to `cost:actual-budget-exceeded` WebSocket event in notification panel; render entry with component name, overage amount, and timestamp | `DONE` |
| FARM-ST269 | Sub-task | Unit tests for `CostBudgetBar` (percentage calculation, color thresholds), red border condition logic, and notification panel entry render | `DONE` |

---

## Phase 20: Service Mesh Expansion `DONE`

### FARM-E65: Linkerd Integration `DONE`

> Mirror the existing Istio integration for Linkerd 2.x. Surface Linkerd control plane health, traffic metrics (RPS / error rate / latency) from Prometheus using Linkerd labels, mTLS auto-rotation status, authorization policies (`policy.linkerd.io`), and Service Profiles (per-route retry and timeout config). Three new tabs in the Component detail page mirror the Istio Traffic, Security, and Canary tabs.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S262 | Story | Linkerd control plane detection and health -- identify installed components (controller, identity, proxy-injector, destination) in the `linkerd` namespace | `DONE` |
| FARM-S263 | Story | Traffic metrics -- RPS, error rate, and P50/P95/P99 latency per component from Prometheus using Linkerd metric labels; topology edges from `request_total{dst_deployment!=""}` | `DONE` |
| FARM-S264 | Story | mTLS, authorization policies, and Service Profiles -- `ServerAuthorization`, `AuthorizationPolicy` CRDs from `policy.linkerd.io`; `ServiceProfile` CRDs with per-route retry and timeout config | `DONE` |
| FARM-S265 | Story | Frontend Linkerd tabs in Component detail -- LinkerdTrafficTab, LinkerdSecurityTab, LinkerdServiceProfileTab; tabs visible only when Linkerd is detected | `DONE` |

#### FARM-S262 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T213 | Task | `LinkerdService.isLinkerdEnabled()`: query `linkerd` namespace for control plane deployments (linkerd-controller, linkerd-identity, linkerd-proxy-injector, linkerd-destination); graceful `false` when namespace absent or CRDs not installed | `DONE` |
| FARM-T214 | Task | `LinkerdModule` with `LinkerdService`, `LinkerdMetricsService`, and `LinkerdController`; register in `app.module.ts`; `GET /api/linkerd/status` returning `{ installed, components: [{ name, ready, version }] }`; unit tests | `DONE` |

#### FARM-S263 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T215 | Task | `LinkerdMetricsService`: query Prometheus `request_total{deployment=X,namespace=Y,direction="inbound"}` for RPS and error rate; `response_latency_ms_bucket` for P50/P95/P99; reuse `KubernetesService.queryPrometheus()` | `DONE` |
| FARM-T216 | Task | `GET /api/linkerd/components/:namespace/:name/metrics/rps`, `/error-rate`, `/latency`; `GET /api/linkerd/topology` building edges from `request_total` with `dst_deployment` label; same `IstioTopologyEdge` interface shape; unit + e2e tests | `DONE` |

#### FARM-S264 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T217 | Task | List `ServerAuthorization` (`serverauthorizations.policy.linkerd.io/v1beta1`) and `AuthorizationPolicy` (`authorizationpolicies.policy.linkerd.io/v1alpha1`) CRDs per namespace via `CustomObjectsApi`; `GET /api/linkerd/authorization-policies`; unit + e2e tests | `DONE` |
| FARM-T218 | Task | List `ServiceProfile` CRDs (`serviceprofiles.linkerd.io/v1alpha2`): name, namespace, routes array (name, condition path/method, isRetryable, timeout, retryBudget); `GET /api/linkerd/service-profiles`; unit + e2e tests | `DONE` |

#### FARM-S265 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T219 | Task | Frontend `LinkerdTrafficTab`: RPS line chart, error rate gauge, latency P50/P95/P99 table -- reuse `PromQLChartCard` and `MiniLineChart` shared components from `IstioTrafficTab` | `DONE` |
| FARM-T220 | Task | Frontend `LinkerdSecurityTab`: mTLS status badge per namespace (auto-mTLS always-on indicator), `ServerAuthorization` and `AuthorizationPolicy` table with allowed/denied routes -- mirror `IstioSecurityTab` layout | `DONE` |
| FARM-T221 | Task | Frontend `LinkerdServiceProfileTab`: `ServiceProfile` list with per-route table (path, method, retryable badge, timeout chip) and per-route RPS/error-rate fetched from metrics endpoint | `DONE` |
| FARM-T222 | Task | Add `linkerd-traffic`, `linkerd-security`, `linkerd-profile` tabs to `ComponentDetailClient.tsx`; fetch Linkerd status on mount and render tabs only when `status.installed === true`; tests for all three tab components | `DONE` |

---

## Phase 21: Policy Engine Expansion `TODO`

### FARM-E66: OPA and Gatekeeper Integration `TODO`

Extend the existing Kyverno policy support to cover Open Policy Agent (OPA) running standalone
and OPA Gatekeeper (the Kubernetes admission controller built on OPA). Farm reads
`ConstraintTemplate` and `Constraint` CRDs from Gatekeeper and, for standalone OPA, queries
the REST API to evaluate Rego policies and surface violation results alongside Kyverno reports.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S266 | Story | OPA Gatekeeper CRD ingestion -- list `ConstraintTemplate` (templates.gatekeeper.sh/v1) and `Constraint` resources (all CRDs in the `constraints.gatekeeper.sh` group) per namespace; detect Gatekeeper presence via `gatekeeper-system` namespace | `TODO` |
| FARM-S267 | Story | Gatekeeper violation reporting -- aggregate audit results from `Constraint.status.violations`; map to the same `PolicyViolation` interface already used by Kyverno so the frontend reuses `ViolationsTab` | `TODO` |
| FARM-S268 | Story | Standalone OPA integration -- configure OPA REST API base URL (`OPA_URL` env var); `POST /v1/data/{policy_path}` to evaluate named Rego policies with a component metadata input document; store and display pass/fail results per component | `TODO` |
| FARM-S269 | Story | Frontend OPA/Gatekeeper tabs -- extend `ViolationsTab` with a source selector (Kyverno / Gatekeeper / OPA); `ConstraintTemplateTable` listing template name, CRD group, enforcement action; `OpaEvaluationPanel` for on-demand policy evaluation with JSON input editor | `TODO` |

#### FARM-S266 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T223 | Task | `GatekeeperService.isGatekeeperEnabled()`: check for `gatekeeper-system` namespace and `constrainttemplates.templates.gatekeeper.sh` CRD; graceful `false` when absent | `TODO` |
| FARM-T224 | Task | `GatekeeperService.listConstraintTemplates()`: list `ConstraintTemplate` resources via `CustomObjectsApi`; return name, CRD group, enforcement action, description; `GET /api/gatekeeper/constraint-templates`; unit + e2e tests | `TODO` |
| FARM-T225 | Task | `GatekeeperService.listConstraints(namespace)`: dynamically discover all Constraint CRDs from the `constraints.gatekeeper.sh` group and list instances; `GET /api/gatekeeper/constraints`; unit + e2e tests | `TODO` |

#### FARM-S267 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T226 | Task | `GatekeeperService.listViolations(namespace)`: aggregate `status.violations[]` from all Constraint instances; map to `PolicyViolation { kind, name, namespace, message, constraint, enforcementAction }`; `GET /api/gatekeeper/violations`; unit + e2e tests | `TODO` |
| FARM-T227 | Task | Extend `KubernetesPolicyReportService` (or create `PolicyAggregatorService`) to merge Kyverno and Gatekeeper violations into a unified list; `GET /api/kubernetes/policy-violations?source=kyverno|gatekeeper|all`; unit tests | `TODO` |

#### FARM-S268 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T228 | Task | `OpaService`: configure `OPA_URL` env var (default `http://localhost:8181`); `evaluate(policyPath, input)` sends `POST /v1/data/{policyPath}` with component metadata as input document; map result to `OpaResult { allowed, violations: string[] }`; unit tests with fetch mock | `TODO` |
| FARM-T229 | Task | `OpaModule` with `OpaService` and `OpaController`; register in `app.module.ts`; `GET /api/opa/status` (ping OPA health endpoint); `POST /api/opa/evaluate` accepting `{ policyPath, input }` body; unit + e2e tests | `TODO` |
| FARM-T230 | Task | Persist OPA evaluation results per component: `OpaResult` entity with `componentId`, `policyPath`, `allowed`, `violations`, `evaluatedAt`; migration; `GET /api/catalog/components/:id/opa-results`; unit tests | `TODO` |

#### FARM-S269 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T231 | Task | Extend `ViolationsTab` with a `source` toggle (All / Kyverno / Gatekeeper); `ConstraintTemplateTable` component listing template name, CRD group, enforcement action badge; visible only when Gatekeeper is detected | `TODO` |
| FARM-T232 | Task | `OpaEvaluationPanel` component: policy path input, JSON input editor (textarea with syntax hint), evaluate button calling `POST /api/opa/evaluate`, result badge (allowed/denied) and violations list; visible only when OPA is reachable | `TODO` |
| FARM-T233 | Task | Add `gatekeeper` and `opa` tabs to `ComponentDetailClient.tsx`; fetch `isGatekeeperEnabled` and OPA status on mount; render tabs conditionally; tests for both new tab components | `TODO` |

---

## Phase 22: CI/CD Hardening `DONE`

### FARM-E67: CI Pipeline Hardening `DONE`

Hardens the GitHub Actions CI pipeline with three gaps identified in the current setup: the API TypeScript build is never validated in the normal CI flow; database migrations are never exercised against a real PostgreSQL instance (e2e tests use SQLite with `synchronize: true`); and Playwright E2E tests only run on Chromium.

| ID | Type | Description | Status |
|----|------|-------------|--------|
| FARM-S270 | Story | API build validation in `ci.yml` -- add a `npm run build -w apps/api` step to the `api` job so every PR verifies the TypeScript compiles to `dist/` cleanly | `DONE` |
| FARM-S271 | Story | Migration integrity job -- new `migrations` job in `ci.yml` with a PostgreSQL 16 service container; runs `npm run migration:run -w apps/api` against a real database to catch constraint errors, type mismatches, and dialect incompatibilities invisible to SQLite | `DONE` |
| FARM-S272 | Story | Playwright cross-browser support -- extend `web-ci.yml` and `playwright.config.ts` to run E2E tests on Chromium, Firefox, and WebKit; upload per-browser artifacts on failure | `DONE` |

#### FARM-E67 Tasks

| ID | Type | Description | Status |
|----|------|-------------|--------|
| FARM-T234 | Task | Add `- name: Build API` step (`run: npm run build -w apps/api`) to the `api` job in `ci.yml`, after the E2E tests step and before the Codecov upload; no additional secrets or services required | `DONE` |
| FARM-T235 | Task | Add `migrations` job to `ci.yml`: PostgreSQL 16-alpine service container with health check; steps: checkout, Node 20, `npm ci`, `npm run build -w apps/api`, `npm run migration:run -w apps/api`; env vars use the same dummy credentials already used in `dast.yml` (`DATABASE_SYNC: "false"`); job runs in parallel with `api` and `lighthouse` | `DONE` |
| FARM-T236 | Task | Add Firefox and WebKit projects to `apps/web/playwright.config.ts`; update `web-ci.yml` `e2e` job to install all browsers (`npx playwright install --with-deps`) and run tests without `--project=chromium` filter; upload separate artifacts per browser on failure | `DONE` |

---

## Phase 23: IaC Platform `TODO`

### FARM-E68: Terraform/OpenTofu Module Registry `TODO`

> A built-in registry of Terraform and OpenTofu modules that teams can browse, version, and consume directly from Farm. Modules are synced from Git repositories and validated on import.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S273 | Story | `IacModule` entity and CRUD API (name, provider: terraform/opentofu, source repository URL, current version, variables JSONB schema, outputs JSONB) | `TODO` |
| FARM-S274 | Story | Module sync job -- clone module repo, parse `variables.tf` and `outputs.tf` into structured metadata, detect semver tags as versions | `TODO` |
| FARM-S275 | Story | Module validation pipeline -- run `terraform validate` or `tofu validate` on import, store validation status and diagnostics | `TODO` |
| FARM-S276 | Story | Frontend: module registry browser with search, version selector, variable documentation table, and usage snippet generator | `TODO` |
| FARM-S286 | Story | IaC scaffold wizard -- select a module from the registry, fill variables via guided form, generate ready-to-use `terragrunt.hcl` (or `main.tf`) with rendered README and usage examples | `TODO` |

#### FARM-S273 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T237 | Task | Create `IacModule` entity with `IacProvider` enum (`terraform`, `opentofu`); `IacModuleModule` with full CRUD service and controller; migration | `TODO` |
| FARM-T238 | Task | `IacModuleVersion` entity (moduleId, version semver, commitSha, validationStatus, variablesMeta JSONB, outputsMeta JSONB, createdAt) | `TODO` |

#### FARM-S274 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T239 | Task | `ModuleSyncJob` BullMQ processor: shallow clone module repo, list semver tags via `git tag -l 'v*'`, parse HCL files per tag | `TODO` |
| FARM-T240 | Task | HCL variable parser: extract name, type, description, default, and validation rules from `variables.tf`; same for `outputs.tf` | `TODO` |

#### FARM-S275 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T241 | Task | `ModuleValidationJob`: run `terraform init -backend=false && terraform validate` (or `tofu`) in a temp directory; capture JSON diagnostics | `TODO` |
| FARM-T242 | Task | Store validation result on `IacModuleVersion` (status: valid/invalid/pending, diagnostics JSON array); expose via `GET /iac-modules/:id/versions/:version/validation` | `TODO` |

#### FARM-S286 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T262 | Task | `POST /iac-modules/:id/scaffold` endpoint: accept version and variable values, render `terragrunt.hcl` (or `main.tf`) from Handlebars template with module source, version pin, and variable assignments | `TODO` |
| FARM-T263 | Task | Scaffold templates: built-in Handlebars templates for Terragrunt (`terragrunt.hcl` with `terraform.source`, `inputs`) and plain Terraform (`main.tf` with `module` block); allow custom templates per module | `TODO` |
| FARM-T264 | Task | Frontend: scaffold wizard -- step 1: pick module + version; step 2: fill required/optional variables with type-aware inputs (string, number, bool, list, map); step 3: preview and download generated file | `TODO` |

---

### FARM-E69: Terragrunt Orchestration `TODO`

> Manage Terragrunt-based infrastructure repositories with a structured account/region/environment layout. Farm provides plan/apply workflows with approval gates, drift detection, and state visualization.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S277 | Story | `IacStack` entity (name, repositoryUrl, basePath, provider, workspaceId) representing a Terragrunt project root; CRUD API | `TODO` |
| FARM-S278 | Story | Plan/Apply workflow -- BullMQ jobs execute `terragrunt plan` and `terragrunt apply` with real-time log streaming via WebSocket | `TODO` |
| FARM-S279 | Story | Drift detection CRON job -- scheduled `terragrunt plan` against each active stack, flag drifted resources, notify via WebSocket | `TODO` |
| FARM-S280 | Story | Approval gate for apply -- plan output stored as artifact, admin approves/rejects before apply executes | `TODO` |
| FARM-S281 | Story | Frontend: stack list, plan diff viewer with resource-level add/change/destroy summary, apply progress with real-time logs | `TODO` |
| FARM-S285 | Story | IaC monorepo support -- auto-discover stacks within a single repo, change detection per stack path, batch plan/apply with dependency ordering | `TODO` |

#### FARM-S277 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T243 | Task | Create `IacStack` entity with relationship to workspace; fields include `parentStackId` (nullable self-ref for monorepo grouping) and `basePath` for subdir targeting; `IacStackModule` CRUD API; migration | `TODO` |
| FARM-T244 | Task | `IacRun` entity (stackId, type: plan/apply, status: queued/running/succeeded/failed/awaiting_approval, planOutput text, triggeredBy userId, approvedBy userId) | `TODO` |

#### FARM-S278 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T245 | Task | `IacPlanJob` BullMQ processor: clone repo, `cd basePath`, run `terragrunt plan -out=plan.tfplan -json`, stream logs via WebSocket `iac:log` event | `TODO` |
| FARM-T246 | Task | `IacApplyJob` BullMQ processor: run `terragrunt apply plan.tfplan -json` after approval; update `IacRun` status; emit `iac:apply-complete` event | `TODO` |
| FARM-T247 | Task | Parse plan JSON output to extract resource changes summary: `{ add: N, change: N, destroy: N, resources: [{ address, action, type }] }` | `TODO` |

#### FARM-S279 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T248 | Task | `DriftDetectionJob` BullMQ CRON (configurable, default daily 03:00 UTC): run `terragrunt plan -detailed-exitcode` per stack; exit code 2 = drift | `TODO` |
| FARM-T249 | Task | `IacDriftRecord` entity (stackId, runId, driftedResources JSONB, detectedAt); `GET /iac-stacks/:id/drift` returns latest drift status | `TODO` |

#### FARM-S280 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T250 | Task | `POST /iac-runs/:id/approve` and `/reject` -- require workspace admin role; on approve, enqueue `IacApplyJob` | `TODO` |
| FARM-T251 | Task | Plan artifact storage: save `plan.tfplan` and parsed JSON summary to disk (configurable `IAC_ARTIFACTS_PATH`); link from `IacRun` record | `TODO` |

#### FARM-S285 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T257 | Task | `StackDiscoveryService`: scan repo for `terragrunt.hcl` files recursively, create one `IacStack` per directory with `parentStackId` linking to the root stack | `TODO` |
| FARM-T258 | Task | Change detection: on plan trigger, `git diff` against last successful run commit to identify changed paths; only plan stacks whose `basePath` overlaps with changed files | `TODO` |
| FARM-T259 | Task | Dependency ordering: parse Terragrunt `dependency` blocks to build a DAG; plan/apply stacks in topological order; fail-fast if a dependency fails | `TODO` |
| FARM-T260 | Task | `POST /iac-stacks/:id/discover` endpoint triggers async discovery job; `GET /iac-stacks/:id/children` returns child stacks; batch `POST /iac-stacks/:id/plan-all` plans changed stacks only | `TODO` |
| FARM-T261 | Task | Frontend: monorepo tree view showing account/region/env hierarchy, per-stack status badges, batch plan/apply controls with aggregated progress | `TODO` |

> Visualize Terraform/OpenTofu state files, show resource graphs, and integrate with Infracost for pre-apply cost estimation on plan output.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S282 | Story | State file reader -- parse `terraform.tfstate` (local or S3/GCS remote backend) and display resource inventory with attributes | `TODO` |
| FARM-S283 | Story | Resource dependency graph -- extract `depends_on` and implicit references from state, render as interactive D3 graph | `TODO` |
| FARM-S284 | Story | Infracost integration -- run `infracost diff --plan-json` on plan output, display cost delta (monthly before/after) in plan review UI | `TODO` |

#### FARM-S282 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T252 | Task | `StateReaderService`: fetch state from local file, S3, or GCS based on stack backend config; parse JSON into typed `TerraformState` interface | `TODO` |
| FARM-T253 | Task | `GET /iac-stacks/:id/state` returns parsed state with resource list, provider info, and serial number; `GET /iac-stacks/:id/state/resources` returns flat resource inventory | `TODO` |

#### FARM-S283 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T254 | Task | Build adjacency graph from state `depends_on` fields and implicit resource references; expose via `GET /iac-stacks/:id/state/graph` | `TODO` |

#### FARM-S284 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T255 | Task | `InfracostService`: run `infracost diff --path plan.json --format json`, parse output into `{ totalMonthlyCost, diffMonthlyCost, resources[] }` | `TODO` |
| FARM-T256 | Task | Display cost estimate card in plan review UI; warn when monthly cost increase exceeds configurable threshold (`IAC_COST_WARN_THRESHOLD`, default $100) | `TODO` |

---

## Phase 24: User Profile Management `DONE`

### FARM-E70: User Profile Management `DONE`

> Allow authenticated users to view and update their own profile from the frontend. Adds `firstName`, `lastName`, and `gender` columns to the `User` entity, exposes a `GET /api/auth/profile` and `PATCH /api/auth/profile` endpoint for general fields, a separate `PATCH /api/auth/profile/password` endpoint for password changes (requiring current password confirmation), and a dedicated frontend profile page accessible from the user menu inside the protected area.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S289 | Story | Backend -- extend User entity with `firstName`, `lastName`, and `gender` fields; add profile endpoints | `DONE` |
| FARM-S290 | Story | Backend -- password change endpoint with current password verification | `DONE` |
| FARM-S291 | Story | Frontend -- profile page with editable fields (first name, last name, gender, email) | `DONE` |
| FARM-S292 | Story | Frontend -- password change form with current password confirmation and validation feedback | `DONE` |

#### FARM-S289 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T271 | Task | Add `firstName` (`varchar`, nullable), `lastName` (`varchar`, nullable), and `gender` (`enum: male, female, non_binary`, nullable) columns to `User` entity; create TypeORM migration | `DONE` |
| FARM-T272 | Task | Create `UpdateProfileDto` with `@IsOptional()` fields: `firstName`, `lastName`, `gender` (`@IsEnum(Gender)`), `email` (`@IsEmail()`); apply `whitelist: true` so `password` and `roles` cannot be set through this DTO | `DONE` |
| FARM-T273 | Task | `GET /api/auth/profile` returns the authenticated user's own profile (exclude `password`, `refreshToken`); unit + e2e tests | `DONE` |
| FARM-T274 | Task | `PATCH /api/auth/profile` updates `firstName`, `lastName`, `gender`, and `email` for the authenticated user; validate unique email constraint; unit + e2e tests | `DONE` |

#### FARM-S290 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T275 | Task | Create `ChangePasswordDto` with `currentPassword`, `newPassword` (`@MinLength(8)`), and `confirmPassword`; add custom validator ensuring `newPassword === confirmPassword` | `DONE` |
| FARM-T276 | Task | `PATCH /api/auth/profile/password` verifies `currentPassword` against stored hash with bcrypt, hashes and persists `newPassword`, invalidates existing refresh tokens; unit + e2e tests | `DONE` |

#### FARM-S291 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T277 | Task | Add `/profile` route inside the protected layout; add "Profile" link to user dropdown menu in the app shell | `DONE` |
| FARM-T278 | Task | `ProfileForm` component: editable fields for first name, last name, email, and gender (`Select` with options Male, Female, Non-Binary); pre-populated from `GET /api/auth/profile`; submit via `PATCH /api/auth/profile`; display success/error toast | `DONE` |
| FARM-T279 | Task | `ProfileForm` unit tests: render with pre-filled data, submit updated values, display validation errors, handle API failure | `DONE` |
| FARM-T280 | Task | Add `profile` methods (`getProfile`, `updateProfile`) to `api-client.ts`; unit tests | `DONE` |

#### FARM-S292 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T281 | Task | `ChangePasswordForm` component: current password, new password, confirm password fields with client-side validation (min 8 chars, match confirmation); submit via `PATCH /api/auth/profile/password`; display success/error toast | `DONE` |
| FARM-T282 | Task | `ChangePasswordForm` unit tests: submit valid change, display mismatch error, display wrong current password API error, enforce minimum length | `DONE` |
| FARM-T283 | Task | Add `changePassword` method to `api-client.ts`; unit tests | `DONE` |
| FARM-T284 | Task | Playwright E2E: navigate to profile page, update name and gender, verify persistence after reload; change password, log out, log in with new password | `DONE` |

---

## Phase 25: Feature Availability UX `DONE`

### FARM-E71: Feature Availability and Configuration UX `DONE`

> Farm is a modular platform — features like Kubernetes, FinOps, Service Mesh, and Registry integration require external services to be configured before they surface meaningful data. Currently, sidebar navigation items for unconfigured features are always visible, leading to empty pages with no guidance. This Epic introduces a consistent "not configured" UX pattern: top-level pages for optional features detect availability on mount and render an informative setup screen (with documentation links and required environment variables) instead of an empty state. Component-detail tabs that already gate on `installed: true` are not affected.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S299 | Story | Backend availability endpoints: each optional module exposes `GET /api/<module>/available` returning `{ available: boolean, reason?: string }` | `DONE` |
| FARM-S300 | Story | Frontend `FeatureUnavailablePage` component and `useFeatureAvailability` hook; integrate into all optional top-level pages | `DONE` |
| FARM-S301 | Story | Sidebar nav enhancements: show a subtle "not configured" badge on nav items whose feature is unavailable; clicking still navigates (shows the setup screen) | `DONE` |
| FARM-S302 | Story | Plugin Marketplace view toggle: add a grid/list toggle to the Plugin Marketplace toolbar so users can switch between the current card grid and a compact table list view; persist preference in `localStorage` | `DONE` |
| FARM-S303 | Story | Integration Settings brand icons: replace the placeholder emoji icons on the ArgoCD, CircleCI, Jenkins, and Travis CI cards with the official SVG brand logos using `simple-icons` | `DONE` |
| FARM-S304 | Story | New CI/CD integrations: add GitHub Actions (PAT + repository webhook) and Azure DevOps (Personal Access Token + organization URL) as first-class integration types with dedicated connect forms, credential storage, pipeline status endpoints, and frontend cards | `DONE` |
| FARM-S305 | Story | Sidebar navigation reorganization: group the 25 flat nav items into labeled sections (Operations, Observability, Infrastructure, Self-Service, Organization, Settings) to reduce cognitive load and improve discoverability | `DONE` |
| FARM-S306 | Story | Global quick search (Cmd+K): keyboard-activated modal that searches across catalog components, teams, documentation, environments, and pipelines by name; grouped results with keyboard navigation | `DONE` |
| FARM-S307 | Story | Admin setup checklist: dismissible "Getting Started" card on the Dashboard guiding workspace admins through initial configuration steps (Kubernetes, Registry, first component, first team, integrations); completion state derived from live data | `DONE` |
| FARM-S308 | Story | Integration health summary card on Dashboard: compact card consuming `GET /api/features/availability`; shows all optional features with color-coded status dots and a "Configure" link; surfaces availability proactively without requiring navigation | `DONE` |
| FARM-S309 | Story | Sidebar collapsible sections: category titles (Operations, Observability, etc.) become toggle buttons; the section containing the active route auto-expands on load; all other sections start collapsed; native `overflow-y-auto` scroll bar appears only when enough sections are expanded to exceed the viewport height | `DONE` |

#### FARM-S299 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T288 | Task | Add `GET /api/kubernetes/available` to `KubernetesController` returning `{ available: boolean, reason: string }` based on `isKubernetesEnabled()`; unit tests | `DONE` |
| FARM-T289 | Task | Add `GET /api/cost/available` to `CostController` (checks `OPENCOST_URL` reachability with a lightweight HEAD request); unit tests | `DONE` |
| FARM-T290 | Task | Add `GET /api/registry/available` to `RegistryController` (returns true when at least one registry credential is configured); unit tests | `DONE` |
| FARM-T291 | Task | Add `GET /api/helm/available` to `HelmController` (checks if at least one Helm release exists or cluster is reachable); unit tests | `DONE` |
| FARM-T292 | Task | Add `GET /api/istio/available` and `GET /api/linkerd/available` availability endpoints; unit tests | `DONE` |

##### FARM-T288 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST270 | Sub-task | Implement `GET /api/kubernetes/available`: call `isKubernetesEnabled()`; return `{ available: true }` or `{ available: false, reason: "KUBECONFIG not set or cluster unreachable" }` | `DONE` |
| FARM-ST271 | Sub-task | Unit test: returns `available: true` when enabled; `available: false` with reason when disabled | `DONE` |

##### FARM-T289 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST272 | Sub-task | Implement `GET /api/cost/available`: attempt HEAD `${OPENCOST_URL}/healthz`; return `{ available: true }` on 2xx; `{ available: false, reason: "OpenCost unreachable at <url>" }` otherwise | `DONE` |
| FARM-ST273 | Sub-task | Unit test: mocked fetch returns 200 → available; mocked fetch throws → not available with reason | `DONE` |

##### FARM-T290 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST274 | Sub-task | Implement `GET /api/registry/available`: query `RegistryCredential` repository count; `available: true` when count > 0 | `DONE` |
| FARM-ST275 | Sub-task | Unit test: count > 0 → available; count = 0 → not available | `DONE` |

##### FARM-T291 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST276 | Sub-task | Implement `GET /api/helm/available`: delegate to `isKubernetesEnabled()`; Helm operations require a live cluster | `DONE` |
| FARM-ST277 | Sub-task | Unit test: kubernetes enabled → available; disabled → not available | `DONE` |

##### FARM-T292 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST278 | Sub-task | Implement `GET /api/istio/available` using `IstioService.isIstioEnabled()` | `DONE` |
| FARM-ST279 | Sub-task | Implement `GET /api/linkerd/available` using `LinkerdService.isLinkerdEnabled()` (Phase 20) | `DONE` |
| FARM-ST280 | Sub-task | Unit tests for both endpoints | `DONE` |

#### FARM-S300 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T293 | Task | Create `useFeatureAvailability(endpoint: string)` hook: fetches the availability endpoint, returns `{ available: boolean, reason: string | undefined, loading: boolean }`; unit tests | `DONE` |
| FARM-T294 | Task | Create `FeatureUnavailablePage` component: title, description, required env var list, documentation link, and an optional "Retry" button that re-fetches availability; unit tests | `DONE` |
| FARM-T295 | Task | Wrap optional top-level pages (`/kubernetes`, `/cost`, `/registry`, `/helm`, `/istio`) with `useFeatureAvailability`; render `FeatureUnavailablePage` when `available === false`; unit tests for each page | `DONE` |

##### FARM-T293 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST281 | Sub-task | Implement `useFeatureAvailability` hook using `globalThis.fetch` (or the existing `apiFetch` utility); cache result with `useState`; re-fetch on explicit `retry()` call | `DONE` |
| FARM-ST282 | Sub-task | Unit tests: loading state, available true, available false with reason, retry triggers re-fetch | `DONE` |

##### FARM-T294 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST283 | Sub-task | `FeatureUnavailablePage` props: `featureName`, `reason`, `requiredEnvVars: string[]`, `docsUrl?: string`, `onRetry?: () => void` | `DONE` |
| FARM-ST284 | Sub-task | Render: feature name heading, reason paragraph, env vars as a code block list, optional docs link button, optional "Check Again" button | `DONE` |
| FARM-ST285 | Sub-task | Unit tests: renders feature name and reason; renders env vars; calls onRetry when button clicked; hides retry button when onRetry not provided | `DONE` |

##### FARM-T295 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST286 | Sub-task | Wrap `/kubernetes` page: `useFeatureAvailability('/api/kubernetes/available')`; `requiredEnvVars: ['KUBECONFIG']`; `docsUrl: '/docs/kubernetes'` | `DONE` |
| FARM-ST287 | Sub-task | Wrap `/cost` page: `useFeatureAvailability('/api/cost/available')`; `requiredEnvVars: ['OPENCOST_URL']` | `DONE` |
| FARM-ST288 | Sub-task | Wrap `/registry` page: `useFeatureAvailability('/api/registry/available')`; `requiredEnvVars: ['Registry credentials configured via Settings > Integrations']` | `DONE` |
| FARM-ST289 | Sub-task | Wrap `/helm` page: `useFeatureAvailability('/api/helm/available')`; `requiredEnvVars: ['KUBECONFIG']` | `DONE` |
| FARM-ST290 | Sub-task | Unit tests for each wrapped page: renders `FeatureUnavailablePage` when hook returns `available: false`; renders normal content when `available: true` | `DONE` |

#### FARM-S301 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T296 | Task | Add `GET /api/features/availability` bulk endpoint returning a map of `{ [featureKey]: { available: boolean } }` for all optional features; reduces sidebar to a single API call; unit + e2e tests | `DONE` |
| FARM-T297 | Task | Frontend: fetch `/api/features/availability` once in the app shell on mount; store in context; pass `available` boolean to each nav item; render a subtle dot indicator on unavailable items; unit tests | `DONE` |

##### FARM-T296 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST291 | Sub-task | Create `FeaturesController` with `GET /api/features/availability`; aggregate availability from `KubernetesService`, `OpenCostService`, `RegistryService`, `IstioService` | `DONE` |
| FARM-ST292 | Sub-task | Response shape: `{ kubernetes: { available: bool }, cost: { available: bool }, registry: { available: bool }, helm: { available: bool }, istio: { available: bool } }` | `DONE` |
| FARM-ST293 | Sub-task | Unit test: each feature maps to expected available state; e2e test: endpoint returns all keys | `DONE` |

##### FARM-T297 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST294 | Sub-task | Add `getFeatureAvailability()` to `api-client.ts`; create `FeatureAvailabilityContext` with React context + provider | `DONE` |
| FARM-ST295 | Sub-task | Update `AppShell` to call `getFeatureAvailability()` on mount and store in context; pass availability map down to nav item renderer | `DONE` |
| FARM-ST296 | Sub-task | Nav item renderer: show a small gray dot badge when `available === false`; no tooltip, no blocking — clicking still navigates | `DONE` |
| FARM-ST297 | Sub-task | Unit tests: dot badge visible when unavailable; no badge when available; context provides correct values | `DONE` |

#### FARM-S302 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T298 | Task | Add `viewMode: 'grid' \| 'list'` state to `PluginsClient`; render a `LayoutGrid` / `List` toggle button group in the `PageHeader` toolbar; persist preference with `localStorage` key `plugins-view-mode`; unit tests | `DONE` |
| FARM-T299 | Task | Implement `PluginListRow` and `PluginListRowSkeleton` components: compact table row with columns for name+version, description (single-line truncated), menu items count, and routes count; render as `<table>` when `viewMode === 'list'`; unit tests | `DONE` |

##### FARM-T298 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST298 | Sub-task | Add `LayoutGrid` and `List` icon buttons (lucide-react) next to "Reload Plugins" in the `PageHeader`; active view highlighted with `variant="secondary"`; default to `'grid'` | `DONE` |
| FARM-ST299 | Sub-task | Read initial `viewMode` from `localStorage.getItem('plugins-view-mode')` on component mount; write back on every toggle | `DONE` |
| FARM-ST300 | Sub-task | Unit tests: toggles from grid to list and back; persists to localStorage; defaults to grid when localStorage is empty | `DONE` |

##### FARM-T299 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST301 | Sub-task | `PluginListRow` renders a `<tr>` with four `<td>` columns: (1) plugin name + monospace version badge, (2) description truncated to one line, (3) menu items count with `Menu` icon, (4) routes count with `Route` icon; `Installed` badge in column 1 | `DONE` |
| FARM-ST302 | Sub-task | `PluginListRowSkeleton` renders matching `<tr>` with `<Skeleton>` cells matching column widths | `DONE` |
| FARM-ST303 | Sub-task | When `viewMode === 'list'` render a `<table>` with a `<thead>` (Plugin, Description, Menu Items, Routes) and `<tbody>` of `PluginListRow` items; reuse existing `EmptyState` for empty list | `DONE` |
| FARM-ST304 | Sub-task | Unit tests: `PluginListRow` renders name, version, description, counts; skeleton renders without errors; table header rendered in list mode; grid cards rendered in grid mode | `DONE` |

#### FARM-S303 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T300 | Task | Install `simple-icons` as a frontend dependency; create `src/components/integrations/brand-icons.tsx` exporting `ArgoCDIcon`, `CircleCIIcon`, `JenkinsIcon`, `TravisCIIcon` as React SVG components using `makeBrandIcon()` factory | `DONE` |
| FARM-T301 | Task | Update `IntegrationSettingsClient.tsx`: change `INTEGRATIONS` array `icon` field from `string` (emoji) to `React.ComponentType<BrandIconProps>`; update `IntegrationCardProps` and render logic accordingly; update tests to assert SVG `role="img"` elements instead of emoji text | `DONE` |

##### FARM-T300 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST305 | Sub-task | `makeBrandIcon(si: SimpleIcon)` returns a named React component rendering `<svg role="img" viewBox="0 0 24 24" fill={#hex}>` with the simple-icons `path`; `displayName` set to `BrandIcon(<title>)` | `DONE` |
| FARM-ST306 | Sub-task | Export `ArgoCDIcon` (siArgo, `#EF7B4D`), `CircleCIIcon` (siCircleci, `#343434`), `JenkinsIcon` (siJenkins, `#D24939`), `TravisCIIcon` (siTravisci, `#3EAAAF`) | `DONE` |

##### FARM-T301 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST307 | Sub-task | Replace `icon: string` with `Icon: React.ComponentType<BrandIconProps>` in the `INTEGRATIONS` constant and `IntegrationCardProps` interface | `DONE` |
| FARM-ST308 | Sub-task | Render `<Icon size={28} />` in `IntegrationCard` replacing the `<span>{icon}</span>` emoji element | `DONE` |
| FARM-ST309 | Sub-task | Update the "renders integration icons/emojis" test: remove emoji `getByText` assertions; add `getAllByRole("img", { hidden: true })` to verify four SVG brand icons are present | `DONE` |

#### FARM-S304 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T302 | Task | Backend: add `GITHUB_ACTIONS = "github-actions"` and `AZURE_DEVOPS = "azure-devops"` to `IntegrationType` enum; create migration; add `GitHubActionsService` (`GET /api/integrations/github-actions/runs`) and `AzureDevOpsService` (`GET /api/integrations/azure-devops/pipelines`) with credential-based HTTP clients; unit + e2e tests | `DONE` |
| FARM-T303 | Task | Frontend brand icons: add `GitHubActionsIcon` (siGithubactions, `#2088FF`) to `brand-icons.tsx`; create `AzureDevOpsIcon` as a custom inline SVG component (official brand color `#0078D4`) | `DONE` |
| FARM-T304 | Task | Frontend connect forms: `GitHubActionsConnectForm` (name, PAT token, optional repository filter) and `AzureDevOpsConnectForm` (name, organization URL, PAT token); add both to `INTEGRATIONS` array and `ConnectModal` dispatch | `DONE` |
| FARM-T305 | Task | Update `IntegrationSettingsClient` tests: "renders all four integration cards" becomes "renders all six integration cards"; add `Not Connected` count assertion (`6`); add form-field tests for each new connect form | `DONE` |

##### FARM-T302 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST310 | Sub-task | Add enum values to `integration-credential.entity.ts`; generate and run migration `AddGitHubActionsAzureDevOpsTypes` | `DONE` |
| FARM-ST311 | Sub-task | `GitHubActionsService`: list workflow runs via `GET https://api.github.com/repos/{owner}/{repo}/actions/runs` using stored PAT; map to common `PipelineRun` shape | `DONE` |
| FARM-ST312 | Sub-task | `AzureDevOpsService`: list pipeline runs via `GET https://dev.azure.com/{org}/{project}/_apis/pipelines/{id}/runs` using stored PAT; map to common shape | `DONE` |
| FARM-ST313 | Sub-task | Unit tests for both services (mocked globalThis.fetch); e2e tests for credential CRUD with new types | `DONE` |

#### FARM-S305 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T306 | Task | Define nav section groups in `app-shell.tsx`: replace the flat `navItems` array with a `navSections` structure; each section has a `label` and an `items` array; render a section heading (`<p>` with `text-xs uppercase font-semibold text-muted-foreground`) above each group; unit tests | `DONE` |
| FARM-T307 | Task | Validate grouping with UX review and update mobile nav drawer to mirror the same section structure; update `app-shell` tests to assert section headings are rendered | `DONE` |

##### FARM-T306 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST314 | Sub-task | **Operations** section: Dashboard, Catalog, Deployments, Pipelines | `DONE` |
| FARM-ST315 | Sub-task | **Observability** section: Alerting, SLOs, Incidents, Observability, Analytics | `DONE` |
| FARM-ST316 | Sub-task | **Infrastructure** section: Operators, GitOps, Queues, Cost | `DONE` |
| FARM-ST317 | Sub-task | **Self-Service** section: Templates, Env Requests, Custom Dashboards, Docs | `DONE` |
| FARM-ST318 | Sub-task | **Organization** section: Organizations, Teams | `DONE` |
| FARM-ST319 | Sub-task | **Settings** section: Integrations, Cloud Providers, Keycloak SSO, Compliance, Tag Policies, Plugins | `DONE` |

##### FARM-T307 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST320 | Sub-task | Update desktop `<nav>` in `AppShell` to iterate `navSections` and render a heading + items per section, with `mb-4` spacing between sections | `DONE` |
| FARM-ST321 | Sub-task | Mirror the same `navSections` structure in the mobile `Sheet` drawer nav | `DONE` |
| FARM-ST322 | Sub-task | Update `app-shell.test.tsx`: assert each of the six section headings is rendered; existing nav-item tests remain valid | `DONE` |

#### FARM-S306 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T308 | Task | `GET /api/search/quick?q=<term>&limit=N` endpoint: parallel `LIKE` queries across `Component` (name, description), `Team` (name), `Documentation` (title), `Environment` (name), `Pipeline` (name); returns `QuickSearchResult[]` typed by entity; unit + e2e tests | `DONE` |
| FARM-T309 | Task | `SearchModal` frontend component: activated by `Cmd+K` / `Ctrl+K` global shortcut; debounced input (300 ms); results grouped by entity type; keyboard navigation (arrow keys, Enter to navigate, Esc to close); unit tests | `DONE` |
| FARM-T310 | Task | Mount `SearchModal` in `AppShell`; add `getQuickSearchResults(query, limit?)` to `api-client.ts`; add a search shortcut hint button in the top nav bar (desktop only); unit tests | `DONE` |

##### FARM-T308 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST323 | Sub-task | Define `QuickSearchResult` interface: `{ type: 'component'\|'team'\|'documentation'\|'environment'\|'pipeline', id: string, name: string, description?: string, url: string }` in a shared DTO file | `DONE` |
| FARM-ST324 | Sub-task | `SearchService.quickSearch(query, limit)`: run parallel `findOptions` LIKE queries on all five repositories; merge arrays, limit total to `limit` (default 10), preserving entity-type grouping | `DONE` |
| FARM-ST325 | Sub-task | `SearchController` at `/search` with `GET /quick`; unit tests for service merge logic; e2e test asserting all entity types returned when name matches | `DONE` |

##### FARM-T309 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST326 | Sub-task | Global `keydown` listener in `SearchModal` (or a wrapping hook): detect `Meta+K` / `Ctrl+K`, toggle `open` state; Esc closes; register and clean up listener in `useEffect` | `DONE` |
| FARM-ST327 | Sub-task | Debounced input (300 ms) calls `getQuickSearchResults`; results rendered in `CommandGroup` sections (one per entity type); each result row shows entity type badge, name, and truncated description | `DONE` |
| FARM-ST328 | Sub-task | Keyboard navigation: `ArrowDown`/`ArrowUp` moves highlighted index; `Enter` on highlighted item calls `router.push(result.url)` and closes modal; empty state when query is blank or no results found | `DONE` |
| FARM-ST329 | Sub-task | Unit tests: modal opens on `Cmd+K`; closes on Esc; renders grouped results; Enter navigates to correct URL; debounce prevents excessive API calls | `DONE` |

##### FARM-T310 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST330 | Sub-task | Add `getQuickSearchResults(query: string, limit?: number): Promise<QuickSearchResult[]>` to `api-client.ts`; unit test with mocked fetch | `DONE` |
| FARM-ST331 | Sub-task | Mount `<SearchModal />` once in `AppShell` (always rendered, visibility controlled by internal state); pass `open`/`onOpenChange` props | `DONE` |
| FARM-ST332 | Sub-task | Add a search trigger button in the top nav bar (desktop `md:flex` only): magnifying glass icon + `⌘K` keyboard hint chip; clicking opens modal | `DONE` |
| FARM-ST333 | Sub-task | Unit tests: search button rendered in AppShell; click opens modal; modal unmounts cleanly without listener leaks | `DONE` |

---

#### FARM-S307 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T311 | Task | `GET /api/setup/checklist` endpoint: returns checklist items derived from live data (entity counts + feature availability); `POST /api/setup/checklist/:key/dismiss` stores dismissed keys in `workspace.settings` JSONB; unit + e2e tests | `DONE` |
| FARM-T312 | Task | `SetupChecklistCard` component: dismissible card with per-item completion status (green check / gray pending), title, description, and "Configure" link button; "Dismiss all" button; unit tests | `DONE` |
| FARM-T313 | Task | Add `getSetupChecklist()` and `dismissChecklistItem(key)` to `api-client.ts`; integrate `SetupChecklistCard` at top of Dashboard page below the stats row; card is hidden when all items are completed or all are dismissed; unit tests | `DONE` |

##### FARM-T311 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST334 | Sub-task | Define `SetupChecklistItem` interface: `{ key: string, title: string, description: string, href: string, completed: boolean, dismissed: boolean }`; define five keys: `setup-kubernetes`, `setup-registry`, `create-component`, `create-team`, `configure-integrations` | `DONE` |
| FARM-ST335 | Sub-task | Compute `completed` for each key: `setup-kubernetes` → `isKubernetesEnabled()`; `setup-registry` → registry credential count > 0; `create-component` → component count > 0; `create-team` → team count > 0; `configure-integrations` → integration credential count > 0 | `DONE` |
| FARM-ST336 | Sub-task | Persist dismissed keys in `workspace.settings.dismissedChecklist: string[]` (JSONB patch via `WorkspaceService.updateSettings()`); `POST /api/setup/checklist/:key/dismiss` appends the key | `DONE` |
| FARM-ST337 | Sub-task | Unit tests: all items incomplete → all returned uncompleted; dismiss persists to workspace settings; e2e test for GET and POST endpoints | `DONE` |

##### FARM-T312 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST338 | Sub-task | `SetupChecklistCard` renders a `Card` with a progress header (`N of 5 steps complete`), a list of `SetupChecklistItem` rows, and a "Dismiss all" button in the card footer | `DONE` |
| FARM-ST339 | Sub-task | Each item row: left icon (`CheckCircle2` green when completed, `Circle` gray when pending), title + description, right "Configure →" link button (hidden when completed); clicking "×" on a row calls dismiss for that key | `DONE` |
| FARM-ST340 | Sub-task | Unit tests: renders N-of-5 progress; completed items show check icon; dismiss button calls `dismissChecklistItem`; card hidden when `items` is empty or all dismissed | `DONE` |

##### FARM-T313 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST341 | Sub-task | Add `getSetupChecklist()` and `dismissChecklistItem(key)` to `api-client.ts`; unit tests with mocked fetch | `DONE` |
| FARM-ST342 | Sub-task | Dashboard page: call `getSetupChecklist()` on mount; derive `visible = items.some(i => !i.completed && !i.dismissed)`; render `SetupChecklistCard` above the stats grid when `visible` | `DONE` |
| FARM-ST343 | Sub-task | Unit tests for Dashboard page: checklist card rendered when incomplete items exist; card absent when all completed; card absent when all dismissed | `DONE` |

---

#### FARM-S308 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T314 | Task | `IntegrationHealthCard` component: fetches `GET /api/features/availability` (defined in FARM-T296); renders each feature as a row with a color-coded dot (green = available, red = unavailable), feature name, and a "Configure →" link to the appropriate settings page; unit tests | `DONE` |
| FARM-T315 | Task | Integrate `IntegrationHealthCard` into the Dashboard page alongside `SetupChecklistCard`; add `getFeatureAvailability()` call to `api-client.ts` if not already present (FARM-ST294); unit tests for dashboard layout with card | `DONE` |

##### FARM-T314 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST344 | Sub-task | `IntegrationHealthCard` props: `availability: FeatureAvailabilityMap`; render a `Card` titled "Platform Integrations" with a row per feature (kubernetes, cost, registry, helm, istio) | `DONE` |
| FARM-ST345 | Sub-task | Each row: `dot` indicator (`bg-green-500` when available, `bg-red-500` when not), feature display name, optional `reason` shown as a muted subtitle when unavailable, right-aligned "Configure →" link | `DONE` |
| FARM-ST346 | Sub-task | Unit tests: green dot when available; red dot + reason when unavailable; "Configure" links point to correct pages; all five features rendered | `DONE` |

##### FARM-T315 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST347 | Sub-task | Dashboard page: call `getFeatureAvailability()` on mount (reuse if already fetched by AppShell context from FARM-ST294); pass result to `IntegrationHealthCard`; render card in a two-column grid alongside `SetupChecklistCard` on desktop, stacked on mobile | `DONE` |
| FARM-ST348 | Sub-task | Unit tests: `IntegrationHealthCard` rendered with availability data; loading skeleton while fetching; graceful empty state when endpoint unreachable | `DONE` |

---

#### FARM-S309 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T316 | Task | Desktop sidebar accordion: replace `<p>` section labels with `<button>` toggle controls; manage `collapsedSections` state as `Set<string>`; initialize with all sections except the one containing the active route collapsed; render items only when section is open; add `ChevronDown`/`ChevronRight` icon; unit tests | `DONE` |
| FARM-T317 | Task | Mobile Sheet nav parity: apply the same accordion toggle behavior to the mobile navigation inside `SheetContent`; use independent collapsed state scoped to the mobile menu; unit tests | `DONE` |
| FARM-T318 | Task | AppShell test coverage for accordion: tests for default open/closed sections based on active route; toggle open; toggle closed; items hidden when section collapsed; accessibility (aria-expanded on trigger buttons) | `DONE` |

##### FARM-T316 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST349 | Sub-task | Add `collapsedSections` state (`useState<Set<string>>`); initialize from `activeHref`: on render only the section whose items include `activeHref` is open, all others collapsed | `DONE` |
| FARM-ST350 | Sub-task | Replace `<p>` section label with `<button>` element; clicking toggles the section; show `ChevronDown` when open and `ChevronRight` when closed | `DONE` |
| FARM-ST351 | Sub-task | Wrap section items in a conditional block: render items only when the section is not collapsed | `DONE` |

##### FARM-T317 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST352 | Sub-task | Duplicate `collapsedSections` state for the mobile Sheet nav (independent from desktop); apply the same button + conditional render pattern | `DONE` |
| FARM-ST353 | Sub-task | Unit tests for mobile nav accordion: verify default state, toggle open, toggle closed | `DONE` |

##### FARM-T318 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST354 | Sub-task | Test: all sections except the active one start collapsed; active section is open | `DONE` |
| FARM-ST355 | Sub-task | Test: clicking a closed section label opens it; clicking an open section label closes it | `DONE` |
| FARM-ST356 | Sub-task | Test: items in a collapsed section are not present in the DOM; items in an open section are present | `DONE` |
| FARM-ST357 | Sub-task | Test: section title buttons have `aria-expanded` attribute set correctly (true when open, false when closed) | `DONE` |

---

## Phase 26: Auth Provider Expansion `TODO`

### FARM-E72: Social and Enterprise SSO Providers `TODO`

> Farm currently supports only local email/password authentication with JWT. This Epic adds first-class OAuth2 and OIDC providers — GitHub, Google, and Okta — plus LDAP/Active Directory for on-premises enterprises. All providers follow the same Passport.js strategy pattern and issue the same JWT access + refresh token pair, making the rest of the application provider-agnostic.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S310 | Story | GitHub OAuth2 authentication -- users can sign in via GitHub; profile is upserted into the `User` table; JWT issued on callback | `TODO` |
| FARM-S311 | Story | Google OAuth2 authentication -- users can sign in via Google; email used as unique identifier; JWT issued on callback | `TODO` |
| FARM-S312 | Story | Okta OIDC authentication -- enterprise Okta tenants connect via OIDC/PKCE; groups mapped to Farm roles | `TODO` |
| FARM-S313 | Story | LDAP / Active Directory authentication -- Farm binds as a service account, searches the user DN, maps attributes to `User` entity fields | `TODO` |
| FARM-S314 | Story | Provider discovery endpoint and frontend login page -- `GET /api/auth/providers` returns enabled providers; login page renders provider buttons dynamically | `TODO` |

#### FARM-S310 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T319 | Task | `GitHubStrategy` (passport-github2): `validate()` upserts `User` with `githubId`, `avatarUrl`, and `externalProvider = "github"`; env vars `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`; unit tests | `TODO` |
| FARM-T320 | Task | `GET /api/auth/github` initiates OAuth2 redirect; `GET /api/auth/github/callback` exchanges code, issues JWT access + refresh tokens, redirects to `/dashboard`; unit + e2e tests | `TODO` |

##### FARM-T319 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST358 | Sub-task | Add optional `githubId`, `googleId`, `externalProvider` fields to `User` entity; migration | `TODO` |
| FARM-ST359 | Sub-task | Unit test: mock GitHub callback profile → `validate()` returns upserted `User`; existing local user with matching email is linked | `TODO` |

#### FARM-S311 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T321 | Task | `GoogleStrategy` (passport-google-oauth20): `validate()` upserts `User` with `googleId` and `externalProvider = "google"`; env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`; unit tests | `TODO` |
| FARM-T322 | Task | `GET /api/auth/google` and `GET /api/auth/google/callback`; same JWT issuance flow as GitHub; unit + e2e tests | `TODO` |

#### FARM-S312 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T323 | Task | `OktaStrategy` (openid-client / passport-openidconnect): PKCE flow; validate ID token; map Okta groups to Farm roles via configurable `OKTA_GROUPS_CLAIM`; env vars `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_CALLBACK_URL`; unit tests | `TODO` |
| FARM-T324 | Task | `GET /api/auth/okta` and `GET /api/auth/okta/callback`; PKCE verifier generated per request and stored in session; unit + e2e tests | `TODO` |

#### FARM-S313 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T325 | Task | `LdapStrategy` (passport-ldapauth): bind as service account, search user by `LDAP_SEARCH_FILTER`; env vars `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_SEARCH_BASE`, `LDAP_SEARCH_FILTER`; unit tests with mock ldapauth | `TODO` |
| FARM-T326 | Task | LDAP attribute mapping: `displayName` → `firstName`+`lastName`, `mail` → `email`, `memberOf` → roles via configurable `LDAP_ADMIN_GROUP` env var; upsert `User` on each successful bind; unit tests | `TODO` |

##### FARM-T325 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST360 | Sub-task | Unit test: mock LDAP profile with `memberOf` containing admin group → user returned with `roles: ["admin"]` | `TODO` |
| FARM-ST361 | Sub-task | Unit test: LDAP bind failure (wrong password) → strategy throws `UnauthorizedException` | `TODO` |

#### FARM-S314 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T327 | Task | `GET /api/auth/providers`: read enabled provider env vars at runtime, return `{ providers: ["github","google","okta","ldap","local"][] }`; unit tests | `TODO` |
| FARM-T328 | Task | Frontend login page: fetch `/api/auth/providers` on mount, render a branded button per enabled provider (GitHub, Google, Okta, LDAP form); local email/password form always shown; unit tests | `TODO` |

---

## Phase 27: Advanced Search `TODO`

### FARM-E73: Elasticsearch-backed Search with Facets and Ranking `TODO`

> The current quick-search queries PostgreSQL with `ILIKE` across a handful of fields. This Epic replaces the search backend with Elasticsearch (or OpenSearch), adding faceted filtering by type, namespace, and tags; relevance ranking with per-field boost weights; typo tolerance via fuzzy matching; and result snippet highlighting. The system degrades gracefully to the existing DB search when Elasticsearch is unavailable.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S315 | Story | Elasticsearch integration -- `ElasticsearchModule` wrapping `@elastic/elasticsearch`; health check; document indexing on entity create/update via TypeORM subscribers | `TODO` |
| FARM-S316 | Story | Faceted search API -- `GET /api/v1/search/advanced` with `types[]`, `namespace`, `tags[]` filters and aggregation buckets | `TODO` |
| FARM-S317 | Story | Relevance ranking and typo tolerance -- per-field boost weights (`title^3`, `tags^2`, `description^1`), `fuzziness: AUTO`, snippet highlighting with `<em>` markers | `TODO` |
| FARM-S318 | Story | Frontend advanced search UI -- two-pane modal (facet panel + result list with highlighted snippets); replaces existing quick-search modal | `TODO` |

#### FARM-S315 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T329 | Task | `ElasticsearchModule`: configure `@elastic/elasticsearch` client with `ELASTICSEARCH_URL` env var (default `http://localhost:9200`); `isElasticsearchEnabled()` pings `/_cluster/health`; graceful `false` on timeout; unit tests | `TODO` |
| FARM-T330 | Task | `SearchIndexService.index(doc)` and `bulkIndex(docs[])`: index component, documentation, team, environment, and API spec documents; document schema: `{ id, type, title, description, tags, namespace, updatedAt }`; TypeORM subscriber triggers on create/update; unit tests | `TODO` |
| FARM-T331 | Task | `POST /api/v1/search/reindex` (admin-only): truncate and rebuild all indices from DB; returns job status; unit + e2e tests | `TODO` |

##### FARM-T329 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST362 | Sub-task | Unit test: ES client ping succeeds → `isElasticsearchEnabled()` returns true | `TODO` |
| FARM-ST363 | Sub-task | Unit test: ES client throws `ConnectionError` → `isElasticsearchEnabled()` returns false; logs warn; falls back to DB search | `TODO` |

#### FARM-S316 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T332 | Task | `SearchService.search(query, filters)`: Elasticsearch `multi_match` query with `filter` clauses for `type`, `namespace`, and `tags`; return hits with `_source` and aggregation buckets for type and tags | `TODO` |
| FARM-T333 | Task | `GET /api/v1/search/advanced` controller: DTO `{ q, types?, namespace?, tags?, page?, limit? }`; pagination via `from`/`size`; unit + e2e tests | `TODO` |

#### FARM-S317 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T334 | Task | Boost and fuzzy config: `title^3`, `tags^2`, `description^1`; `fuzziness: "AUTO"`; `highlight` option returns fragment list with `<em>` markers; configurable via `SearchConfig` entity | `TODO` |
| FARM-T335 | Task | Admin endpoint `PATCH /api/v1/search/config` to update boost weights at runtime; persisted in `SearchConfig` entity (`titleBoost`, `tagsBoost`, `descriptionBoost`, `fuzziness`); migration; unit tests | `TODO` |

#### FARM-S318 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T336 | Task | `AdvancedSearchModal` component: two-pane layout (left: facet checkboxes for type/namespace/tags; right: paginated result list with snippet highlights rendered as bold text); keyboard navigation (ArrowUp/Down, Enter, Escape); replaces `SearchModal` | `TODO` |
| FARM-T337 | Task | `useFacetedSearch` hook: debounced query (300ms), manages active filter state, calls `GET /api/v1/search/advanced`, returns `{ results, facets, loading, error }`; unit tests with mock API | `TODO` |

##### FARM-T336 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST364 | Sub-task | Unit test: toggling a facet checkbox adds/removes the filter from the active set and re-triggers the search | `TODO` |
| FARM-ST365 | Sub-task | Unit test: snippet `<em>` markers are rendered as `<strong>` via sanitized `dangerouslySetInnerHTML`; raw HTML from other fields is stripped | `TODO` |

---

## Phase 28: Software Templates 2.0 `TODO`

### FARM-E74: Nunjucks Templating with Dry-run and Live Preview `TODO`

> The current scaffold engine uses Handlebars with a basic variable substitution model. This Epic upgrades to Nunjucks for richer template logic (filters, macros, inheritance), adds a dry-run endpoint that validates variables against the template schema before execution, a live server-side preview API, and a JSON Schema-driven parameter form with type-aware inputs and conditional field visibility.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S319 | Story | Nunjucks template engine -- replace Handlebars with Nunjucks; add built-in string filters (`camelCase`, `snakeCase`, `kebabCase`, `pascalCase`) | `TODO` |
| FARM-S320 | Story | Dry-run validation endpoint -- `POST /api/v1/service-templates/:id/dry-run` validates variables and returns rendered output without writing files | `TODO` |
| FARM-S321 | Story | Live template preview -- `GET /api/v1/service-templates/:id/preview` renders the template server-side with provided variables; frontend split-view with auto-refresh | `TODO` |
| FARM-S322 | Story | JSON Schema-driven parameter form -- extend `ServiceTemplate.parameters` JSONB to support `type`, `validation`, `dependsOn`; `DynamicParameterForm` with conditional field visibility | `TODO` |

#### FARM-S319 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T338 | Task | Replace `handlebars` with `nunjucks`; update `ScaffoldService.render(template, vars)` to use `nunjucks.renderString`; register `camelCase`, `snakeCase`, `kebabCase`, `pascalCase` as custom filters; all existing scaffold tests must pass | `TODO` |
| FARM-T339 | Task | Handlebars-to-Nunjucks migration guide: convert `{{#if}}` → `{% if %}`, `{{#each items}}` → `{% for item in items %}`; audit and update all stored templates in seed data and tests; unit tests for each filter | `TODO` |

##### FARM-T338 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST366 | Sub-task | Unit test: `nunjucks.renderString` with `camelCase` filter converts `"my-service"` → `"myService"` | `TODO` |
| FARM-ST367 | Sub-task | Unit test: `nunjucks.renderString` with `pascalCase` filter converts `"my-service"` → `"MyService"` | `TODO` |

#### FARM-S320 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T340 | Task | `ScaffoldService.dryRun(templateId, variables)`: validate all required variables present; render template; return `{ valid: boolean, errors: string[], preview: string }`; unit tests | `TODO` |
| FARM-T341 | Task | `POST /api/v1/service-templates/:id/dry-run` controller; requires auth; returns dry-run result; unit + e2e tests | `TODO` |

#### FARM-S321 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T342 | Task | `GET /api/v1/service-templates/:id/preview?vars=<base64-encoded-JSON>`: render template with provided vars; 8KB response size cap; unit tests | `TODO` |
| FARM-T343 | Task | Frontend `TemplatePreviewPanel`: split view (left: variable form, right: rendered preview); auto-refreshes with 300ms debounce on variable change; unit tests | `TODO` |

#### FARM-S322 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T344 | Task | Extend `ServiceTemplate.parameters` JSONB schema to support `type` (`string | number | boolean | enum | multiselect`), `validation` (regex pattern + message), `default`, `placeholder`, `dependsOn` (`{ field, equals, action: "show"|"hide" }`); update DTO validation | `TODO` |
| FARM-T345 | Task | `DynamicParameterForm` component: render type-aware inputs (text, number, toggle, select, multi-select); evaluate `dependsOn` rules to show/hide fields reactively; unit tests for each input type and visibility rule | `TODO` |

##### FARM-T345 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST368 | Sub-task | Unit test: field with `dependsOn: { field: "provider", equals: "aws", action: "show" }` is hidden by default and shown when `provider` is set to `"aws"` | `TODO` |
| FARM-ST369 | Sub-task | Unit test: multiselect field serializes to comma-separated string before POST; deserializes back to array on load | `TODO` |

---

## Phase 29: TechDocs 2.0 `TODO`

### FARM-E75: MkDocs Integration and CI Publishing `TODO`

> Farm's current documentation module fetches Markdown files from URLs and renders them server-side. This Epic adds first-class MkDocs support: Farm clones a component's repository, detects `mkdocs.yml`, builds the static site, serves it under a versioned path, and re-builds on Git push via webhook. Full-text doc search is powered by the Elasticsearch index introduced in Phase 27.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S323 | Story | MkDocs build service -- clone repo, detect `mkdocs.yml`, run `mkdocs build`, store output in `DocumentationBuild` entity | `TODO` |
| FARM-S324 | Story | CI publishing pipeline -- webhook endpoint triggered by GitHub/GitLab push; enqueues `DocsBuildJob` via BullMQ | `TODO` |
| FARM-S325 | Story | Versioned documentation -- each build is tagged with a semver or branch name; frontend `VersionSelector` dropdown in the doc viewer | `TODO` |
| FARM-S326 | Story | Full-text documentation search -- index rendered HTML pages into Elasticsearch after build; `GET /api/docs/search` scoped to docs type | `TODO` |

#### FARM-S323 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T346 | Task | `MkDocsService.build(componentId, repoUrl, ref)`: shallow clone repo, detect `mkdocs.yml`, run `mkdocs build --site-dir dist/` via `child_process.spawn`; store artifacts path in `DocumentationBuild`; env `MKDOCS_ENABLED=true`; unit tests | `TODO` |
| FARM-T347 | Task | `DocumentationBuild` entity (componentId, version, status: `building | ready | failed`, buildLog text, artifactsPath, triggeredAt, completedAt); migration; `GET /api/docs/builds/:componentId` returns build history; unit tests | `TODO` |

##### FARM-T346 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST370 | Sub-task | Unit test: `build()` resolves with `{ status: "ready", artifactsPath }` when `mkdocs build` exits with code 0 | `TODO` |
| FARM-ST371 | Sub-task | Unit test: missing `mkdocs.yml` → build fails with `{ status: "failed", buildLog: "mkdocs.yml not found" }` | `TODO` |

#### FARM-S324 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T348 | Task | `POST /api/docs/webhook` accepting GitHub/GitLab push payloads; verify `X-Hub-Signature-256` HMAC; enqueue `DocsBuildJob` only when `mkdocs.yml` or `docs/` path appears in changed files; unit tests with mock payloads | `TODO` |
| FARM-T349 | Task | `DocsBuildJob` BullMQ processor: call `MkDocsService.build()`, update `DocumentationBuild.status`, emit `docs:build-complete` WebSocket event with build summary; unit tests | `TODO` |

##### FARM-T348 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST372 | Sub-task | Unit test: invalid HMAC signature returns 401 Unauthorized | `TODO` |
| FARM-ST373 | Sub-task | Unit test: push event with no `docs/` or `mkdocs.yml` changes is acknowledged (200) but no BullMQ job is enqueued | `TODO` |

#### FARM-S325 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T350 | Task | Tag each `DocumentationBuild` with the semver tag or branch name from the webhook payload ref (`refs/tags/v1.2.0` → `v1.2.0`); `GET /api/docs/:componentId/versions` returns builds sorted by version desc; unit tests | `TODO` |
| FARM-T351 | Task | Frontend `VersionSelector` dropdown in the documentation viewer header; switching version re-fetches that build's rendered content; defaults to latest; unit tests | `TODO` |

#### FARM-S326 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T352 | Task | After successful `DocsBuildJob`, strip HTML tags from rendered pages and index into Elasticsearch with `type = "docs"`, `componentId`, `heading`, `body`, `url` fields; unit tests | `TODO` |
| FARM-T353 | Task | `GET /api/docs/search?q=<query>&componentId=<id>` endpoint: Elasticsearch query scoped to `type=docs`; return matching pages with heading + snippet highlight; unit + e2e tests | `TODO` |

---

## Phase 30: Plugin Ecosystem `TODO`

### FARM-E76: Community Plugin Registry and SDK `TODO`

> Farm's current plugin system uses a static in-memory registry populated at startup. This Epic evolves it into a full community plugin ecosystem: a versioned `plugin.json` manifest spec, a registry API for publishing and discovering plugins, lifecycle management (install, enable, disable, uninstall) per organization, and a frontend renderer that loads plugin UI via React lazy-loading or sandboxed iframes.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S327 | Story | Plugin SDK and `plugin.json` manifest spec v2 -- defines `id`, `version`, `entryPoint`, `permissions`, `menuContributions`, `routeContributions`, `settingsSchema` | `TODO` |
| FARM-S328 | Story | Community plugin registry API -- search and publish endpoints backed by the Farm DB; install count tracking | `TODO` |
| FARM-S329 | Story | Plugin lifecycle management -- install, enable, disable, uninstall per organization; `PluginInstance` entity with status state machine | `TODO` |
| FARM-S330 | Story | Frontend dynamic plugin renderer -- React lazy-loading for route contributions; sandboxed iframe with postMessage bridge for sidebar/panel contributions | `TODO` |

#### FARM-S327 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T354 | Task | Define `plugin.json` manifest v2 schema: `id`, `name`, `version` (semver), `description`, `author`, `license`, `farmMinVersion`, `entryPoint` (URL or npm package), `permissions[]`, `menuContributions[]`, `routeContributions[]`, `settingsSchema` (JSON Schema); publish to `packages/plugin-sdk/schema/plugin.json` | `TODO` |
| FARM-T355 | Task | `PluginValidator.validate(manifest)`: check required fields, semver format, `farmMinVersion` compatibility, `permissions` against known scopes; return `{ valid: boolean, errors: string[] }`; unit tests | `TODO` |

##### FARM-T354 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST374 | Sub-task | Unit test: valid manifest with all required fields passes validation | `TODO` |
| FARM-ST375 | Sub-task | Unit test: manifest with missing `id` fails; incompatible `farmMinVersion` (`"99.0.0"`) fails with descriptive error | `TODO` |

#### FARM-S328 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T356 | Task | `PluginRegistryService.search(query, category?)`: queries `PluginManifest` DB table; `publish(manifest)`: validates and upserts; `GET /api/plugins/registry` with `?q=` and `?category=` filters; unit tests | `TODO` |
| FARM-T357 | Task | `GET /api/plugins/registry/:id` returns full manifest + install count + latest version; `GET /api/plugins/registry/:id/versions` returns version history; unit + e2e tests | `TODO` |

#### FARM-S329 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T358 | Task | `PluginInstance` entity (pluginId, orgId, version, status: `installing | active | disabled | error`, installedAt); `PluginInstanceService.install(pluginId, orgId)`: resolve entry point, validate manifest, create instance; migration; unit tests | `TODO` |
| FARM-T359 | Task | `POST /api/plugins/:id/enable` and `/disable`: toggle `PluginInstance.status`; `DELETE /api/plugins/:id` uninstalls and clears menu contributions; emit `plugin:status-changed` WebSocket event; unit + e2e tests | `TODO` |

#### FARM-S330 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T360 | Task | `PluginRenderer` component: for route contributions, load via `React.lazy(() => import(entryPoint))` wrapped in `<Suspense>` with skeleton fallback; for sidebar/panel contributions, render a sandboxed `<iframe>` with `sandbox="allow-scripts allow-same-origin"`; unit tests | `TODO` |
| FARM-T361 | Task | postMessage bridge: `PluginRenderer` listens for `farm:navigate`, `farm:toast`, and `farm:api-request` messages from iframe; injects auth token into API requests; enforces CSP `frame-src` policy; unit tests | `TODO` |

##### FARM-T360 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST376 | Sub-task | Unit test: `PluginRenderer` in iframe mode renders `<iframe sandbox="allow-scripts allow-same-origin">` with the plugin entry point URL as `src` | `TODO` |
| FARM-ST377 | Sub-task | Unit test: `React.lazy` dynamic import resolves a mock module → component is rendered inside `<Suspense>`; loading skeleton is shown before resolution | `TODO` |

##### FARM-T361 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST378 | Sub-task | Unit test: `farm:navigate` message from iframe calls `router.push` with the provided path | `TODO` |
| FARM-ST379 | Sub-task | Unit test: `farm:api-request` message from untrusted origin (not matching plugin `entryPoint` host) is rejected and logged as a security warning | `TODO` |

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
| Phase 11: API Management | 2 | 8 | `DONE` |
| Phase 12: Multi-tenancy | 2 | 8 | `DONE` |
| Phase 13: Observability 2.0 | 3 | 12 | `DONE` |
| Phase 14: AI / Intelligence | 3 | 12 | `DEFERRED` |
| Phase 15: Developer Self-Service | 2 | 10 | `DONE` |
| Phase 16: Kubernetes Operators | 1 | 5 | `DONE` |
| Phase 17: Container Registry Integration | 1 | 6 | `DONE` |
| Phase 18: GitOps and Autoscaling | 2 | 7 | `DONE` |
| Phase 19: FinOps | 2 | 11 | `DONE` |
| Phase 20: Service Mesh Expansion | 1 | 4 | `DONE` |
| Phase 21: Policy Engine Expansion | 1 | 4 | `TODO` |
| Phase 22: CI/CD Hardening | 1 | 3 | `DONE` |
| Phase 23: IaC Platform | 3 | 14 | `TODO` |
| Phase 24: User Profile Management | 1 | 4 | `DONE` |
| Phase 25: Feature Availability UX | 1 | 11 | `DONE` |
| Phase 26: Auth Provider Expansion | 1 | 5 | `TODO` |
| Phase 27: Advanced Search | 1 | 4 | `TODO` |
| Phase 28: Software Templates 2.0 | 1 | 4 | `TODO` |
| Phase 29: TechDocs 2.0 | 1 | 4 | `TODO` |
| Phase 30: Plugin Ecosystem | 1 | 4 | `TODO` |
| **Total** | **78** | **311** | |
