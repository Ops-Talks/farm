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
| Phase 46: Granular RBAC | 3 | 12 | - | `IN PROGRESS` |
| Phase 47: API Contract Stability | 2 | 7 | - | `TODO` |
| Phase 48: Platform Resilience | 3 | 10 | - | `TODO` |

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
| Phase 46: Granular RBAC | 3 | 12 | `IN PROGRESS` |
| Phase 47: API Contract Stability | 2 | 7 | `TODO` |
| Phase 48: Platform Resilience | 3 | 10 | `TODO` |
| **Total** | **127** | **497** | |

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
| FARM-S505 | Update `apps/web/src/contexts/organization-context.test.tsx` to mock `useAuth` and cover: `isAuthenticated false→true` transition triggers `fetchOrgs`; `isAuthenticated=false` clears org state immediately; `farm:org:stale` custom event triggers re-fetch. | `DONE` |
| FARM-S506 | Create `apps/api/src/common/guards/org-required.guard.spec.ts`. Cover: passes when valid `X-Organization-Id` header matches an active user membership; throws `ForbiddenException` when header is absent; throws `ForbiddenException` when user is not a member of the given org; throws `ForbiddenException` when org does not exist. | `DONE` |

---

## Phase 46: Granular RBAC

Replaces the binary `admin/user` role model with a structured permission system scoped to organizations. Today every authenticated user in an org can trigger destructive actions (delete components, cancel pipeline runs, remove team members) regardless of intent. This phase introduces organization-scoped roles (`owner`, `admin`, `member`, `viewer`) and per-resource permission gates on both backend and frontend.

### FARM-E120: Permission Model `IN PROGRESS`

Defines the new role hierarchy and persists per-org role assignments. The current flat `roles: string[]` array on `User` is a global flag; it cannot express that a user is an `admin` in org-A but only a `member` in org-B.

| ID | Story | Status |
|----|-------|--------|
| FARM-S507 | Add `role` enum column (`owner`, `admin`, `member`, `viewer`) to `UserOrganization` entity. Generate migration `AddUserOrgRole`. Backfill: existing membership rows default to `member`; the first user in each org (lowest `createdAt`) is promoted to `owner`. | `TODO` |
| FARM-S508 | Create `Permission` enum (`catalog:write`, `catalog:delete`, `pipeline:trigger`, `pipeline:delete`, `environment:write`, `team:manage`, `org:manage`, `iac:write`) and a `RolePermissions` map that statically defines which permissions each role holds. Store in `src/common/rbac/permissions.ts`. | `TODO` |
| FARM-S509 | Extend `OrgRequiredGuard` to expose `req.orgRole` after membership lookup. Update `RequestWithOrg` interface with `orgRole: OrgRole`. No breaking change — downstream handlers may ignore it. | `TODO` |
| FARM-S510 | Create `@RequiresPermission(permission: Permission)` decorator and `PermissionGuard` that reads `req.orgRole` and checks against `RolePermissions`. Must be placed after `OrgRequiredGuard`. Throw `ForbiddenException` with code `INSUFFICIENT_PERMISSIONS` when denied. | `TODO` |

### FARM-E121: Backend Enforcement `TODO`

Applies `@RequiresPermission()` to all mutating and destructive endpoints. Read-only `GET` endpoints require only `viewer` (the minimum org membership), so they need no additional decorator.

| ID | Story | Status |
|----|-------|--------|
| FARM-S511 | **Catalog:** Apply `@RequiresPermission('catalog:write')` to `POST /api/catalog` and `PATCH /api/catalog/:id`. Apply `@RequiresPermission('catalog:delete')` to `DELETE /api/catalog/:id`. Update Swagger `@ApiHeader` and `@ApiForbiddenResponse` annotations. | `TODO` |
| FARM-S512 | **Pipelines:** Apply `@RequiresPermission('pipeline:trigger')` to `POST /api/pipelines/:id/trigger`. Apply `@RequiresPermission('pipeline:delete')` to `DELETE /api/pipelines/:id`. Update Swagger annotations. | `TODO` |
| FARM-S513 | **Teams:** Apply `@RequiresPermission('team:manage')` to `POST /api/teams`, `PATCH /api/teams/:id`, `DELETE /api/teams/:id`, and all team membership mutation endpoints. Update Swagger annotations. | `TODO` |
| FARM-S514 | **Organizations:** Apply `@RequiresPermission('org:manage')` to `PATCH /api/organizations/:id`, `DELETE /api/organizations/:id`, and all member role management endpoints. Only `owner` and `admin` hold this permission. Update Swagger annotations. | `TODO` |

### FARM-E122: Frontend Permission Gates `TODO`

Makes the UI reflect the user's actual permissions. Currently all authenticated org members see identical action buttons regardless of their role; clicking a disallowed action results in a confusing 403 with no explanation.

| ID | Story | Status |
|----|-------|--------|
| FARM-S515 | Add `orgRole` field to `OrganizationContext`. Fetch the current user's role from the `UserOrganization` membership returned by `GET /api/organizations/me/memberships` (or embed in the org list response). Expose via `useOrganization()` hook. | `TODO` |
| FARM-S516 | Create `usePermission(permission: Permission): boolean` hook that derives a boolean from `orgRole` and the static `RolePermissions` map. Returns `false` while org is loading. | `TODO` |
| FARM-S517 | Apply `usePermission` gates in Catalog (hide Edit/Delete buttons for `viewer`/`member`), Pipelines (hide Trigger/Delete for `viewer`), Teams (hide Add/Remove member for non-`admin`), and Organizations settings page (hide Rename/Delete for non-`owner`). | `TODO` |
| FARM-S518 | Add role badge to the org-switcher dropdown and to the Organizations settings page member list, showing each member's current role with an inline role-change select for `owner`/`admin`. | `TODO` |

---

## Phase 47: API Contract Stability

Establishes a stable, versioned public API surface so external integrations are not broken by internal refactors. Today all endpoints live under `/api` with no version prefix; any rename or removal is a silent breaking change for consumers.

### FARM-E123: API Versioning `TODO`

Introduces a `/api/v1` prefix for all public endpoints while keeping `/api` as a deprecated alias during a transition period.

| ID | Story | Status |
|----|-------|--------|
| FARM-S519 | Enable NestJS versioning (`VERSION_NEUTRAL` default + `v1` explicit) via `app.enableVersioning({ type: VersioningType.URI })` in `main.ts`. Add `@Version('1')` to all public controllers. Keep the existing `/api` prefix for backward compatibility by registering a redirect middleware `/api/:path* → /api/v1/:path*` with a `Deprecation` response header. | `TODO` |
| FARM-S520 | Update Swagger to document both `/api/v1` (primary) and the deprecated `/api` alias. Add `@ApiHeader({ name: 'Deprecation', description: 'Deprecated alias — use /api/v1' })` on the redirect middleware docs. | `TODO` |
| FARM-S521 | Add `X-API-Version: 1` response header globally via a `VersionInterceptor`. Update all e2e specs to target `/api/v1` endpoints. | `TODO` |

### FARM-E124: Contract Documentation `TODO`

Provides a machine-readable and human-readable API contract alongside a changelog for breaking changes.

| ID | Story | Status |
|----|-------|--------|
| FARM-S522 | Generate a static `openapi.json` snapshot during CI build (`GET /api/v1/docs-json` → artifact). Add a CI step that diffs the new snapshot against the committed baseline and fails on breaking changes (removed fields, changed types) using `openapi-diff`. | `TODO` |
| FARM-S523 | Add `API-CHANGELOG.md` to `apps/api/` documenting breaking changes per version. Include migration guide from `/api` to `/api/v1`. | `TODO` |
| FARM-S524 | Publish the OpenAPI spec to the MkDocs documentation site under `api-reference/` so external consumers can browse it without running the server. | `TODO` |

---

## Phase 48: Platform Resilience

Closes the operational gaps that prevent Farm from being deployed in a production environment with SLA requirements. Multi-replica support, graceful degradation per integration, and Redis failure isolation are the three pillars.

### FARM-E125: High Availability Configuration `TODO`

Ensures the API and worker processes can run as multiple replicas without race conditions or session affinity requirements.

| ID | Story | Status |
|----|-------|--------|
| FARM-S525 | Validate that all in-memory state (plugin registry, metrics cache) is either stateless or backed by Redis. Audit `PluginManagerService`, `BusinessMetricsService`, and `CacheModule` for in-process mutable state that would diverge across replicas. Document findings and remediate. | `TODO` |
| FARM-S526 | Update Helm Chart `values.yaml` to support `replicaCount > 1` with a `PodDisruptionBudget` (`minAvailable: 1`) and `topologySpreadConstraints` for zone distribution. Add `Horizontal Pod Autoscaler` manifest triggered by CPU > 70%. | `TODO` |
| FARM-S527 | Add Redis Sentinel support to `CacheModule` configuration. When `REDIS_SENTINEL_HOSTS` env var is set, instantiate `@keyv/redis` with Sentinel options instead of a single-host connection string. Document in `.env.example`. | `TODO` |

### FARM-E126: Database Resilience `TODO`

Prevents cascading failures caused by slow or unreachable database connections.

| ID | Story | Status |
|----|-------|--------|
| FARM-S528 | Configure TypeORM connection pool with `connectTimeoutMS`, `acquireTimeoutMillis`, and `idleTimeoutMillis` via `DATABASE_POOL_*` env vars. Add pool exhaustion metric (`db_pool_size`, `db_pool_waiting`) exposed on `/metrics`. | `TODO` |
| FARM-S529 | Add a `TypeOrmHealthIndicator` to the existing `HealthModule` that checks DB connectivity with a 2-second timeout. Return `{ database: { status: 'down', message } }` in `/api/health` instead of crashing the health check. | `TODO` |
| FARM-S530 | Add a migration lock mechanism: if `DATABASE_SYNC=false` and `migrationsRun=false` (production), ensure only one replica runs pending migrations on startup using a PostgreSQL advisory lock. Prevent duplicate migration runs in parallel pod startups. | `TODO` |

### FARM-E127: Integration Circuit Breakers `TODO`

Prevents a degraded external integration (GitHub, Kong, Kubernetes API, Slack) from blocking unrelated requests via cascading timeout failures.

| ID | Story | Status |
|----|-------|--------|
| FARM-S531 | Introduce `CircuitBreakerService` (using `opossum` or a lightweight alternative) wrapping all HTTP calls in `IntegrationsModule`, `KubernetesModule`, `HelmModule`, `GatewayModule`, and `RegistryModule`. Default thresholds: 50% failure rate over 10 req → open; 30s reset. | `TODO` |
| FARM-S532 | When a circuit is open, return a structured `503 Service Unavailable` with `{ errorCode: 'INTEGRATION_UNAVAILABLE', integration: 'github' }` instead of letting the request hang until `fetch` timeout. Log circuit state transitions at WARN level. | `TODO` |
| FARM-S533 | Expose circuit breaker state as Prometheus gauge metric `integration_circuit_state{integration, state}` (0=closed, 1=open, 2=half-open). Add Grafana panel to `farm-integrations.json` dashboard. | `TODO` |
