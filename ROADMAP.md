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
| Phase 12: Multi-tenancy | 2 | 8 | v0.13.0 - v0.13.2 | `DONE` |
| Phase 13: Observability 2.0 | 3 | 12 | v0.13.1 | `DONE` |
| Phase 14: AI / Intelligence | 3 | 12 | - | `DEFERRED` |
| Phase 15: Developer Self-Service | 2 | 10 | v0.13.2 - v0.14.3 | `DONE` |
| Phase 16: Kubernetes Operators | 1 | 5 | v0.14.0 - v0.14.3 | `DONE` |
| Phase 17: Container Registry Integration | 1 | 6 | v0.15.0 - v0.16.0 | `DONE` |
| Phase 18: GitOps and Autoscaling | 2 | 7 | v0.16.0 - v0.17.0 | `DONE` |
| Phase 19: FinOps | 2 | 11 | v0.17.0 | `DONE` |
| Phase 20: Service Mesh Expansion | 1 | 4 | v0.17.2 | `DONE` |
| Phase 21: Policy Engine Expansion | 1 | 4 | v0.17.2 | `DONE` |
| Phase 22: CI/CD Hardening | 1 | 3 | v0.14.3 - v0.14.7 | `DONE` |
| Phase 24: User Profile Management | 1 | 4 | v0.14.7 - v0.15.0 | `DONE` |
| Phase 25: Feature Availability UX | 1 | 11 | v0.17.1 - v0.17.2 | `DONE` |
| Phase 28: Software Templates 2.0 | 1 | 4 | v0.17.2 | `DONE` |
| Phase 26: Auth Provider Expansion | 1 | 5 | v0.19.0 | `DONE` |
| Phase 27: Advanced Search | 1 | 4 | v0.20.0 | `DONE` |
| Phase 29: TechDocs 2.0 | 1 | 4 | v0.21.0 | `DONE` |

---

## Phase 23: IaC Visibility and Cataloging `DONE`

### FARM-E68: IaC Module Catalog `DONE`

> A built-in catalog of Terraform, OpenTofu, and Pulumi modules that teams can browse and consume from Farm. The catalog stores structured metadata (variables, outputs, versions) parsed from source repositories. Farm acts as a discoverability layer; plan, apply, and approval workflows remain in dedicated tools (Terraform Cloud, Atlantis, Spacelift, or local CLI).

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S273 | Story | `IacModule` entity and CRUD API (name, provider: aws/gcp/azure/kubernetes/..., engine: terraform/opentofu/pulumi, sourceRepoUrl, description, latestVersion, variablesMeta JSONB, outputsMeta JSONB); optional link to a catalog `Component` via `componentId` FK | `DONE` |
| FARM-S274 | Story | Metadata sync service: fetch semver tags from the source repository, parse `variables.tf` and `outputs.tf` per tag into structured JSONB; triggered manually via `POST /iac-modules/:id/sync` | `DONE` |
| FARM-S275 | Story | Frontend: module browser page with search, provider filter, version selector, variable and output documentation tables, and copyable usage snippet | `DONE` |
| FARM-S276 | Story | Component detail IaC tab: list modules linked to the component with version badge, source repository link, and variable summary | `DONE` |

#### FARM-S273 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T237 | Task | `IacModule` entity with `IacProvider` enum (aws, gcp, azure, kubernetes, ...) and optional `IacEngine` enum (terraform, opentofu, pulumi); `IacModuleVersion` child entity (version semver, variablesMeta JSONB, outputsMeta JSONB, syncedAt); `IacModuleModule` with full CRUD service and controller; migration | `DONE` |
| FARM-T238 | Task | `GET /components/:id/iac-modules` and `POST /iac-modules/:id/link-component` endpoints to associate modules with catalog components; `DELETE /iac-modules/:id/unlink-component` to remove the association | `DONE` |

#### FARM-S274 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T239 | Task | `IacModuleSyncService.sync(module)`: run `git ls-remote --tags <sourceRepoUrl>`, detect semver tags not yet stored, shallow-clone each new tag, parse HCL files, persist as `IacModuleVersion` records | `DONE` |
| FARM-T240 | Task | HCL variable parser: extract name, type, description, default, and validation rules from `variables.tf`; same structure for `outputs.tf`; store result as typed JSONB on `IacModuleVersion` | `DONE` |

#### FARM-S275 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T241 | Task | Module browser page (`/iac-modules`): card/list view with provider badge, latest version chip, description, and link to detail; search by name, filter by provider | `DONE` |
| FARM-T242 | Task | Module detail page: version selector dropdown; variable documentation table (name, type, description, default, required flag); output table; copyable usage snippet rendered from selected version (Terraform `module {}` block or Pulumi constructor call) | `DONE` |

#### FARM-S276 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T243 | Task | IaC tab in component detail (`/catalog/:id`): table of linked modules with provider badge, version chip, source repository link; empty state with "Link IaC Module" action that opens a search dialog over existing `IacModule` records | `DONE` |

---

### FARM-E69: IaC Stack Visibility `DONE`

> The IaC stack records already exist in Farm, populated by Cultivator (E70). This Epic surfaces that data in the right places: a dedicated stack list, a stack detail page, a Stacks tab on the component detail page, and a visual resource map showing the topology of infrastructure resources and their dependencies within each stack. Farm does not manage IaC stacks, does not read state files, and does not hold cloud credentials — the same read-only portal pattern applied to Prometheus, ArgoCD, and Linkerd.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S277 | Story | Read-only stack query API — `GET /api/v1/iac/stacks` (list with optional `?environment=` and `?componentId=` filters) and `GET /api/v1/iac/stacks/:id` (single stack with last run joined); no write operations | `DONE` |
| FARM-S278 | Story | Stacks tab on component detail — lists all `IacStack` records with `componentId` matching the component; shows environment, last run status, last run date, and link-out to `externalToolUrl` | `DONE` |
| FARM-S279 | Story | Stack list page at `/iac/stacks` — table view of all stacks with environment filter; "Stacks" navigation entry added to the IaC sidebar section | `DONE` |
| FARM-S280 | Story | Stack detail page at `/iac/stacks/:id` — stack metadata (provider, repository, linked component) and embedded run history list reusing the existing runs data | `DONE` |
| FARM-S286 | Story | Resource Map tab on stack detail page — Cultivator pushes a sanitized resource topology (resource addresses, types, and dependency edges; no attribute values, no secrets) via `POST /iac/stacks/:id/resources/ingest`; Farm stores the topology in `IacResource` and `IacResourceDependency` entities and renders an interactive directed graph showing each resource as a node (labelled with provider and type) and each dependency as a directed edge | `DONE` |

#### FARM-S277 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T244 | Task | `GET /api/v1/iac/stacks`: returns all stacks ordered by environment then name; accepts optional `?environment=` and `?componentId=` query params; each record includes the most recent `IacRun` (status, type, startedAt) joined via a subquery; protected by `JwtAuthGuard`; unit + e2e tests | `DONE` |
| FARM-T245 | Task | `GET /api/v1/iac/stacks/:id`: returns a single stack with its last run joined; returns 404 when not found; protected by `JwtAuthGuard`; unit tests | `DONE` |

##### FARM-T244 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST400 | Sub-task | Unit test: `GET /api/v1/iac/stacks?componentId=x` returns only stacks matching the given componentId | `DONE` |
| FARM-ST401 | Sub-task | Unit test: `GET /api/v1/iac/stacks?environment=production` returns only stacks in that environment | `DONE` |

#### FARM-S278 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T246 | Task | `IacStacksTab` component on the component detail page: fetches `GET /api/v1/iac/stacks?componentId=:id`; table with columns stack name, environment badge, last run status badge, last run date, and "Open in [tool]" link-out button (hidden when `externalToolUrl` is null); empty state when no stacks are linked; unit tests | `DONE` |

##### FARM-T246 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST402 | Sub-task | Unit test: `IacStacksTab` renders empty state when the API returns an empty array | `DONE` |
| FARM-ST403 | Sub-task | Unit test: "Open in [tool]" link-out button is not rendered when `externalToolUrl` is null | `DONE` |

#### FARM-S279 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T247 | Task | Stack list page at `/iac/stacks`: table with stack name, provider badge, environment badge, linked component chip, last run status badge, last run date, and "Open in [tool]" link-out button; environment filter chips above the table; add "Stacks" navigation entry in the IaC sidebar section; unit tests | `DONE` |

#### FARM-S280 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T248 | Task | Stack detail page at `/iac/stacks/:id`: header with stack name, provider badge, environment badge, repository URL, linked component chip, and "Open in [tool]" link-out button; run history list below the header reusing the existing `IacStackRunsClient` component already built in E70; unit tests | `DONE` |

#### FARM-S286 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T249 | Task | `IacResource` entity (`id`, `stackId` FK, `address`, `resourceType`, `resourceName`, `provider`) and `IacResourceDependency` entity (`id`, `stackId` FK, `sourceAddress`, `targetAddress`) + TypeORM migrations | `DONE` |
| FARM-T250 | Task | `POST /api/v1/iac/stacks/:id/resources/ingest` (IAC_INGEST_TOKEN protected): accepts `{ resources: [{address, resourceType, resourceName, provider}], dependencies: [{source, target}] }` and atomically replaces the full resource topology for that stack (delete existing records, insert new ones in a transaction); `GET /api/v1/iac/stacks/:id/resources` (JwtAuthGuard protected): returns `{ resources, dependencies }` in a single response; unit + e2e tests | `DONE` |
| FARM-T262 | Task | `ResourceMapCanvas` component using `@xyflow/react` (React Flow): renders resources as nodes with provider icon and resource-type label, and dependencies as directed edges with arrow markers; automatic layout via `dagre`; embedded as a "Resource Map" tab on the stack detail page at `/iac/stacks/:id`; empty state panel when no resources have been pushed yet; unit tests | `DONE` |

##### FARM-T250 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST404 | Sub-task | Unit test: `POST .../resources/ingest` replaces an existing snapshot atomically — old nodes are removed and new ones persisted in a single transaction | `DONE` |
| FARM-ST405 | Sub-task | Unit test: `ResourceMapCanvas` renders the correct number of node and edge elements from a mocked API response | `DONE` |

---

### FARM-E70: Cultivator Integration `DONE`

> [Cultivator](https://github.com/Ops-Talks/cultivator) is a CLI tool that orchestrates Terragrunt stack discovery, dependency-aware execution, and CI/CD integration. It has no server and no UI. Farm complements it by acting as the visibility and history layer: Cultivator handles plan/apply execution; Farm ingests the run reports, catalogs the discovered stacks, and surfaces a unified dashboard across environments. This follows the same integration model used for Prometheus, Flux, and ArgoCD — Farm consumes results, it does not execute.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S281 | Story | Run ingest API: `POST /api/v1/iac/runs/ingest` webhook endpoint that receives Cultivator run reports and persists them as `IacRun` records linked to the matching `IacStack` | `DONE` |
| FARM-S282 | Story | Stack auto-registration via Cultivator discovery: the team runs `cultivator discover --output json` locally or in CI and pipes the result to `POST /api/v1/iac/stacks/import`; Farm upserts one `IacStack` record per discovered stack, so stacks appear in the portal without anyone having to register them by hand through the UI | `DONE` |
| FARM-S283 | Story | Per-stack run history in the Farm UI: after Cultivator finishes a plan or apply in CI/CD it posts the result to Farm; the stack detail page shows a chronological list of those runs with the outcome (success/failed/cancelled), what changed (resources added, modified, destroyed), how long it took, who triggered it, and a direct link back to the CI/CD pipeline job that produced it | `DONE` |
| FARM-S284 | Story | Aggregated IaC dashboard: cross-environment overview of all stacks showing last run status, drift indicators, and resource count trends over time | `DONE` |
| FARM-S285 | Story | Agronomist integration: `POST /api/v1/iac/module-drift/ingest` ingests the Agronomist JSON report generated in CI/CD; Farm surfaces outdated module references per stack in the IaC dashboard, showing current vs latest version and how many releases behind each reference is | `DONE` |

#### FARM-S281 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T251 | Task | `IacRun` entity (stackId FK, provider, environment, status: succeeded/failed/cancelled, type: plan/apply, resourceChanges JSONB `{add,change,destroy}`, triggeredBy string, pipelineUrl, startedAt, finishedAt, durationMs); migration | `DONE` |
| FARM-T252 | Task | `POST /api/v1/iac/runs/ingest` controller: validate payload via DTO, resolve `IacStack` by `stackName` + `environment` (create if not found with `autoImported: true`), persist `IacRun`; secured with a static bearer token configured via `IAC_INGEST_TOKEN` env var | `DONE` |
| FARM-T253 | Task | Cultivator reporter documentation: document the expected ingest payload schema and provide a ready-to-use GitHub Actions step (`curl` snippet) that posts the Cultivator JSON summary to Farm after each plan/apply run | `DONE` |

#### FARM-S282 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T254 | Task | `POST /api/v1/iac/stacks/import` endpoint: accepts Cultivator `discover` JSON output (array of `{ name, path, environment, provider, dependencies[] }`); upserts `IacStack` records preserving existing `componentId` and `externalToolUrl` associations; returns created and updated counts | `DONE` |
| FARM-T255 | Task | `autoImported` boolean flag on `IacStack` entity to distinguish stacks registered manually from those imported via Cultivator discovery; migration | `DONE` |

#### FARM-S283 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T256 | Task | `GET /api/v1/iac/stacks/:id/runs` paginated endpoint: returns `IacRun` list sorted by `startedAt` DESC with status, type, resource change counts, duration, triggered-by, and pipeline URL | `DONE` |
| FARM-T257 | Task | Stack detail Runs tab: timeline list of past runs with status icon (success/failed/cancelled), type badge (plan/apply), resource change chips (`+N ~N -N`), duration, actor, and external pipeline link | `DONE` |

#### FARM-S284 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T258 | Task | `GET /api/v1/iac/dashboard` endpoint: aggregate last run status per stack grouped by environment; include total stack count, last-run-failed count, and resource change totals for the last 30 days | `DONE` |
| FARM-T259 | Task | IaC dashboard page (`/iac`): environment selector tabs (all / dev / staging / prod); per-stack status cards showing last run status badge, resource counts, last run time, and Cultivator actor; failed stacks surfaced at the top | `DONE` |

#### FARM-S285 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T260 | Task | `POST /api/v1/iac/module-drift/ingest` endpoint: receives the Agronomist JSON report (`agronomist report --root . --json report.json`), persists one `IacModuleDrift` record per outdated module reference found (stackPath, currentRef, latestRef, moduleName, sourceUrl, detectedAt); secured with `IAC_INGEST_TOKEN` | `DONE` |
| FARM-T261 | Task | Module drift panel in the IaC dashboard: list of outdated module references grouped by stack, showing current vs latest version, how many versions behind, and a link to the module in FARM-E68 catalog if a matching `IacModule` record exists | `DONE` |

---

## Phase 26: Auth Provider Expansion `DONE`

### FARM-E72: Social and Enterprise SSO Providers `DONE`

> Farm currently supports only local email/password authentication with JWT. This Epic adds first-class OAuth2 and OIDC providers — GitHub, Google, and Keycloak (enterprise OIDC) — plus LDAP/Active Directory for on-premises enterprises. All providers follow the same Passport.js strategy pattern and issue the same JWT access + refresh token pair, making the rest of the application provider-agnostic.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S310 | Story | GitHub OAuth2 authentication -- users can sign in via GitHub; profile is upserted into the `User` table; JWT issued on callback | `DONE` |
| FARM-S311 | Story | Google OAuth2 authentication -- users can sign in via Google; email used as unique identifier; JWT issued on callback | `DONE` |
| FARM-S312 | Story | Enterprise OIDC authentication -- Keycloak per-org OIDC/PKCE flow via `KeycloakOidcService`; dynamic strategy built from per-org `IntegrationCredential`; groups mapped to Farm roles | `DONE` |
| FARM-S313 | Story | LDAP / Active Directory authentication -- Farm binds as a service account, searches the user DN, maps attributes to `User` entity fields | `DONE` |
| FARM-S314 | Story | Provider discovery endpoint and frontend login page -- `GET /api/auth/providers` returns enabled providers; login page renders provider buttons dynamically | `DONE` |

#### FARM-S310 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T319 | Task | `GitHubStrategy` (passport-github2): `validate()` upserts `User` with `oauthProvider = "github"` and `oauthProviderId`; env vars `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`; unit tests | `DONE` |
| FARM-T320 | Task | `GET /api/auth/github` initiates OAuth2 redirect; `GET /api/auth/github/callback` exchanges code, issues JWT access + refresh tokens; unit + e2e tests | `DONE` |

##### FARM-T319 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST358 | Sub-task | Added `oauthProvider` and `oauthProviderId` nullable fields to `User` entity; migration `AddUserOauthFields1773770832000` | `DONE` |
| FARM-ST359 | Sub-task | Unit test: mock GitHub callback profile → `validate()` returns upserted `User`; existing local user with matching email is linked | `DONE` |

#### FARM-S311 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T321 | Task | `GoogleStrategy` (passport-google-oauth20): `validate()` upserts `User` with `oauthProvider = "google"`; env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`; unit tests | `DONE` |
| FARM-T322 | Task | `GET /api/auth/google` and `GET /api/auth/google/callback`; same JWT issuance flow as GitHub; unit + e2e tests | `DONE` |

#### FARM-S312 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T323 | Task | `KeycloakOidcService` (passport-openidconnect): per-org dynamic strategy; OIDC flow; map Keycloak groups to Farm roles; env vars stored as encrypted `IntegrationCredential` records; unit tests | `DONE` |
| FARM-T324 | Task | `GET /api/auth/keycloak?orgId=` initiates OIDC redirect; `GET /api/auth/keycloak/callback` completes flow and issues JWT; org ID stored in session for callback; unit + e2e tests | `DONE` |

#### FARM-S313 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T325 | Task | `LdapAuthStrategy` (passport-ldapauth): bind as service account, search user by `LDAP_SEARCH_FILTER`; env vars `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_SEARCH_BASE`, `LDAP_SEARCH_FILTER`; unit tests with mock ldapauth | `DONE` |
| FARM-T326 | Task | LDAP attribute mapping: `displayName`/`cn` → display name, `givenName`/`sn` → first/last name, `mail` → email, `memberOf` → roles via configurable `LDAP_ADMIN_GROUP` env var; upsert `User` via `findOrCreateOAuthUser`; unit tests | `DONE` |

##### FARM-T325 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST360 | Sub-task | Unit test: mock LDAP profile with `memberOf` containing admin group → user returned with `roles: ["admin", "user"]` | `DONE` |
| FARM-ST361 | Sub-task | Unit test: `findOrCreateOAuthUser` rejection → strategy re-throws the error | `DONE` |

#### FARM-S314 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T327 | Task | `GET /api/auth/providers`: read enabled provider env vars at runtime, return `{ providers: ["local","github","google","ldap","keycloak"][] }`; unit tests | `DONE` |
| FARM-T328 | Task | Frontend login page: fetch `/api/auth/providers` on mount, render GitHub/Google buttons and LDAP form when those providers are returned; Keycloak section always shown; local email/password form always shown; unit tests | `DONE` |

---

## Phase 27: Advanced Search `DONE`

### FARM-E73: Elasticsearch-backed Search with Facets and Ranking `DONE`

> The current quick-search queries PostgreSQL with `ILIKE` across a handful of fields. This Epic replaces the search backend with Elasticsearch (or OpenSearch), adding faceted filtering by type, namespace, and tags; relevance ranking with per-field boost weights; typo tolerance via fuzzy matching; and result snippet highlighting. The system degrades gracefully to the existing DB search when Elasticsearch is unavailable.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S315 | Story | Elasticsearch integration -- `ElasticsearchModule` wrapping `@elastic/elasticsearch`; health check; document indexing on entity create/update via TypeORM subscribers | `DONE` |
| FARM-S316 | Story | Faceted search API -- `GET /api/v1/search/advanced` with `types[]`, `namespace`, `tags[]` filters and aggregation buckets | `DONE` |
| FARM-S317 | Story | Relevance ranking and typo tolerance -- per-field boost weights (`title^3`, `tags^2`, `description^1`), `fuzziness: AUTO`, snippet highlighting with `<em>` markers | `DONE` |
| FARM-S318 | Story | Frontend advanced search UI -- two-pane modal (facet panel + result list with highlighted snippets); replaces existing quick-search modal | `DONE` |

#### FARM-S315 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T329 | Task | `ElasticsearchModule`: configure `@elastic/elasticsearch` client with `ELASTICSEARCH_URL` env var (default `http://localhost:9200`); `isElasticsearchEnabled()` pings `/_cluster/health`; graceful `false` on timeout; unit tests | `DONE` |
| FARM-T330 | Task | `SearchIndexService.index(doc)` and `bulkIndex(docs[])`: index component, documentation, team, environment, and API spec documents; document schema: `{ id, type, title, description, tags, namespace, updatedAt }`; TypeORM subscriber triggers on create/update; unit tests | `DONE` |
| FARM-T331 | Task | `POST /api/v1/search/reindex` (admin-only): truncate and rebuild all indices from DB; returns job status; unit + e2e tests | `DONE` |

##### FARM-T329 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST362 | Sub-task | Unit test: ES client ping succeeds → `isElasticsearchEnabled()` returns true | `DONE` |
| FARM-ST363 | Sub-task | Unit test: ES client throws `ConnectionError` → `isElasticsearchEnabled()` returns false; logs warn; falls back to DB search | `DONE` |

#### FARM-S316 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T332 | Task | `SearchService.search(query, filters)`: Elasticsearch `multi_match` query with `filter` clauses for `type`, `namespace`, and `tags`; return hits with `_source` and aggregation buckets for type and tags | `DONE` |
| FARM-T333 | Task | `GET /api/v1/search/advanced` controller: DTO `{ q, types?, namespace?, tags?, page?, limit? }`; pagination via `from`/`size`; unit + e2e tests | `DONE` |

#### FARM-S317 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T334 | Task | Boost and fuzzy config: `title^3`, `tags^2`, `description^1`; `fuzziness: "AUTO"`; `highlight` option returns fragment list with `<em>` markers; configurable via `SearchConfig` entity | `DONE` |
| FARM-T335 | Task | Admin endpoint `PATCH /api/v1/search/config` to update boost weights at runtime; persisted in `SearchConfig` entity (`titleBoost`, `tagsBoost`, `descriptionBoost`, `fuzziness`); migration; unit tests | `DONE` |

#### FARM-S318 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T336 | Task | `AdvancedSearchModal` component: two-pane layout (left: facet checkboxes for type/namespace/tags; right: paginated result list with snippet highlights rendered as bold text); keyboard navigation (ArrowUp/Down, Enter, Escape); replaces `SearchModal` | `DONE` |
| FARM-T337 | Task | `useFacetedSearch` hook: debounced query (300ms), manages active filter state, calls `GET /api/v1/search/advanced`, returns `{ results, facets, loading, error }`; unit tests with mock API | `DONE` |

##### FARM-T336 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST364 | Sub-task | Unit test: toggling a facet checkbox adds/removes the filter from the active set and re-triggers the search | `DONE` |
| FARM-ST365 | Sub-task | Unit test: snippet `<em>` markers are rendered as `<strong>` via sanitized `dangerouslySetInnerHTML`; raw HTML from other fields is stripped | `DONE` |

---

## Phase 29: TechDocs 2.0 `DONE`

### FARM-E75: Multi-Builder Documentation Platform `DONE`

> Farm's current documentation module fetches Markdown files from URLs and renders them server-side. This Epic evolves it into a multi-builder documentation platform using a strategy pattern: Farm auto-detects the documentation tool used by each component repository and dispatches to the appropriate builder. MkDocs is the recommended standard (most common in DevOps/SRE teams), but teams without any build tool receive a working Markdown fallback with zero friction. The CI pipeline (webhook + BullMQ), versioning by Git tag, and optional full-text search via Elasticsearch are shared across all builders. Future builders -- Docusaurus, Hugo, Sphinx -- can be added by implementing the `DocBuilder` interface without touching the core pipeline.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S323 | Story | `DocBuilder` strategy interface and `DocBuilderFactory` auto-detection -- probe repo for build configs (`mkdocs.yml` → MkDocs; none found → Markdown fallback); `MarkdownBuilder` collects `.md` files with no external tool required | `DONE` |
| FARM-S324 | Story | `MkDocsBuilder` implementation and `DocumentationBuild` entity -- recommended builder; clone repo, run `mkdocs build`, store versioned artifacts | `DONE` |
| FARM-S325 | Story | CI publishing pipeline -- webhook endpoint triggered by GitHub/GitLab push; HMAC verification; `DocsBuildJob` BullMQ processor resolves the correct builder via `DocBuilderFactory` | `DONE` |
| FARM-S326 | Story | Versioned documentation and optional full-text search -- each build tagged with semver or branch name from webhook ref; `VersionSelector` dropdown in frontend; Elasticsearch indexing after build degrades gracefully to DB search when unavailable | `DONE` |

#### FARM-S323 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T346 | Task | `DocBuilder` interface: `supports(repoPath: string): Promise<boolean>` and `build(componentId, repoUrl, ref): Promise<BuildResult>`; `DocBuilderFactory.resolve(repoUrl, ref)`: shallow-clone repo, iterate ordered builder list calling `supports()`, return first match (MkDocs priority over Markdown fallback); unit tests | `DONE` |
| FARM-T347 | Task | `MarkdownBuilder` implementation: shallow clone repo, collect all `.md` files under `docs/` and repo root, store file paths in `DocumentationBuild` with `sourceType: "markdown"`; no external build tool required; unit tests | `DONE` |

##### FARM-T346 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST370 | Sub-task | Unit test: `DocBuilderFactory.resolve()` returns `MkDocsBuilder` instance when `mkdocs.yml` is present in the cloned repo | `DONE` |
| FARM-ST371 | Sub-task | Unit test: `DocBuilderFactory.resolve()` returns `MarkdownBuilder` instance when no recognized build config is found (fallback path) | `DONE` |

#### FARM-S324 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T348 | Task | `MkDocsBuilder` implementation: shallow clone repo, verify `mkdocs.yml` exists, run `mkdocs build --site-dir dist/` via `child_process.spawn`; store artifacts path in `DocumentationBuild`; env `MKDOCS_ENABLED=true` gates the MkDocs binary check at startup; unit tests | `DONE` |
| FARM-T349 | Task | `DocumentationBuild` entity (componentId, version, sourceType: `mkdocs \| markdown`, status: `building \| ready \| failed`, buildLog text, artifactsPath, triggeredAt, completedAt); migration; `GET /api/docs/builds/:componentId` returns build history; unit tests | `DONE` |

##### FARM-T348 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST372 | Sub-task | Unit test: `MkDocsBuilder.build()` resolves with `{ status: "ready", artifactsPath }` when `mkdocs build` exits with code 0 | `DONE` |
| FARM-ST373 | Sub-task | Unit test: missing `mkdocs.yml` → `MkDocsBuilder.supports()` returns false; `DocBuilderFactory` falls back to `MarkdownBuilder` | `DONE` |

#### FARM-S325 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T350 | Task | `POST /api/docs/webhook` accepting GitHub/GitLab push payloads; verify `X-Hub-Signature-256` HMAC; enqueue `DocsBuildJob` only when `mkdocs.yml`, `docs/` or `*.md` paths appear in changed files; unit tests with mock payloads | `DONE` |
| FARM-T351 | Task | `DocsBuildJob` BullMQ processor: call `DocBuilderFactory.resolve()` to select the correct builder, execute `builder.build()`, update `DocumentationBuild.status`, emit `docs:build-complete` WebSocket event; unit tests | `DONE` |

##### FARM-T350 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST374 | Sub-task | Unit test: invalid `X-Hub-Signature-256` HMAC returns 401 Unauthorized | `DONE` |
| FARM-ST375 | Sub-task | Unit test: push event with no `docs/`, `*.md` or build config changes is acknowledged (200) but no BullMQ job is enqueued | `DONE` |

#### FARM-S326 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T352 | Task | Tag each `DocumentationBuild` with semver or branch name from webhook ref (`refs/tags/v1.2.0` → `v1.2.0`); `GET /api/docs/:componentId/versions` returns builds sorted by version desc; unit tests | `DONE` |
| FARM-T353 | Task | Frontend `VersionSelector` dropdown in the documentation viewer header; switching version re-fetches that build's rendered content; defaults to latest `ready` build; unit tests | `DONE` |

> **Note:** Full-text search indexing (strip HTML, index into Elasticsearch with `type = "docs"`, `componentId`, `heading`, `body`, `url`) is implemented after `DocsBuildJob` completes. This feature requires the `ElasticsearchModule` introduced in Phase 27 and degrades gracefully -- skips indexing with a warn log when Elasticsearch is unavailable, falling back to the existing DB title search.

---

## Phase 30: Plugin Ecosystem `DONE`

### FARM-E76: Community Plugin Registry and SDK `DONE`

> Farm's current plugin system uses a static in-memory registry populated at startup. This Epic evolves it into a full community plugin ecosystem: a versioned `plugin.json` manifest spec, a registry API for publishing and discovering plugins, lifecycle management (install, enable, disable, uninstall) per organization, and a frontend renderer that loads plugin UI via React lazy-loading or sandboxed iframes.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S327 | Story | Plugin SDK and `plugin.json` manifest spec v2 -- defines `id`, `version`, `entryPoint`, `permissions`, `menuContributions`, `routeContributions`, `settingsSchema` | `DONE` |
| FARM-S328 | Story | Community plugin registry API -- search and publish endpoints backed by the Farm DB; install count tracking | `DONE` |
| FARM-S329 | Story | Plugin lifecycle management -- install, enable, disable, uninstall per organization; `PluginInstance` entity with status state machine | `DONE` |
| FARM-S330 | Story | Frontend dynamic plugin renderer -- React lazy-loading for route contributions; sandboxed iframe with postMessage bridge for sidebar/panel contributions | `DONE` |

#### FARM-S327 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T354 | Task | Define `plugin.json` manifest v2 schema: `id`, `name`, `version` (semver), `description`, `author`, `license`, `farmMinVersion`, `entryPoint` (URL or npm package), `permissions[]`, `menuContributions[]`, `routeContributions[]`, `settingsSchema` (JSON Schema); publish to `packages/plugin-sdk/schema/plugin.json` | `DONE` |
| FARM-T355 | Task | `PluginValidator.validate(manifest)`: check required fields, semver format, `farmMinVersion` compatibility, `permissions` against known scopes; return `{ valid: boolean, errors: string[] }`; unit tests | `DONE` |

##### FARM-T354 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST380 | Sub-task | Unit test: valid manifest with all required fields passes validation | `DONE` |
| FARM-ST381 | Sub-task | Unit test: manifest with missing `id` fails; incompatible `farmMinVersion` (`"99.0.0"`) fails with descriptive error | `DONE` |
| FARM-ST386 | Sub-task | `dependsOn` field in manifest v2 schema — optional array of plugin IDs; `PluginValidator` checks all declared dependencies exist in the registry before allowing install | `DONE` |

#### FARM-S328 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T356 | Task | `PluginRegistryService.search(query, category?)`: queries `PluginManifest` DB table; `publish(manifest)`: validates and upserts; `GET /api/plugins/registry` with `?q=` and `?category=` filters; unit tests | `DONE` |
| FARM-T357 | Task | `GET /api/plugins/registry/:id` returns full manifest + install count + latest version; `GET /api/plugins/registry/:id/versions` returns version history; unit + e2e tests | `DONE` |

#### FARM-S329 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T358 | Task | `PluginInstance` entity (pluginId, orgId, version, status: `installing | active | disabled | error`, installedAt); `PluginInstanceService.install(pluginId, orgId)`: resolve entry point, validate manifest, create instance; migration; unit tests | `DONE` |
| FARM-T359 | Task | `POST /api/plugins/:id/enable` and `/disable`: toggle `PluginInstance.status`; `DELETE /api/plugins/:id` uninstalls and clears menu contributions; emit `plugin:status-changed` WebSocket event; unit + e2e tests | `DONE` |

##### FARM-T358 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST387 | Sub-task | `PluginInstance.healthStatus` field (`healthy \| degraded \| unknown`) updated by periodic health check; `GET /api/plugins/:id/health` returns current status | `DONE` |
| FARM-ST388 | Sub-task | Lifecycle hooks interface: `OnPluginInit` and `OnPluginDestroy` — `PluginInstanceService` calls `onPluginInit()` after status transitions to `active` and `onPluginDestroy()` before transitioning to `disabled`/uninstalled | `DONE` |
| FARM-ST389 | Sub-task | Dependency-aware initialization order — `PluginInstanceService.installWithDependencies()` resolves the dependency graph from manifest `dependsOn` and initializes plugins in topological order; circular dependencies return 400 | `DONE` |

#### FARM-S330 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T360 | Task | `PluginRenderer` component: for route contributions, load via `React.lazy(() => import(entryPoint))` wrapped in `<Suspense>` with skeleton fallback; for sidebar/panel contributions, render a sandboxed `<iframe>` with `sandbox="allow-scripts allow-same-origin"`; unit tests | `DONE` |
| FARM-T361 | Task | postMessage bridge: `PluginRenderer` listens for `farm:navigate`, `farm:toast`, and `farm:api-request` messages from iframe; injects auth token into API requests; enforces CSP `frame-src` policy; unit tests | `DONE` |

##### FARM-T360 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST382 | Sub-task | Unit test: `PluginRenderer` in iframe mode renders `<iframe sandbox="allow-scripts allow-same-origin">` with the plugin entry point URL as `src` | `DONE` |
| FARM-ST383 | Sub-task | Unit test: `React.lazy` dynamic import resolves a mock module → component is rendered inside `<Suspense>`; loading skeleton is shown before resolution | `DONE` |

##### FARM-T361 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST384 | Sub-task | Unit test: `farm:navigate` message from iframe calls `router.push` with the provided path | `DONE` |
| FARM-ST385 | Sub-task | Unit test: `farm:api-request` message from untrusted origin (not matching plugin `entryPoint` host) is rejected and logged as a security warning | `DONE` |

---

## Phase 31: Elastic Stack and Log Pipeline Visibility `DONE`

### FARM-E77: Elastic Stack and Log Collector Discovery `DONE`

> Farm already discovers Kubernetes workloads, Helm releases, Flux GitOps bindings, and KEDA scaled objects. This Epic extends that pattern to the observability data layer. Discovery operates across three tiers: ECK-managed resources (CRD-based, robust), in-cluster collectors deployed via Helm or plain YAML (label-based fallback), and external or SaaS Elasticsearch instances (URL health check). All tiers are independent and degrade gracefully — if ECK CRDs are absent, Farm falls back to label detection; if no in-cluster Elasticsearch is found, it checks `ELASTICSEARCH_URL`. The frontend surfaces a unified view on the Observability page and a focused card on the component detail page.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S331 | Story | Backend: ECK-managed resource discovery -- Elasticsearch clusters, Kibana instances, Logstash pipelines, and Beats via ECK CRDs | `DONE` |
| FARM-S332 | Story | Backend: In-cluster non-ECK discovery -- Fluent Bit and Fluentd DaemonSets and Logstash Deployments via label conventions (Helm / plain YAML installs) | `DONE` |
| FARM-S333 | Story | Backend: External and SaaS Elasticsearch health check -- ping `ELASTICSEARCH_URL`, report reachability, cluster health, and version | `DONE` |
| FARM-S334 | Story | Frontend: Elastic Stack tab on the Observability page -- unified view of ECK resources, in-cluster collectors, and external ES with per-tier sections and health badges | `DONE` |
| FARM-S335 | Story | Frontend: Log Pipeline card on the component detail page -- shows the collector(s) active in the component namespace (ECK preferred, label-based fallback) | `DONE` |

#### FARM-S331 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T362 | Task | `ElasticStackService.getEckElasticsearch(kubeconfig)`: list `Elasticsearch` CRs from `elasticsearch.k8s.elastic.co/v1`; map to `{ name, namespace, health: "green"\|"yellow"\|"red", version, nodeCount, source: "eck" }`; degrade gracefully to `[]` when CRD is absent; unit tests | `DONE` |
| FARM-T363 | Task | `ElasticStackService.getEckKibana(kubeconfig)` and `getEckBeats(kubeconfig)`: list `Kibana` and `Beat` CRs; map to `{ name, namespace, available: bool, version?, source: "eck" }`; degrade gracefully to `[]` when CRDs are absent; unit tests | `DONE` |
| FARM-T364 | Task | `ElasticStackService.getEckLogstash(kubeconfig)`: list `Logstash` CRs from `logstash.k8s.elastic.co/v1alpha1`; map to `{ name, namespace, readyReplicas, desiredReplicas, source: "eck" }`; degrade gracefully to `[]` when CRD is absent; unit tests | `DONE` |

##### FARM-T362 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST386 | Sub-task | Unit test: ECK Elasticsearch CR with `health: "green"` → returned with `source: "eck"` and correct `nodeCount` | `DONE` |
| FARM-ST387 | Sub-task | Unit test: ECK CRD not installed (404 from CustomObjectsApi) → `getEckElasticsearch()` returns `[]` without throwing | `DONE` |

#### FARM-S332 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T365 | Task | `ElasticStackService.getFluentBit(kubeconfig)` and `getFluentd(kubeconfig)`: list DaemonSets matching labels `app.kubernetes.io/name=fluent-bit` / `k8s-app=fluent-bit` and `app.kubernetes.io/name=fluentd`; map to `{ name, namespace, desiredNodes, readyNodes, notReadyNodes, configMapRef?, source: "helm" }`; degrade gracefully to `[]` when Kubernetes is unavailable; unit tests | `DONE` |
| FARM-T366 | Task | `ElasticStackService.getLogstashDeployment(kubeconfig)`: list Deployments matching label `app.kubernetes.io/name=logstash`; map to `{ name, namespace, desiredReplicas, readyReplicas, configMapRef?, source: "helm" }`; degrade gracefully to `[]`; unit tests | `DONE` |
| FARM-T367 | Task | `GET /api/v1/kubernetes/elastic-stack` endpoint: returns `{ eck: { elasticsearch, kibana, logstash, beats }, inCluster: { fluentBit, fluentd, logstash }, external: { ... } }`; optional `namespace` query param; unit + e2e tests | `DONE` |

##### FARM-T365 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST388 | Sub-task | Unit test: Fluent Bit DaemonSet with 1 pod not ready → `notReadyNodes === 1`; no exception thrown | `DONE` |
| FARM-ST389 | Sub-task | Unit test: no Fluent Bit DaemonSet found → returns empty array without throwing | `DONE` |

#### FARM-S333 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T368 | Task | `ElasticStackService.getExternalElasticsearch()`: ping `ELASTICSEARCH_URL/_cluster/health` (from env var); return `{ url, reachable: bool, clusterHealth?: "green"\|"yellow"\|"red", version? }`; return `{ reachable: false }` when env var is not set; no Kubernetes client required; unit tests | `DONE` |

##### FARM-T368 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST390 | Sub-task | Unit test: `ELASTICSEARCH_URL` not set → returns `{ reachable: false }` without throwing | `DONE` |
| FARM-ST391 | Sub-task | Unit test: cluster health endpoint returns `{ status: "yellow" }` → `clusterHealth: "yellow"`, `reachable: true` | `DONE` |

#### FARM-S334 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T369 | Task | `ElasticStackTab` on the Observability page: three sections (ECK-managed, In-cluster, External); ECK Elasticsearch health rendered with green/yellow/red color badge; DaemonSet/Deployment health as `Healthy`/`Degraded`/`Unhealthy`; external ES as `Reachable`/`Unreachable`; empty state per section; unit tests | `DONE` |
| FARM-T370 | Task | `useElasticStack` hook: fetches `GET /api/v1/kubernetes/elastic-stack`, returns `{ eck, inCluster, external, loading, error }`; unit tests with mock API responses | `DONE` |

#### FARM-S335 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T371 | Task | `LogPipelineCard` on the component detail sidebar: shows collectors for the component namespace — ECK-managed resources shown first, label-based results as fallback; renders "No log pipeline detected" when all tiers return empty; unit tests | `DONE` |

---

## Phase 32: Thanos and Long-Term Metrics Visibility `DONE`

### FARM-E78: Thanos Discovery and Metrics Backend Awareness `DONE`

Thanos Querier exposes the same PromQL HTTP API as Prometheus, so Farm's existing `queryPrometheus()` already works when `PROMETHEUS_URL` points to a Thanos Querier — no query-layer changes are needed. This phase focuses on three complementary capabilities: (1) discovering Thanos components running in the cluster so operators can see their health, (2) auto-detecting whether the configured metrics endpoint is plain Prometheus, Thanos, Grafana Mimir, or Cortex, and (3) surfacing that knowledge in the UI to unlock longer query time-ranges and richer observability context. The same three-tier discovery model used in Phase 31 applies here: operator/CRD → label-based (Helm/YAML) → external URL detection.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S336 | Story | Backend: Thanos operator and CRD-based component discovery — Querier, Store Gateway, Compactor, Ruler, and sidecar via `monitoring.thanos.io` CRDs or kube-prometheus-stack sidecar container labels | `DONE` |
| FARM-S337 | Story | Backend: Label-based Thanos discovery for Helm and plain-YAML installs — bitnami/thanos and thanos-io/thanos chart label conventions across Deployments and StatefulSets | `DONE` |
| FARM-S338 | Story | Backend: Metrics backend auto-detection — determine whether `PROMETHEUS_URL` points to plain Prometheus, Thanos Querier, Grafana Mimir, or Cortex via response headers and probe endpoints | `DONE` |
| FARM-S339 | Story | Frontend: Thanos component health panel on the Observability page — unified view of operator-managed and label-based components with per-type sections and health badges | `DONE` |
| FARM-S340 | Story | Frontend: Metrics backend badge and extended time-range awareness — show detected backend type on the Observability page header; extend max query window to 90 days when Thanos, Mimir, or Cortex is detected | `DONE` |

#### FARM-S336 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T372 | Task | `ThanosService.getThanosOperatorComponents(kubeconfig)`: list Thanos CRs from `monitoring.thanos.io` (thanos-operator) and detect Thanos sidecar containers in kube-prometheus-stack Prometheus pods via label `app.kubernetes.io/component=thanos-sidecar`; map each component to `{ name, namespace, type: "querier"\|"store-gateway"\|"compactor"\|"ruler"\|"sidecar", ready: bool, source: "operator" }`; degrade gracefully to `[]` when CRDs are absent; unit tests | `DONE` |

##### FARM-T372 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST392 | Sub-task | Unit test: Thanos Querier CR present → returned with `type: "querier"`, `source: "operator"`, `ready: true` | `DONE` |
| FARM-ST393 | Sub-task | Unit test: `monitoring.thanos.io` CRD absent (404 from CustomObjectsApi) → `getThanosOperatorComponents()` returns `[]` without throwing | `DONE` |

#### FARM-S337 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T373 | Task | `ThanosService.getThanosLabelBased(kubeconfig)`: list Deployments and StatefulSets matching labels `app.kubernetes.io/name=thanos-query`, `app.kubernetes.io/name=thanos-storegateway`, `app.kubernetes.io/name=thanos-compactor`, `app.kubernetes.io/name=thanos-ruler` (bitnami/thanos and thanos-io/thanos chart conventions); map to `{ name, namespace, type, readyReplicas, desiredReplicas, source: "helm" }`; degrade gracefully to `[]`; unit tests | `DONE` |
| FARM-T374 | Task | `GET /api/v1/kubernetes/thanos`: returns `{ operator: ThanosComponent[], inCluster: ThanosComponent[], backendType: string, longTermEnabled: bool }`; optional `namespace` query param filters in-cluster results by namespace; unit + e2e tests | `DONE` |

#### FARM-S338 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T375 | Task | `ThanosService.detectMetricsBackend()`: HEAD or GET `PROMETHEUS_URL/api/v1/query` and inspect response headers — `X-Thanos-*` headers indicate Thanos Querier; probe `/ready` response body for Cortex/Mimir markers; return `{ type: "prometheus"\|"thanos"\|"mimir"\|"cortex"\|"unknown", version?: string, multiCluster?: bool }`; returns `{ type: "unknown" }` when `PROMETHEUS_URL` is not set or unreachable; unit tests | `DONE` |

##### FARM-T375 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST394 | Sub-task | Unit test: response includes `X-Thanos-Querier-Store-Addresses` header → `detectMetricsBackend()` returns `{ type: "thanos" }` | `DONE` |
| FARM-ST395 | Sub-task | Unit test: no Thanos headers, no Mimir/Cortex markers → `detectMetricsBackend()` returns `{ type: "prometheus" }` | `DONE` |

#### FARM-S339 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T376 | Task | `ThanosHealthPanel` on the Observability page: two sub-sections (Operator-managed, Helm/YAML); each component rendered with a health badge (`Ready`/`Degraded`); shows component type label (Querier, Store Gateway, Compactor, Ruler, Sidecar); empty state "No Thanos components detected" when both tiers return empty; unit tests | `DONE` |

#### FARM-S340 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T377 | Task | `MetricsBackendBadge` on the Observability page header: displays "Prometheus", "Thanos", "Mimir", or "Cortex" based on `detectMetricsBackend()` result; when a long-term backend (Thanos, Mimir, Cortex) is detected, extends the metrics time-range picker max from 7 days to 90 days; `useMetricsBackend` hook fetches `GET /api/v1/kubernetes/thanos` and returns `{ backendType, longTermEnabled, loading, error }`; unit tests | `DONE` |

---

## Phase 33: UX/UI Quality and Accessibility `TODO`

### FARM-E79: UX/UI Quality and Accessibility `TODO`

> Systematic improvements to the Farm Web interface derived from a full UX/UI audit. The audit identified six areas requiring work: form validation feedback, loading state consistency, empty state standardization, accessibility hardening, mutation feedback and recovery, and Storybook coverage. All changes are purely frontend and do not require API modifications. The guiding principle is to fix patterns across the entire application uniformly rather than fixing individual pages in isolation.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S341 | Story | Form UX improvements — real-time inline validation, unsaved-changes detection, and scroll-to-first-error on submit failure across all React Hook Form forms | `TODO` |
| FARM-S342 | Story | Loading state standardization — branded page-level Suspense fallback, consistent row-count-aware skeletons on all list/table pages, and pending states on mutation buttons and confirmation dialogs | `TODO` |
| FARM-S343 | Story | Empty state standardization — replace all ad-hoc "No data" strings and raw `<TableCell>` fallbacks with the `EmptyState` component; add action CTAs where the user can immediately address the empty state | `TODO` |
| FARM-S344 | Story | Accessibility hardening — `aria-describedby` linking form errors to inputs, meaningful alt text and `aria-label` on icon-only buttons, minimum 44×44 px touch targets, and `<abbr>` for metric abbreviations | `TODO` |
| FARM-S345 | Story | Feedback and recovery improvements — loading spinner in confirmation dialogs during async actions, Sonner toast with a 5-second undo action for destructive operations, and distinct pending/success/error mutation phases | `TODO` |
| FARM-S346 | Story | Storybook coverage expansion — stories for all shared components (`EmptyState`, `ConfirmDialog`, `PageHeader`) and new UX patterns (form validation states, loading skeletons, empty states) | `TODO` |

#### FARM-S341 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T378 | Task | Real-time inline validation: configure React Hook Form with `mode: "onChange"` across all forms (login, team edit, alerting rule, component create, SLO create, pipeline create); wrap each field error in `<p role="alert" aria-live="polite">` so screen readers announce errors without a page reload; unit tests | `TODO` |
| FARM-T379 | Task | `useUnsavedChanges(isDirty: boolean)` hook: sets `window.onbeforeunload` when `isDirty` is true and clears it on submit or unmount; renders an "Unsaved changes" badge next to the submit button when `formState.isDirty`; applied to team edit, component edit, and alerting rule forms; unit tests | `TODO` |
| FARM-T380 | Task | Scroll-to-first-error on submit: after a failed form submission identify the first invalid field using `Object.keys(formState.errors)[0]`, call `scrollIntoView({ behavior: "smooth", block: "center" })` on the corresponding input ref; applied to all multi-section forms; unit tests | `TODO` |

##### FARM-T379 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST396 | Sub-task | Unit test: `useUnsavedChanges(true)` → `window.onbeforeunload` is set; `useUnsavedChanges(false)` → `window.onbeforeunload` is null | `TODO` |

#### FARM-S342 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T381 | Task | `AppLoadingFallback` component: replaces the generic `<Skeleton className="h-full w-full" />` in `app/(protected)/layout.tsx` Suspense fallback; renders the Farm logo centered with a subtle pulse animation to provide brand context during navigation; unit tests | `TODO` |
| FARM-T382 | Task | Standardize data-fetching skeletons: audit all pages that expose `isLoading`/`isPending` from React Query; ensure every list and table renders a skeleton with the same column structure as the real data (default 5 rows); affected pages: teams, environments, SLO list, alerting rules, pipelines, incidents, registry vulnerabilities panel; unit tests | `TODO` |
| FARM-T383 | Task | Mutation pending states: add `isPending: boolean` prop to `ConfirmDialog`; disable both action buttons and replace confirm label with "Processing…" and a `<Loader2 className="animate-spin" />` icon while pending; all standalone delete/trigger buttons set `disabled` and show a spinner during the mutation; unit tests | `TODO` |

##### FARM-T383 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST397 | Sub-task | Unit test: `ConfirmDialog` with `isPending=true` → confirm button is disabled and renders spinner; cancel button is also disabled; neither `onConfirm` nor `onCancel` fire on click | `TODO` |

#### FARM-S343 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T384 | Task | Replace ad-hoc empty state patterns: audit every page for raw "No X found" strings inside `<TableCell colSpan>` or bare `<div>` elements; replace with `<EmptyState icon title description />` component; affected: component CRD resources tab, incidents list, pipelines list, environments list, SLO list, registry vulnerabilities panel, gateway routes; unit tests | `TODO` |
| FARM-T385 | Task | Add action CTAs to empty states: where the user can immediately act, pass a primary button as `children` of `<EmptyState>`; examples — "Create SLO" in the SLO tab, "Add Alerting Rule" in the alerting rules page, "Add Pipeline" in the pipelines page; each CTA opens the existing create form/dialog; unit tests | `TODO` |

#### FARM-S344 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T386 | Task | Form error accessibility: for every React Hook Form `<Input>` with a `fieldState.error`, set `aria-invalid="true"` and `aria-describedby="<fieldName>-error"` on the input element; give the companion error `<p>` the matching `id="<fieldName>-error"`; affects all forms in the application; unit tests | `TODO` |
| FARM-T387 | Task | Touch target sizing: audit all interactive elements on mobile-relevant views; enforce minimum `min-h-11 min-w-11` (44 px) on icon-only buttons, navigation links, and table row action menus; update the `icon-sm` and `icon-xs` button variants in `components/ui/button.tsx` to meet the 44 px minimum; unit tests | `TODO` |
| FARM-T388 | Task | Alt text and icon accessibility: add descriptive `aria-label` to every icon-only button (e.g. edit, delete, refresh) that currently relies solely on `aria-hidden="true"` on the inner icon; add `alt` attributes to repository avatar images and provider logos; wrap metric abbreviations ("RPS", "P99", "P50", "P95") in `<abbr title="…">` with full expansion; unit tests | `TODO` |

##### FARM-T386 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST398 | Sub-task | Unit test: form input rendered with `fieldState.error` set → `aria-invalid="true"` present and `aria-describedby` value matches the `id` of the sibling error `<p>` element | `TODO` |

#### FARM-S345 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T389 | Task | Confirmation dialog loading state: wire `isPending` from the parent mutation into `ConfirmDialog` for all destructive action dialogs (delete team, delete component, remove team member, delete alerting rule, delete SLO, delete pipeline); validate that no dialog can be dismissed while an action is in flight; unit tests | `TODO` |
| FARM-T390 | Task | `useUndoableDelete(deleteFn, restoreFn, options?)` hook: calls `deleteFn` immediately on invoke; shows a Sonner toast with an "Undo" action button; if user clicks Undo within the 5-second window, calls `restoreFn` and dismisses the toast; after 5 seconds, the undo window closes silently; implement for team member removal and component deletion as the initial rollout; unit tests | `TODO` |

##### FARM-T390 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST399 | Sub-task | Unit test: `useUndoableDelete` — `deleteFn` called immediately on invoke; `restoreFn` called when `undo()` is triggered within window; `restoreFn` NOT called when window expires without undo action | `TODO` |

#### FARM-S346 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T391 | Task | Storybook stories for shared components: `EmptyState` (no CTA, with CTA, with icon, compact variant), `ConfirmDialog` (default, destructive, pending state), `PageHeader` (with breadcrumbs, without breadcrumbs, with action slot), data table (loading skeleton state, populated state, empty state) | `TODO` |
| FARM-T392 | Task | Storybook stories for new UX patterns: form field with inline validation error (valid, invalid, submitting states), unsaved-changes badge, `AppLoadingFallback` branded skeleton; documents the patterns from FARM-S341 and FARM-S342 so new contributors follow the established approach | `TODO` |

---

## Phase 34: Dead Code Elimination `TODO`

### FARM-E80: Knip Dead Code and Dependency Hygiene `TODO`

> Farm is a monorepo with 665+ source files across two workspaces (`apps/api` and `apps/web`). As each phase ships, unreferenced exports, orphaned components, and stale `package.json` entries accumulate. This Epic introduces [Knip](https://knip.dev) — a static analysis tool that finds unused files, unused exports, and unused dependencies at the workspace level, complementing ESLint which only sees within-file scope. The cleanup is split by workspace because NestJS (DI-based, decorator-heavy) requires a different ignore-rule strategy than Next.js. After cleanup, a CI step prevents regressions by failing on any new dead code introduced in a PR.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S347 | Story | Knip baseline setup — install Knip as a root devDependency, create a monorepo-aware `knip.config.ts` with workspace entries, Next.js plugin for `apps/web`, and NestJS-aware ignore rules for `apps/api`; capture initial dead-code report | `TODO` |
| FARM-S348 | Story | Web workspace cleanup — resolve all Knip findings in `apps/web`: unused React components, hooks, utility functions, and unused `package.json` dependencies; full Vitest and Playwright suites must pass after each removal batch | `TODO` |
| FARM-S349 | Story | API workspace cleanup — resolve all Knip findings in `apps/api` after NestJS ignore rules are applied: unused DTOs, enums, and utility exports; unused `package.json` dependencies; all unit and e2e tests must pass | `TODO` |
| FARM-S350 | Story | CI enforcement — add a Knip step to the GitHub Actions workflows in report-only mode first; escalate to hard-fail after the initial cleanup lands; add `knip` to `make check` for local developer feedback | `TODO` |

#### FARM-S347 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T393 | Task | Install `knip` as a root devDependency; create `knip.config.ts` with workspace entries for `apps/api` and `apps/web`; enable the Knip `next` plugin for the web workspace; run `knip --reporter json` to capture the initial dead-code baseline and commit it as `knip-baseline.json` | `TODO` |
| FARM-T394 | Task | Configure NestJS-aware ignore rules for `apps/api`: exclude DI-registered classes (modules, providers, guards, interceptors, pipes declared in `@Module()` arrays), TypeORM entities and migration files loaded dynamically, decorator factories, and the `main.ts` entry point from unused-export checks; document each rule with an inline comment explaining why it is needed | `TODO` |

##### FARM-T393 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST406 | Sub-task | Verify `knip --reporter compact` exits with a known, documented count on the baseline run after all structural ignores are applied; this count becomes the acceptance threshold for FARM-S348 and FARM-S349 | `TODO` |
| FARM-ST407 | Sub-task | Add a `"knip"` script to the root `package.json` (`knip --reporter compact`) and a `"knip:ci"` variant that writes findings to `knip-report.json` for CI artifact upload | `TODO` |

#### FARM-S348 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T395 | Task | Remove unused React components, hooks, and utility functions found in `apps/web` by Knip; run `npx vitest run` after each removal batch to confirm no regressions; update barrel exports and re-exports as needed | `TODO` |
| FARM-T396 | Task | Remove unused `package.json` dependencies and devDependencies in `apps/web` identified by Knip; run `npm install` and `npm run build` after removal; full Vitest suite and Playwright e2e suite must pass | `TODO` |

#### FARM-S349 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T397 | Task | Remove unused TypeScript exports in `apps/api` (DTOs, enums, utility functions) after NestJS ignore rules are applied; run `npm run test` and `npm run test:e2e` to confirm no regressions | `TODO` |
| FARM-T398 | Task | Remove unused `package.json` dependencies in `apps/api` identified by Knip; run `npm run build` to confirm a clean compilation; all unit and e2e tests must pass | `TODO` |

#### FARM-S350 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T399 | Task | Add `knip --reporter compact --no-exit-code` step to both `ci.yml` and `web-ci.yml`; upload the JSON report as a workflow artifact; step never blocks the build in this first iteration | `TODO` |
| FARM-T400 | Task | After FARM-S348 and FARM-S349 are merged and the CI baseline is clean, remove `--no-exit-code` from both workflow steps so any new dead code introduced in a PR causes the workflow to fail; update `CONTRIBUTING.md` with Knip usage guidance (how to add an ignore rule, how to verify locally before opening a PR) | `TODO` |

##### FARM-T400 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST408 | Sub-task | Verify the hard-fail gate works: introduce a deliberately unused export in a test branch, confirm Knip exits with code 1 and the CI workflow is blocked before enabling the gate on main | `TODO` |
| FARM-ST409 | Sub-task | Add `knip` to the `check` target in the root `Makefile` so developers receive Knip feedback alongside lint, format, and tests in a single `make check` run | `TODO` |

---

## Phase 35: Elasticsearch Index Visibility `TODO`

### FARM-E81: Elasticsearch Index Linking and Health Visibility `TODO`

> Farm already surfaces Kubernetes workloads, Helm releases, IaC stacks, and service mesh topology. This Epic extends the same read-only portal pattern to Elasticsearch indices used by catalog components. Teams link one or more index patterns to a component; Farm queries the ES Stats API at runtime and shows health, doc count, and store size directly in the component detail page. Farm does not manage indices, does not hold cluster admin credentials, and does not modify mappings or settings — it is a visibility layer only, following the same model as the Prometheus, ArgoCD, and Linkerd integrations. An optional `KIBANA_URL` env var enables direct link-out to Kibana Discover for each index.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S351 | Story | `ComponentElasticsearchIndex` entity and CRUD API — link one or more ES index patterns to a catalog component; optional per-record ES URL override | `TODO` |
| FARM-S352 | Story | `ElasticsearchIndexService` — query live index stats from ES (`/_cat/indices/<pattern>`); return health, doc count, and store size; degrade gracefully when ES is unreachable | `TODO` |
| FARM-S353 | Story | Frontend: Elasticsearch tab on the component detail page — linked index patterns with health badge, doc count, store size, and optional Kibana link-out | `TODO` |
| FARM-S354 | Story | Frontend: ES indices overview page — all linked indices across all components with filter by health status | `TODO` |

#### FARM-S351 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T401 | Task | `ComponentElasticsearchIndex` entity (`id`, `componentId` FK, `indexPattern` string, `esUrl` nullable string overriding `ELASTICSEARCH_URL`, `description` nullable, `createdAt`, `updatedAt`); migration; service with `findByComponent`, `create`, `remove`; `GET /api/v1/components/:id/elasticsearch-indices`, `POST /api/v1/components/:id/elasticsearch-indices`, `DELETE /api/v1/components/:id/elasticsearch-indices/:indexId`; `JwtAuthGuard` on all; unit + e2e tests | `TODO` |

##### FARM-T401 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST410 | Sub-task | Unit test: `POST .../elasticsearch-indices` with a duplicate `indexPattern` for the same component returns 409 Conflict | `TODO` |
| FARM-ST411 | Sub-task | Unit test: `DELETE .../elasticsearch-indices/:indexId` with a non-existent id returns 404 Not Found | `TODO` |

#### FARM-S352 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T402 | Task | `ElasticsearchIndexService.getIndexStats(patterns: string[], esUrl?: string)`: calls `GET /_cat/indices/<pattern>?format=json&h=index,health,status,docs.count,store.size` against `esUrl` or `ELASTICSEARCH_URL`; maps response to `{ pattern, health: "green"\|"yellow"\|"red"\|"unknown", status, docsCount, storeSize }`; returns `{ reachable: false }` when the env var is unset or the request fails; unit tests with mock fetch | `TODO` |
| FARM-T403 | Task | `GET /api/v1/components/:id/elasticsearch-indices/stats`: resolves each linked `ComponentElasticsearchIndex`, calls `getIndexStats()`, returns `{ indexPattern, esUrl, reachable, stats? }[]`; `JwtAuthGuard` protected; unit + e2e tests | `TODO` |

##### FARM-T402 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST412 | Sub-task | Unit test: ES returns a healthy index entry → `getIndexStats()` maps `health: "green"`, `docsCount`, and `storeSize` correctly | `TODO` |
| FARM-ST413 | Sub-task | Unit test: fetch throws a network error → `getIndexStats()` returns `{ reachable: false }` without propagating the exception | `TODO` |

#### FARM-S353 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T404 | Task | `ElasticsearchIndicesTab` on the component detail page: table with columns index pattern, health badge (green/yellow/red color dot), doc count, store size, and "Open in Kibana" link-out (rendered only when `KIBANA_URL` env var is set, URL format `<KIBANA_URL>/app/discover#/?_a=(index:'<pattern>')`); "Link Index" button opens an inline dialog to add a new `ComponentElasticsearchIndex` record; empty state when no indices are linked; unit tests | `TODO` |
| FARM-T405 | Task | `useElasticsearchIndices(componentId)` hook: fetches `GET .../elasticsearch-indices/stats`; polls every 30 seconds while the tab is visible (`document.visibilityState`); returns `{ indices, loading, error }`; unit tests with mock API | `TODO` |

##### FARM-T404 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST414 | Sub-task | Unit test: index entry with `health: "red"` renders a red badge; `health: "green"` renders a green badge; `health: "unknown"` renders a grey badge | `TODO` |
| FARM-ST415 | Sub-task | Unit test: `KIBANA_URL` not configured (env var absent) → "Open in Kibana" link is not rendered in the table row | `TODO` |

#### FARM-S354 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T406 | Task | ES indices overview page at `/elasticsearch`: table of all linked `ComponentElasticsearchIndex` records across all components with live stats; filter chips by health (All / Green / Yellow / Red); component name chip links back to `/catalog/:id`; "No indices linked" empty state; unit tests | `TODO` |
| FARM-T407 | Task | `GET /api/v1/elasticsearch/indices` endpoint: aggregates all `ComponentElasticsearchIndex` records with their live stats grouped by component; returns `{ componentId, componentName, indices: [...] }[]`; `JwtAuthGuard` + `Roles("admin")` protected; unit + e2e tests | `TODO` |

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
| Phase 21: Policy Engine Expansion | 1 | 4 | `DONE` |
| Phase 22: CI/CD Hardening | 1 | 3 | `DONE` |
| Phase 23: IaC Visibility and Cataloging | 3 | 13 | `DONE` |
| Phase 24: User Profile Management | 1 | 4 | `DONE` |
| Phase 25: Feature Availability UX | 1 | 11 | `DONE` |
| Phase 26: Auth Provider Expansion | 1 | 5 | `DONE` |
| Phase 27: Advanced Search | 1 | 4 | `DONE` |
| Phase 28: Software Templates 2.0 | 1 | 4 | `DONE` |
| Phase 29: TechDocs 2.0 | 1 | 4 | `DONE` |
| Phase 30: Plugin Ecosystem | 1 | 4 | `DONE` |
| Phase 31: Elastic Stack and Log Pipeline Visibility | 1 | 5 | `DONE` |
| Phase 32: Thanos and Long-Term Metrics Visibility | 1 | 5 | `DONE` |
| Phase 33: UX/UI Quality and Accessibility | 1 | 6 | `TODO` |
| Phase 34: Dead Code Elimination | 1 | 4 | `TODO` |
| Phase 35: Elasticsearch Index Visibility | 1 | 4 | `TODO` |
| **Total** | **83** | **334** | |
