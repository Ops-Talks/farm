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
| **Total** | **132** | **511** | |

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

### FARM-E136: Observability Coverage `TODO`

| ID | Story | Status |
|----|-------|--------|
| FARM-S557 | Add `"farm-integrations"` to the dashboard list in `templates/grafana-dashboards.yaml`. Add a CI step that `diff`s `deploy/helm/farm/dashboards/` against `observability/grafana/provisioning/dashboards/` (excluding `dashboard.yml`) and fails on any missing file (HELM-F007). | `DONE` |
| FARM-S558 | Add `runbook_url` annotations to all four alerts in `templates/prometheusrule.yaml`. Introduce a `prometheusRule.runbookBaseUrl` value (default: the GitHub README anchor) so operators can point to an internal runbook base URL (HELM-F008). | `DONE` |
| FARM-S559 | Compile `observability/sloth-slos.yml` with `sloth generate` and embed the resulting multi-burn-rate alert groups into `templates/prometheusrule.yaml`. Add a `make sloth-generate` Makefile target and a CI diff check to detect drift between the Sloth source and the embedded rules (HELM-F009). | `TODO` |

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

### FARM-E139: Ingress Improvements `TODO`

| ID | Story | Status |
|----|-------|--------|
| FARM-S567 | Add `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"` and `proxy-send-timeout: "3600"` to `values-production.yaml` under `ingress.annotations` (or introduce separate `ingress.api.annotations` / `ingress.web.annotations` keys). Document the WebSocket requirement in README (HELM-F026). | `DONE` |
| FARM-S568 | Split `templates/ingress.yaml` into `templates/ingress-api.yaml` and `templates/ingress-web.yaml`. Introduce `ingress.api.annotations` and `ingress.web.annotations` value keys. Add a migration note to README for operators upgrading from the combined Ingress (HELM-F027). | `SUPERSEDED` by FARM-S613 |

---

## Phase 52: Helm Chart Production Readiness

Outcome of a dual-perspective audit of the Helm chart against two failure modes: (1) **portability** — can the chart be deployed as-is on EKS, K3s, and vanilla clusters without operator surprises; and (2) **production reliability** — does it survive real-world usage when Farm is a company's live developer portal with real users, real data, and uptime expectations. Phase 51 addressed chart correctness for basic deployments. Phase 52 addresses the full production lifecycle: distribution-specific operator experience, zero-downtime rolling upgrades, safe DB migration strategy, secret management at company scale, and HPA/connection-pool constraints that only surface under real load.

### FARM-E140: Platform-Agnostic Extension Points `DONE`

The chart must be opinionless about the underlying Kubernetes distribution. It never hardcodes ingress controller classes, CNI assumptions, or cloud-provider annotations. Instead it exposes clean extension points and documents what the operator must supply for their environment.

| ID | Story | Status |
|----|-------|--------|
| FARM-S569 | Audit and purge all controller-specific assumptions from chart files. Ensure `ingress.className` defaults to `""` in `values.yaml` and `values-production.yaml`. Replace any hardcoded `nginx.ingress.kubernetes.io/` annotations in `values-production.yaml` with a comprehensive comment block showing the equivalent WebSocket timeout annotation for NGINX, Traefik, AWS ALB, and Kong — as operator examples, never as active defaults. The chart itself ships zero ingress controller opinions. Already partially addressed; verify no regressions in `helm lint`. | `DONE` |
| FARM-S570 | Add `api.serviceAccount.annotations: {}` to `values.yaml` and render it in `templates/api/serviceaccount.yaml`. This is the standard Kubernetes pattern for cloud-provider workload identity: IRSA on EKS (`eks.amazonaws.com/role-arn`), Workload Identity on GKE (`iam.gke.io/service-account`), Pod Identity on AKS (`azure.workload.identity/client-id`). The chart stays agnostic — the operator supplies the annotation for their cloud. Expose `api.serviceAccount.automountServiceAccountToken` as a configurable boolean (default `false`) so operators using workload identity can enable it without patching the template. | `DONE` |
| FARM-S571 | Add a warning comment block in `values.yaml` above the `postgresql` and `redis` subchart sections: Bitnami images have moved to a private registry requiring Docker Hub authentication. Add `postgresql.global.imageRegistry: ""` and `redis.global.imageRegistry: ""` as explicit override keys so operators can point to any OCI-compliant registry mirror (corporate Harbor, ECR public mirror, GHCR). Document in `README.md` under a new "Registry Mirrors" section. | `DONE` |
| FARM-S572 | Fix `templates/NOTES.txt`: correct "A pre-install/pre-upgrade Job ran migrations before this release" to accurately describe the hook timing — `post-install` on fresh deploy (migration runs after all resources are created) and `pre-upgrade` on subsequent upgrades (migration runs before new pods roll out). This distinction is critical for operators triaging a failed upgrade at 2am. | `DONE` |
| FARM-S573 | Add a runtime guard to `validate.yaml`: when `api.networkPolicy.enabled: true` or `web.networkPolicy.enabled: true`, emit a Helm `fail` with a message stating that NetworkPolicy enforcement requires a CNI that supports it (Calico, Cilium, Canal, Weave Net) and that Flannel silently ignores NetworkPolicy resources without error. Add a "Prerequisites" section to `README.md` listing the CNI requirement. | `DONE` |
| FARM-S574 | Parameterize `storageClass` for both Bitnami subcharts: declare `postgresql.primary.persistence.storageClass: ""` and `redis.master.persistence.storageClass: ""` explicitly in `values.yaml` with `""` meaning "use the cluster default StorageClass". Add a comment block in `values-production.yaml` with the correct value for common cluster defaults (`gp3` for EKS managed nodes, `managed-premium` for AKS, `pd-ssd` for GKE). The chart itself ships no StorageClass opinion. | `DONE` |

### FARM-E141: Zero-Downtime Deployment `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S576 | Add `terminationGracePeriodSeconds` and `lifecycle.preStop` to both API and web Deployment templates. Expose `api.terminationGracePeriodSeconds: 30` and `api.lifecycle.preStop.exec.command: ["sleep", "5"]` in `values.yaml` with a comment explaining that the preStop sleep allows kube-proxy to drain in-flight connections before SIGTERM is sent. Same pattern for `web`. | `DONE` |
| FARM-S577 | Change the rolling update defaults in both Deployment templates from Kubernetes implicit defaults to explicit zero-downtime settings: `strategy.type: RollingUpdate`, `strategy.rollingUpdate.maxUnavailable: 0`, `strategy.rollingUpdate.maxSurge: 1`. Expose as `api.updateStrategy` and `web.updateStrategy` in `values.yaml`. Add `api.minReadySeconds: 10` and `web.minReadySeconds: 10` to prevent new pods from receiving traffic before they have stabilized past their startup probe. | `DONE` |
| FARM-S578 | Decouple the liveness probe from the dependency health check. Add a `GET /api/health/live` endpoint to the NestJS API that returns `200 { status: "ok" }` based solely on process responsiveness (no DB, no Redis check). Update the API Deployment template `livenessProbe` to use `/api/health/live`. Keep the existing `readinessProbe` on `/api/health` (which checks DB and memory). This prevents Kubernetes from killing a healthy API pod simply because PostgreSQL is slow during a backup or heavy query. | `DONE` |
| FARM-S579 | Add `replicaCount: 2` as the recommended minimum in `values-production.yaml` with a comment block explaining: (1) single-replica deployments cause downtime on every `helm upgrade` because `maxUnavailable: 0` requires at least one pod to stay up while the new pod starts; (2) `replicaCount >= 2` also activates the PodDisruptionBudget guard added in FARM-S554, protecting against node eviction during cluster maintenance. | `DONE` |

### FARM-E142: Safe Production Upgrades `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S580 | Add an "Upgrading Farm in Production" section to `deploy/helm/farm/README.md` with a step-by-step runbook: (1) take a pg_dump snapshot of the Farm database before upgrading; (2) run `helm upgrade --atomic --timeout 10m` so a failed migration automatically triggers Helm rollback; (3) if rollback occurs, restore from pg_dump only if schema changes were partially applied; (4) how to inspect migration job logs before they are cleaned up by `hook-delete-policy`. Add `--atomic --timeout 15m` to the `helm-upgrade` Makefile target. | `DONE` |
| FARM-S581 | Add a `pre-upgrade` Helm hook Job (`templates/pre-upgrade-check.yaml`, weight `-20`, lower than the migration) that runs `pg_isready` against the database and fails fast if the database is unreachable before the migration even starts. Gate on `migration.preUpgradeCheck.enabled: true` in `values.yaml`. This prevents the migration job from silently hanging for `activeDeadlineSeconds` when the DB is temporarily unavailable during a maintenance window. | `DONE` |
| FARM-S582 | Document migration forward-compatibility contract in `README.md`: all TypeORM migrations applied by the Farm chart must be additive (add column, add table, add index) for the duration of one release cycle. Destructive changes (drop column, rename, change type) are only permitted in the release after the one that introduced the replacement. This enables the pre-upgrade migration to run while old pods are still serving traffic without breaking them. Add this rule to `CONTRIBUTING.md`. | `DONE` |

### FARM-E143: Secrets Management at Scale `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S583 | Add `templates/external-secret.yaml` gated on `api.externalSecret.enabled: false`. When enabled, renders an `ExternalSecret` resource (external-secrets.io/v1beta1) that pulls `JWT_SECRET`, `DATABASE_PASSWORD`, and `REDIS_PASSWORD` from a configurable store (`api.externalSecret.secretStoreRef`, `api.externalSecret.remoteRef`). Add commented examples in `values-production.yaml` for AWS Secrets Manager and HashiCorp Vault. Requires the External Secrets Operator CRD to be installed — document this prerequisite. | `DONE` |
| FARM-S584 | Add a "Secret Management" section to `README.md` covering three tiers: (1) `api.existingSecret` — bring your own pre-created Secret (current supported path); (2) `api.externalSecret.enabled: true` — ESO integration (FARM-S583); (3) Vault agent injector sidecar — annotation-based injection pattern with example pod annotations. Document that Helm stores `--set` values in release history as plaintext and that operators must use `existingSecret` or ESO in production to avoid secret exposure via `helm get values`. | `DONE` |
| FARM-S585 | Add a "JWT Secret Rotation" runbook to `README.md`: (1) update the secret value in the external store or K8s Secret; (2) trigger a rolling restart (`kubectl rollout restart deployment/farm-api`); (3) all existing access tokens become invalid immediately (JWT verification uses the new secret); (4) refresh tokens are stored hashed in the DB and remain valid — users will need to re-authenticate with their refresh token once to get a new access token signed with the new key. Document expected user-facing impact. | `DONE` |

### FARM-E144: HPA, Connection Pools, and Scaling Constraints `DONE`

| ID | Story | Status |
|----|-------|--------|
| FARM-S586 | Add a comment block in `values.yaml` above `api.autoscaling.maxReplicas` warning operators about the connection pool ceiling: `maxReplicas x DATABASE_POOL_SIZE` must not exceed the PostgreSQL `max_connections` setting (default: 100). Add a corresponding `DATABASE_POOL_SIZE` scaling guidance comment in `values-production.yaml` recommending `DATABASE_POOL_SIZE: "5"` when `maxReplicas >= 10`, and noting that PgBouncer in transaction mode is the recommended solution for high-replica deployments. | `DONE` |
| FARM-S587 | Add Redis connection guidance to `values-production.yaml`: with HPA enabled, each API replica opens a persistent connection to Redis. For deployments with more than 5 replicas, recommend either Redis Cluster mode or a Redis proxy (e.g., Twemproxy) to avoid connection exhaustion on the single-instance Redis default. Add a link to Farm's Phase 48 Redis Sentinel configuration as the HA path for the Redis subchart. | `DONE` |
| FARM-S588 | Add default `topologySpreadConstraints` for API and web Deployments in `values-production.yaml`: spread across availability zones (`topology.kubernetes.io/zone`) with `maxSkew: 1` and `whenUnsatisfiable: ScheduleAnyway`. This prevents all HPA replicas from landing on the same AZ node in EKS/K3s multi-node clusters. Keep `values.yaml` default as `[]` to avoid breaking single-node dev clusters. | `DONE` |

---

## Phase 53: Tri-Agent Audit Remediation

Outcome of a deep cross-stack audit conducted by three specialized agents (`Farm-Developer`, `Next.js Expert`, `Farm-SRE`) against official framework documentation and modern best practices. Full findings are stored in `.github/agents/audits/{nestjs,nextjs,sre}-audit.md` (625 lines total, 95 findings). This phase converts the **Critical** and **High** items into actionable epics. Medium/Low items remain in the audit files as backlog candidates for later phases.

### FARM-E145: NestJS API — Critical Security & RBAC `DONE`

Address the 5 Critical and top High findings of the NestJS audit. Restores the documented guard-chain convention, removes hard-coded fallback secrets, and fixes cross-tenant cache poisoning.

| ID | Story | Status |
|----|-------|--------|
| FARM-S589 | Remove the literal `"super-secret-key-change-me-in-production"` fallback from `apps/api/src/config/configuration.ts` and `auth.module.ts` / `jwt.strategy.ts`. Joi schema must require `JWT_SECRET` (`min(32)`) for every `NODE_ENV` except `test` — fail fast at boot when unset. Same treatment for the Swagger Basic Auth defaults (`farm:farm`): require `SWAGGER_USER` / `SWAGGER_PASSWORD` outside `test`. Add a regression e2e that boots the API without `JWT_SECRET` and asserts a thrown `ConfigService` error. (Audit ref: NestJS C1) | `DONE` |
| FARM-S590 | Centralize bcrypt cost in a `BCRYPT_ROUNDS` constant (default `12`, env-overridable via `BCRYPT_ROUNDS`). Refactor `user.entity.ts:64`, `auth.service.ts:89/136/307/335`, `user-management.service.ts:343`, and `database/seeds/initial-seed.ts:247` to read from the constant. Add a "lazy re-hash on next login" path so legacy `cost=10` hashes are transparently upgraded. Update unit tests to use `BCRYPT_ROUNDS=4` in `jest.setup.ts` to keep test runtime reasonable. (Audit ref: NestJS C2) | `DONE` |
| FARM-S591 | Delete the global `OrgContextInterceptor` (`apps/api/src/common/interceptors/org-context.interceptor.ts`) and the `APP_INTERCEPTOR` registration in `app.module.ts:527–530`. `OrgRequiredGuard` is already mandatory for org-scoped endpoints and already populates `req.organizationId` + `req.orgRole`. For the small set of endpoints that accept an *optional* org header, introduce an explicit `OptionalOrgContextGuard` (or a `@OptionalOrgContext()` decorator + lightweight guard). Update affected controllers and add e2e coverage for one optional-context route. (Audit ref: NestJS C3) | `DONE` |
| FARM-S592 | Replace every `cacheManager.clear()` call (currently in `catalog.controller.ts:167/192/298/322` and others) with scoped key invalidation. Introduce a `CacheKeyBuilder` helper that prefixes keys with `org:${orgId}:<namespace>:<resource>` and a `TenantCacheService.invalidate(orgId, namespace)` that deletes only the matching scope. Add unit tests asserting cross-tenant isolation. Document the rule in `Farm-Developer.agent.md`: "never call `cacheManager.clear()` outside admin tooling." (Audit ref: NestJS C4) | `DONE` |
| FARM-S593 | Migrate the ~20 org-scoped controllers currently using `@UseGuards(JwtAuthGuard, RolesGuard) + @Roles("admin")` to the canonical chain `@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard) + @RequiresPermission(...)`. Affected files: `alerting/alerting.controller.ts:40`, `audit-log/audit-log.controller.ts:41`, `integrations/{argocd,jenkins,circleci,travisci}.controller.ts`, `tag-policy/tag-policy.controller.ts:43`, `api-specs/api-specs.controller.ts:41`, `environments/deployments.controller.ts:43`, `integrations/integration-credential.controller.ts:38`, `plugin-manager/plugin-manager.controller.ts:46`, `auth/auth.controller.ts:193/549`. Map each existing `@Roles("admin")` to the appropriate `Permission` enum value in `@farm/types`. Update Swagger annotations (`@ApiHeader({ name: 'x-organization-id', required: true })` + 401/403 responses). Add e2e tests that assert a non-owner org member receives 403 on a write endpoint. (Audit ref: NestJS C5) | `DONE` |
| FARM-S594 | Harden the JWT strategy (`apps/api/src/modules/auth/strategies/jwt.strategy.ts:22`): in `validate()`, look up the user, reject when `suspended === true`, and compare a new `tokenVersion` claim against `user.tokenVersion` so admins can invalidate sessions globally by incrementing the column. Add a migration to introduce `users.tokenVersion INT NOT NULL DEFAULT 0`. Apply constant-time guard in `auth.service.ts:80` by always calling `bcrypt.compare()` against a fixed dummy hash when the user is not found, to eliminate the timing oracle. (Audit ref: NestJS Auth H1/H4) | `TODO` |
| FARM-S595 | Replace the single `users.refreshToken` column with a dedicated `refresh_tokens` table keyed by `(userId, jti)` with `issuedAt`, `expiresAt`, `revokedAt`, `userAgent`, `ip`. Implement family-based rotation with reuse detection (revoke entire family on reuse). Enables true multi-device login. Add e2e covering: two parallel logins from different "devices" both remain valid; reuse of a rotated token revokes the family. Generate a TypeORM migration to backfill the new table from the legacy column then drop it. (Audit ref: NestJS Auth H2) | `TODO` |
| FARM-S596 | Introduce a `TenantScopedRepository<T>` mixin (or a `@TenantScoped()` decorator) that wraps `Repository<T>` and unconditionally appends `andWhere("entity.organizationId = :orgId")` using a REQUEST-scoped `OrgContextService` (CLS / `nestjs-cls`). Forbid raw `QueryBuilder` chains without org scoping via a lint rule or runtime assertion in dev. Refactor at least `analytics.service.ts:62–215`, `deployments.service.ts:227–324`, `teams.service.ts:238` as the first batch. Extend `cross-tenant-security.e2e-spec.ts` to cover the analytics + deployments surfaces. (Audit ref: NestJS Multi-tenancy H) | `TODO` |

### FARM-E146: Next.js Web — Critical Security & Architecture `TODO`

Address the 5 Critical and top High findings of the Next.js 16 audit. Closes the XSS surface and moves JWT off `sessionStorage`. (Note: the `proxy.ts` BFF work was replaced by FARM-E148 Ingress path-based routing.)

| ID | Story | Status |
|----|-------|--------|
| FARM-S597 | Add unit + integration tests for `apps/web/src/proxy.ts`. Cover: matcher hit/miss, query-string preservation, `URL` construction errors (return 502), env-fallback ordering, and the trailing-slash semantics. Remove the `?? process.env.NEXT_PUBLIC_API_URL` fallback inside `proxy.ts` so a build-time-inlined client URL can never silently override the server-runtime proxy target. Throw at boot when `API_INTERNAL_URL` is unset in production. Add a Playwright e2e (`apps/web/e2e/proxy.spec.ts`) asserting that an authenticated request to `/api/v1/organizations` is forwarded correctly. (Audit ref: Next.js C5 / H7 / Low 38) | `SUPERSEDED` by FARM-E148 |
| FARM-S598 | Migrate JWT access + refresh tokens from `sessionStorage` (`apps/web/src/lib/api-client.ts:174–217, 304–319`) to `httpOnly` + `Secure` + `SameSite=Lax` cookies. NestJS API sets cookies on `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`. Update `apps/web/src/lib/api-client.ts` to stop reading tokens client-side. This unlocks Server Component data-fetching (FARM-S601). (Audit ref: Next.js C2) | `TODO` |
| FARM-S599 | Enforce CSP. In `next.config.ts`: (a) switch header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`; (b) drop `'unsafe-inline'` and `'unsafe-eval'` in production; (c) tighten `connect-src` to the API origin, Faro endpoint, and OTel collector (remove the global `https://*` wildcard and drop `ws:` in production); (d) scope CSP to non-static paths via `source: '/((?!_next/static\|_next/image\|favicon\\.ico).*)'`. Reference: https://nextjs.org/docs/app/guides/content-security-policy. (Audit ref: Next.js C3 / M20 / M21) | `TODO` |
| FARM-S600 | Eliminate the XSS surfaces. (a) `apps/web/src/app/(protected)/docs/_components/DocsClient.tsx:106, 423`: add `isomorphic-dompurify` and sanitize `renderedHtml` before injecting via `dangerouslySetInnerHTML`. (b) `apps/web/src/components/search/advanced-search-modal.tsx:24–39, 354–365`: replace the hand-rolled regex tag-stripper with DOMPurify configured with an allow-list of `strong` only, OR escape both highlight and fallback into text and re-emit `<strong>` programmatically via React fragments. Add unit tests with known XSS payloads (nested tags, attribute injection, SVG namespace). (Audit ref: Next.js C4) | `TODO` |
| FARM-S601 | Adopt true Server Components for the top-5 highest-traffic pages: `dashboard`, `catalog`, `catalog/[id]`, `teams`, `pipelines`. For each: (a) move the initial fetch server-side using `await fetch(...)` with the cookie-based auth from FARM-S598; (b) add `generateMetadata({ params })` for detail pages; (c) hydrate React Query on the client via `dehydrate()` / `<HydrationBoundary>`; (d) add a per-segment `loading.tsx` with `<Suspense>` for streaming; (e) standardise the async-params contract — `page.tsx` receives `params: Promise<{ id: string }>`, awaits it, and passes `id` typed to the client child. Reference: https://nextjs.org/docs/app/getting-started/fetching-data. (Audit ref: Next.js C1 / H10 / M19) | `TODO` |
| FARM-S602 | Harden the plugin proxy (`apps/web/src/app/api/plugin-proxy/route.ts:1–60`): (a) add `AbortSignal.timeout(5000)`; (b) cap request body via streaming size guard (reject >1 MiB); (c) reject when upstream `Content-Type` is not `application/json` instead of `JSON.parse` failing silently; (d) drop the `?? NEXT_PUBLIC_API_URL` fallback (same as FARM-S597); (e) add an upstream host allow-list to prevent SSRF. Long-term consolidation with the unified `proxy.ts` is tracked separately under FARM-E146 backlog (audit M17). (Audit ref: Next.js H11) | `SUPERSEDED` by FARM-E148 |
| FARM-S603 | Convert at least 4 mutating flows to Server Actions: create org, create team, create component, accept invite. Colocate `actions.ts` under each route, use `useActionState`, and call `revalidateTag` / `revalidatePath` on success. Adopt `use cache` and `next: { revalidate, tags }` on the listing pages migrated in FARM-S601. Add a `@next/bundle-analyzer` script (`ANALYZE=true npm run build`) and verify that `winston`, `@opentelemetry/sdk-node`, and `winston-daily-rotate-file` never enter a client bundle. Reference: https://nextjs.org/docs/app/getting-started/updating-data. (Audit ref: Next.js H8 / H9 / M26) | `TODO` |

### FARM-E147: Helm Chart & SRE — Critical Reliability `TODO`

Address the 5 Critical and top High findings of the SRE audit. Fixes migration-ordering on fresh install, adds the missing CI gate, and closes the NetworkPolicy egress hole.

| ID | Story | Status |
|----|-------|--------|
| FARM-S604 | Fix the migration-ordering bug on fresh install. Currently `templates/migration-job.yaml` uses `helm.sh/hook: post-install,pre-upgrade`, but Helm does NOT wait for post-install hooks before creating the main release resources — the API Deployment boots in parallel with the migration Job and may serve traffic against an empty schema. Three remediation options (pick one and document):  (a) add an `initContainer` on the API Deployment that runs `kubectl wait --for=condition=complete job/farm-migration --timeout=300s` (requires an extra image + RBAC); (b) change the hook to `pre-install,pre-upgrade` and rely on the Bitnami postgresql subchart's own readiness (requires postgresql to also be a `pre-install` hook, which it currently is not); (c) rely on the API container's own `migration:run` invocation at startup (preferred for idempotency — already wired in `Dockerfile` `CMD`). Update `templates/NOTES.txt:27–34` to accurately reflect the chosen behaviour. Add an e2e test in KinD that fresh-installs the chart and asserts no 5xx is served before migrations complete. (Audit ref: SRE F-1) | `TODO` |
| FARM-S605 | Add a `helm` CI gate. New workflow `.github/workflows/helm.yml` that runs on every PR touching `deploy/helm/**`: (a) `helm lint deploy/helm/farm`; (b) `helm template` matrix against `values-dev.yaml`, an in-tree `values-prod.yaml.example`, and `--set postgresql.enabled=true` piped through `kubeconform -strict -summary -schema-location default -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'` (covers ServiceMonitor + ExternalSecret CRDs); (c) `ct lint` from `helm/chart-testing-action`. Block merge on any failure. Backport this to a `pre-commit` hook. (Audit ref: SRE F-2) | `TODO` |
| FARM-S606 | Fix the NetworkPolicy egress holes. `templates/api/networkpolicy.yaml:45–52` currently allows DB/Redis ports with no `to:` selector, effectively `0.0.0.0/0:<port>`. Render `to: [{ podSelector: { matchLabels: { app.kubernetes.io/name: postgresql } } }]` when `postgresql.enabled`, and accept a configurable `externalDatabase.egressIpBlock` (e.g. `10.0.0.0/16`) when external. Same pattern for Redis. Add a `validate.yaml` `fail` requiring BOTH `ingressControllerNamespaceSelector` AND `ingressControllerPodSelector` when NetworkPolicy is enabled with Ingress (covers F-6). Add a default `from: [{ podSelector: { matchLabels: { app.kubernetes.io/component: api } } }]` on the web NetworkPolicy when the operator does not set an ingress selector (covers F-25). (Audit ref: SRE F-5 / F-6 / F-25) | `TODO` |
| FARM-S607 | Reconcile chart versioning and metadata. `Chart.yaml` currently shows `version: 0.1.0` while `appVersion: 0.25.7`. (a) Bump chart `version` per SemVer on every template change (patch for additive/template-only, minor for new values, major for breaking). (b) Update `.github/workflows/release.yml` to bump BOTH `version` and `appVersion` from the pushed git tag (today it only updates appVersion). (c) Add `kubeVersion: ">=1.27.0-0"` and `icon: https://raw.githubusercontent.com/Ops-Talks/farm/main/docs/assets/logo.png` to `Chart.yaml`. (d) Add an ArtifactHub annotations block (`artifacthub.io/changes`, `/maintainers`, `/license`). (Audit ref: SRE F-3 / F-28) | `TODO` |
| FARM-S608 | Unify observability and adopt Sloth-generated alerts. Make `deploy/helm/farm/templates/prometheusrule.yaml` the single source of truth and either delete or auto-generate `observability/prometheus-rules.yml` from it. Implement FARM-S559 (Phase 51 carry-over): add a `make sloth-generate` target that runs `sloth generate -i observability/sloth-slos.yml -o deploy/helm/farm/templates/_sloth-rules.gen.yaml`, add a CI diff check to fail on drift between the Sloth source and the embedded rules, and gate inclusion behind `prometheusRule.sloth.enabled`. Replace the existing point-threshold alerts (`FarmApiDown for 1m`, `FarmApiNodeHeapHigh`) with the Sloth-generated multi-window/multi-burn-rate variants. Switch the heap alert to `container_memory_working_set_bytes / container_spec_memory_limit_bytes` instead of `nodejs_heap_size_total_bytes`. (Audit ref: SRE F-4 / F-18) | `TODO` |
| FARM-S609 | Fix secret rotation when `api.existingSecret` is set or the Secret is managed by ESO / SealedSecrets. Today `checksum/secret` on the API Deployment hashes the empty rendered `templates/api/secret.yaml`, so rotating the external Secret does NOT roll the pod. Implement option (a) — `lookup` the existingSecret's `resourceVersion` and include it in the checksum: `{{ (lookup "v1" "Secret" .Release.Namespace .Values.api.existingSecret).metadata.resourceVersion }}`. Also document the alternate Reloader pattern (`reloader.stakater.com/auto: "true"`) in the README under "Secret Rotation". (Audit ref: SRE F-8) | `TODO` |
| FARM-S610 | Modernize ExternalSecret coverage. (a) Bump `templates/external-secret.yaml:17` from `external-secrets.io/v1beta1` (deprecated since ESO 0.10) to `external-secrets.io/v1`; gate with `{{- if $.Capabilities.APIVersions.Has "external-secrets.io/v1" -}}` for backward compatibility. (b) Replace the hardcoded data list (`JWT_SECRET`, `DATABASE_PASSWORD`, `REDIS_PASSWORD`) with `range .Values.api.externalSecret.dataFrom` so operators can map any secret in `api.secrets` (covers `SMTP_PASS`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `KEYCLOAK_CLIENT_SECRET`, `LDAP_BIND_PASSWORD`, `IAC_INGEST_TOKEN`, `SWAGGER_PASSWORD`). Support both ESO `extract` and `find` modes. (Audit ref: SRE F-9 / F-10) | `TODO` |
| FARM-S611 | Add `values.schema.json` to `deploy/helm/farm/`. Generate with `helm schema-gen` (or `helm schema`) from `values.yaml`. Commit it so `helm install/upgrade` automatically validates the values structure and rejects misspelled keys (`autoScaling`, `ingres`, etc.) at lint time. Add a `make helm-schema` target and a CI check that re-generates the schema and fails on diff. (Audit ref: SRE F-11) | `TODO` |
| FARM-S612 | Bound the migration wait-for-db loop. `templates/migration-job.yaml:100–119` currently runs `until nc -z ... ; do sleep ...` with **no upper bound**, relying solely on `activeDeadlineSeconds: 300` for hard kill. Replace with `for i in $(seq 1 60); do nc -z ... && exit 0; sleep 5; done; echo "DB unreachable" >&2; exit 1` so the failure is logged with context before the deadline kill. Pin `busybox` to an immutable digest (`busybox:1.36@sha256:...`) per the comment in `values.yaml:566-568`. Also fix the `pre-upgrade-check.yaml` hook-weight ordering: weight `-20` runs BEFORE the migration SA is created at weight `-5`, so drop `serviceAccountName` from the pre-upgrade-check (default SA is fine for `nc`). Verify with `helm upgrade --dry-run --debug`. (Audit ref: SRE F-7 / F-16) | `TODO` |



### FARM-E148: Architecture Correction — Ingress Path Routing & Proxy Removal `DONE`

**Architectural principle**: the Helm Chart follows Helm/Kubernetes best practices independently; the application code follows cloud-native best practices independently. Neither adapts to the other via workarounds. Application-level proxies for backend traffic are anti-patterns — Kubernetes Ingress path-based routing is the market-standard solution.

Replaces the anti-pattern introduced as a workaround for KinD login issues (`apps/web/src/proxy.ts` and `apps/web/src/app/api/plugin-proxy/route.ts`). Both used `API_INTERNAL_URL` for URL rewriting in Node.js — an extra network hop through the event loop with no value. Correct approach: single shared hostname, Ingress controller routes `/api` → API service, `/` → web service, web app uses relative URLs.

| ID | Story | Status |
|----|-------|--------|
| FARM-S613 | Split `deploy/helm/farm/templates/ingress.yaml` into `ingress-api.yaml` and `ingress-web.yaml`. Add `ingress.hostname` (shared) to `values.yaml`. Change API paths from single `/` to `[{path: /api}, {path: /admin}]` list. Web gets `[{path: /}]`. Both Ingress resources use `ingress.api.hostname \| default ingress.hostname` / `ingress.web.hostname \| default ingress.hostname` so subdomain routing remains available as an override. Add ingress hostname guard to `validate.yaml`. | `DONE` |
| FARM-S614 | Delete `apps/web/src/proxy.ts`. Remove `API_INTERNAL_URL` from `apps/web/next.config.ts` (admin rewrite removed — Bull Board accessible directly at API URL or via Ingress `/admin` path). Remove `API_INTERNAL_URL` from `deploy/helm/farm/values.yaml` `web.env`, `templates/web/configmap.yaml` special-case handler, and `templates/_helpers.tpl` `farm.apiInternalUrl` helper. The `api-client.ts` already uses `const API_BASE = "/api"` (relative same-origin URL) — no change required. | `DONE` |
| FARM-S615 | Update `deploy/helm/farm/values-dev.yaml`: `ingress.enabled: true`, `ingress.className: "nginx"`, `ingress.hostname: "farm.local"`, API paths `[/api, /admin]`, web path `[/]`. Update `Makefile` `kind-deploy` target to install ingress-nginx (pinned to `v1.12.2`) before the Helm upgrade. | `DONE` |
| FARM-S616 | Delete `apps/web/src/app/api/plugin-proxy/route.ts` and its test. Update `apps/web/src/components/plugins/PluginRenderer.tsx` to call the API directly at the validated `safeUrl` (already guaranteed to be same-origin and prefixed with `/api/v1/`) instead of routing through the proxy Route Handler. Update PluginRenderer test to assert the direct fetch. | `DONE` |
| FARM-S617 | Update `deploy/helm/farm/README.md` Ingress section: document shared-hostname path-based routing, KinD setup steps, and subdomain-override pattern. Remove `API_INTERNAL_URL` row from web.env table. Update ROADMAP and CHANGELOG. | `DONE` |
