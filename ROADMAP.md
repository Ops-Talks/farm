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

## Phase 29: TechDocs 2.0 `TODO`

### FARM-E75: Multi-Builder Documentation Platform `TODO`

> Farm's current documentation module fetches Markdown files from URLs and renders them server-side. This Epic evolves it into a multi-builder documentation platform using a strategy pattern: Farm auto-detects the documentation tool used by each component repository and dispatches to the appropriate builder. MkDocs is the recommended standard (most common in DevOps/SRE teams), but teams without any build tool receive a working Markdown fallback with zero friction. The CI pipeline (webhook + BullMQ), versioning by Git tag, and optional full-text search via Elasticsearch are shared across all builders. Future builders -- Docusaurus, Hugo, Sphinx -- can be added by implementing the `DocBuilder` interface without touching the core pipeline.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S323 | Story | `DocBuilder` strategy interface and `DocBuilderFactory` auto-detection -- probe repo for build configs (`mkdocs.yml` → MkDocs; none found → Markdown fallback); `MarkdownBuilder` collects `.md` files with no external tool required | `TODO` |
| FARM-S324 | Story | `MkDocsBuilder` implementation and `DocumentationBuild` entity -- recommended builder; clone repo, run `mkdocs build`, store versioned artifacts | `TODO` |
| FARM-S325 | Story | CI publishing pipeline -- webhook endpoint triggered by GitHub/GitLab push; HMAC verification; `DocsBuildJob` BullMQ processor resolves the correct builder via `DocBuilderFactory` | `TODO` |
| FARM-S326 | Story | Versioned documentation and optional full-text search -- each build tagged with semver or branch name from webhook ref; `VersionSelector` dropdown in frontend; Elasticsearch indexing after build degrades gracefully to DB search when unavailable | `TODO` |

#### FARM-S323 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T346 | Task | `DocBuilder` interface: `supports(repoPath: string): Promise<boolean>` and `build(componentId, repoUrl, ref): Promise<BuildResult>`; `DocBuilderFactory.resolve(repoUrl, ref)`: shallow-clone repo, iterate ordered builder list calling `supports()`, return first match (MkDocs priority over Markdown fallback); unit tests | `TODO` |
| FARM-T347 | Task | `MarkdownBuilder` implementation: shallow clone repo, collect all `.md` files under `docs/` and repo root, store file paths in `DocumentationBuild` with `sourceType: "markdown"`; no external build tool required; unit tests | `TODO` |

##### FARM-T346 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST370 | Sub-task | Unit test: `DocBuilderFactory.resolve()` returns `MkDocsBuilder` instance when `mkdocs.yml` is present in the cloned repo | `TODO` |
| FARM-ST371 | Sub-task | Unit test: `DocBuilderFactory.resolve()` returns `MarkdownBuilder` instance when no recognized build config is found (fallback path) | `TODO` |

#### FARM-S324 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T348 | Task | `MkDocsBuilder` implementation: shallow clone repo, verify `mkdocs.yml` exists, run `mkdocs build --site-dir dist/` via `child_process.spawn`; store artifacts path in `DocumentationBuild`; env `MKDOCS_ENABLED=true` gates the MkDocs binary check at startup; unit tests | `TODO` |
| FARM-T349 | Task | `DocumentationBuild` entity (componentId, version, sourceType: `mkdocs \| markdown`, status: `building \| ready \| failed`, buildLog text, artifactsPath, triggeredAt, completedAt); migration; `GET /api/docs/builds/:componentId` returns build history; unit tests | `TODO` |

##### FARM-T348 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST372 | Sub-task | Unit test: `MkDocsBuilder.build()` resolves with `{ status: "ready", artifactsPath }` when `mkdocs build` exits with code 0 | `TODO` |
| FARM-ST373 | Sub-task | Unit test: missing `mkdocs.yml` → `MkDocsBuilder.supports()` returns false; `DocBuilderFactory` falls back to `MarkdownBuilder` | `TODO` |

#### FARM-S325 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T350 | Task | `POST /api/docs/webhook` accepting GitHub/GitLab push payloads; verify `X-Hub-Signature-256` HMAC; enqueue `DocsBuildJob` only when `mkdocs.yml`, `docs/` or `*.md` paths appear in changed files; unit tests with mock payloads | `TODO` |
| FARM-T351 | Task | `DocsBuildJob` BullMQ processor: call `DocBuilderFactory.resolve()` to select the correct builder, execute `builder.build()`, update `DocumentationBuild.status`, emit `docs:build-complete` WebSocket event; unit tests | `TODO` |

##### FARM-T350 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST374 | Sub-task | Unit test: invalid `X-Hub-Signature-256` HMAC returns 401 Unauthorized | `TODO` |
| FARM-ST375 | Sub-task | Unit test: push event with no `docs/`, `*.md` or build config changes is acknowledged (200) but no BullMQ job is enqueued | `TODO` |

#### FARM-S326 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T352 | Task | Tag each `DocumentationBuild` with semver or branch name from webhook ref (`refs/tags/v1.2.0` → `v1.2.0`); `GET /api/docs/:componentId/versions` returns builds sorted by version desc; unit tests | `TODO` |
| FARM-T353 | Task | Frontend `VersionSelector` dropdown in the documentation viewer header; switching version re-fetches that build's rendered content; defaults to latest `ready` build; unit tests | `TODO` |

> **Note:** Full-text search indexing (strip HTML, index into Elasticsearch with `type = "docs"`, `componentId`, `heading`, `body`, `url`) is implemented after `DocsBuildJob` completes. This feature requires the `ElasticsearchModule` introduced in Phase 27 and degrades gracefully -- skips indexing with a warn log when Elasticsearch is unavailable, falling back to the existing DB title search.

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
| FARM-ST380 | Sub-task | Unit test: valid manifest with all required fields passes validation | `TODO` |
| FARM-ST381 | Sub-task | Unit test: manifest with missing `id` fails; incompatible `farmMinVersion` (`"99.0.0"`) fails with descriptive error | `TODO` |

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
| FARM-ST382 | Sub-task | Unit test: `PluginRenderer` in iframe mode renders `<iframe sandbox="allow-scripts allow-same-origin">` with the plugin entry point URL as `src` | `TODO` |
| FARM-ST383 | Sub-task | Unit test: `React.lazy` dynamic import resolves a mock module → component is rendered inside `<Suspense>`; loading skeleton is shown before resolution | `TODO` |

##### FARM-T361 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST384 | Sub-task | Unit test: `farm:navigate` message from iframe calls `router.push` with the provided path | `TODO` |
| FARM-ST385 | Sub-task | Unit test: `farm:api-request` message from untrusted origin (not matching plugin `entryPoint` host) is rejected and logged as a security warning | `TODO` |

---

## Phase 31: Elastic Stack and Log Pipeline Visibility `TODO`

### FARM-E77: Elastic Stack and Log Collector Discovery `TODO`

> Farm already discovers Kubernetes workloads, Helm releases, Flux GitOps bindings, and KEDA scaled objects. This Epic extends that pattern to the observability data layer. Discovery operates across three tiers: ECK-managed resources (CRD-based, robust), in-cluster collectors deployed via Helm or plain YAML (label-based fallback), and external or SaaS Elasticsearch instances (URL health check). All tiers are independent and degrade gracefully — if ECK CRDs are absent, Farm falls back to label detection; if no in-cluster Elasticsearch is found, it checks `ELASTICSEARCH_URL`. The frontend surfaces a unified view on the Observability page and a focused card on the component detail page.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S331 | Story | Backend: ECK-managed resource discovery -- Elasticsearch clusters, Kibana instances, Logstash pipelines, and Beats via ECK CRDs | `TODO` |
| FARM-S332 | Story | Backend: In-cluster non-ECK discovery -- Fluent Bit and Fluentd DaemonSets and Logstash Deployments via label conventions (Helm / plain YAML installs) | `TODO` |
| FARM-S333 | Story | Backend: External and SaaS Elasticsearch health check -- ping `ELASTICSEARCH_URL`, report reachability, cluster health, and version | `TODO` |
| FARM-S334 | Story | Frontend: Elastic Stack tab on the Observability page -- unified view of ECK resources, in-cluster collectors, and external ES with per-tier sections and health badges | `TODO` |
| FARM-S335 | Story | Frontend: Log Pipeline card on the component detail page -- shows the collector(s) active in the component namespace (ECK preferred, label-based fallback) | `TODO` |

#### FARM-S331 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T362 | Task | `ElasticStackService.getEckElasticsearch(kubeconfig)`: list `Elasticsearch` CRs from `elasticsearch.k8s.elastic.co/v1`; map to `{ name, namespace, health: "green"\|"yellow"\|"red", version, nodeCount, source: "eck" }`; degrade gracefully to `[]` when CRD is absent; unit tests | `TODO` |
| FARM-T363 | Task | `ElasticStackService.getEckKibana(kubeconfig)` and `getEckBeats(kubeconfig)`: list `Kibana` and `Beat` CRs; map to `{ name, namespace, available: bool, version?, source: "eck" }`; degrade gracefully to `[]` when CRDs are absent; unit tests | `TODO` |
| FARM-T364 | Task | `ElasticStackService.getEckLogstash(kubeconfig)`: list `Logstash` CRs from `logstash.k8s.elastic.co/v1alpha1`; map to `{ name, namespace, readyReplicas, desiredReplicas, source: "eck" }`; degrade gracefully to `[]` when CRD is absent; unit tests | `TODO` |

##### FARM-T362 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST386 | Sub-task | Unit test: ECK Elasticsearch CR with `health: "green"` → returned with `source: "eck"` and correct `nodeCount` | `TODO` |
| FARM-ST387 | Sub-task | Unit test: ECK CRD not installed (404 from CustomObjectsApi) → `getEckElasticsearch()` returns `[]` without throwing | `TODO` |

#### FARM-S332 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T365 | Task | `ElasticStackService.getFluentBit(kubeconfig)` and `getFluentd(kubeconfig)`: list DaemonSets matching labels `app.kubernetes.io/name=fluent-bit` / `k8s-app=fluent-bit` and `app.kubernetes.io/name=fluentd`; map to `{ name, namespace, desiredNodes, readyNodes, notReadyNodes, configMapRef?, source: "helm" }`; degrade gracefully to `[]` when Kubernetes is unavailable; unit tests | `TODO` |
| FARM-T366 | Task | `ElasticStackService.getLogstashDeployment(kubeconfig)`: list Deployments matching label `app.kubernetes.io/name=logstash`; map to `{ name, namespace, desiredReplicas, readyReplicas, configMapRef?, source: "helm" }`; degrade gracefully to `[]`; unit tests | `TODO` |
| FARM-T367 | Task | `GET /api/v1/kubernetes/elastic-stack` endpoint: returns `{ eck: { elasticsearch, kibana, logstash, beats }, inCluster: { fluentBit, fluentd, logstash }, external: { ... } }`; optional `namespace` query param; unit + e2e tests | `TODO` |

##### FARM-T365 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST388 | Sub-task | Unit test: Fluent Bit DaemonSet with 1 pod not ready → `notReadyNodes === 1`; no exception thrown | `TODO` |
| FARM-ST389 | Sub-task | Unit test: no Fluent Bit DaemonSet found → returns empty array without throwing | `TODO` |

#### FARM-S333 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T368 | Task | `ElasticStackService.getExternalElasticsearch()`: ping `ELASTICSEARCH_URL/_cluster/health` (from env var); return `{ url, reachable: bool, clusterHealth?: "green"\|"yellow"\|"red", version? }`; return `{ reachable: false }` when env var is not set; no Kubernetes client required; unit tests | `TODO` |

##### FARM-T368 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST390 | Sub-task | Unit test: `ELASTICSEARCH_URL` not set → returns `{ reachable: false }` without throwing | `TODO` |
| FARM-ST391 | Sub-task | Unit test: cluster health endpoint returns `{ status: "yellow" }` → `clusterHealth: "yellow"`, `reachable: true` | `TODO` |

#### FARM-S334 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T369 | Task | `ElasticStackTab` on the Observability page: three sections (ECK-managed, In-cluster, External); ECK Elasticsearch health rendered with green/yellow/red color badge; DaemonSet/Deployment health as `Healthy`/`Degraded`/`Unhealthy`; external ES as `Reachable`/`Unreachable`; empty state per section; unit tests | `TODO` |
| FARM-T370 | Task | `useElasticStack` hook: fetches `GET /api/v1/kubernetes/elastic-stack`, returns `{ eck, inCluster, external, loading, error }`; unit tests with mock API responses | `TODO` |

#### FARM-S335 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T371 | Task | `LogPipelineCard` on the component detail sidebar: shows collectors for the component namespace — ECK-managed resources shown first, label-based results as fallback; renders "No log pipeline detected" when all tiers return empty; unit tests | `TODO` |

---

## Phase 32: Thanos and Long-Term Metrics Visibility `TODO`

### FARM-E78: Thanos Discovery and Metrics Backend Awareness `TODO`

Thanos Querier exposes the same PromQL HTTP API as Prometheus, so Farm's existing `queryPrometheus()` already works when `PROMETHEUS_URL` points to a Thanos Querier — no query-layer changes are needed. This phase focuses on three complementary capabilities: (1) discovering Thanos components running in the cluster so operators can see their health, (2) auto-detecting whether the configured metrics endpoint is plain Prometheus, Thanos, Grafana Mimir, or Cortex, and (3) surfacing that knowledge in the UI to unlock longer query time-ranges and richer observability context. The same three-tier discovery model used in Phase 31 applies here: operator/CRD → label-based (Helm/YAML) → external URL detection.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S336 | Story | Backend: Thanos operator and CRD-based component discovery — Querier, Store Gateway, Compactor, Ruler, and sidecar via `monitoring.thanos.io` CRDs or kube-prometheus-stack sidecar container labels | `TODO` |
| FARM-S337 | Story | Backend: Label-based Thanos discovery for Helm and plain-YAML installs — bitnami/thanos and thanos-io/thanos chart label conventions across Deployments and StatefulSets | `TODO` |
| FARM-S338 | Story | Backend: Metrics backend auto-detection — determine whether `PROMETHEUS_URL` points to plain Prometheus, Thanos Querier, Grafana Mimir, or Cortex via response headers and probe endpoints | `TODO` |
| FARM-S339 | Story | Frontend: Thanos component health panel on the Observability page — unified view of operator-managed and label-based components with per-type sections and health badges | `TODO` |
| FARM-S340 | Story | Frontend: Metrics backend badge and extended time-range awareness — show detected backend type on the Observability page header; extend max query window to 90 days when Thanos, Mimir, or Cortex is detected | `TODO` |

#### FARM-S336 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T372 | Task | `ThanosService.getThanosOperatorComponents(kubeconfig)`: list Thanos CRs from `monitoring.thanos.io` (thanos-operator) and detect Thanos sidecar containers in kube-prometheus-stack Prometheus pods via label `app.kubernetes.io/component=thanos-sidecar`; map each component to `{ name, namespace, type: "querier"\|"store-gateway"\|"compactor"\|"ruler"\|"sidecar", ready: bool, source: "operator" }`; degrade gracefully to `[]` when CRDs are absent; unit tests | `TODO` |

##### FARM-T372 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST392 | Sub-task | Unit test: Thanos Querier CR present → returned with `type: "querier"`, `source: "operator"`, `ready: true` | `TODO` |
| FARM-ST393 | Sub-task | Unit test: `monitoring.thanos.io` CRD absent (404 from CustomObjectsApi) → `getThanosOperatorComponents()` returns `[]` without throwing | `TODO` |

#### FARM-S337 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T373 | Task | `ThanosService.getThanosLabelBased(kubeconfig)`: list Deployments and StatefulSets matching labels `app.kubernetes.io/name=thanos-query`, `app.kubernetes.io/name=thanos-storegateway`, `app.kubernetes.io/name=thanos-compactor`, `app.kubernetes.io/name=thanos-ruler` (bitnami/thanos and thanos-io/thanos chart conventions); map to `{ name, namespace, type, readyReplicas, desiredReplicas, source: "helm" }`; degrade gracefully to `[]`; unit tests | `TODO` |
| FARM-T374 | Task | `GET /api/v1/kubernetes/thanos`: returns `{ operator: ThanosComponent[], inCluster: ThanosComponent[], backendType: string, longTermEnabled: bool }`; optional `namespace` query param filters in-cluster results by namespace; unit + e2e tests | `TODO` |

#### FARM-S338 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T375 | Task | `ThanosService.detectMetricsBackend()`: HEAD or GET `PROMETHEUS_URL/api/v1/query` and inspect response headers — `X-Thanos-*` headers indicate Thanos Querier; probe `/ready` response body for Cortex/Mimir markers; return `{ type: "prometheus"\|"thanos"\|"mimir"\|"cortex"\|"unknown", version?: string, multiCluster?: bool }`; returns `{ type: "unknown" }` when `PROMETHEUS_URL` is not set or unreachable; unit tests | `TODO` |

##### FARM-T375 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST394 | Sub-task | Unit test: response includes `X-Thanos-Querier-Store-Addresses` header → `detectMetricsBackend()` returns `{ type: "thanos" }` | `TODO` |
| FARM-ST395 | Sub-task | Unit test: no Thanos headers, no Mimir/Cortex markers → `detectMetricsBackend()` returns `{ type: "prometheus" }` | `TODO` |

#### FARM-S339 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T376 | Task | `ThanosHealthPanel` on the Observability page: two sub-sections (Operator-managed, Helm/YAML); each component rendered with a health badge (`Ready`/`Degraded`); shows component type label (Querier, Store Gateway, Compactor, Ruler, Sidecar); empty state "No Thanos components detected" when both tiers return empty; unit tests | `TODO` |

#### FARM-S340 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T377 | Task | `MetricsBackendBadge` on the Observability page header: displays "Prometheus", "Thanos", "Mimir", or "Cortex" based on `detectMetricsBackend()` result; when a long-term backend (Thanos, Mimir, Cortex) is detected, extends the metrics time-range picker max from 7 days to 90 days; `useMetricsBackend` hook fetches `GET /api/v1/kubernetes/thanos` and returns `{ backendType, longTermEnabled, loading, error }`; unit tests | `TODO` |

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
| Phase 23: IaC Platform | 3 | 14 | `TODO` |
| Phase 24: User Profile Management | 1 | 4 | `DONE` |
| Phase 25: Feature Availability UX | 1 | 11 | `DONE` |
| Phase 26: Auth Provider Expansion | 1 | 5 | `TODO` |
| Phase 27: Advanced Search | 1 | 4 | `TODO` |
| Phase 28: Software Templates 2.0 | 1 | 4 | `DONE` |
| Phase 29: TechDocs 2.0 | 1 | 4 | `TODO` |
| Phase 30: Plugin Ecosystem | 1 | 4 | `TODO` |
| Phase 31: Elastic Stack and Log Pipeline Visibility | 1 | 5 | `TODO` |
| Phase 32: Thanos and Long-Term Metrics Visibility | 1 | 5 | `TODO` |
| Phase 33: UX/UI Quality and Accessibility | 1 | 6 | `TODO` |
| **Total** | **81** | **327** | |
