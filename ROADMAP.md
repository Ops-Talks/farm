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
| Phase 23: IaC Visibility and Cataloging | 3 | 13 | v0.18.0 | `DONE` |
| Phase 24: User Profile Management | 1 | 4 | v0.14.7 - v0.15.0 | `DONE` |
| Phase 25: Feature Availability UX | 1 | 11 | v0.17.1 - v0.17.2 | `DONE` |
| Phase 26: Auth Provider Expansion | 1 | 5 | v0.19.0 | `DONE` |
| Phase 27: Advanced Search | 1 | 4 | v0.20.0 | `DONE` |
| Phase 28: Software Templates 2.0 | 1 | 4 | v0.17.2 | `DONE` |
| Phase 29: TechDocs 2.0 | 1 | 4 | v0.21.0 | `DONE` |
| Phase 30: Plugin Ecosystem | 1 | 4 | v0.21.1 | `DONE` |
| Phase 31: Elastic Stack and Log Pipeline Visibility | 1 | 5 | v0.22.0 | `DONE` |
| Phase 32: Thanos and Long-Term Metrics Visibility | 1 | 5 | v0.22.0 | `DONE` |
| Phase 35: Elasticsearch Index Visibility | 1 | 4 | v0.23.0 | `DONE` |
| Phase 36: Permission Scope Test Fixtures | 1 | 3 | v0.24.0 | `DONE` |
| Phase 37: User Signup & Org Invitation | 1 | 5 | v0.24.3 | `DONE` |
| Phase 33: UX/UI Quality and Accessibility | 1 | 6 | v0.24.3 | `DONE` |
| Phase 34: Dead Code Elimination | 1 | 4 | v0.24.3 | `DONE` |
| Phase 38: LDAP Client Modernization | 1 | 3 | v0.24.6 | `DONE` |
| Phase 39: Service Maturity Scorecards | 1 | 6 | v0.24.7 | `DONE` |
| Phase 40: Observability 3.0 — Full-Stack Hardening | 7 | 23 | v0.24.10 | `DONE` |
| Phase 41: Swagger/OpenAPI Hardening | 4 | 14 | v0.25.1 | `DONE` |
| Phase 42: Kubernetes Deployment — Helm Chart | 6 | 24 | v0.25.0 | `DONE` |
| Phase 43: CI/CD Pipeline Orchestration | 5 | 16 | v0.25.0 - v0.25.3 | `DONE` |

Phase 44 is intentionally omitted from this completed-phase archive because it is tracked separately in the summary below and is not part of this completed sequence.

| **Phase 45: Organization Context Hardening** | **3** | **10** | v0.25.4 | `DONE` |
| Phase 46: Granular RBAC | 3 | 12 | v0.25.5 | `DONE` |
| Phase 47: API Contract Stability | 2 | 7 | v0.25.6 | `DONE` |
| Phase 48: Platform Resilience | 3 | 10 | - | `DONE` |
| Phase 49: Dependency Modernization | 1 | 3 | - | `DONE` |

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
| Phase 33: UX/UI Quality and Accessibility | 1 | 6 | `DONE` |
| Phase 34: Dead Code Elimination | 1 | 4 | `DONE` |
| Phase 35: Elasticsearch Index Visibility | 1 | 4 | `DONE` |
| Phase 36: Permission Scope Test Fixtures | 1 | 3 | `DONE` |
| Phase 37: User Signup & Org Invitation | 1 | 5 | `DONE` |
| Phase 38: LDAP Client Modernization | 1 | 3 | `DONE` |
| Phase 39: Service Maturity Scorecards | 1 | 6 | `DONE` |
| Phase 40: Observability 3.0 — Full-Stack Hardening | 7 | 23 | `DONE` |
| Phase 41: Swagger/OpenAPI Hardening | 4 | 14 | `DONE` |
| Phase 42: Kubernetes Deployment — Helm Chart | 6 | 24 | `DONE` |
| Phase 43: CI/CD Pipeline Orchestration | 5 | 16 | `DONE` |
| Phase 44: Multi-tenancy Hardening | 5 | 20 | `DONE` |
| Phase 45: Organization Context Hardening | 3 | 10 | `DONE` |
| Phase 46: Granular RBAC | 3 | 12 | `DONE` |
| Phase 47: API Contract Stability | 2 | 7 | `DONE` |
| Phase 48: Platform Resilience | 3 | 10 | `DONE` |
| Phase 49: Dependency Modernization | 1 | 3 | `DONE` |
| Phase 50: Docker & Container Hardening | 4 | 11 | `DONE` |
| Phase 51: Helm Chart Hardening | 7 | 21 | `IN PROGRESS` |
| Phase 52: Helm Observability Integration | 3 | 6 | `DONE` |
| Phase 56: Admin User Registration | 2 | 9 | `DONE` |
| **Total** | **147** | **553** | |

---

## Phase 40: Observability 3.0 — Full-Stack Hardening

Closes the gaps in the current Prometheus + Loki + Grafana + Tempo stack to reach full open-source market standard across all three pillars of observability (logs, metrics, traces), plus alerting, SLO tracking, RUM, and continuous profiling.

### FARM-E90: Web App Server-Side Observability `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S400 | Structured JSON logging for Next.js server using Winston, matching the Promtail pipeline format (`level`, `message`, `context`, `trace_id`, `span_id`) so Loki label extraction works for the web container | `DONE` |
| FARM-S401 | Server-side OTEL Node SDK wired in `instrumentation.ts` (`register()` → `initTracing()` in the `nodejs` runtime), sending spans via OTLP to Tempo | `DONE` |
| FARM-S402 | `onRequestError` hook in `instrumentation.ts` and `global-error.tsx` boundary to capture and log unhandled server errors in structured format | `DONE` |
| FARM-S403 | Web-specific Grafana panels in `farm-logs.json`: Web Error Rate and Web Warn Count per time window using `{container="farm-web", level="error"}` queries | `DONE` |

### FARM-E91: Alerting Infrastructure `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S404 | Deploy Alertmanager in `docker-compose.observability.yml` with routing tree, grouping, and inhibition rules | `DONE` |
| FARM-S405 | Prometheus alert rules: API error rate > 5%, latency P99 > 2 s, Node.js heap > 80% | `DONE` |
| FARM-S406 | Loki alert rules: error log rate spike per container (sustained > 10 errors/min for 5 m) | `DONE` |
| FARM-S407 | Notification channels: Slack webhook and SMTP email configured as Alertmanager receivers | `DONE` |

### FARM-E92: OTel Collector Pipeline `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S408 | Replace direct OTLP-to-Tempo with Grafana Alloy as OTel Collector to enable fan-out, buffering, and retry | `DONE` |
| FARM-S409 | Tail-based sampling via Alloy: retain all error and slow (> 1 s) traces, probabilistic 10 % sampling for healthy traces | `DONE` |
| FARM-S410 | Exemplars: enable in Prometheus and prom-client, wire Grafana Tempo datasource for metric-to-trace drill-down from latency spikes | `DONE` |
| FARM-S411 | Remove dead Jaeger proxy methods (`queryJaeger*`) from `ObservabilityService`; replace with Tempo HTTP API calls | `DONE` |

### FARM-E93: Tempo Service Graph and Span Metrics `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S412 | Enable Tempo `metrics_generator` (service graph and span metrics pipelines) in `tempo.yml` | `DONE` |
| FARM-S413 | Service dependency map dashboard in Grafana auto-generated from Tempo span data | `DONE` |
| FARM-S414 | RED metrics dashboard (Rate / Errors / Duration per service) sourced from Tempo-generated span metrics | `DONE` |

### FARM-E94: SLO and Error Budget Tracking `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S415 | Add Prometheus SLO recording rules using `slok/sloth` (https://github.com/slok/sloth, Apache 2.0) for API availability (99.5 %) and latency (P99 < 500 ms). Distinct from the existing in-app SLO CRUD module (`core-slo`), which stores SLO definitions in Postgres; this story adds infrastructure-level multi-window burn-rate recording rules evaluated natively by Prometheus | `DONE` |
| FARM-S416 | Grafana dashboard for SLO compliance and error budget burn rate, sourced from the Sloth recording rules added in FARM-S415. Distinct from the in-app `/slos` page (Next.js UI), which reads from the API; this story provides an operator-facing Grafana view with 1 h / 6 h burn-rate panels and remaining budget gauges | `DONE` |
| FARM-S417 | Prometheus recording rules for high-frequency dashboard aggregations (request rate, error rate per route) | `DONE` |

### FARM-E95: Real User Monitoring — Grafana Faro `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S418 | Enable the `faro.receiver` component in Grafana Alloy (`docker-compose.observability.yml`) to receive browser telemetry from the Faro Web SDK and fan it out to Loki (logs) and Tempo (traces). No separate "Faro Collector" binary — `faro.receiver` is a GA-stable built-in component of Alloy (Apache 2.0) | `DONE` |
| FARM-S419 | Integrate `@grafana/faro-web-sdk` (Apache 2.0) in Next.js: session correlation, user journey tracking, and unhandled error capture. Core Web Vitals are already tracked as OTel spans via `web-vitals.ts`; Faro adds session-level error aggregation and navigation timing. The "Grafana Frontend Observability" app is Grafana Cloud-only and not available in self-hosted Grafana OSS — custom Loki/Tempo dashboards will be built to visualize Faro data instead | `DONE` |
| FARM-S420 | Custom Grafana dashboards for Faro RUM data: unhandled JS exceptions and promise rejections (from Loki), frontend trace waterfall (from Tempo), and Web Vitals trends per session — replacing the Cloud-only Frontend Observability app | `DONE` |

### FARM-E96: Continuous Profiling — Grafana Pyroscope `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S421 | Deploy Grafana Pyroscope (AGPL-3.0, free for self-hosted internal use of unmodified binary) in `docker-compose.observability.yml`; install the `grafana-pyroscope-app` OSS plugin in Grafana for the Explore Profiles UI | `DONE` |
| FARM-S422 | Node.js profiling agent (`@pyroscope/nodejs`, Apache 2.0) in NestJS API pushing CPU and heap profiles to the self-hosted Pyroscope server | `DONE` |

---

## Phase 41: Swagger/OpenAPI Hardening

Closes the gaps identified by the full Swagger audit (May 2026) across all 51 controllers and 118 DTO/entity files. The audit found near-universal absence of `@ApiResponse(401/403)`, 7 entities with zero `@ApiProperty`, 9 DTOs with undocumented enum fields, missing `@ApiParam` on 10 controllers, and critical issues in `app.controller.ts` and `auth.controller.ts` that break Swagger UI functionality. This phase brings the OpenAPI spec to a state suitable for public API release.

### FARM-E97: Critical Swagger Fixes `DONE`

Fixes that break Swagger UI functionality or produce actively misleading documentation. Must be resolved before any public API release.

| ID | Story | Status |
|----|-------|--------|
| FARM-S423 | Add `@ApiTags`, `@ApiOperation`, and `@ApiResponse(200)` to `app.controller.ts` — the root endpoint currently appears ungrouped and undocumented in Swagger UI, which is the first thing API consumers see | `DONE` |
| FARM-S424 | Add `@ApiBearerAuth()` to all JWT-protected handlers in `auth/auth.controller.ts` (`GET /auth/users`, `GET /auth/profile`, `PATCH /auth/profile`, `PATCH /auth/profile/password`, `POST /auth/keycloak/sync/:orgId`) — without this the Swagger UI `Authorize` button does not attach the JWT token when testing these endpoints | `DONE` |
| FARM-S425 | Replace `Record<string, unknown>` body types in `webhook-receiver.controller.ts` with typed DTOs and add `@ApiBody()` on the 3 POST webhook receivers — Swagger currently shows an empty body schema for all three | `DONE` |
| FARM-S426 | Register an M2M auth scheme in `main.ts` `DocumentBuilder` (`.addApiKey` or second `.addBearerAuth`) for IAC ingest and documentation webhook endpoints that use a static `IAC_INGEST_TOKEN` rather than a JWT; annotate those endpoints with `@ApiSecurity('iac-token')` so consumers can distinguish M2M from JWT-protected routes | `DONE` |

### FARM-E98: Auth Error Response Coverage `DONE`

The most pervasive gap in the codebase: 46 of 49 JWT-protected controllers have no `@ApiResponse(401)`, and 30 of 32 controllers using `@Roles` have no `@ApiResponse(403)`. The fix is a class-level decorator pattern already established in `auth.controller.ts` and `iac.controller.ts`.

| ID | Story | Status |
|----|-------|--------|
| FARM-S427 | Add class-level `@ApiResponse({ status: 401, description: 'Unauthorized.', type: ErrorResponseDto })` to all 46 JWT-protected controllers missing it — covers every controller that has `@UseGuards(JwtAuthGuard)` but no 401 documentation | `DONE` |
| FARM-S428 | Add class-level `@ApiResponse({ status: 403, description: 'Forbidden.', type: ErrorResponseDto })` to all ~30 controllers that apply `@Roles()` but have no 403 documentation | `DONE` |

### FARM-E99: DTO, Entity, and Parameter Annotation Completeness `DONE`

Addresses structural gaps in DTO and entity annotations that cause incomplete or incorrect schema generation: missing enum values, invisible response type fields, undocumented path and query parameters.

| ID | Story | Status |
|----|-------|--------|
| FARM-S429 | Fix enum `@ApiProperty` gaps in 9 DTOs: add `{ enum: XxxEnum, enumName: 'XxxEnum' }` to `update-deployment.dto.ts`, `update-api-spec.dto.ts`, `update-incident-status.dto.ts`, `invite-member.dto.ts`, `update-member-role.dto.ts`, `list-runs-query.dto.ts`, `slo-budget-response.dto.ts`; add the missing `enum:` key to existing `@ApiProperty` in `create-invitation.dto.ts` and `list-deployments-query.dto.ts`. Also fix 5 entities where enum fields have `@ApiProperty` without `enum:` key (`component.entity.ts`, `deployment.entity.ts`, `team.entity.ts`, `user-organization.entity.ts`, `pipeline-run.entity.ts`) | `DONE` |
| FARM-S430 | Add `@ApiParam` to 10 controllers with un-annotated path parameters: `user-management.controller.ts` (6 params), `invitation.controller.ts` (4), `istio.controller.ts` (4), `integration-credential.controller.ts` (3), `argocd.controller.ts` (2), `jenkins.controller.ts` (2), `kubernetes.controller.ts` (5 remaining), `auth.controller.ts` (1), `circleci.controller.ts` (1), `travisci.controller.ts` (1) | `DONE` |
| FARM-S431 | Add `@ApiQuery` decorators to `user-management.controller.ts` `GET /users` for `page`, `pageSize`, `search`, `role`, and `orgId` pagination and filter parameters | `DONE` |
| FARM-S432 | Add `@ApiProperty` to the 7 entities with zero annotations that are used as response types in controllers: `org-invitation.entity.ts` (14 fields), `tag-policy.entity.ts` (7), `resource-violation.entity.ts` (9), `search-config.entity.ts` (8), `opa-result.entity.ts` (8), `invitation-token.entity.ts` (19), and `password-reset.entity.ts` (6, internal but referenced) | `DONE` |

### FARM-E100: Swagger Config and Polish `DONE`

Low-severity completeness and consistency improvements to the Swagger setup that improve developer experience and API discoverability.

| ID | Story | Status |
|----|-------|--------|
| FARM-S433 | Enable `introspectComments: true` in the `@nestjs/swagger` plugin config in `nest-cli.json` — this converts existing JSDoc property comments into Swagger `description` values automatically, reducing the manual annotation burden across the ~240 unannotated fields in the top-10 most-gapped DTOs | `DONE` |
| FARM-S434 | Normalize the 12 lowercase `@ApiTags` values to Title Case: `Analytics`, `Cost`, `Features`, `Integrations`, `OPA`, `Registry`, `Scorecards`, `Search`, `Setup` — mixed casing causes incorrect alphabetical sort order in the Swagger UI sidebar | `DONE` |
| FARM-S435 | Add `DocumentBuilder.addTag()` entries with human-readable descriptions in `main.ts` for the major feature groups (Catalog, Authentication, Environments, Teams, Observability, IaC, Kubernetes, Integrations, FinOps, Scorecards, Search) so the Swagger UI sidebar shows tooltips for each group | `DONE` |
| FARM-S436 | Fix `traces-ingest.controller.ts`: add missing `@ApiResponse(502)` (collector unreachable) and `@ApiResponse(204)` (no endpoint configured); remove the misleading `@ApiOperation.description` claim that a JWT is required when no `@UseGuards` is applied | `DONE` |

---

## Phase 42: Kubernetes Deployment — Helm Chart

Delivers a production-grade Helm chart (`deploy/helm/farm/`) covering both application services (api, web), the database migration lifecycle as a pre-upgrade Job hook, optional bundled PostgreSQL and Redis via Bitnami subcharts (disabled by default for production), and example values files for development and production profiles. CI/CD image publishing is out of scope for this phase.

### FARM-E101: Chart Foundation `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S437 | Create `deploy/helm/farm/Chart.yaml` with `apiVersion: v2`, chart name, versioning aligned to the Farm release version, and Bitnami `postgresql` (15.x) and `redis` (19.x) as optional dependencies. Run `helm dependency update` to generate `Chart.lock` | `DONE` |
| FARM-S438 | Create `values.yaml` with the complete configurable schema: `image` (registry, repository, tag, pullPolicy), `replicaCount`, `resources`, `env`, `api.existingSecret`, `ingress` (className, annotations, TLS), `autoscaling`, `pdb`, `externalDatabase.*`, `externalRedis.*`, `postgresql` (enabled + Bitnami passthrough), `redis` (enabled + Bitnami passthrough), `migration` | `DONE` |
| FARM-S439 | Create `templates/_helpers.tpl` with named template helpers: `farm.fullname`, `farm.name`, `farm.chart`, `farm.labels`, `farm.selectorLabels`, `farm.api.image`, `farm.web.image`, `farm.serviceAccountName.api`, `farm.serviceAccountName.web` | `DONE` |
| FARM-S440 | Create `templates/NOTES.txt` with post-install access instructions (port-forward commands for api and web), migration Job status check command, and link to `deploy/helm/farm/README.md` | `DONE` |

### FARM-E102: API Workload `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S441 | `templates/api/deployment.yaml` — Deployment with readiness and liveness probes on `/api/health`, `envFrom` referencing ConfigMap and Secret, resource requests/limits from values, rolling update strategy (`maxUnavailable: 0`), and optional `topologySpreadConstraints` | `DONE` |
| FARM-S442 | `templates/api/service.yaml` — ClusterIP Service for the API on port 3000 | `DONE` |
| FARM-S443 | `templates/api/serviceaccount.yaml` — optional dedicated ServiceAccount controlled by `api.serviceAccount.create`, with optional annotations for IRSA/Workload Identity | `DONE` |
| FARM-S444 | `templates/api/configmap.yaml` + `templates/api/secret.yaml` — non-sensitive environment variables in ConfigMap; sensitive variables (JWT_SECRET, database credentials, SMTP, OAuth) in a Kubernetes Secret; Secret creation is skipped when `api.existingSecret` is set (existingSecret pattern for GitOps with External Secrets Operator or Sealed Secrets) | `DONE` |
| FARM-S445 | `templates/api/hpa.yaml` + `templates/api/pdb.yaml` — optional HorizontalPodAutoscaler (CPU threshold 70%, configurable `minReplicas`/`maxReplicas`) and optional PodDisruptionBudget (`minAvailable: 1`; skipped when `replicaCount` is 1 to avoid blocking single-replica upgrades) | `DONE` |

### FARM-E103: Web Workload `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S446 | `templates/web/deployment.yaml` — Deployment with readiness and liveness probes on `/api/health`, env for `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, rolling update strategy | `DONE` |
| FARM-S447 | `templates/web/service.yaml` + `templates/web/serviceaccount.yaml` — ClusterIP Service on port 3001 and optional ServiceAccount following the same pattern as the API | `DONE` |
| FARM-S448 | `templates/web/hpa.yaml` + `templates/web/pdb.yaml` — optional HPA and PodDisruptionBudget for the web workload, using the same values schema pattern as the API | `DONE` |

### FARM-E104: Infrastructure Templates `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S449 | `templates/ingress.yaml` — generic Ingress resource with optional TLS termination; `ingressClassName` and all annotations are fully configurable via values so the chart is neutral across nginx-ingress, Traefik, AWS Load Balancer Controller, and others; supports separate hostnames for api and web services in a single Ingress object | `DONE` |
| FARM-S450 | `templates/migration-job.yaml` — Kubernetes Job annotated with `helm.sh/hook: pre-upgrade,pre-install`, `helm.sh/hook-weight: "-1"`, and `helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded`; uses the api image to run `npm run migration:run`; shares the same Secret/ConfigMap env references as the API Deployment so it always runs against the correct database | `DONE` |
| FARM-S451 | Wire the Bitnami `postgresql` subchart: pass through all `postgresql.*` values; when `postgresql.enabled: false`, populate the API's database env vars from `externalDatabase.host/port/user/password/name` values instead | `DONE` |
| FARM-S452 | Wire the Bitnami `redis` subchart: pass through all `redis.*` values; when `redis.enabled: false`, populate the API's Redis env vars from `externalRedis.host/port` values instead | `DONE` |

### FARM-E105: DX and Documentation `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S453 | `values-dev.yaml` — example override file enabling embedded `postgresql` and `redis` subcharts, 1 replica, no TLS, debug log level; ready to use with `helm install farm deploy/helm/farm -f deploy/helm/farm/values-dev.yaml` | `DONE` |
| FARM-S454 | `values-production.yaml` — example override file for production: external DB and Redis, 2 replicas, TLS ingress with cert-manager annotations, `existingSecret` references for all sensitive values; every field annotated with an inline comment | `DONE` |
| FARM-S455 | `deploy/helm/farm/README.md` — prerequisites (Helm 3.x, kubectl), quick-start for dev and production profiles, migration lifecycle explanation, upgrade and rollback instructions, complete parameter reference table | `DONE` |
| FARM-S456 | Add Makefile targets: `helm-lint` (`helm lint` + `helm template --debug`), `helm-template`, `helm-install`, `helm-upgrade`, `helm-diff` (requires helm-diff plugin), `helm-uninstall`; update ROADMAP.md Phase 42 status and Summary totals at completion | `DONE` |

### FARM-E106: Observability Integration Assets `DONE`

Ships the observability assets that plug into the user's existing monitoring stack (e.g., kube-prometheus-stack + Grafana Loki). The chart does not deploy Grafana, Prometheus, Loki, Tempo, or Pyroscope — it integrates with whichever stack the user already has. All resources are opt-in via feature flags in values.yaml.

| ID | Story | Status |
|----|-------|--------|
| FARM-S457 | Extend `values.yaml` with an `api.observability` block covering OTEL (`otelEnabled`, `otelExporterEndpoint`, `otelServiceName`), Pyroscope (`pyroscopeEnabled`, `pyroscopeServerAddress`), and backend URLs (`grafanaUrl`, `prometheusUrl`, `tempoUrl`, `lokiUrl`); wire all fields into `templates/api/configmap.yaml` | `DONE` |
| FARM-S458 | `templates/servicemonitor.yaml` — Prometheus Operator `ServiceMonitor` resource that configures scraping of the API `/metrics` endpoint; conditional on `serviceMonitor.enabled`; includes configurable `interval`, `scrapeTimeout`, `namespace`, and label selectors to match any `kube-prometheus-stack` installation | `DONE` |
| FARM-S459 | `templates/prometheusrule.yaml` — Prometheus Operator `PrometheusRule` resource shipping the alert rules from `observability/prometheus-rules.yml` as a Kubernetes-native resource; conditional on `prometheusRule.enabled`; rules are embedded verbatim so they stay in sync with the docker-compose observability stack | `DONE` |
| FARM-S460 | `templates/grafana-dashboards.yaml` — all 6 Grafana dashboard JSON files (`farm-api`, `farm-logs`, `farm-rum`, `farm-slo`, `farm-traces`, `farm-infra`) packaged as individual Kubernetes `ConfigMap` resources with label `grafana_dashboard: "1"` for automatic discovery and import by the Grafana sidecar in `kube-prometheus-stack`; conditional on `grafanaDashboards.enabled`; dashboards are embedded from `observability/grafana/provisioning/dashboards/` at chart render time | `DONE` |

---

## Phase 43: CI/CD Pipeline Orchestration

Evolves the Farm from a CI/CD **portal** (displays data from external tools) to a CI/CD **orchestrator** (uses external tools as execution backends). Closes the four main gaps: Component↔Pipeline binding, external CI backend delegation, webhook feedback loop, and automatic Deployment record creation.

### FARM-E107: Component–Pipeline Binding `DONE`

Establishes a first-class relationship between catalog components and their delivery pipelines. A component can have multiple pipelines (build, release, rollback). A pipeline is always scoped to a single component.

| ID | Story | Status |
|----|-------|--------|
| FARM-S461 | Add nullable `componentId` UUID FK to `Pipeline` entity with a TypeORM `ManyToOne` → `Component` relation. Generate and run migration. Update `CreatePipelineDto` / `UpdatePipelineDto` with optional `componentId` field. Update `PipelinesService.findAll` to accept `componentId` filter. | `DONE` |
| FARM-S462 | New endpoint `GET /components/:id/pipelines` on the Catalog controller — lists all pipelines bound to a component, each entry includes latest run status and duration. Delegates to `PipelinesService.findByComponent(componentId)`. | `DONE` |
| FARM-S463 | UI — "Pipelines" tab on the Component detail page. Lists bound pipelines with latest run status badge, last run timestamp, and a "Trigger" button. Clicking a run row navigates to the run detail page. | `DONE` |

### FARM-E108: External CI Backend for Pipeline Stages `DONE`

Makes the `PipelineProcessor` delegate stage execution to real external CI/CD tools. A stage's `config` gains a typed `backend` field; when present, the processor calls the corresponding integration service instead of running an internal script.

| ID | Story | Status |
|----|-------|--------|
| FARM-S464 | Extend the `PipelineStage` interface (stages JSON column) with a `backend?: { provider: 'github-actions' \| 'argocd' \| 'jenkins' \| 'circleci'; ref?: string; workflowId?: string; appName?: string; jobName?: string }` field. Update DTO validation schema. No DB migration needed (stages is already a JSON column). | `DONE` |
| FARM-S465 | `PipelineProcessor`: when executing a `build` stage with `backend.provider = 'github-actions'`, call `GitHubActionsService.triggerWorkflow(orgId, workflowId, ref)`. When executing a `deploy` stage with `backend.provider = 'argocd'`, call `ArgoCDService.syncApplication(orgId, appName)`. Set stage status to `running` immediately, `succeeded` or `failed` based on the external call result. | `DONE` |
| FARM-S466 | Extend `StageResult` interface with `externalRunId?: string` and `externalRunUrl?: string`. When triggering an external CI job, persist the external run ID and URL in the stage result immediately so webhooks can correlate back to this run. | `DONE` |
| FARM-S467 | Add `GitHubActionsService.triggerWorkflow(orgId, workflowId, ref)` method using `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` GitHub API. Returns the newly created workflow run ID by polling `GET /repos/{owner}/{repo}/actions/runs` for up to 10 s after dispatch. | `DONE` |

### FARM-E109: Webhook Feedback Loop `DONE`

Closes the loop between external CI/CD tools and Farm pipeline runs. Today webhooks emit a `CI_BUILD_UPDATED` event that nobody handles. This epic wires that event to update the relevant `PipelineRun` stage and propagate the final run status.

| ID | Story | Status |
|----|-------|--------|
| FARM-S468 | Add `POST /webhooks/github-actions` endpoint. Validates `x-hub-signature-256` HMAC (secret stored as `IntegrationCredential` of type `GITHUB_ACTIONS`). Handles `workflow_run` events with action `completed`: looks up a `PipelineRun` whose any `StageResult.externalRunId` matches the incoming run ID, then updates that stage's status to `succeeded` or `failed`. | `DONE` |
| FARM-S469 | Handle the existing `CI_BUILD_UPDATED` event emitted by the CircleCI / Jenkins / Travis CI webhook handlers. Implement `PipelinesService.updateStageFromExternalEvent(externalRunId, status, output)` — finds the `PipelineRun` with a matching `externalRunId` in any stage result, updates the stage, and advances the overall run status if all stages are terminal. | `DONE` |
| FARM-S470 | Add `POST /webhooks/argocd` endpoint for ArgoCD `ResourceStatus` sync notifications. On `Synced`/`OutOfSync`/`Degraded` events, update the corresponding PipelineRun deploy stage. Document how to configure the ArgoCD notification webhook in `docs/developer-guide/`. | `DONE` |

### FARM-E110: Pipeline → Deployment Auto-creation `DONE`

When a pipeline's `deploy` stage succeeds, automatically create a `Deployment` record in the Farm environments module. This gives the catalog a full deployment history without manual data entry.

| ID | Story | Status |
|----|-------|--------|
| FARM-S471 | Extend `PipelineStage` config for the `deploy` type with `componentId?: string` and `environmentId?: string`. When a deploy stage transitions to `succeeded` in `PipelineProcessor`, call `DeploymentsService.create()` with the component/environment from the stage config and version from `PipelineRun.metadata.version`. | `DONE` |
| FARM-S472 | Add nullable `deploymentId` UUID field to `PipelineRun` entity. After auto-creating the Deployment, persist its ID on the run. Generate and run migration. Allows the UI to navigate from a pipeline run directly to the deployment record. | `DONE` |
| FARM-S473 | Emit `PIPELINE_RUN_UPDATED` WebSocket event on every stage status transition (not only on final run completion). Payload includes the updated `StageResult[]` so the UI can render live per-stage progress without polling. | `DONE` |

### FARM-E111: Unified History UI `DONE`

Surfaces the orchestration data in the Farm web UI so engineers can navigate from a component to its full delivery history — pipelines, runs, stages, external CI links, and deployments — in a single place.

| ID | Story | Status |
|----|-------|--------|
| FARM-S474 | UI — Component detail "Pipelines" tab (FARM-S463 provides the API). Show each bound pipeline as an expandable row with the last 5 run statuses as colored badges. Each badge links to the run detail page. | `DONE` |
| FARM-S475 | UI — Pipeline run detail page: show per-stage progress with status icon, duration, and an external link button when `StageResult.externalRunUrl` is set (navigates to GitHub Actions run, ArgoCD app, or Jenkins job). | `DONE` |
| FARM-S476 | UI — Deployments list page and component deployment history: show a "via pipeline" badge with a link to the `PipelineRun` when `Deployment` was created automatically from a pipeline (i.e., when the source `PipelineRun.deploymentId` is set). | `DONE` |

---

## Phase 44: Multi-tenancy Hardening

Closes systematic cross-tenant data leakage gaps found across 10+ modules. Every `findOne(id)` call today queries by ID alone — no `organizationId` filter — meaning any authenticated user can read, modify, or delete another tenant's data by guessing a UUID. This phase fixes the schema, service, and controller layers in order of severity, then adds org-scoped uniqueness constraints and an e2e cross-tenant security test suite.

**Reference pattern (correct implementation):** `IntegrationCredentialService` — every method accepts and filters by `orgId`; every controller endpoint reads `req.organizationId` and passes it down.

### FARM-E112: Cross-cutting Guard & Repository Pattern `DONE`

Provides the shared primitives the rest of the phase builds on.

| ID | Story | Status |
|----|-------|--------|
| FARM-S477 | Create `@OrgRequired()` decorator (in `src/common/decorators/`) that attaches metadata and a companion `OrgRequiredGuard` that throws `ForbiddenException` when `req.organizationId` is absent. Apply to all controller classes fixed in E114–E115 so missing the `X-Organization-Id` header is never silently ignored. `OrgRequiredGuard` performs membership validation itself using `DataSource` to avoid NestJS execution-order issues (guards run before interceptors). | `DONE` |
| FARM-S478 | `OrgContextInterceptor` runs as `APP_INTERCEPTOR` for optional org-context routes. `OrgRequiredGuard` handles membership check and sets `req.organizationId` for all `@OrgRequired()` routes. | `DONE` |

### FARM-E113: Entity Schema — Add organizationId to Missing Entities `DONE`

Schema changes and migrations that enable the service fixes in E114–E115.

| ID | Story | Status |
|----|-------|--------|
| FARM-S479 | Add nullable `organizationId` UUID column (indexed) to `PipelineRun` entity. Generate migration `1776600000001-AddPipelineRunOrgId`. Backfill from parent `Pipeline.organizationId` in the migration `up()`. | `DONE` |
| FARM-S480 | Add nullable `organizationId` UUID column (indexed) to `ActualCost` and `CostEstimate` entities. Generate migration `1776600000002-AddFinOpsOrgId`. | `DONE` |
| FARM-S481 | Add nullable `organizationId` UUID column (indexed) to `ContainerVulnerability` entity. Generate migration `1776600000003-AddContainerVulnOrgId`. | `DONE` |
| FARM-S482 | Add nullable `organizationId` UUID column (indexed) to all IaC entities: `IacStack`, `IacRun`, `IacModule`, `IacResource`, `IacModuleDrift`, `IacModuleVersion`, `IacResourceDependency`. Generate migration `1776600000004-AddIaCOrgId`. | `DONE` |

### FARM-E114: Service & Controller Fix — Tier 1 CRITICAL `DONE`

Modules where a cross-tenant write or destructive action is possible today.

| ID | Story | Status |
|----|-------|--------|
| FARM-S483 | **Catalog:** `CatalogService.findOne(id, orgId?)` and `findAllWithContainerImage(orgId?)` filter by `organizationId` when provided. `CatalogController` GET/PATCH/DELETE `:id` endpoints read `req.organizationId` and pass it. Apply `@OrgRequired()`. Removed `@UseInterceptors(CacheInterceptor)` from list/findOne to fix org-unaware cache security leak. | `DONE` |
| FARM-S484 | **Pipelines:** `PipelinesService.findOne(id, orgId?)` and `findRun(pipelineId, runId, orgId?)` filter by `organizationId`. `create()` sets `organizationId` on both `Pipeline` and `PipelineRun` from `req.organizationId`. `PipelinesController` GET/PATCH/DELETE/trigger endpoints pass `req.organizationId`. Pipeline `name` uniqueness constraint scoped to `[name, organizationId]` composite unique index. | `DONE` |
| FARM-S485 | **IaC:** `IacService.getStack(id, orgId)`, `listStacks(orgId)`, and all run/module/resource queries filter by `organizationId`. `IacController` reads and passes `req.organizationId`. `IacStack` name+environment uniqueness scoped by org. `ingestRun` and `importStacks` accept optional `X-Organization-Id` header to scope ingestion. Apply `@OrgRequired()` to org-scoped endpoints. | `DONE` |

### FARM-E115: Service & Controller Fix — Tier 2 HIGH `DONE`

Modules where cross-tenant reads and updates are possible.

| ID | Story | Status |
|----|-------|--------|
| FARM-S486 | **Environments:** `EnvironmentsService.findOne(id, orgId?)` filters by `organizationId`. `EnvironmentsController` GET/PATCH/DELETE `:id` pass `req.organizationId`. | `DONE` |
| FARM-S487 | **SLO:** `SloService.findOne(id, orgId?)` and `getErrorBudget(id, orgId?)` filter by `organizationId`. `SloController` GET/PATCH/DELETE `:id` pass `req.organizationId`. | `DONE` |
| FARM-S488 | **Incident:** `IncidentService.findOne(id, orgId?)` filters by `organizationId`. `IncidentController` GET/PATCH/DELETE `:id` pass `req.organizationId`. | `DONE` |
| FARM-S489 | **Dashboard:** `DashboardService.findOne(id, orgId?)` filters by `organizationId`. `DashboardController` GET/PATCH/DELETE `:id` pass `req.organizationId`. | `DONE` |
| FARM-S490 | **Documentation:** `DocumentationService.findOne(id, orgId?)` and `getContent(id, orgId?)` filter by `organizationId`. `DocumentationController` GET/PATCH/DELETE `:id` pass `req.organizationId`. | `DONE` |
| FARM-S491 | **FinOps:** `FinOpsService` cost queries join through `Component.organizationId` to scope results. `ActualCost` and `CostEstimate` filter by `organizationId`. | `DONE` |
| FARM-S492 | **Registry:** `ContainerVulnerabilityService` queries filter by `organizationId`. Controller passes `req.organizationId`. | `DONE` |

### FARM-E116: Uniqueness Constraints & Cross-Tenant Security Tests `DONE`

Prevents silent data collisions between tenants and provides regression coverage.

| ID | Story | Status |
|----|-------|--------|
| FARM-S493 | Scope `Pipeline.name` unique constraint to `[name, organizationId]` composite index. | `DONE` |
| FARM-S494 | Scope `Environment.name` unique constraint to `[name, organizationId]` composite index. | `DONE` |
| FARM-S495 | Scope `IacStack` name+environment uniqueness to include `organizationId`. | `DONE` |
| FARM-S496 | E2E cross-tenant security test suite (`test/cross-tenant-security.e2e-spec.ts`): registers two users in two orgs, creates a resource in org-A, verifies org-B gets HTTP 404 for GET/PATCH/DELETE. Covers: Component, Pipeline, Environment, SLO, Incident, Dashboard, Documentation. 14 tests, all passing. | `DONE` |

---

## Phase 45: Organization Context Hardening

Eliminates a class of race conditions, stale-state bugs, and UX dead ends in the frontend organization context. Root cause analysis revealed that the `OrganizationProvider` bootstrap was decoupled from auth restoration, auto-select was missing for multi-org users, and 403 stale-recovery only cleaned `sessionStorage` without notifying React. This phase makes the org context a reliable state machine that correctly handles all user scenarios.

### FARM-E117: Bootstrap & State Machine `DONE`

Fixes core bootstrap reliability: the `OrgReadyGate` now blocks on both auth and org loading, auto-select fires for any user with memberships (not just single-org), zero-org users are redirected to onboarding, and logout explicitly clears the persisted org.

| ID | Story | Status |
|----|-------|--------|
| FARM-S497 | `organization-context.tsx` — change auto-select logic from `list.length === 1` to `list.length > 0` so any user with memberships gets a default org without manual intervention. Multi-org users previously landed with `currentOrg=null` causing 403 on all org-required endpoints. | `DONE` |
| FARM-S498 | `org-ready-gate.tsx` — import `useAuth` and block rendering while `auth.isLoading OR org.isLoading`. On hard refresh, auth restore is async; the gate previously opened with an empty org list before auth finished, causing a brief 403 window. | `DONE` |
| FARM-S499 | `org-ready-gate.tsx` — after both loading states settle, if `isAuthenticated && organizations.length === 0` redirect to `/organizations/new`. Users with no memberships were previously stranded with every org-required page returning 403 silently. | `DONE` |
| FARM-S500 | `auth-context.tsx` `logout()` — add `sessionStorage.removeItem("farm_current_org")`. Logout cleared tokens and `farm_user` but left `farm_current_org` in sessionStorage; any direct storage reader after logout saw stale org data. | `DONE` |
| FARM-S501 | `organization-context.tsx` `fetchOrgs()` — when `savedId` is found but no longer in the membership list (stale), after clearing sessionStorage auto-select `list[0]` if available instead of falling back to `currentOrg=null`. | `DONE` |

### FARM-E118: Cache Coherence `DONE`

Closes the two remaining data-consistency gaps: 403 stale-org recovery now notifies React state, and org switching invalidates TanStack Query caches so page data always reflects the active org.

| ID | Story | Status |
|----|-------|--------|
| FARM-S502 | `api-client.ts` 403 handler — after `safeSessionRemove("farm_current_org")` dispatch `window.dispatchEvent(new CustomEvent("farm:org:stale"))`. `organization-context.tsx` — add `addEventListener("farm:org:stale", fetchOrgs)` effect. Previously, 403 recovery cleared sessionStorage but left OrganizationProvider React state showing the stale org; the next request still included the wrong `X-Organization-Id`. | `DONE` |
| FARM-S503 | `org-switcher.tsx` — add `useQueryClient()` and call `queryClient.invalidateQueries()` after `switchOrg(org)`. Query keys like `["pipelines"]` carry no org ID; switching org currently shows stale data from the previous org until manual refresh. | `DONE` |

### FARM-E119: Test Coverage `DONE`

Adds the missing test coverage for the org context changes and the backend guard.

| ID | Story | Status |
|----|-------|--------|
| FARM-S504 | Create `apps/web/src/components/org-ready-gate.test.tsx`. Cover: renders spinner when `auth.isLoading=true`; renders spinner when `org.isLoading=true`; renders children when both are `false` and org is set; redirects to `/organizations/new` when authenticated with 0 orgs. | `DONE` |
| FARM-S505 | Update `apps/web/src/contexts/organization-context.test.tsx` to mock `useAuth` and cover: `isAuthenticated false→true` transition triggers `fetchOrgs`; `isAuthenticated=false` clears org state immediately; `farm:org:stale` custom event triggers re-fetch. | `DONE` |
| FARM-S506 | Create `apps/api/src/common/guards/org-required.guard.spec.ts`. Cover: passes when valid `X-Organization-Id` header matches an active user membership; throws `ForbiddenException` when header is absent; throws `ForbiddenException` when user is not a member of the given org; throws `ForbiddenException` when org does not exist. | `DONE` |

---

## Phase 46: Granular RBAC

Replaces the binary `admin/user` role model with a structured permission system scoped to organizations. Today every authenticated user in an org can trigger destructive actions (delete components, cancel pipeline runs, remove team members) regardless of intent. This phase introduces organization-scoped roles (`owner`, `admin`, `member`, `viewer`) and per-resource permission gates on both backend and frontend.

### FARM-E120: Permission Model `DONE`

Defines the new role hierarchy and persists per-org role assignments. The current flat `roles: string[]` array on `User` is a global flag; it cannot express that a user is an `admin` in org-A but only a `member` in org-B.

| ID | Story | Status |
|----|-------|--------|
| FARM-S507 | Add `role` enum column (`owner`, `admin`, `member`, `viewer`) to `UserOrganization` entity. Generate migration `AddUserOrgRole`. Backfill: existing membership rows default to `member`; the first user in each org (lowest `createdAt`) is promoted to `owner`. | `DONE` |
| FARM-S508 | Create `Permission` enum (`catalog:write`, `catalog:delete`, `pipeline:trigger`, `pipeline:delete`, `environment:write`, `team:manage`, `org:manage`, `iac:write`) and a `RolePermissions` map that statically defines which permissions each role holds. Store in `src/common/rbac/permissions.ts`. | `DONE` |
| FARM-S509 | Extend `OrgRequiredGuard` to expose `req.orgRole` after membership lookup. Update `RequestWithOrg` interface with `orgRole: OrgRole`. No breaking change — downstream handlers may ignore it. | `DONE` |
| FARM-S510 | Create `@RequiresPermission(permission: Permission)` decorator and `PermissionGuard` that reads `req.orgRole` and checks against `RolePermissions`. Must be placed after `OrgRequiredGuard`. Throw `ForbiddenException` with code `INSUFFICIENT_PERMISSIONS` when denied. | `DONE` |

### FARM-E121: Backend Enforcement `DONE`

Applies `@RequiresPermission()` to all mutating and destructive endpoints. Read-only `GET` endpoints require only `viewer` (the minimum org membership), so they need no additional decorator.

| ID | Story | Status |
|----|-------|--------|
| FARM-S511 | **Catalog:** Apply `@RequiresPermission('catalog:write')` to `POST /api/catalog` and `PATCH /api/catalog/:id`. Apply `@RequiresPermission('catalog:delete')` to `DELETE /api/catalog/:id`. Update Swagger `@ApiHeader` and `@ApiForbiddenResponse` annotations. | `DONE` |
| FARM-S512 | **Pipelines:** Apply `@RequiresPermission('pipeline:trigger')` to `POST /api/pipelines/:id/trigger`. Apply `@RequiresPermission('pipeline:delete')` to `DELETE /api/pipelines/:id`. Update Swagger annotations. | `DONE` |
| FARM-S513 | **Teams:** Apply `@RequiresPermission('team:manage')` to `POST /api/teams`, `PATCH /api/teams/:id`, `DELETE /api/teams/:id`, and all team membership mutation endpoints. Update Swagger annotations. | `DONE` |
| FARM-S514 | **Organizations:** Apply `@RequiresPermission('org:manage')` to `PATCH /api/organizations/:id`, `DELETE /api/organizations/:id`, and all member role management endpoints. Only `owner` and `admin` hold this permission. Update Swagger annotations. | `DONE` |

### FARM-E122: Frontend Permission Gates `DONE`

Makes the UI reflect the user's actual permissions. Currently all authenticated org members see identical action buttons regardless of their role; clicking a disallowed action results in a confusing 403 with no explanation.

| ID | Story | Status |
|----|-------|--------|
| FARM-S515 | Add `orgRole` field to `OrganizationContext`. Fetch the current user's role from the `UserOrganization` membership returned by `GET /api/organizations/me/memberships` (or embed in the org list response). Expose via `useOrganization()` hook. | `DONE` |
| FARM-S516 | Create `usePermission(permission: Permission): boolean` hook that derives a boolean from `orgRole` and the static `RolePermissions` map. Returns `false` while org is loading. | `DONE` |
| FARM-S517 | Apply `usePermission` gates in Catalog (hide Edit/Delete buttons for `viewer`/`member`), Pipelines (hide Trigger/Delete for `viewer`), Teams (hide Add/Remove member for non-`admin`), and Organizations settings page (hide Rename/Delete for non-`owner`). | `DONE` |
| FARM-S518 | Add role badge to the org-switcher dropdown and to the Organizations settings page member list, showing each member's current role with an inline role-change select for `owner`/`admin`. | `DONE` |

---

## Phase 47: API Contract Stability

Establishes a stable, versioned public API surface so external integrations are not broken by internal refactors. Today all endpoints live under `/api` with no version prefix; any rename or removal is a silent breaking change for consumers.

### FARM-E123: API Versioning `DONE`

Introduces a `/api/v1` prefix for all public endpoints while keeping `/api` as a deprecated alias during a transition period.

| ID | Story | Status |
|----|-------|--------|
| FARM-S519 | Enable NestJS versioning (`VERSION_NEUTRAL` default + `v1` explicit) via `app.enableVersioning({ type: VersioningType.URI })` in `main.ts`. Add `@Version('1')` to all public controllers. Keep the existing `/api` prefix for backward compatibility by registering a redirect middleware `/api/:path* → /api/v1/:path*` with a `Deprecation` response header. | `DONE` |
| FARM-S520 | Update Swagger to document both `/api/v1` (primary) and the deprecated `/api` alias. Add `.addServer("/api/v1", "Versioned API (current)")` and `.addServer("/api", "Deprecated alias")` to `DocumentBuilder`. | `DONE` |
| FARM-S521 | Add `X-API-Version: 1` response header globally via `ApiVersionInterceptor` (`src/common/interceptors/api-version.interceptor.ts`). E2E specs already target `/api/v1` endpoints. | `DONE` |

### FARM-E124: Contract Documentation `DONE`

Provides a machine-readable and human-readable API contract alongside a changelog for breaking changes.

| ID | Story | Status |
|----|-------|--------|
| FARM-S522 | Generate a static `openapi.json` snapshot during CI build (`GET /api/v1/docs-json` → artifact). `openapi-snapshot` CI job polls `/api/health`, downloads the spec, and uploads it as the `openapi-spec` artifact with 30-day retention. Initial baseline committed as `apps/api/openapi.json`. | `DONE` |
| FARM-S523 | Add `API-CHANGELOG.md` to `apps/api/` documenting v1 and the migration guide from `/api` to `/api/v1`. | `DONE` |
| FARM-S524 | Published OpenAPI spec reference to MkDocs under `api-reference/` — updated `docs/api-reference/index.md` with OpenAPI section, added `docs/api-reference/api-changelog.md`, registered in `mkdocs.yml` nav. | `DONE` |

---

## Phase 48: Platform Resilience `DONE`

Closes the operational gaps that prevent Farm from being deployed in a production environment with SLA requirements. Multi-replica support, graceful degradation per integration, and Redis failure isolation are the three pillars.

### FARM-E125: High Availability Configuration `DONE`

Ensures the API and worker processes can run as multiple replicas without race conditions or session affinity requirements.

| ID | Story | Status |
|----|-------|--------|
| FARM-S525 | Validate that all in-memory state (plugin registry, metrics cache) is either stateless or backed by Redis. Audit `PluginManagerService`, `BusinessMetricsService`, and `CacheModule` for in-process mutable state that would diverge across replicas. Document findings and remediate. | `DONE` |
| FARM-S526 | Update Helm Chart `values.yaml` to support `replicaCount > 1` with a `PodDisruptionBudget` (`minAvailable: 1`) and `topologySpreadConstraints` for zone distribution. Add `Horizontal Pod Autoscaler` manifest triggered by CPU > 70%. | `DONE` |
| FARM-S527 | Add Redis Sentinel support to `CacheModule` configuration. When `REDIS_SENTINEL_HOSTS` env var is set, instantiate `@keyv/redis` with Sentinel options instead of a single-host connection string. Document in `.env.example`. | `DONE` |

### FARM-E126: Database Resilience `DONE`

Prevents cascading failures caused by slow or unreachable database connections.

| ID | Story | Status |
|----|-------|--------|
| FARM-S528 | Configure TypeORM connection pool with `connectTimeoutMS`, `acquireTimeoutMillis`, and `idleTimeoutMillis` via `DATABASE_POOL_*` env vars. Add pool exhaustion metric (`db_pool_size`, `db_pool_waiting`) exposed on `/metrics`. | `DONE` |
| FARM-S529 | Add a `TypeOrmHealthIndicator` to the existing `HealthModule` that checks DB connectivity with a 2-second timeout. Return `{ database: { status: 'down', message } }` in `/api/health` instead of crashing the health check. | `DONE` |
| FARM-S530 | Add a migration lock mechanism: if `DATABASE_SYNC=false` and `migrationsRun=false` (production), ensure only one replica runs pending migrations on startup using a PostgreSQL advisory lock. Prevent duplicate migration runs in parallel pod startups. | `DONE` |

### FARM-E127: Integration Circuit Breakers `DONE`

Prevents a degraded external integration (GitHub, Kong, Kubernetes API, Slack) from blocking unrelated requests via cascading timeout failures.

| ID | Story | Status |
|----|-------|--------|
| FARM-S531 | Introduce `CircuitBreakerService` (using `opossum` or a lightweight alternative) wrapping all HTTP calls in `IntegrationsModule`, `KubernetesModule`, `HelmModule`, `GatewayModule`, and `RegistryModule`. Default thresholds: 50% failure rate over 10 req → open; 30s reset. | `DONE` |
| FARM-S532 | When a circuit is open, return a structured `503 Service Unavailable` with `{ errorCode: 'INTEGRATION_UNAVAILABLE', integration: 'github' }` instead of letting the request hang until `fetch` timeout. Log circuit state transitions at WARN level. | `DONE` |
| FARM-S533 | Expose circuit breaker state as Prometheus gauge metric `integration_circuit_state{integration, state}` with three labeled series per integration (`state=open\|closed\|half_open`), each holding a 0/1 value. Add Grafana panel to `farm-integrations.json` dashboard. | `DONE` |

---

## Phase 49: Dependency Modernization `DONE`

All four Dependabot MAJOR-version PRs resolved. Group A (bull-board) and Group B (vite/plugin-react) were both executed and merged in PRs `chore/bump-bull-board-v7` and `chore/bump-vite-plugin-react-v6`.

> **Note on Group B:** The initial analysis flagged this as `BLOCKED` on `vitest@5` stable. On execution it was found that `vitest@4` already declares `vite: "^6.0.0 || ^7.0.0 || ^8.0.0"` in its peer dep range, making `vitest@5` unnecessary. The fix required adding `"vite": "^8.0.0"` to the root `package.json` overrides to deduplicate the two vite instances that npm resolved when `@vitejs/plugin-react@6` (which has vite@8 as a peer) and vitest@4 (which resolved to vite@7) coexisted.

### Dependabot PR Inventory

| PR Branch | Package | Bump | App | Risk | Group |
|-----------|---------|------|-----|------|-------|
| `dependabot/npm_and_yarn/bull-board/api-7.1.5` | `@bull-board/api` | 6.21.3 → 7.1.5 | `apps/api` | LOW | A |
| `dependabot/npm_and_yarn/bull-board/express-7.1.5` | `@bull-board/express` | 6.21.3 → 7.1.5 | `apps/api` | LOW | A |
| `dependabot/npm_and_yarn/bull-board/nestjs-7.1.5` | `@bull-board/nestjs` | 6.21.3 → 7.1.5 | `apps/api` | LOW | A |
| `dependabot/npm_and_yarn/vitejs/plugin-react-6.0.2` | `@vitejs/plugin-react` | 5.2.0 → 6.0.2 | `apps/web` | HIGH | B |

### Group A: @bull-board/* — Immediate Chore (outside this phase)

All three packages share the same version (bull-board monorepo) and must be bumped together. The v7.0.0 changelog contains no breaking API removals — only adds `prefix`/`basePath` support and BullMQ Pro compatibility. Farm usage (`BullBoardModule.forRoot`, `BullBoardModule.forFeature`, `ExpressAdapter`, `BullMQAdapter`) is fully compatible.

**Execution steps (can be done immediately as `chore/bump-bull-board-v7`):**
1. Update `apps/api/package.json`: `@bull-board/api`, `@bull-board/express`, `@bull-board/nestjs` → `^7.1.5`.
2. Run `npm install` from the monorepo root.
3. Run `cd apps/api && npm run test && npm run test:e2e`.
4. Run `make check`.
5. Merge and close the three Dependabot PRs.

### FARM-E128: Vite Ecosystem Upgrade `DONE`

Upgrades the `apps/web` test toolchain from Vite 7 to Vite 8 so `@vitejs/plugin-react@6` can be adopted. The Next.js production build is not affected — Next.js manages its own React transform independently.

**Resolution:** No remaining blocker. `vitest@4` already supports Vite 8, so the upgrade was completed without waiting for `vitest@5` stable.

| ID | Story | Status |
|----|-------|--------|
| FARM-S534 | Bump `apps/web/package.json`: `@vitejs/plugin-react` → `^6.0.2`. Add `"vite": "^8.0.0"` override to root `package.json` to deduplicate the dual-vite conflict. `vitest.config.ts` required no changes — `react()` is called without Babel options. | `DONE` |
| FARM-S535 | Storybook `@storybook/nextjs@^10.x` confirmed compatible with vite@8 peer — no version bump required. | `DONE` |
| FARM-S536 | `make check` passed: 3525 API unit, 351 API e2e, 2807 web unit, 70 Playwright. Branch `chore/bump-vite-plugin-react-v6` pushed; closes Dependabot PR. | `DONE` |

---

## Phase 50: Docker & Container Hardening

Outcome of a deep audit of `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`, and `docker-compose.yml` performed by the Farm SRE agent. The current images work but carry recurring CI-break patterns (hardcoded `apk` CVE pins), DRY violations (workspace manifests copied across 3 stages of 2 files), runtime UID inconsistency, and missing supply-chain primitives (digest pinning, SBOM, signing, multi-arch).

Full audit and learnings are captured in `.github/agents/Farm-SRE.agent.md` under the "Dockerfile Hardening Lessons" section.

### FARM-E129: CVE & Base Image Strategy `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S537 | Remove hardcoded `apk add --upgrade "pkg>=x.y.z-rN"` constraints in `apps/api/Dockerfile` (L56-57) and `apps/web/Dockerfile` (L52-57). Replace with `RUN apk upgrade --no-cache`. This pattern broke CI repeatedly when Alpine repushed patched versions under different version strings. Security coverage is retained via Trivy CI gate and Dependabot automated base-image digest bumps. | `DONE` |
| FARM-S538 | Pin both Dockerfile `FROM node:26-alpine` lines by digest (`@sha256:...`) and configure Dependabot to bump the digest automatically. Document the pin policy in `.github/agents/Farm-SRE.agent.md`. | `DONE` |
| FARM-S539 | Add `hadolint` CI job (`.github/workflows/dockerfile-lint.yml`) plus a custom workflow `grep` guard step that fails any Dockerfile containing `apk add ... ">="` version constraints. Prevents regression of FARM-S537. | `DONE` |

### FARM-E130: Image Consistency & DRY `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S540 | Standardize runtime UID across both images on **1001**. Update `apps/api/Dockerfile` to create a `farmapi` user with UID 1001 (replacing the default `node` UID 1000) to align with `apps/web/Dockerfile` `nextjs` user and Helm `securityContext.runAsUser: 1001`. Add an e2e check comparing `id -u` inside both containers. | `DONE` |
| FARM-S541 | Extract a single shared health-check entrypoint at `apps/api/scripts/healthcheck.js` and `apps/web/scripts/healthcheck.js`. Replace the four inline `node -e "..."` duplications (api Dockerfile L82, web Dockerfile L75, `docker-compose.yml` L59 and L82). Update Helm `livenessProbe`/`readinessProbe` to reference the same script. | `DONE` |
| FARM-S542 | Replace manual `RUN cd packages/types && npx tsc` (api L23, web L22) with `RUN npm run build --workspace=@farm/types`. Adds future-hook support and removes duplicated logic across both Dockerfiles. | `DONE` |

### FARM-E131: Build Performance & Reproducibility `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S543 | Enable BuildKit cache mounts: add `RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --ignore-scripts` to both deps stages, and `--mount=type=cache,target=/app/apps/web/.next/cache` to the web builder stage. Verify CI cold-build wall time drops by at least 40%. | `DONE` |
| FARM-S544 | Generate SBOM and provenance attestation during release builds: update `.github/workflows/release.yml` to use `docker buildx build --sbom=true --provenance=mode=max --push`. Upload SBOM as a release asset for both `farm-api` and `farm-web` images. | `DONE` |
| FARM-S545 | Tighten `.dockerignore`: add `**/*.{test,spec}.ts`, `**/__tests__/**`, `**/__mocks__/**`, `.env`, `.env.*`, `*.log`, `e2e/`, `playwright-report/`, `test-results/`, `.husky/`, `storybook-static/`. Delete the dead `apps/web/.dockerignore` (root context overrides it) and add a comment in the root file explaining context precedence. | `DONE` |

### FARM-E132: Supply Chain & Multi-Arch `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S546 | Add `cosign` signing to `release.yml` for both `farm-api` and `farm-web` images. Publish the public key and document verification procedure in `deploy/helm/farm/README.md`. Implemented as Sigstore **keyless** signing (Fulcio + Rekor) using the GHA OIDC token — no public key to distribute. GHCR push (`ghcr.io/ops-talks/farm-api`, `ghcr.io/ops-talks/farm-web`) enabled with `packages: write` + `id-token: write`. Verification recipe documented in the Helm README under "Image Provenance and Signing". | `DONE` |
| FARM-S547 | Enable multi-arch builds (`linux/amd64,linux/arm64`) via `docker buildx` in CI. Evaluate native ARM runners vs QEMU emulation. Publish both architectures under a single tag manifest. Implemented via `docker/setup-qemu-action` on the default amd64 runner; per-platform SBOM + SLSA provenance attestations are produced automatically by `sbom: true` + `provenance: mode=max`. Native ARM runner migration is documented in `Farm-SRE.agent.md` as a future optimization. | `DONE` |

## Phase 51: Helm Chart Hardening

Outcome of a deep audit of `deploy/helm/farm/` performed by the Farm SRE agent. The chart is functionally correct for basic deployments but carries 27 findings across security, reliability, observability, configuration completeness, Helm best practices, migration safety, and ingress hygiene. Critical gaps: the migration Job silently ignores its resource limits (HELM-F022), runs as root (HELM-F023), and the web workload has no ConfigMap or config-change restart annotation (HELM-F013/F014). Full findings and recommendations are captured in the audit report in `.github/agents/Farm-SRE.agent.md`.

### FARM-E133: Migration Job Hardening `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S548 | Fix critical resource omission: add `resources: {{- toYaml .Values.migration.resources \| nindent 12 }}` to the migration container spec in `templates/migration-job.yaml`. The `migration.resources` values block exists in `values.yaml` but is never rendered (HELM-F022). | `DONE` |
| FARM-S549 | Add pod and container `securityContext` to the migration Job, re-using `.Values.api.podSecurityContext` and `.Values.api.containerSecurityContext` so the migration container runs as UID 1001 with `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, and `readOnlyRootFilesystem: true` (HELM-F023). | `DONE` |
| FARM-S550 | Set `serviceAccountName: {{ include "farm.api.serviceAccountName" . }}` on the migration Job pod spec so it uses the pre-existing API ServiceAccount (which already has `automountServiceAccountToken: false`) instead of the namespace `default` SA (HELM-F024). | `DONE` |
| FARM-S551 | Add a `pg_isready` initContainer to the migration Job that polls the database endpoint before the migration container starts. Set `migration.activeDeadlineSeconds` default to `300` in `values.yaml`. Document both in `NOTES.txt` (HELM-F025). | `DONE` |

### FARM-E134: Security Hardening `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S552 | Set `api.containerSecurityContext.readOnlyRootFilesystem: true` in `values.yaml`. Add `api.extraVolumeMounts` and `api.extraVolumes` to the Deployment template to support `emptyDir` mounts for `/tmp` and `PLUGINS_DIR` at runtime. Update `values-dev.yaml` and `values-production.yaml` with example tmpfs mounts (HELM-F001). | `DONE` |
| FARM-S553 | Add `templates/api/networkpolicy.yaml` and `templates/web/networkpolicy.yaml`. Default policy: API ingress from Ingress controller + web pods only; web ingress from Ingress controller only; egress to DB, Redis, observability stack. Gate on `api.networkPolicy.enabled` / `web.networkPolicy.enabled` (default: `false`). Document in README (HELM-F002). | `DONE` |

### FARM-E135: Reliability and High Availability `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S554 | Guard both PDB templates with `{{- if ge .Values.*.replicaCount 2 }}` to prevent the single-replica-with-PDB node-drain deadlock. Add the guard for both API and web. Update README upgrade notes (HELM-F004). | `DONE` |
| FARM-S555 | Add a `behavior` block to both HPA templates. Expose `api.autoscaling.behavior` and `web.autoscaling.behavior` in `values.yaml` with safe defaults (scaleDown stabilizationWindowSeconds 300, scaleUp stabilizationWindowSeconds 60). Add to README parameters table (HELM-F005). | `DONE` |
| FARM-S556 | Add `startupProbe` to the API and web Deployment templates. Expose `api.startupProbe` and `web.startupProbe` in `values.yaml` with defaults `httpGet /api/health`, `failureThreshold: 20`, `periodSeconds: 5`. Remove reliance on large `initialDelaySeconds` as the only startup guard (HELM-F006). | `DONE` |

### FARM-E136: Observability Coverage `IN PROGRESS`

| ID | Story | Status |
|----|-------|--------|
| FARM-S557 | Add `"farm-integrations"` to the dashboard list in `templates/grafana-dashboards.yaml`. Add a CI step that `diff`s `deploy/helm/farm/dashboards/` against `observability/grafana/provisioning/dashboards/` (excluding `dashboard.yml`) and fails on any missing file (HELM-F007). | `DONE` |
| FARM-S558 | Add `runbook_url` annotations to all four alerts in `templates/prometheusrule.yaml`. Introduce a `prometheusRule.runbookBaseUrl` value (default: the GitHub README anchor) so operators can point to an internal runbook base URL (HELM-F008). | `DONE` |
| FARM-S559 | Compile `observability/sloth-slos.yml` with `sloth generate` and embed the resulting multi-burn-rate alert groups into `templates/prometheusrule.yaml`. Add a `make sloth-generate` Makefile target and a CI diff check to detect drift between the Sloth source and the embedded rules (HELM-F009). | `BLOCKED` — requires `sloth` binary; embed pending `make sloth-generate` output review. |

### FARM-E137: Configuration Completeness `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S560 | Introduce `web/configmap.yaml` rendering all `web.env` keys. Update the web Deployment to consume it via `envFrom.configMapRef`. This fixes `NEXT_TELEMETRY_DISABLED` not being injected (HELM-F013), provides the missing `checksum/config` restart annotation (HELM-F014), and makes `NEXT_PUBLIC_APP_URL` in `values-dev.yaml` actually apply. | `DONE` |
| FARM-S561 | Add `THROTTLE_TTL: "60000"` and `THROTTLE_LIMIT: "10"` to `api.env` in `values.yaml` and emit them in `configmap.yaml`. Add override examples to `values-production.yaml`. Add to README parameters table (HELM-F012). | `DONE` |
| FARM-S562 | Add `DATABASE_POOL_SIZE: "10"`, `LOG_LEVEL: "info"` to `api.env` in `values.yaml` and emit them in `configmap.yaml`. Add a comment in `values-production.yaml` warning that pool size should be reduced when HPA max replicas is high. Add to README parameters table (HELM-F015, HELM-F016, HELM-F011). | `DONE` |
| FARM-S563 | Fix `tempoUrl` default in `values-production.yaml` from port `3100` to port `3200` (Grafana Tempo HTTP query frontend default). Update the matching example in `README.md` (HELM-F017). | `DONE` |

### FARM-E138: Helm Best Practices `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S564 | Remove the dead top-level `replicaCount: 1` key from `values.yaml`. Add `nameOverride: ""` and `fullnameOverride: ""` with documentation comments so all referenced values are explicitly declared (HELM-F018, HELM-F019). | `DONE` |
| FARM-S565 | Bump `Chart.yaml appVersion` to `"0.25.7"`. Add an automated step to `.github/workflows/release.yml` that updates `Chart.yaml appVersion` to the pushed semver tag before packaging, preventing future stale-appVersion drift (HELM-F020). | `DONE` |
| FARM-S566 | Extend the README parameters table with all missing keys: `api.topologySpreadConstraints`, `web.topologySpreadConstraints`, `api.autoscaling.behavior`, `api.startupProbe`, `web.startupProbe`, `api.env.THROTTLE_TTL`, `api.env.THROTTLE_LIMIT`, `api.env.LOG_LEVEL`, `api.env.DATABASE_POOL_SIZE`, `migration.activeDeadlineSeconds`. Evaluate adopting `helm-docs` to auto-generate the table from `values.yaml` comments (HELM-F021). | `DONE` |

### FARM-E139: Ingress Improvements `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S567 | Add `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"` and `proxy-send-timeout: "3600"` to `values-production.yaml` under `ingress.annotations` (or introduce separate `ingress.api.annotations` / `ingress.web.annotations` keys). Document the WebSocket requirement in README (HELM-F026). | `DONE` |
| FARM-S568 | Split `templates/ingress.yaml` into `templates/ingress-api.yaml` and `templates/ingress-web.yaml`. Introduce `ingress.api.annotations` and `ingress.web.annotations` value keys. Add a migration note to README for operators upgrading from the combined Ingress (HELM-F027). | `DONE` |

---

## Phase 52: Helm Observability Integration `DONE`

Refactor the observability configuration in the Helm chart so that each integration (tracing, profiling, RUM) is an independent feature flag (`enabled: false` by default). Operators activate only the components present in their cluster. Adds Pyroscope pod annotations for auto-discovery and Grafana Faro RUM support to the web deployment.

### FARM-E140: Observability Feature Flags `DONE`

Lift the flat `api.observability.*` keys into three independent top-level blocks, each guarded by `enabled: false`. Zero behavioral change when all flags are false.

| ID | Story | Status |
|----|-------|--------|
| FARM-S569 | Refactor `api.observability.otelEnabled`, `otelExporterEndpoint`, and `otelServiceName` into a top-level `tracing:` block (`enabled: false`, `endpoint: ""`, `serviceName: farm-api`). Update the API ConfigMap template to conditionally inject `OTEL_ENABLED`, `OTEL_EXPORTER_ENDPOINT`, and `OTEL_SERVICE_NAME` only when `tracing.enabled: true`. Update `values.schema.json`. (OBS-F001) | `DONE` |
| FARM-S570 | Refactor `api.observability.pyroscopeEnabled` and `pyroscopeServerAddress` into a top-level `pyroscope:` block (`enabled: false`, `url: ""`). Update the API ConfigMap template to conditionally inject `PYROSCOPE_ENABLED` and `PYROSCOPE_URL` only when `pyroscope.enabled: true`. Update `values.schema.json`. (OBS-F002) | `DONE` |
| FARM-S571 | Add a top-level `faro:` block (`enabled: false`, `url: ""`). When `faro.enabled: true`, inject `NEXT_PUBLIC_FARO_URL` into the web ConfigMap. Update `values.schema.json`. (OBS-F003) | `DONE` |

### FARM-E141: Pyroscope Pod Annotations `DONE`

When Pyroscope is enabled, the Pyroscope agent/operator discovers targets via pod annotations. Without these annotations, continuous profiling silently does nothing in Kubernetes even if the URL is set.

| ID | Story | Status |
|----|-------|--------|
| FARM-S572 | When `pyroscope.enabled: true`, add Pyroscope auto-discovery annotations to the API Deployment pod template: `profiles.grafana.com/cpu.scrape: "true"`, `profiles.grafana.com/memory.scrape: "true"`, `profiles.grafana.com/service_name: {{ .Release.Name }}-api`. Document required Pyroscope Operator or Alloy version in README. (OBS-F004) | `DONE` |

### FARM-E142: Developer Experience `DONE`

Ensure `values-dev.yaml` reflects the full local stack and the README documents all new parameters.

| ID | Story | Status |
|----|-------|--------|
| FARM-S573 | Update `values-dev.yaml` with all three integration blocks enabled, pointing to local in-cluster service URLs matching `docker-compose.observability.yml` (`tracing.endpoint: http://alloy:4318/v1/traces`, `pyroscope.url: http://pyroscope:4040`, `faro.url: http://alloy:12347/collect`). (OBS-F005) | `DONE` |
| FARM-S574 | Update the README parameters table with the new `tracing`, `pyroscope`, and `faro` top-level blocks. Remove the stale `api.observability.*` entries. (OBS-F006) | `DONE` |

---

## Phase 53: Helm Chart Quality Remediation `DONE`

Resolve all 40 problems identified in the post-release technical audit of `deploy/helm/`. Issues are classified into five areas: critical rendering bugs, credential and security hardening, production-safe defaults, template and schema correctness, and CI/CD pipeline hardening. Every item has a concrete, verifiable fix. No behavioral change to the application — only chart quality, safety, and operability improvements.

### FARM-E143: Critical Rendering Fixes `TODO`

Four bugs that cause incorrect Kubernetes manifests or silent security failures on every `helm install` / `helm upgrade` regardless of cluster or values file.

| ID | Story | Status |
|----|-------|--------|
| FARM-S575 | Pin dependency versions in `deploy/helm/farm/Chart.yaml` from floating ranges (`15.x.x`, `19.x.x`) to exact versions matching `Chart.lock` (`postgresql: "15.5.38"`, `redis: "19.6.4"`). Floating ranges allow `helm dependency update` to silently pull a different subchart version than what is in the lock file, breaking supply-chain reproducibility. | `TODO` |
| FARM-S576 | Create `deploy/helm/farm/templates/_validate.tpl` with two guards: (1) `fail` when `api.secrets.JWT_SECRET` equals the default placeholder string; (2) `fail` when `len(api.secrets.JWT_SECRET) < 32`. Both checks are skipped when `api.existingSecret` is set. Add a corresponding `minLength: 32` constraint to the `api.secrets` section of `values.schema.json`. | `TODO` |
| FARM-S577 | Wrap `spec.replicas` in both `templates/api/deployment.yaml` and `templates/web/deployment.yaml` with `{{- if not .Values.api.autoscaling.enabled }}` / `{{- end }}`. When HPA is active, `helm upgrade` currently resets replicas to the static value on every run, causing a scale-down spike before the HPA recovers. | `TODO` |
| FARM-S578 | Fix the `farm.imagePullSecrets` helper in `templates/_helpers.tpl` to iterate with `{{ .name }}` instead of `{{ . }}`. The current implementation serializes the full map object (`map[name:xxx]`) when `imagePullSecrets` contains objects (the format validated by `values.schema.json`), producing invalid YAML that the kube-apiserver rejects. | `TODO` |

### FARM-E144: Security and Credential Hardening `TODO`

Credentials and access controls that are either hardcoded in committed files or default to insecure values that will reach production silently.

| ID | Story | Status |
|----|-------|--------|
| FARM-S579 | Remove `grafana.adminPassword: farm` from `deploy/helm/observability/values.yaml`. Replace with `grafana.admin.existingSecret: ""` and add a `fail` guard in `deploy/helm/observability/templates/NOTES.txt` (or a validate template) that aborts `helm install` if `adminPassword` is non-empty and `admin.existingSecret` is empty in a non-dev context. Update `values-dev.yaml` to keep the dev password override explicitly. | `TODO` |
| FARM-S580 | Move `grafana.auth.anonymous.enabled: true` and `grafana.auth.anonymous.org_role: Viewer` from `deploy/helm/observability/values.yaml` to `values-dev.yaml` only. Set `auth.anonymous.enabled: false` as the production default. Anonymous read access to Grafana exposes all metrics, traces, and logs to anyone with network access to the cluster. | `TODO` |
| FARM-S581 | Set `loki.loki.auth_enabled: true` in `deploy/helm/observability/values.yaml`. Without authentication, any pod in the cluster can write arbitrary log entries to Loki or read logs from any namespace. Document the required `tenant_id` configuration in the Alloy pipeline and Grafana datasource in `values-dev.yaml` and README. | `TODO` |
| FARM-S582 | Replace `cors_allowed_origins = ["*"]` in the Alloy Faro receiver configuration in `deploy/helm/observability/values.yaml` with a configurable value defaulting to `[]`. Add a top-level `faro.corsAllowedOrigins` key in `values.yaml` and render it into the inline Alloy River config. Document the required domain in README. | `TODO` |
| FARM-S583 | Change `externalDatabase.host` and `externalRedis.host` defaults in `deploy/helm/farm/values.yaml` from `"localhost"` to `""`. Add `fail` guards in `_validate.tpl`: abort if `postgresql.enabled: false` and `externalDatabase.host` is empty; abort if `redis.enabled: false` and `externalRedis.host` is empty. `localhost` is an invalid address in any Kubernetes pod network. | `TODO` |

### FARM-E145: Production Defaults and High Availability `TODO`

Values that default to configurations that cause downtime or silent monitoring gaps when the chart is deployed to production without explicit overrides.

| ID | Story | Status |
|----|-------|--------|
| FARM-S584 | Change `api.replicaCount` and `web.replicaCount` defaults in `deploy/helm/farm/values.yaml` from `1` to `2`. A single replica is a Single Point of Failure: any pod restart (OOM kill, liveness probe failure, node eviction) causes downtime. The `values-dev.yaml` override of `replicaCount: 1` remains correct for local KinD. | `TODO` |
| FARM-S585 | Enable `podDisruptionBudget` by default (`enabled: true`, `minAvailable: 1`) for both `api` and `web` in `deploy/helm/farm/values.yaml`. Without a PDB, `kubectl drain` (cluster upgrades, node maintenance, spot instance interruptions) evicts all pods simultaneously. The current default of `enabled: false` makes the HA from `replicaCount: 2` (S584) ineffective during maintenance windows. | `TODO` |
| FARM-S586 | Enable `serviceMonitor.enabled: true` and `prometheusRule.enabled: true` by default in `deploy/helm/farm/values.yaml`. A production deployment with defaults today has no metrics collection and no alerts — including `FarmApiDown`. Operators without Prometheus Operator must explicitly set both to `false`; this is the correct opt-out model. Add a note to `values.yaml` indicating the Prometheus Operator CRD requirement. | `TODO` |
| FARM-S587 | Add a `fail` guard in `_validate.tpl` that aborts `helm install` when `prometheusRule.enabled: true` and the Alertmanager default receiver is `"null"`. This prevents silent alert black-holes in production. Add a commented-out routing template in `deploy/helm/observability/values.yaml` with instructions for configuring PagerDuty or Slack receivers. | `TODO` |
| FARM-S588 | Document in `deploy/helm/observability/README.md` that Loki (`replication_factor: 1`, SingleBinary), Tempo (`backend: local`), and Pyroscope (`replication_factor: 1`) are configured for single-node operation and are not suitable for production HA without migrating to S3/GCS/Azure Blob object storage. Add a `WARNING` block to `values.yaml` comments for each component. | `TODO` |

### FARM-E146: Template and Schema Correctness `TODO`

Template logic bugs, missing validations, and schema gaps that cause silent misconfigurations, runtime failures, or manifest drift.

| ID | Story | Status |
|----|-------|--------|
| FARM-S589 | Replace the `egress: - {}` (allow-all) rule in `deploy/helm/farm/templates/web/networkpolicy.yaml` with structured egress rules: DNS (UDP/TCP 53), API service pod selector on `api.service.port`, and HTTPS (TCP 443). The current wildcard negates any security value of the NetworkPolicy and creates a false sense of confinement. | `TODO` |
| FARM-S590 | Fix hardcoded `job="farm-api"` label in all PromQL expressions in `deploy/helm/farm/templates/prometheusrule.yaml` by replacing with `{{ include "farm.fullname" . }}-api`. Add a `relabelings` block to `templates/servicemonitor.yaml` that pins `targetLabel: job` to the same value. If the release name is not `farm`, all current PrometheusRules produce alerts that never fire. | `TODO` |
| FARM-S591 | Add a `fail` guard in `deploy/helm/farm/templates/migration-job.yaml` for the case where `postgresql.enabled: false`, `externalDatabase.password` is empty, and `externalDatabase.existingSecret` is empty. The current fallback renders `DATABASE_PASSWORD: ""` in the migration Secret, which either causes a silent connection failure or, if the database has no password set, connects insecurely. | `TODO` |
| FARM-S592 | Add `spec.ttlSecondsAfterFinished: 3600` to both `deploy/helm/farm/templates/migration-job.yaml` and `deploy/helm/farm/templates/pre-upgrade-check.yaml`. The current `hook-delete-policy: before-hook-creation,hook-succeeded` leaves failed Jobs in the namespace indefinitely, accumulating across repeated failed upgrade attempts. | `TODO` |
| FARM-S593 | Extend `_validate.tpl` with cross-field HPA validation: `fail` when `api.autoscaling.maxReplicas < api.autoscaling.minReplicas` or `web.autoscaling.maxReplicas < web.autoscaling.minReplicas`. This configuration is accepted by `helm lint` but rejected by the kube-apiserver at apply time with a non-obvious error. | `TODO` |
| FARM-S594 | Replace the hardcoded dashboard name list in `deploy/helm/farm/templates/grafana-dashboards.yaml` with `$.Files.Glob "dashboards/*.json"` iteration. The current list requires manual synchronization with the `dashboards/` directory — adding a new `.json` file without updating the list silently omits the dashboard from the ConfigMap. | `TODO` |
| FARM-S595 | Migrate `deploy/helm/farm/templates/api/configmap.yaml` from per-field hardcoded key emission to `range $key := (.Values.api.env | keys | sortAlpha)` iteration, matching the pattern already used by the web ConfigMap. Any custom `api.env.*` key set by an operator today is silently ignored and never injected into the pod. Preserve the conditional blocks for tracing, pyroscope, and faro variables. | `TODO` |
| FARM-S596 | Change `targetPort` in `deploy/helm/farm/templates/api/service.yaml` and `templates/web/service.yaml` from the hardcoded integer `3000` to the named port `http`. This creates a declarative binding to the container port by name and prevents silent routing failures if `containerPort` is ever changed. | `TODO` |
| FARM-S597 | Add `extraVolumes` and `extraVolumeMounts` for `emptyDir` on `/tmp` and `/app/apps/web/.next/cache` to the web section of `deploy/helm/farm/values.yaml`. The web pod runs with `readOnlyRootFilesystem: true` (inherited from the base security context) but lacks writable volumes for Next.js runtime cache and temporary I/O, causing `EROFS: read-only file system` crashes. | `TODO` |
| FARM-S598 | Add structured validation to `values.schema.json` for `podSecurityContext` and `containerSecurityContext`: enumerate required properties (`runAsNonRoot`, `runAsUser`, `allowPrivilegeEscalation`) with their expected types. Create `deploy/helm/observability/values.schema.json` with top-level type validation for `grafana`, `loki`, `tempo`, `alloy`, and `pyroscope` blocks. | `TODO` |
| FARM-S599 | Pin the `migration.waitForDb.image` in `deploy/helm/farm/values.yaml` from `busybox:1.36` to `busybox:1.36@sha256:<digest>`. Resolve the current digest with `docker manifest inspect busybox:1.36`. Tag-only references violate the Base Image Digest Pin Policy (FARM-S538). | `TODO` |
| FARM-S600 | Expand `deploy/helm/farm/.helmignore` and `deploy/helm/observability/.helmignore` to exclude `*.md` (except `README.md`), `ci/`, `tests/`, and `.github/` from `helm package` output. Fix `Chart.yaml`: set `home` to the project documentation URL and `sources` to the repository URL — currently both point to the same GitHub URL. Remove the dead `farm.selectorLabels` helper from `templates/_helpers.tpl` (defined but never referenced). | `TODO` |
| FARM-S601 | Update `deploy/helm/farm/templates/NOTES.txt` to include Ingress configuration guidance (class annotation, TLS, host), LoadBalancer service option, and a reference to `values-production.yaml`. Add a datasource sidecar (`grafana.sidecar.datasources.enabled: true`) to `deploy/helm/observability/values.yaml` so datasources added or edited via the Grafana UI survive pod restarts. | `TODO` |

### FARM-E147: CI/CD Pipeline Hardening `TODO`

Non-deterministic builds, inconsistent security practices, and redundant logic across the two Helm CI workflows.

| ID | Story | Status |
|----|-------|--------|
| FARM-S602 | Pin kubeconform to a specific version in `.github/workflows/helm-lint.yml`. Replace `releases/latest/download` with `releases/download/v0.6.7` (or current stable). Every other tool and action in the Helm CI is version-pinned; kubeconform is the only exception, making the schema validation step non-deterministic across runs. | `TODO` |
| FARM-S603 | Pin `actions/checkout` in the `helm` job of `.github/workflows/ci.yml` to a full commit SHA, matching the convention already used in `helm-lint.yml` (`@11bd71901bbe5b1630ceea73d27597364c9af683`). Tag references (`@v5`) are mutable and represent an inconsistent supply-chain security posture within the same repository. | `TODO` |
| FARM-S604 | Fix `chart-dirs` in `deploy/helm/ct.yaml` to list the two chart directories explicitly (`deploy/helm/farm`, `deploy/helm/observability`) instead of the current `"."` placeholder that is silently overridden by the `--chart-dirs` CLI flag. Extract the shared Helm repo-add and dependency-build steps from both `ci.yml` and `helm-lint.yml` into a reusable composite action at `.github/actions/setup-helm-deps/action.yml` to eliminate the current duplication. | `TODO` |
| FARM-S605 | Add SHA256 checksum verification to the `curl | bash` Helm install script in both `ci.yml` and `helm-lint.yml`. Download the `helm-v3.17.0-linux-amd64.tar.gz.sha256sum` alongside the archive and verify with `sha256sum --check` before executing. Alternatively, migrate both workflows to use `azure/setup-helm` action (pinned by SHA) to remove the need for manual verification. | `TODO` |

---

## Phase 54: Helm Chart Quality, Correctness & Publishing `TODO`

Comprehensive remediation of 25 defects identified in an audit of the full Helm implementation (Phase 53 post-mortem), followed by chart publishing, Artifact Hub integration, and a validated install test pipeline. All work follows a single design principle: the Farm project adapts to Helm ecosystem best practices — not the other way around.

Audit findings summary: 4 critical (appVersion written as branch name; Ingress documented but not implemented; release.yml without SHA-pinned actions; NetworkPolicy web silently deny-all), 8 high, 9 medium, 4 low.

### FARM-E152: Critical Defect Remediation `TODO`

Fix the 4 critical defects found in the audit. These are prerequisites for all other work in this phase — publishing a chart with `appVersion: "main"` or missing Ingress templates invalidates the entire publishing effort.

| ID | Story | Status |
|----|-------|--------|
| FARM-S619 | Fix C-1: `appVersion` in `release.yml` is set using `github.ref_name` which resolves to the branch name (e.g. `"main"`) when triggered via `workflow_dispatch`, not the semantic version. Remove the explicit `Update Helm chart appVersion` step and move the `sed` calls to the `after:bump` hook in `.release-it.json`, alongside the existing web `npm version` hook: `"sed -i \"s/^appVersion: .*/appVersion: \\\"${version}\\\"/\" ../../deploy/helm/farm/Chart.yaml"`. Add a second line for `observability/Chart.yaml`. Also add a third line to update `api.image.tag` and `web.image.tag` in `deploy/helm/farm/ci/kind-values.yaml` (created in FARM-S616). With this change, `appVersion` is set from `release-it`'s resolved `${version}` variable, which is always the correct semver string. | `TODO` |
| FARM-S620 | Fix C-2: The `deploy/helm/farm/README.md` documents a full `ingress:` block (`enabled`, `className`, `annotations`, `api.hostname`, `web.hostname`) and references `ingress-api.yaml` / `ingress-web.yaml` templates. Neither template exists. The `values.schema.json` has `additionalProperties: false` at root — any operator who tries to set `ingress.*` as documented gets a schema rejection error. Create `deploy/helm/farm/templates/api/ingress.yaml` and `deploy/helm/farm/templates/web/ingress.yaml` with the full Helm 3 Ingress pattern: `networking.k8s.io/v1`, `ingressClassName` field (not the deprecated annotation), `pathType: Prefix` mandatory field, TLS block gated by `ingress.tls`. Add `ingress:` to `values.yaml`, `values-dev.yaml`, and `values.schema.json`. | `TODO` |
| FARM-S621 | Fix C-3: `release.yml` uses `actions/checkout@v5` (mutable tag) in two places (job `release` line 81 and job `build-images` line 185). The release job carries `permissions: contents: write` and access to secrets — the most privileged job in the repository. Resolve the commit SHA for `v5` with `gh api /repos/actions/checkout/git/ref/tags/v5` and pin both occurrences. While auditing, also pin `docker/setup-buildx-action`, `docker/login-action`, and `docker/build-push-action` to SHAs in the same workflow — they are equally privileged and equally mutable. | `TODO` |
| FARM-S622 | Fix C-4: In `deploy/helm/farm/templates/web/networkpolicy.yaml`, the ingress rule block is wrapped in `{{- if .Values.web.networkPolicy.ingressControllerNamespaceSelector }}`. The default value is `{}` (empty map). In Go templates, an empty map evaluates as falsy — so enabling `web.networkPolicy.enabled: true` with the default `namespaceSelector: {}` creates a NetworkPolicy with `policyTypes: [Ingress, Egress]` but no ingress rules, silently denying all inbound traffic to the web pod. Fix: render the ingress rule on port 3001 unconditionally (always allow inbound to the service port), with the `namespaceSelector` being additive and optional — not the gate for the rule's existence. Document the expected behavior in a comment in the template. | `TODO` |

### FARM-E153: Template and Values Correctness `TODO`

Fix the 8 high and medium defects in templates and values identified in the audit.

| ID | Story | Status |
|----|-------|--------|
| FARM-S623 | Fix A-1: Both `deploy/helm/farm/templates/api/deployment.yaml` and `deploy/helm/farm/templates/web/deployment.yaml` use `farm.api.selectorLabels` / `farm.web.selectorLabels` in `template.metadata.labels`. Helm Best Practices require `template.metadata.labels` to carry the full label set (`farm.api.labels` / `farm.web.labels` which include `helm.sh/chart`, `app.kubernetes.io/version`, and `app.kubernetes.io/managed-by`), while `selector.matchLabels` carries only the immutable selectorLabels. Fix both Deployments. Verify that `selector.matchLabels` remains unchanged (immutable field — changing it would require a delete+recreate). | `TODO` |
| FARM-S624 | Fix A-2: `deploy/helm/farm/templates/migration-job.yaml` pod template uses `farm.labels` (generic) which includes `app.kubernetes.io/name: farm` — the same value as the API Deployment selector. Add a dedicated helper `farm.migration.labels` and `farm.migration.selectorLabels` to `_helpers.tpl` with `app.kubernetes.io/component: migration` to uniquely identify the migration workload. Update migration-job.yaml to use the new helpers. | `TODO` |
| FARM-S625 | Fix A-8: PDB templates (`api/pdb.yaml` and `web/pdb.yaml`) gate creation with `gt (int .Values.api.replicaCount) 1`. When HPA is enabled, `replicaCount` is the static value from `values.yaml` (default 2), not the actual running replicas. If HPA scales down to `minReplicas: 1`, a PDB with `minAvailable: 1` will block all node drains (eviction deadlock). Fix both templates: compute effective minimum replicas as `ternary .Values.api.autoscaling.minReplicas .Values.api.replicaCount .Values.api.autoscaling.enabled` and use that value for the guard and for setting `minAvailable`. | `TODO` |
| FARM-S626 | Fix M-3: `deploy/helm/farm/values.yaml` has `externalRedis.host: "localhost"`. Inside a pod, `localhost` resolves to the pod itself — not an external Redis. An operator who disables `redis.enabled: false` without setting `externalRedis.host` gets a silent connection failure. Apply the same fix as `externalDatabase.host` (set by FARM-S583): change default to `""` and add a validation guard in `_validate.tpl`: fail if `redis.enabled` is false and `externalRedis.host` is empty. | `TODO` |
| FARM-S627 | Fix M-4: `deploy/helm/farm/values-dev.yaml` overrides `api.image.tag: "latest"` and `web.image.tag: "latest"`. The `latest` tag is mutable — `helm rollback` becomes ineffective and image provenance is lost. Change both to `tag: ""` which inherits from `.Chart.AppVersion` (the behavior already in `values.yaml` defaults). This aligns dev with the same image resolution logic as production, and rollbacks will pull the correct versioned image. | `TODO` |
| FARM-S628 | Fix M-5: The migration `ServiceAccount` in `migration-job.yaml` has `hook-delete-policy: before-hook-creation` only. The migration `Job` and `ConfigMap` correctly add `hook-succeeded` but the `ServiceAccount` persists after each successful migration and is only cleaned up before the next. Add `hook-succeeded` to the `ServiceAccount` delete policy so the SA is removed after successful migrations, following least-surface-area principles. | `TODO` |
| FARM-S629 | Fix M-9: `deploy/helm/farm/values.yaml` comment says "Create ConfigMaps for all 6 Farm Grafana dashboards" but `grafana-dashboards.yaml` iterates 7 dashboards (`farm-api`, `farm-infra`, `farm-integrations`, `farm-logs`, `farm-rum`, `farm-slo`, `farm-traces`). Update the comment to 7. Audit all other numeric claims in comments across both charts for similar drift. | `TODO` |
| FARM-S630 | Fix B-2: `_helpers.tpl` defines `farm.selectorLabels` (generic, without `component`) but no template uses it directly — all templates use `farm.api.selectorLabels` or `farm.web.selectorLabels`. Remove the dead helper to prevent future misuse where a contributor accidentally uses the generic helper and creates an ambiguous selector. | `TODO` |

### FARM-E154: CI/CD Quality Hardening `TODO`

Fix the 7 high and medium CI/CD defects identified in the audit. Note: FARM-S618 (ct install with KinD) already addresses A-7; FARM-S607 already addresses M-2. Stories here address the remaining gaps.

| ID | Story | Status |
|----|-------|--------|
| FARM-S631 | Fix A-3: In `.github/workflows/ci.yml`, the `helm` job checkout step is missing `fetch-depth: 0`. Without a full git history, `ct lint` cannot compare the PR branch to `target-branch: main` and will either fail with an error or silently skip chart validation. Add `fetch-depth: 0` to the checkout in the `helm` job, matching the `helm-lint.yml` configuration. | `TODO` |
| FARM-S632 | Fix A-4: `.github/workflows/ci.yml` and `.github/workflows/helm-lint.yml` implement overlapping but non-identical Helm validation logic that runs on the same path trigger (`deploy/helm/**`). Convert `helm-lint.yml` to expose a `workflow_call` trigger in addition to `pull_request`, and have `ci.yml` call it via `uses: ./.github/workflows/helm-lint.yml`. This eliminates duplication, ensures both CI contexts run the same validation, and makes `helm-lint.yml` the single source of truth for chart CI. | `TODO` |
| FARM-S633 | Fix A-5: `.github/workflows/helm-lint.yml` runs `helm lint deploy/helm/farm -f deploy/helm/farm/values-dev.yaml` without `--strict`. Warnings exit 0 and pass the CI gate silently. Add `--strict` to the `helm lint` invocation. Also add `helm lint deploy/helm/observability --strict` — the observability chart is only validated by `ct lint` today, not by `helm lint --strict`. | `TODO` |
| FARM-S634 | Fix A-6: Extend `deploy/helm/ct.yaml` with the following fields missing from the chart-testing reference: `install-namespace: farm-ci-test` (deterministic namespace for `ct install`); `helm-extra-args: "--timeout 10m"` (PostgreSQL + Redis startup accommodation); `validate-chart-schema: true` (explicit — chart has `values.schema.json`); `check-version-increment: true` (enforce chart `version` bump on every PR that modifies chart files). | `TODO` |
| FARM-S635 | Fix M-1: The `version:` field in both `Chart.yaml` files is never incremented automatically. Helm SemVer spec requires `version` to be bumped on every chart change. In `.release-it.json`, add a `after:bump` hook step that increments the chart `version` patch component using `sed` or a dedicated version-bump script. Chart version should track independently from `appVersion` — e.g., `appVersion: "0.26.0"` with `version: "0.3.1"`. Document the convention: chart `version` patch = bug/template fixes; minor = new values/features; major = breaking changes to the values API. | `TODO` |
| FARM-S636 | Fix M-7: In `.github/workflows/helm-lint.yml`, the `kubeconform` installation uses `curl -sL ... | tar xz` — a curl-pipe without SHA256 verification. The Helm install in the same workflow correctly downloads the tarball, verifies the checksum against the `.sha256sum` file, and then extracts. Apply the same pattern to kubeconform: download to `/tmp`, fetch the corresponding SHA256 from the GitHub release assets, verify with `sha256sum --check`, then extract. | `TODO` |
| FARM-S637 | Fix B-3: `.github/workflows/ci.yml` uses mutable action tags in multiple jobs: `actions/checkout@v5` (jobs `api`, `web`, `migrations`, `openapi-snapshot`), `codecov/codecov-action@v6.0.1` (jobs `api`, `web`). Resolve commit SHAs for all tags and pin every action in `ci.yml` to SHA. Use `gh api /repos/{owner}/{repo}/git/ref/tags/{tag}` to resolve. This brings `ci.yml` to the same supply-chain hardening standard already applied to `helm-lint.yml`. | `TODO` |

### FARM-E148: OCI Chart Distribution `TODO`

Publish `farm` and `farm-observability` as OCI artifacts to GHCR (`ghcr.io/ops-talks/helm-charts/`) so operators can install with a single `helm install oci://...` command without cloning the repository.

| ID | Story | Status |
|----|-------|--------|
| FARM-S606 | Create `.github/workflows/helm-publish.yml` triggered on `push` to `main` with `paths: deploy/helm/**`. This decouples chart releases from app releases — a chart bug fix ships independently. For each chart where `version:` in `Chart.yaml` differs from the last published OCI tag (detected via `helm show chart oci://ghcr.io/ops-talks/helm-charts/<name> --version <ver>` returning non-zero): run `helm dependency build`, `helm package`, `helm push <tgz> oci://ghcr.io/ops-talks/helm-charts/<name>`. Use `helm registry login ghcr.io` with `secrets.GITHUB_TOKEN`. Set `permissions: packages: write, contents: read`. Do not use `azure/setup-helm`; reuse the SHA256-verified install from the composite action. | `TODO` |
| FARM-S607 | Extend the `Update Helm chart appVersion` step in `.github/workflows/release.yml` to also update `deploy/helm/observability/Chart.yaml`. Use the same `sed -i "s/^appVersion: .*/appVersion: \"${VERSION}\"/"` pattern already applied to `farm/Chart.yaml` (line 99) — no new tool (`yq`) needed. Add a second `sed` line for `observability/Chart.yaml`. Also add a `sed` to update `api.image.tag` and `web.image.tag` in `deploy/helm/farm/ci/kind-values.yaml` (created in FARM-S617) so `ct install` always tests against the latest released image. | `TODO` |
| FARM-S608 | Document OCI installation in `deploy/helm/farm/README.md` and `deploy/helm/observability/README.md`. Add a "Quick Start" section with `helm install farm oci://ghcr.io/ops-talks/helm-charts/farm --version x.y.z -f values-production.yaml`. Document GHCR package visibility (must be set to public in Package Settings after first push). Add cosign verification command reusing the keyless signing infrastructure from Phase 50 (FARM-S546). | `TODO` |

### FARM-E149: Artifact Hub Integration `TODO`

Make both charts discoverable on artifacthub.io with full metadata, changelogs, and automated quality gates. Artifact Hub polls OCI registries directly — no `index.yaml` or `gh-pages` branch needed.

| ID | Story | Status |
|----|-------|--------|
| FARM-S609 | Add Artifact Hub annotations to `deploy/helm/farm/Chart.yaml`: `artifacthub.io/changes` (changelog for current version), `artifacthub.io/license: Apache-2.0`, `artifacthub.io/links` (support + source URLs), `artifacthub.io/images` (farm-api and farm-web with GHCR URIs and platforms), `artifacthub.io/category: integration-delivery`. | `TODO` |
| FARM-S610 | Add Artifact Hub annotations to `deploy/helm/observability/Chart.yaml`: `artifacthub.io/changes`, `artifacthub.io/license: Apache-2.0`, `artifacthub.io/links`, `artifacthub.io/images` (kube-prometheus-stack, loki, tempo, alloy, pyroscope), `artifacthub.io/category: monitoring-logging`. | `TODO` |
| FARM-S611 | Pre-requisite (manual, blocking): register both OCI repositories on artifacthub.io UI and capture the `repositoryID` UUID for each. Create `deploy/helm/artifacthub-repo.yml` with the obtained `repositoryID` and `owners` block. Add an `oras push` step to `helm-publish.yml`: install the `oras` CLI binary from GitHub releases with SHA256 verification (same pattern as helm and kubeconform — no `docker run`). Push the metadata file as the special AH tag: `oras push ghcr.io/ops-talks/helm-charts/<name>:artifacthub.io --config /dev/null:application/vnd.cncf.artifacthub.config.v1+yaml artifacthub-repo.yml:application/vnd.cncf.artifacthub.repository-metadata.layer.v1.yaml`. | `TODO` |
| FARM-S612 | Add `ah lint` quality gate to `.github/workflows/helm-lint.yml`. Install the `ah` CLI binary from GitHub releases with SHA256 verification — do not use `docker run artifacthub/ah` (pulls ~100 MB image per run). Run `ah lint` for each changed chart directory. Gate on `steps.list-changed.outputs.changed == 'true'` so it only runs on modified charts. | `TODO` |

### FARM-E150: Helm Test Suite `TODO`

Add `helm test` hook templates to the `farm` chart so `helm test <release>` verifies the deployed stack is fully operational — API health, web health, database connectivity, and Redis connectivity. All test resources are `batch/v1 Job` with `backoffLimit: 0` — the Helm documentation recommends `Job` over bare `Pod` for test hooks because `Job` provides proper failure semantics and restart control.

| ID | Story | Status |
|----|-------|--------|
| FARM-S613 | Create `deploy/helm/farm/templates/tests/test-api-health.yaml` as `batch/v1 Job` with `backoffLimit: 0`. Container uses `curlimages/curl` pinned by digest (add `# renovate: datasource=docker depName=curlimages/curl` comment for auto-update). Command: `curl -sf http://{{ include "farm.fullname" . }}-api:{{ .Values.api.service.port }}/api/health`. Annotations: `helm.sh/hook: test`, `helm.sh/hook-delete-policy: hook-succeeded`. Image digest hardcoded in template — not in `values.yaml` (test internals are not user-configurable). | `TODO` |
| FARM-S614 | Create `deploy/helm/farm/templates/tests/test-web-health.yaml` as `batch/v1 Job` with `backoffLimit: 0`. Same structure as S613. Command: `curl -sf http://{{ include "farm.fullname" . }}-web:{{ .Values.web.service.port }}/`. Same `helm.sh/hook` and delete policy. Image digest hardcoded in template. | `TODO` |
| FARM-S615 | Create `deploy/helm/farm/templates/tests/test-db-redis.yaml` as `batch/v1 Job` with `backoffLimit: 0` and `helm.sh/hook-weight: "5"` (runs after S613 and S614). Two `initContainers`: (1) `postgres:16-alpine` pinned by digest running `pg_isready -h {{ .Release.Name }}-postgresql -U {{ .Values.postgresql.auth.username }}`; (2) `redis:7-alpine` pinned by digest running `redis-cli -h {{ .Release.Name }}-redis-master ping`. Main container is `busybox` that exits 0 after both init containers succeed. All image digests hardcoded in template with Renovate comments. | `TODO` |

### FARM-E151: KinD Integration Tests in CI `TODO`

Run `ct install` on every PR that modifies `deploy/helm/**` against a real KinD cluster. This is the approach recommended by `helm/chart-testing`: `ct install` handles the full lifecycle (dependency build, install, `helm test`, cleanup) and automatically discovers `ci/kind-values.yaml` override files per chart. Bare `Pod` test resources are replaced by `Job` (FARM-E150) so `helm test` correctly reports pass/fail through Job completion status.

Application images in KinD reference the last released tag (pinned in `ci/kind-values.yaml`). This is standard practice: chart tests validate chart rendering and connectivity, not unreleased application code. The `release.yml` keeps `kind-values.yaml` current (FARM-S607).

| ID | Story | Status |
|----|-------|--------|
| FARM-S616 | Create `deploy/helm/farm/ci/kind-values.yaml` with minimal values for a bare KinD cluster (no Prometheus Operator): `postgresql.enabled: true`, `redis.enabled: true`, `api.replicaCount: 1`, `web.replicaCount: 1`, `api.secrets.JWT_SECRET: "ci-test-secret-32-chars-minimum!"`, `prometheusRule.alertmanagerReceiverName: "null"`, `serviceMonitor.enabled: false`, `prometheusRule.enabled: false`, `api.image.tag: "0.25.9"`, `web.image.tag: "0.25.9"` (pinned to latest released tag; kept current by FARM-S607 automation in `release.yml`). GHCR packages must be set to public for KinD to pull without credentials. | `TODO` |
| FARM-S617 | Update `deploy/helm/ct.yaml` to add `install-namespace: farm-ci-test` and `chart-values: ["ci/kind-values.yaml"]` under the chart configuration. This makes `ct install` automatically apply `ci/kind-values.yaml` when installing the `farm` chart. Add `helm-extra-args: "--timeout 10m"` to accommodate PostgreSQL + Redis startup time. | `TODO` |
| FARM-S618 | Add a `ct-install` job to `.github/workflows/helm-lint.yml`, running after the `helm-lint` job. Steps: (1) `actions/checkout` (SHA-pinned, same as `helm-lint` job); (2) `helm/kind-action` SHA-pinned to the commit SHA of the version tag (`gh api /repos/helm/kind-action/git/ref/tags/<tag>` to resolve); (3) `helm/chart-testing-action` (already in `helm-lint` job — reuse); (4) run setup-helm-deps composite action; (5) run `ct install --config deploy/helm/ct.yaml`. Gate: `if: steps.list-changed.outputs.changed == 'true'` — only runs when chart files are modified. Do NOT add KinD to a separate post-release workflow; `ct install` on PRs is the recommended pattern. | `TODO` |

---

## Phase 55: Backend API Best-Practices Audit & Remediation `TODO`

Remediate the gambiarras (workarounds) found in a technical audit of the backend API (`apps/api`) where the Farm project bent a framework, library, or driver to fit Farm instead of adopting the tool's documented best practice. Guiding principle, applied without exception: **the Farm backend adapts to the tools' best practices — not the other way around.** Scope is strictly the NestJS API; the web frontend and Helm chart are out of scope and tracked separately.

Audit method: four parallel static analyses (bootstrap/config, TypeORM/persistence, auth/RBAC, integrations/async) cross-checked against the source. Findings that turned out to be deliberate, documented design decisions (the plugin-manager mega-module, the `/api` to `/api/v1` legacy redirect from FARM-S519, the `PerUserThrottlerGuard.getTracker()` override — which is the documented `@nestjs/throttler` extension point — the org-scoping guard chain, entity `@BeforeInsert` password hashing, and the `ConfigService`-backed configuration factory reading `process.env`) were excluded. Only genuine deviations from tool best practices remain below.

Findings summary: the dominant theme is a **dual-database compromise** (PostgreSQL in production, SQLite/`better-sqlite3` in tests) that pushed the production schema toward a lowest-common-denominator design and required a runtime monkey-patch of TypeORM driver internals in the test harness, plus a **fragmented HTTP client strategy** (the project mixes native `fetch()` in 17 services with the idiomatic `@nestjs/axios` `HttpService` in 9, with uneven response validation and timeout policy).

### FARM-E155: Database Schema Integrity & Driver Independence `TODO`

The production database is PostgreSQL 16, but the schema, entity metadata, and migrations were bent to also satisfy the SQLite in-memory test database. The result is environment-dependent column types, driver-conditional DDL, and lowest-common-denominator column shapes that forfeit PostgreSQL's native capabilities (`jsonb` indexing, native arrays, `timestamptz`). This epic restores a single, PostgreSQL-first schema and moves the dual-database accommodation out of the production model.

| ID | Story | Status |
|----|-------|--------|
| FARM-S638 | Remove `src/common/utils/column-type.util.ts`. The `dateColumnType()` helper picks `"timestamp"` vs `"datetime"` from `process.env.DATABASE_TYPE`, making entity metadata environment-dependent — a gambiarra so that SQLite tests accept the schema. At least 15 entity files consume it (`user.entity.ts`, `password-reset.entity.ts`, `documentation-build.entity.ts`, `invitation-token.entity.ts`, `pipeline-run.entity.ts`, `resource-violation.entity.ts`, `api-health-check.entity.ts`, `gateway-route.entity.ts`, `environment-request.entity.ts`, `opa-result.entity.ts`, `iac-module-version.entity.ts`, `iac-run.entity.ts`, `scorecard-result.entity.ts`, `api-specs/entities/api-spec.entity.ts`, `api-specs/entities/api-consumer.entity.ts`). Best practice: an entity is a single source of truth — declare the PostgreSQL-correct type (`@CreateDateColumn`/`@UpdateDateColumn`, or `timestamptz` for explicit columns) once and let the test driver map it. Acceptance criterion: `grep -r "dateColumnType(" src` returns zero matches and the util file is deleted. | `TODO` |
| FARM-S639 | Eliminate driver-conditional DDL across the entire migration set. Approximately 22 migration files branch on the active driver (`queryRunner.connection.options.type`, `=== "postgres"`, `=== "better-sqlite3"`/`"sqlite"`) and emit different SQL — different column types, indexes, and even no-op `down()` paths — so the same migration runs against SQLite. Some explicitly weaken constraints for SQLite compatibility (e.g. `1776700000001-AddUserOrgRole.ts`). This is a non-exhaustive sample; representative files include `1773930000001-add-keycloak-integration.ts`, `1773940000001-add-api-specs.ts`, `1773950000001-add-gateway.ts`, `1774000000001-add-org-id-to-phase11-entities.ts`, `1774200000002-add-incidents.ts`, `1774700000002-AddKedaBindings.ts`, `1774900000001-AddPipelineRunMetadata.ts`, `1776400000001-AddScorecardResults.ts`. Best practice (TypeORM): migrations target the production database only and must never run against the SQLite test DB (tests build schema from entity metadata — see FARM-S642). Acceptance criterion: zero `options.type`/driver conditionals and zero `better-sqlite3`/`sqlite` references remain in `src/migrations`; every migration contains PostgreSQL-only SQL. | `TODO` |
| FARM-S640 | Migrate `simple-json` columns to PostgreSQL `jsonb`. ~29 `simple-json` columns across the entity set (notably `component.entity.ts`: `links`, `metadata`, `helmChart`, `containerImage`; plus `scorecard-result`, `pipeline-run`, `post-mortem`, `alerting-rule`, `service-template`, `dashboard-widget`, etc.) serialize structured data to TEXT — a SQLite-compatible lowest common denominator. `simple-json` cannot be queried, indexed, or partially updated at the database level. Best practice: use `@Column({ type: "jsonb" })` on PostgreSQL for structured payloads, enabling GIN indexing and JSON path queries. Provide a typed object shape (interface) for each column. Each column needs its own defensive conversion migration — do not assume a bare `USING column::jsonb` cast is safe: handle legacy empty strings and invalid JSON (e.g. `USING NULLIF(column, '')::jsonb`) and preserve existing defaults. | `TODO` |
| FARM-S641 | Replace `simple-array` columns with proper relational or native-array modeling. 10 `simple-array` columns (notably `gateway-route.entity.ts`: `paths`, `methods`, `tags`; `user.entity.ts`: `roles`; `component.entity.ts`: `tags`; plus `team`, `environment`, `deployment`, etc.) comma-join values into a single string, which breaks on values containing commas and cannot be queried. Best practice: choose per-column based on semantics and query pattern — use a normalized join table where the values carry referential meaning or are frequently filtered (e.g. `gateway-route` methods used in routing lookups, `user.roles`), and PostgreSQL native arrays (`@Column({ type: "text", array: true })`) only for true scalar bags (e.g. free-form tags). Produce a per-column migration plan and the corresponding conversion migrations; document the rationale for each choice. | `TODO` |
| FARM-S642 | Decouple the test database from the production schema and remove the TypeORM driver monkey-patch. Today E2E tests run SQLite/`better-sqlite3` with `synchronize: true` (`test/helpers/e2e-setup.ts`), and `test/helpers/better-sqlite3-compat.ts` monkey-patches `BetterSqlite3Driver.prototype.normalizeType` via a private TypeORM import path (`typeorm/driver/better-sqlite3/BetterSqlite3Driver`) to coerce `timestamp`/`timestamptz` into `datetime` so the production schema validates under SQLite. This is the canonical "bend the tool to the project" gambiarra and will require ever-growing patches once S640/S641 introduce `jsonb` and native arrays (which SQLite cannot represent). Best practice: make a PostgreSQL-backed test database the primary path — adopt `@testcontainers/postgresql` (or an ephemeral PostgreSQL 16 service) for E2E and schema-fidelity tests so the test schema equals production. SQLite, if retained at all, is restricted to fast pure-unit tests with mocked repositories and carries no TypeORM schema fidelity. Delete `better-sqlite3-compat.ts`. Record the decision in an ADR; the PostgreSQL migration-integrity CI job remains the definitive schema validator. | `TODO` |
| FARM-S643 | Guard `synchronize: true` so it can never be enabled outside tests. In `app.module.ts` the TypeORM `synchronize` flag is config-driven (`database.synchronize`). Add a hard guard in the `TypeOrmModule.forRootAsync` factory (or `configuration.ts` Joi schema) that forces `synchronize: false` whenever `database.type === "postgres"` or `env !== "test"`, regardless of `DATABASE_SYNC`. Best practice (TypeORM): `synchronize: true` is documented as unsafe for any database that holds real data; production schema changes must flow exclusively through migrations. | `TODO` |

### FARM-E156: HTTP Client Consistency `TODO`

The backend mixes two outbound-HTTP strategies: 17 services call the native `fetch()` API directly while 9 use the idiomatic `@nestjs/axios` `HttpService`. The shared `src/modules/integrations/http-error.ts` helper even branches on "Axios or native fetch", institutionalizing the split. Native `fetch()` is not by itself non-idiomatic, but the inconsistency means timeout, retry, circuit-breaker, response validation, and OpenTelemetry HTTP instrumentation are applied unevenly across integrations. This epic standardizes a single outbound-HTTP convention and closes the validation/timeout gaps — it does not claim `fetch()` is forbidden by NestJS.

| ID | Story | Status |
|----|-------|--------|
| FARM-S644 | Adopt a single project convention for outbound HTTP built on `@nestjs/axios` `HttpService` (configured via `HttpModule.registerAsync` with default timeout, max redirects, and the existing circuit breaker from `src/common/circuit-breaker`). Document it as the standard pattern for external calls. Where a service legitimately needs `fetch()` for test interception (e.g. `opa.service.ts` notes this explicitly), keep it as a documented, justified exception rather than the default. Add an ESLint guard that flags new unjustified `fetch(` usage in `src/**` (excluding tests) to prevent further drift. | `TODO` |
| FARM-S645 | Converge the native-`fetch()` services on the standard convention (FARM-S644): `kubernetes/thanos.service.ts`, `kubernetes/elastic-stack.service.ts`, `finops/open-cost.service.ts`, `finops/cost.controller.ts`, `features/features.service.ts`, `slo/slo-calculator.service.ts`, `elasticsearch-index/elasticsearch-index-stats.service.ts`, `gateway/adapters/kong.adapter.ts`, `registry/adapters/{harbor,gcr,docker-hub}.adapter.ts`, `integrations/{github-actions,azure-devops}.service.ts`, `auth/keycloak-sync.service.ts`, `pipelines/pipeline.processor.ts`, `observability/traces-ingest.controller.ts`, and `opa.service.ts` (unless its test-interception exception is kept and documented). Preserve existing behavior and circuit-breaker wrapping; route error handling through the unified `translateHttpError` path. Once converged, simplify `http-error.ts` to a single client model. | `TODO` |
| FARM-S646 | Validate external HTTP response payloads instead of casting raw JSON. Multiple services (`opa.service.ts`, `elastic-stack.service.ts`, `open-cost.service.ts`) parse `response.json()` and cast straight into hand-written interfaces with no runtime validation, so a malformed upstream payload surfaces as an obscure downstream crash. Best practice: define response DTOs validated with `class-validator`/`class-transformer` (consistent with the inbound `ValidationPipe`), or a schema validator, and reject/log malformed responses at the boundary. | `TODO` |
| FARM-S647 | Remove hardcoded fallback URLs for external services. `opa.service.ts` defaults to `http://localhost:8181` and `open-cost.service.ts` to `http://localhost:9090` when config is absent — inside a Kubernetes pod `localhost` is the pod itself, so a misconfiguration fails silently instead of failing fast. Best practice: make these endpoints required configuration validated by the Joi schema in `configuration.ts`; on absence, the module should fail startup (or cleanly disable the feature) with an explicit error — never fall back to `localhost`. | `TODO` |
| FARM-S648 | Apply timeout, retry, and circuit-breaker policy uniformly. After convergence, confirm every external integration is wrapped by the circuit breaker (already used by 18 services) with a configured request timeout, and that there are no remaining ad-hoc `setTimeout`-based timeouts or unbounded awaits. Document the standard resilience policy (timeout, breaker thresholds) in the integration module README. | `TODO` |

### FARM-E157: Idiomatic NestJS Framework Usage `TODO`

A small number of features fight the NestJS/Passport request lifecycle instead of using the framework's declarative primitives.

| ID | Story | Status |
|----|-------|--------|
| FARM-S649 | Replace the per-request Passport mutation in `auth.controller.ts` (`keycloakAuth`/callback). The controller calls `passport.use("keycloak-dynamic", strategy)` on every request and then invokes `passport.authenticate(...)` manually. Mutating the global Passport strategy registry per request is not thread/async-safe — concurrent logins for different organizations race on the shared `"keycloak-dynamic"` slot. Best practice: resolve the per-organization OIDC config without mutating global Passport state — use a custom `AuthGuard` subclass that builds the strategy in `getAuthenticateOptions`/`getRequest` scope, or instantiate and run the strategy locally per request without registering it globally. | `TODO` |
| FARM-S650 | Move Socket.IO connection authentication out of the hand-written handshake logic. `common/events/events.gateway.ts` verifies the JWT by hand inside `handleConnection`. Best practice: a NestJS `CanActivate` WS guard protects message handlers but does not cover the Socket.IO connection handshake, so connection-time auth should be implemented as Socket.IO server middleware (`io.use(...)`) via a custom `IoAdapter`, or a `@nestjs/passport` WS strategy — making connection auth declarative, testable, and consistent with the HTTP guard chain. Choose the adapter/middleware approach for handshake auth and a WS guard for per-message authorization. | `TODO` |
| FARM-S651 | Route the remaining direct `process.env` reads in the application runtime through `ConfigService`. The Pyroscope bootstrap block in `main.ts` (`PYROSCOPE_ENABLED`, `PYROSCOPE_URL`, `NODE_ENV`) and the correlation-ID exposure decision in `common/filters/http-exception.filter.ts` read `process.env` directly, bypassing the validated config layer. Best practice: inject `ConfigService` (the filter is a provider and can take it via constructor; the Pyroscope init can move into an `OnModuleInit` provider that reads config). Explicitly out of scope and deliberately excluded: the `configuration.ts` factory and `typeorm-cli.config.ts` (reading `process.env` is their defined role) and the module-load-time reads in `common/telemetry/tracing.ts`, which must run before the DI container exists and therefore cannot use `ConfigService`. | `TODO` |

### FARM-E158: Test & Build Tooling Honesty `TODO`

Remove tooling that games a quality metric rather than reflecting reality.

| ID | Story | Status |
|----|-------|--------|
| FARM-S652 | Remove the `src/jest-helper-patch.js` custom Jest transformer. It wraps `ts-jest` and rewrites compiled output to inject `/* istanbul ignore next */` before every TypeScript-emitted `emitDecoratorMetadata` type-guard ternary, excluding them from branch coverage. While the intent (the `Object` fallback branch is unreachable) is defensible, monkey-patching the transpiler output to manipulate coverage is a gambiarra that masks the real coverage surface and is fragile against TypeScript/ts-jest version changes. Best practice: configure coverage exclusions through documented Jest/Istanbul mechanisms — `coveragePathIgnorePatterns`, per-file `/* istanbul ignore */` only where a human reviewer adds it, or `babel-plugin-istanbul` ignore options — and adjust `coverageThreshold` to reflect the true number. Delete the transformer, restore the standard `ts-jest` transform in `jest.config.js`, and remove the `jest-helper-patch.js` entry from `knip.config.ts`. | `TODO` |

### FARM-E159: OpenAPI Contract Artifact Integrity `TODO`

Swagger decorator hygiene is strong (Phase 41): every controller carries `@ApiTags`/`@ApiOperation`, every `JwtAuthGuard` controller declares `@ApiBearerAuth`, every `OrgRequiredGuard` controller documents the `x-organization-id` header, and the `@nestjs/swagger` CLI plugin runs with `introspectComments`. The gambiarras are in the OpenAPI *artifact* and its CI handling: a committed spec file that is a fake placeholder, and an "OpenAPI snapshot" job that never actually gates on the snapshot.

| ID | Story | Status |
|----|-------|--------|
| FARM-S653 | Replace the committed `apps/api/openapi.json` placeholder with a real, generated specification — or remove it. The file is a 556-byte static stub with `"paths": {}`, a hardcoded `version: "0.25.10"` (already drifted from the current release), and an `x-note` declaring "Static placeholder only. Do not use for code generation." Nothing consumes it: `dast.yml` regenerates its own `openapi.json` at runtime via `/api/docs-json`, and no build or codegen step reads the committed file. A committed contract artifact that is empty, stale, and self-declared unusable is worse than no file. Best practice: add a standalone generator script (`SwaggerModule.createDocument` written to disk without starting the HTTP listener, mirroring `main.ts` setup) wired as an npm script (e.g. `openapi:generate`), and commit the full generated spec so it is a real, versioned, codegen-usable contract. If a committed spec is not wanted, delete `apps/api/openapi.json` outright rather than shipping a misleading placeholder. | `TODO` |
| FARM-S654 | Make the `openapi-snapshot` CI job an actual contract-drift gate. Today the job (`.github/workflows/ci.yml:98-192`) boots the API, downloads `/api/docs-json`, and uploads it as a 30-day artifact — it is a "snapshot" in name only, with no comparison and no failure condition, so an unreviewed breaking change to the public API surface passes CI silently. Best practice: regenerate the spec with the FARM-S653 generator and `git diff --exit-code apps/api/openapi.json` (or a normalized JSON diff) so the job fails when the committed contract and the live spec diverge, forcing the spec to be regenerated and reviewed in the same PR. This turns the OpenAPI document into an enforced contract, consistent with Phase 47 (API Contract Stability). | `TODO` |

---

## Phase 56: Admin User Registration `DONE`

The Farm user management dashboard (Phase 37, `UserManagementController`) allows platform admins and org admins to list, suspend, change roles, reset passwords, and delete existing users — but provides no endpoint to proactively create a new user account. The only current path to account creation is self-registration via `POST /api/v1/auth/register`, which requires the prospective user to act first. This phase adds admin-initiated user creation: a platform admin or an org admin can create a user account from within the logged-in area, optionally pre-enrolling the new user into an organization with a specified role and sending a welcome email containing temporary credentials.

Authorization follows the established Phase 37 pattern: `JwtAuthGuard` at the controller level; org-level authorization delegated to `assertOrgAdmin()` in the service; platform-wide operations gated by `isPlatformAdmin()`. No new `Permission` enum entry is required — user creation is a user-management-level operation, not an org-context (`PermissionGuard`) operation.

### FARM-E160: Backend — Admin-Initiated User Creation API `DONE`

Add `POST /api/v1/users` to the existing `UserManagementController` and its backing `UserManagementService`. The new endpoint reuses all surrounding infrastructure: `JwtAuthGuard`, `AuditLogService`, `notificationsQueue`, and the `ManagedUserView` response shape already established in Phase 37.

| ID | Story | Status |
|----|-------|--------|
| FARM-S655 | Add `AdminCreateUserDto` to `apps/api/src/modules/auth/dto/admin-create-user.dto.ts`. Required fields: `username` (2–50 chars, same `Matches(/^[a-zA-Z0-9_-]+$/)` pattern as `RegisterUserDto`), `email` (valid email), `displayName` (non-empty string). Optional fields: `password` (omit to have the API auto-generate a 12-char temporary password via `randomBytes` — same approach as `resetPassword`); `orgId` (UUID string; auto-enroll the new user into this organization); `orgRole` (`OrgRole` enum, defaults to `OrgRole.VIEWER` when `orgId` is provided); `platformAdmin` (boolean, defaults to `false`; grants the new user the global `admin` role — rejected with `ForbiddenException` if the acting user is not a platform admin). Apply full `class-validator` decorators (`@IsString`, `@IsEmail`, `@IsOptional`, `@IsEnum`, `@IsBoolean`, `@IsUUID`) and `@ApiProperty` with examples, descriptions, and `enum:` keys for `orgRole`. | `DONE` |
| FARM-S656 | Add `createUser(actor: AuthenticatedActor, dto: AdminCreateUserDto): Promise<ManagedUserView & { tempPassword?: string }>` to `UserManagementService`. Authorization rules: (1) if `dto.orgId` is provided and actor is not a platform admin, call `assertOrgAdmin(actor, dto.orgId)` — org admins may create users directly within their org; (2) if `dto.orgId` is absent, actor must be a platform admin, otherwise throw `ForbiddenException`; (3) if `dto.platformAdmin: true` and actor is not a platform admin, throw `ForbiddenException`. Credential generation: use `dto.password` if provided, otherwise `randomBytes(9).toString('base64').slice(0, 12)` for a 12-char temp password; hash with `bcrypt.hash(raw, 10)` and assign to `user.password` before calling `userRepository.save()` (bypass the `@BeforeInsert` hook double-hash guard by pre-hashing). Set `user.roles = dto.platformAdmin ? ['user', 'admin'] : ['user']`. If `dto.orgId` is provided, persist a `UserOrganization` row with `role: dto.orgRole ?? OrgRole.VIEWER`. If `notificationsQueue` is available, enqueue a `send-welcome-email` job carrying `{ username, email, tempPassword (if generated), loginLink }`. Emit audit log `USER_CREATED`. Catch TypeORM `QueryFailedError` with PostgreSQL code `23505` (UNIQUE violation) and SQLite code `SQLITE_CONSTRAINT` and rethrow as `ConflictException` (HTTP 409). Return `ManagedUserView` extended with `tempPassword?: string` — expose `tempPassword` only when it was auto-generated and SMTP is not available (same fallback contract as `resetPassword`). | `DONE` |
| FARM-S657 | Add `POST /` handler to `UserManagementController` (`@Post()` at path `''`, resolving to `POST /api/v1/users`). Decorate with `@HttpCode(HttpStatus.CREATED)`. Swagger annotations are mandatory: `@ApiOperation({ summary: 'Create a new user (admin)' })`, `@ApiBody({ type: AdminCreateUserDto })`, `@ApiResponse({ status: 201, description: 'User created successfully.' })`, `@ApiResponse({ status: 409, description: 'Username or email already taken.', type: ErrorResponseDto })`. The class-level `@ApiBearerAuth()` and `@ApiResponse({ status: 401 })` already cover auth. Delegate to `this.userMgmt.createUser(req.user, dto)` and return the result directly. | `DONE` |
| FARM-S658 | Unit tests in `apps/api/src/modules/auth/__tests__/user-management.service.spec.ts` covering `createUser`: (1) platform admin creates user globally → 201, returns `ManagedUserView`; (2) platform admin with `dto.platformAdmin: true` → `user.roles` includes `'admin'`; (3) org admin with matching `dto.orgId` → success, `UserOrganization` row saved with correct role; (4) org admin with `dto.orgId` belonging to another org → 403 `ForbiddenException`; (5) org admin with no `dto.orgId` → 403 `ForbiddenException`; (6) non-admin with `dto.platformAdmin: true` → 403 `ForbiddenException`; (7) duplicate username (UNIQUE constraint) → 409 `ConflictException`; (8) duplicate email (UNIQUE constraint) → 409 `ConflictException`; (9) SMTP queue unavailable → `tempPassword` present in response; (10) SMTP queue available → `tempPassword` absent from response, notification job enqueued; (11) audit log `USER_CREATED` entry emitted. Use `jest.fn()` mock repositories and reset in `afterEach()`. | `DONE` |
| FARM-S659 | E2E test in `apps/api/test/user-management.e2e-spec.ts` using `createE2EApp()` + `registerAndLogin()` from `test/helpers/e2e-setup.ts`: (1) `POST /api/v1/users` with valid DTO as platform admin → 201, body contains `id`, `username`, `email`; (2) repeat same username → 409; (3) repeat same email with different username → 409; (4) request without JWT → 401; (5) request as non-admin user (role `'user'` only) → 403. | `DONE` |

### FARM-E161: Frontend — Admin User Creation UI `DONE`

Extend the existing User Management dashboard (`apps/web/src/app/(protected)/users`) with a modal-driven admin user creation flow. The UX follows the same dialog pattern already used for password reset: a header-area trigger button opens a form dialog; on success, a copyable temporary password is shown before the dialog closes and the user list refreshes.

| ID | Story | Status |
|----|-------|--------|
| FARM-S660 | Extend the `userManagement` object in `apps/web/src/lib/api-client.ts` with a `create(dto: AdminCreateUserInput): Promise<ManagedUser & { tempPassword?: string }>` method that calls `POST /v1/users`. Add the `AdminCreateUserInput` interface to `apps/web/src/types/api.ts` mirroring `AdminCreateUserDto`: `{ username: string; email: string; displayName: string; password?: string; orgId?: string; orgRole?: OrgRole; platformAdmin?: boolean }`. Add `api-client.test.ts` coverage for the new method using the existing mock-`fetch` pattern (`globalThis.fetch = jest.fn()...` with the capture-and-restore guard). | `DONE` |
| FARM-S661 | Implement `CreateUserDialog` in `apps/web/src/app/(protected)/users/_components/CreateUserDialog.tsx`. Controlled dialog using the same Radix `Dialog` primitives and `Button`/`Input`/`Select`/`Badge` components from the design system already imported by `UsersClient.tsx`. Form fields: `username` (required), `email` (required), `displayName` (required), `password` (optional; placeholder "Leave blank to auto-generate"), `orgId` (optional `Select` populated from the organizations the actor belongs to, or all orgs if platform admin), `orgRole` (`Select` visible only when `orgId` is set; options: Viewer, Member, Admin, Owner), `platformAdmin` (`Checkbox` visible only when `user.roles?.includes('admin')` from `useAuth()`). On submit, call `userManagement.create(dto)` via `useMutation`. On success, if the response includes `tempPassword`, replace the form with a read-only credentials panel showing the generated password with a `Copy` button (reuse the `Copy` icon already imported in `UsersClient.tsx` and the same UX as the existing password-reset flow). On dialog close from the credentials panel, call `queryClient.invalidateQueries({ queryKey: ['users'] })`. Surface API errors inline (duplicate → "Username or email already taken", 403 → "Insufficient permissions"). | `DONE` |
| FARM-S662 | Wire the "New User" button into `UsersClient.tsx`. Add a `UserPlus` icon button (from `lucide-react`) in the card header, alongside existing header controls. Visibility condition: `user.roles?.includes('admin') || orgRole === OrgRole.ADMIN || orgRole === OrgRole.OWNER` — consistent with the visibility guard on other admin-only actions in the same component. Clicking the button opens `CreateUserDialog`. Add a unit test to `apps/web/src/app/(protected)/users/page.test.tsx` asserting the button is rendered for platform admin and org admin/owner roles, and is absent for viewer and member roles (mock `useAuth` and `useOrganization` accordingly). | `DONE` |
| FARM-S663 | Playwright test covering the end-to-end create-user flow: authenticate as platform admin → navigate to `/users` → assert "New User" button is visible → click → fill the form with a unique username, email, and display name (no password, to exercise auto-generation) → submit → assert the credentials panel appears with a non-empty password field and a working copy button → close the dialog → assert the new user row appears in the user list. Also assert the button is NOT visible when logged in as a viewer. Follow the `setupOrgMock` pattern and mock `GET /organizations/*/members/me` returning `{ role: 'owner' }` for the admin session so permission-gated UI elements render correctly. | `DONE` |
