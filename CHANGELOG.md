# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.25.5] - 2026-05-20

### Changed
- **deps**: bump @bull-board/* from 6.21.3 to 7.1.5.
- Potential fix for pull request finding.
- **roadmap**: mark Phase 49 DONE, update FARM-E128 stories.
- **deps**: bump @vitejs/plugin-react from 5.2.0 to 6.0.2, upgrade vite to 8.
- **deps**: bump @bull-board/* from 6.21.3 to 7.1.5.
- **deps-dev**: bump @vitejs/plugin-react from 5.2.0 to 6.0.2.
- **deps**: bump codecov/codecov-action from 5.5.3 to 6.0.1.
- **deps**: bump the non-critical-updates group across 1 directory with 36 updates.
- Patch/project docs (#173).
- **rbac**: Increasing matury and hardening at RBAC.
- **deps-dev**: bump release-it from 19.2.4 to 20.0.1.

### Fixed
- resolve dual-vite conflict and web Docker Stage 2 build failure.
- **docker**: copy workspace node_modules in web Stage 2 build.
- **docker**: copy workspace node_modules in Stage 2 build.
- **docker**: add workspace manifests to Stage 2 build context.
- **docker**: copy workspace node_modules in Stage 2 build.
- **docker**: add workspace manifests to Stage 2 build context.
- **rbac**: address PR review feedback - dedupe role fetch, fix migration column names, remove RolesGuard from catalog, fix ROADMAP duplicate.

## [0.25.4] - 2026-05-18

### Added
- **organizations**: `OrgReadyGate` frontend component that blocks protected pages until both auth and org loading are settled, eliminating race-condition redirects to `/organizations/new` (Phase 45, FARM-E117, #164).
- **organizations**: `OrgRequiredGuard` backend guard that validates `X-Organization-Id` membership on all org-scoped endpoints, returning 403 with `ORG_STALE_MEMBERSHIP` error code for non-members (Phase 45, FARM-E117).

### Fixed
- **organizations**: `organization-context.tsx` race condition — derived `isLoading` from `isFetching || (isAuthenticated && !hasFetchedForCurrentAuth)` so the loading gate is true in the same render where auth becomes active, preventing child effects from firing before the org fetch completes (Phase 45, FARM-E117).
- **organizations**: `api-client.ts` 403 handler now gates stale-org recovery on `ORG_STALE_MEMBERSHIP` error code and dispatches `farm:org:stale` custom event, notifying `OrganizationProvider` to re-fetch without triggering false positives on unrelated 403 responses (Phase 45, FARM-E118).
- **organizations**: `org-switcher.tsx` calls `queryClient.invalidateQueries()` on org switch to clear stale TanStack Query caches (Phase 45, FARM-E118).
- **organizations**: `auth-context.tsx` `logout()` clears `farm_current_org` from `sessionStorage` to prevent stale org data persisting after session end (Phase 45, FARM-E117).
- **migrations**: Column name mismatches in Phase 44 multi-tenancy migrations causing integrity CI failure.
- **filter**: Validate `errorCode` is a string before spreading into error response, fixing TypeScript TS2698 build error introduced by the preceding Copilot Review auto-fix commit.

## [0.25.3] - 2026-05-15

### Added
- **pipelines**: `ComponentPipelinesTab` frontend component linking catalog components to their pipeline runs, with full test coverage (305 tests) (Phase 43, #161).
- **pipelines**: `PipelineDetailClient` frontend component for pipeline run detail view with external run URL and status badge, with full test coverage (379 tests) (Phase 43).
- **pipelines**: `AddDeploymentPipelineRunId` migration — nullable `pipelineRunId` FK on `Deployment` entity to link deployments to their originating pipeline run.

## [0.25.2] - 2026-05-13

### Added
- **pipelines**: GitHub Actions webhook receiver (`WebhookReceiverController`) with HMAC-SHA256 signature verification and raw body buffer middleware (Phase 43, #160).
- **pipelines**: `IntegrationsListenerService` — EventEmitter-based pipeline event listener that creates `PipelineRun` records on `pipeline.triggered` events.
- **pipelines**: `AddPipelineComponentId` and `AddPipelineRunDeploymentId` migrations — nullable FKs linking pipelines to catalog components and pipeline runs to deployments.

## [0.25.1] - 2026-05-13

### Changed
- **sweagger**: Update Sweagger endpoints.
- merge main into storybook/nextjs bump branch, resolve conflicts.
- **ci**: align setup-monorepo action to Node 26 to match Dockerfiles.
- **deps**: bump node from 25-alpine to 26-alpine in Dockerfiles.
- **deps-dev**: bump release-it from 19.2.4 to 20.0.1.
- **deps**: bump the non-critical-updates group across 1 directory with 16 updates.
- Chore/dependabot bumps (#154).
- **deps-dev**: bump @storybook/nextjs from 9.1.20 to 10.3.6.
- **deps-dev**: bump eslint from 9.39.4 to 10.3.0.

### Fixed
- revert release-it to ^19.0.0 — @release-it/keep-a-changelog@7 is incompatible with v20.
- **tsconfig**: exclude story files from Next.js production build.

## [0.25.0] - 2026-05-11

### Added
- **deploy**: Create the Helm Chart v0 (#149).

### Changed
- Merge pull request #148 from Ops-Talks/path/errorHandling.

## [0.24.10] - 2026-05-08

### Added
- **observability**: Alloy OTel collector with tail sampling for distributed tracing (FARM-E92).
- **observability**: Alertmanager integration for metric-based alerting (FARM-E91).
- **observability**: Grafana Faro RUM instrumentation for web frontend (FARM-E95).
- **observability**: Pyroscope continuous profiling integration (FARM-E96).

### Changed
- **deps-dev**: bump storybook from 9.1.20 to 10.3.6.
- **deps-dev**: bump @storybook/react from 9.1.20 to 10.3.6.
- **deps**: bump the non-critical-updates group across 1 directory with 5 updates.

### Fixed
- use sentinel spanID for synthetic Tempo summary spans.
- **observability**: address PR review feedback on metrics, traces, and app module.
- **alertmanager**: remove unused global SMTP config, fix duplicate env vars in .env.example.

## [0.24.9] - 2026-05-06

### Changed
- **deps**: apply safe Dependabot bumps (non-critical group + jsdom 29).
- **deps**: bump marked from 17.0.6 to 18.0.3.
- **deps-dev**: bump globals from 16.5.0 to 17.6.0.

### Fixed
- add express as explicit dep and fix CI npm install via corepack.
- **observability**: fix Tempo metrics_generator processor activation.

## [0.24.8] - 2026-05-06

### Added
- **observability**: upgrade @pyroscope/nodejs to 0.4.11, removing axios CVE dependencies.

### Fixed
- **ci**: fix Playwright e2e in CI and local make check.
- **observability**: address PR review feedback.

## [0.24.7] - 2026-05-05

### Added
- **scorecards**: introduce Service Maturity Scorecards — 16-criterion evaluator, API endpoints, component detail tab, and overview page (Phase 39, #136).

### Fixed
- **observability**: add whitespace trim to message validation and structured catch logging.
- **observability**: add fetch error fallback and input length limits to log-error route.
- **observability**: address PR review comments - fix test isolation, add instrumentation tests, and forward client errors to server logger.
- **observability**: fix broken observability monitoring for Farm app.
- **scorecards**: add explicit column names to fix PostgreSQL upsert.

## [0.24.6] - 2026-05-04

### Changed
- **ldap**: Refactor LDAP to new lib.

## [0.24.5] - 2026-05-04

### Changed
- **docs**: Update project docs.

## [0.24.4] - 2026-04-30

### Changed
- **docs**: address PR review feedback on ES index docs.
- **docs**: Update project docs.
- **deps**: update mkdocs-material requirement in /docs.

## [0.24.3] - 2026-04-30

### Added
- **knip**: Phase 34 (#123).

## [0.24.2] - 2026-04-29

### Changed
- Address PR review feedback: forwardRef Input, ref dedup, a11y, undoable hook, confirm dialog async, beforeunload listener.
- Phase 33.

## [0.24.1] - 2026-04-29

### Changed
- **deps**: bump the non-critical-updates group across 1 directory with 3 updates (#121).

## [0.24.0] - 2026-04-28

### Changed
- Feat/phase 36 user roles (#120).
- **deps-dev**: bump @types/supertest from 6.0.3 to 7.2.0 (#106).
- **deps-dev**: bump release-it from 19.2.4 to 20.0.1.
- **deps-dev**: bump @types/node from 20.19.39 to 25.6.0.
- **deps-dev**: bump jest-junit from 16.0.0 to 17.0.0.

## [0.23.0] - 2026-04-27

### Added
- **elasticstack**: Elasticsearch Index Visibility (#113).

## [0.22.2] - 2026-04-25

### Fixed
- **cves**: GitLeaks (#102).

## [0.22.1] - 2026-04-24

### Changed
- **libs**: Bump libs and deps.
- **docker**: update docker images.

### Fixed
- **cves**: scope brace-expansion override to v1 consumers only.
- **cves**: Lot of the CVEs.
- **cves**: Lot of the CVEs.

## [0.22.0] - 2026-04-23

### Added
- **phase-32**: Thanos Integration (#96).
- **phase-31**: Elasticsearch Integration (#95).

## [0.21.1] - 2026-04-22

### Added
- implement Phase 30 Plugin Ecosystem (FARM-S327, FARM-S328, FARM-S329).

### Changed
- Merge pull request #73 from Ops-Talks/copilot/fix-roadmap-summary-inconsistency.
- Initial plan.
- **changelog**: remove 50 duplicated lines from CHANGELOG.md.
- Add comprehensive tests for API modules with low coverage.
- Initial analysis of test coverage gaps.

### Fixed
- **pipelines**: Make a deep refactoring in the project workflows (#74).
- resolve TypeScript build errors, ESLint errors, and pin codecov-action to v5.5.3.
- correct DFS cycle detection in PluginInstanceService, remove unused import, improve e2e variable name.
- **roadmap**: update Phase 29 TechDocs 2.0 — mark Epic, Tasks, and Sub-tasks as DONE (released in v0.21.0).

## [0.21.0] - 2026-04-19

### Added
- **phase-29**: Update Coverage.
- **phase-29**: TechDocs 2.0.

### Fixed
- address all 14 PR review comments for TechDocs 2.0.

## [0.20.0] - 2026-04-19

### Added
- **phase-27**: Elasticsearch.

### Changed
- address code review feedback on afterRemove guard order and LDAP noop constant.

### Fixed
- address all PR review comments (search contract, LDAP, ES, XSS).

## [0.19.0] - 2026-04-17

### Added
- **phase-23**: IaC Catalog (#67).
- **phase-23**: IaC Catalog (#66).

### Changed
- **Grafana**: Widget Dashboards enhacement.
- fix(CVES).
- revert CHANGELOG.md to pre-PR state — feature docs do not belong in a CVE fix PR.
- Update package.json.

### Fixed
- regenerate lockfile for follow-redirects 1.16.0 and fix ROADMAP API versioned endpoints.

## [0.18.0] - 2026-04-14

### Added
- **FARM-E69** (IaC Stack Visibility): `GET /api/v1/iac/stacks` and `GET /api/v1/iac/stacks/:id` endpoints with optional `?environment=` and `?componentId=` filters; each record includes the latest `IacRun` joined via a correlated subquery.
- **FARM-E69**: `IacStacksTab` on the component detail page lists all stacks linked to that component with environment badge, run status, and link-out to the external tool.
- **FARM-E69**: Stack list page at `/iac/stacks` with environment filter chips and a new "Stacks" sidebar navigation entry.
- **FARM-E69**: Stack detail page at `/iac/stacks/:id` showing metadata (provider, repository, linked component) and embedded run history.
- **FARM-E69**: `IacResource` and `IacResourceDependency` entities with `POST /iac/stacks/:id/resources/ingest` (IAC_INGEST_TOKEN auth, atomic replace) and `GET /iac/stacks/:id/resources`; `ResourceMapCanvas` renders an interactive directed graph using `@xyflow/react` + `dagre`.
- **FARM-E68** (IaC Module Catalog): module registry, version tracking, component linking, and drift detection panel.
- **FARM-E70** (Cultivator Integration): `IacStack`, `IacRun`, `IacModuleDrift` entities; 6 ingest endpoints; IaC dashboard with run status and drift panel.

### Changed
- extract startedAt fallback and normalizeUrl helper for readability.
- update ROADMAP.
- feat(seeds) - Update mocking new examples.

### Fixed
- **iac**: address PR review feedback — query perf, validation, entity types, a11y, docs.
- address PR review comments — optimize dashboard query, fix validation, entity types, UI accessibility, and docs.

## [0.17.4] - 2026-04-13

### Changed
- apply all remaining PR review corrections across api-reference and user-guide docs.
- Update docs/user-guide/container-registry.md.
- Update docs/user-guide/opa-integration.md.
- **linkerd**: fix API reference response examples to match actual backend shapes.
- Update docs/developer-guide/backend/architecture.md.
- Update docs/developer-guide/setup.md.
- Update docs/index.md.
- Update docs/api-reference/linkerd.md.
- patch(mkdocs) Revision and overall docs update.
- fix(CVES) Picomath.
- Update ROADMAP.

## [0.17.3] - 2026-04-12

### Changed
- Update apps/api/Dockerfile.
- Update apps/web/Dockerfile.

### Fixed
- pin npm to 11.12.1 instead of @latest for reproducible Docker builds.
- **vulnerabilities**: Libs and Deps.

## [0.17.2] - 2026-04-12

### Changed
- feat(phase-21) New Features (#59).
- feat(phase-28) New Features.
- feat(phase-20) New Features.

### Fixed
- **vulnerabilities**: NPM (#60).
- align base64url encoding, remove vars dump, catch render errors in dryRun.

## [0.17.1] - 2026-04-11

### Changed
- feat(phase-25) New Features (#56).

## [0.17.0] - 2026-04-09

### Changed
- feat(phase-19) New Features.
- fix(phase-18) Bugs and Coverage.
- **kubernetes**: add missing branch coverage for listFluxBindingsByComponent and listKedaBindingsByComponent.
- feat(phase-18) New Features.

### Fixed
- **finops**: address PR review feedback - numeric transformers, query optimizations, FinOpsService integration.
- **cve**: AXIOS.
- **phase-18**: make AddKedaBindings migration explicit about supported db types.
- **phase-18**: address PR review feedback - org scoping, type alignment, accessibility, migration.

## [0.16.0] - 2026-04-08

### Added
- **container-resgistries**: Add Container Registries support.

### Fixed
- **lint**: resolve all 16 ESLint errors in SAST pipeline.
- address validation feedback — flexible digest stripping, precise ECR host check.
- address PR review feedback — normalize image refs, fix adapters, parseMetric, conditional Dragonfly polling.
- **k8s**: Wrong behavior generate errors at API.

## [0.15.0] - 2026-04-07

### Changed
- **user**: New feature profile.

### Fixed
- address PR review comments - auth docs, e2e tests, migration, zod schema.

## [0.14.7] - 2026-04-07

### Changed
- apply PR review feedback on docs accuracy.
- **docs**: Update Docs.

## [0.14.6] - 2026-04-07

### Fixed
- **docs**: The Roadmap.
- **webci**: E2E pipeline.

## [0.14.5] - 2026-04-07

### Fixed
- **sast**: Vulnerabilites.
- **webci**: E2E pipeline.
- **e2e**: use getAttribute() to avoid WebKit prefetch race before page.goto().
- **e2e**: use page.goto() for WebKit-reliable catalog detail navigation.
- **e2e**: fix WebKit Playwright failures in catalog and organizations tests.
- **docker**: replace workspace stubs with real COPY in API and Web Dockerfiles.
- **cves**: override lodash 4.18.1 / lodash-es 4.18.1, upgrade zlib in web Dockerfile.

## [0.14.4] - 2026-04-06

### Changed
- Update apps/web/Dockerfile.
- Update apps/api/Dockerfile.

### Fixed
- **sast**: Vulnerabilites.
- **trivy**: use include-only matrix to ensure dockerfile is always defined.
- **trivy**: Improvements.

## [0.14.3] - 2026-04-01

### Fixed
- **cves**: Remove stale workspace lockfiles with vulnerable dependency resolutions.
- **cves**: At package.json.

## [0.14.2] - 2026-03-31

### Fixed
- **cves**: At package.json (#43).

## [0.14.1] - 2026-03-31

### Changed
- Feature/phase 16 (#42).

## [0.14.0] - 2026-03-30

### Fixed
- resolve SAST, CI, and DAST pipeline failures (#41).

## [0.13.2] - 2026-03-29

### Changed
- **docs**: Update docs (#40).

## [0.13.1] - 2026-03-29

### Added
- **org**: organization invitation flow (FARM-E50 S199).
- **org**: enforce org isolation on all create endpoints (FARM-E49).
- **org**: complete org scoping for Phase 11 entities (FARM-E49).

### Changed
- Feature/phase 13 (#39).
- **roadmap**: mark FARM-E49 DONE, Phase 12 IN PROGRESS.
- Feature/farm e50 (#38).
- feat(roadmap) - Update.
- Update apps/api/src/modules/documentation/documentation.controller.ts.
- Update apps/api/src/modules/gateway/gateway.controller.ts.
- fix(tests) - Gateway Controller.
- mark Phase 11 as DONE in ROADMAP; ignore GIT_COMMIT.md.

### Fixed
- **org**: use ApiHeader for X-Organization-Id and type-safe req.organizationId.

## [0.13.0] - 2026-03-28

### Changed
- Feature/farm e48 (#34).
- Feature/farm e48 (#33).

## [0.12.3] - 2026-03-27

### Added
- **api-specs**: implement FARM-E47 API Catalog and Lifecycle Management (#32).

### Changed
- Fix incomplete URL substring sanitization in provider detection (#28).
- Fix for code scanning alert no. 8: Incomplete multi-character sanitization (#26).
- Fix for code scanning alert no. 10: Incomplete multi-character sanitization (#25).

### Fixed
- resolve CodeQL command injection alert and restore missing web test dependency (#31).
- **api**: resolve ESLint type-safety errors in test files (#30).

## [0.12.2] - 2026-03-27

### Changed
- Feature/performances (#24).
- Phase-7 (#23).
- feat:(docs) - Update docs and improvements.

## [0.12.1] - 2026-03-25

### Changed
- fix(web-ci) - The fix was straightforward: .prose appeared immediately with empty renderedHtml when selectedId changed, before the async fetch ran. The waitFor was resolving too early. Changing it to wait for the actual content (toContain('object content')) ensures it waits for the fetch to complete.

## [0.12.0] - 2026-03-25

### Changed
- Feature/phase 10 (#20).

## [0.11.5] - 2026-03-25

### Changed
- fix:(security) - Fix CVE's (#19).
- fix:(security) - Fix CVE's (#18).
- fix:(security) - Fix CVE's.
- patch(eslint) - Improvements.

## [0.11.4] - 2026-03-24

### Changed
- patch(eslint) - Improvements.
- chore(ci.yaml) - Comparison.
- **web**: add comprehensive api-client test coverage (S176).
- **api**: improve branch coverage for critical modules (S173).
- add Phase 10 test coverage hardening to ROADMAP (FARM-E45).
- Fix/several stuffs (#14).
- Potential fix for code scanning alert no. 12: Type confusion through parameter tampering (#11).
- add web coverage and test results upload to Codecov.

### Fixed
- **security**: add runtime engine allowlist validation in build-stage executor.

## [0.11.3] - 2026-03-21

### Changed
- Add web coverage job to CI workflow.

## [0.11.2] - 2026-03-21

### Changed
- Potential fix for code scanning alert no. 11: Server-side request forgery (#12).
- Feature/farm e38 (#13).
- chore:(fonts) - Update project font (#10).
- update gitleaks.
- chore:(web) - Improvements.

## [0.11.1] - 2026-03-20

### Changed
- feat:(security) - New Securiy tests implemented (#9).
- Update README with new make commands.
- Updates.
- fix:(dast) - Include fix.
- feat:(dast) - New CI.
- fix:(ci) - Fix NPM Audit.
- fix:(ci) - Fix CI test errors.

## [0.11.0] - 2026-03-20

### Added
- **web**: add branded Farm design system and visual redesign (FARM-E43).

### Changed
- fix:(ci) - Fix CI test errors.
- patch:(ui) - Little improvements.
- fix:(ui) Copillot sugestions.
- Update background.
- feat:(css) - Update colors.

## [0.10.11] - 2026-03-19

### Changed
- Update Istio implementation.
- add Istio service mesh integration documentation (FARM-E42).
- Update Codecov.

## [0.10.10] - 2026-03-19

### Added
- **observability**: add Loki, Promtail, Node Exporter and new Grafana dashboards.
- **web**: add Keycloak SSO login and integration management UI (FARM-E41).
- **api**: add Keycloak enterprise SSO integration (FARM-E41).
- **web**: add Kyverno policy violations tab and ClusterPolicy YAML export (FARM-E40).
- **api**: add Kyverno PolicyReport reader and ClusterPolicy export (FARM-E40).
- **web**: add compliance dashboard and tag governance UI (FARM-E39).
- **api**: add resource tag governance module (FARM-E39).

### Changed
- **observability**: update observability guides for Loki, Promtail, and Node Exporter.
- add Keycloak SSO documentation (FARM-E41).
- add tag governance and Kyverno integration documentation (FARM-E39/E40).

### Fixed
- **api**: read app version from package.json instead of hardcoded fallback.
- **api**: use COUNT(*) in ORDER BY for usage analytics queries.
- **web**: replace isPending with isLoading for disabled useQuery skeletons.
- allow all authenticated users to list plugins; fix catalog e2e locators.

## [0.10.9] - 2026-03-19

### Added
- **web**: add cloud provider integrations UI (FARM-E38).
- **api**: add cloud provider integrations module (FARM-E38).

### Changed
- add cloud provider integrations documentation (FARM-E38).

## [0.10.8] - 2026-03-19

### Added
- **infra**: merge docs service into docker-compose.yml with profiles.
- **web**: add frontend OpenTelemetry instrumentation.
- **api**: add business metrics counters and public traces ingest.

### Changed
- **roadmap**: add FARM-E43 frontend visual redesign (Phase 8).
- update observability guide, add OAuth setup and production guide.

### Fixed
- **web**: gate analytics and plugins queries on isAuthenticated.
- **web**: fix observability unreachable badge and dashboard lazy stats.
- **web**: fix Bull Board URL and add /admin proxy rewrite.
- **web**: clear stale org from sessionStorage on membership mismatch.
- **observability**: correct prometheus scrape path and grafana tempo UID.

## [0.10.7] - 2026-03-18

### Added
- **integrations**: FARM-E35 CI/CD external integrations.

## [0.10.6] - 2026-03-18

### Changed
- DOC-3: add Helm and Kubernetes rows to docs/api-reference/index.md    DOC-4: add 13 missing env vars to docs/developer-guide/setup.md           (observability, OAuth, integrations, plugins)    DOC-5: add observability, OAuth, integrations, and plugin sections           to .env.example    DOC-6: fix docs/api-reference/teams.md endpoint table to use full           paths (/api/v1/teams/...) consistent with all other API docs    DOC-7: add Helm Integration and Kubernetes Operator to           docs/user-guide/index.md Core Features and Quick Links.
- DOC-2: create docs/api-reference/audit-log.md, helm.md, kubernetes.md.
- DOC-1: add Helm Integration, Kubernetes Operator to User Guide nav and Audit Log, Helm, Kubernetes APIs to API Reference nav in mkdocs.yml.

## [0.10.5] - 2026-03-18

### Changed
- feat:(helm+k8s) FARM-E36 and FARM-E37 complete.
- Update README.

## [0.10.4] - 2026-03-18

### Changed
- fix:(E2E) solved tests failed.

## [0.10.3] - 2026-03-18

### Changed
- fix:(coverage) reports back to generates.

## [0.10.2] - 2026-03-18

### Changed
- - GET /api/v1/auth/users now requires JWT + admin role (was unauthenticated)    - POST /api/v1/traces/ingest now requires JWT (was unauthenticated)    - /api/docs protected with HTTP Basic Auth middleware; credentials      configurable via SWAGGER_USER / SWAGGER_PASSWORD (default: farm/farm)    - Add swagger.user and swagger.password to configuration.ts and Joi schema    - Document SWAGGER_USER and SWAGGER_PASSWORD in .env.example.

## [0.10.1] - 2026-03-18

### Changed
- feat:(web) FARM-E29 done.

## [0.10.0] - 2026-03-17

### Added
- **web**: FARM-S120 replace useState data fetching with TanStack Query v5   QueryProvider (makeQueryClient, staleTime 60s, retry 1) wraps the   protected layout. Client components migrated from useState+useEffect   to useQuery/useMutation. Eliminates react-hooks/set-state-in-effect   lint warnings permanently. Deps: @tanstack/react-query.
- **web**: FARM-S123 lazy-load heavy components with next/dynamic.
- **web**: FARM-S121 error boundaries for all protected feature routes.
- **web**: FARM-S118 OpenTelemetry client-side instrumentation.
- **api**: FARM-S118 OTLP ingest proxy for browser traces.
- **web**: FARM-S91 run list pagination, stats panel, and run comparison.
- **api**: FARM-S91 paginated pipeline run history with stats and comparison.

### Changed
- mark FARM-E31 DONE and update NEXT_STEPS for v0.9.3.
- **web**: FARM-S122 colocate test files with source components   All 32 test files moved from src/__tests__/ flat mirror to alongside their source files (*.test.tsx colocated with *.tsx). Zero import changes needed — all tests use @/ alias. vitest.config.ts: setup. Files updated to src/test/setup.ts. 309/309 tests pass.
- update ROADMAP and NEXT_STEPS for v0.9.3 deliveries.

### Fixed
- **api**: FARM-T59 fix deployments matrix 500 on PostgreSQL     TypeORM getMatrix() used raw string concatenation for correlated     subquery, producing 'd.createdAt = SELECT MAX(...)' which PostgreSQL     rejects. Replaced with .subQuery() so TypeORM wraps it in parentheses.     SQLite tolerated the invalid syntax; PostgreSQL does not.

## [0.9.13] - 2026-03-17

### Added
- **web**: pipeline run actions, dashboard widget, and WebSocket notifications (FARM-E26).
- **pipelines**: add approve, reject, and cancel run endpoints (FARM-E26).
- **types**: add WAITING_APPROVAL to PipelineRunStatus enum (FARM-E26).

### Changed
- **web**: add notification-listener and run-detail test coverage (FARM-E26).
- **api**: add organization controller and pipeline processor specs (FARM-E25/E26).
- add organizations guide, update pipelines and catalog docs (FARM-E25/E26).
- update CHANGELOG and ROADMAP for FARM-E26 pipeline UI completion.

## [0.9.12] - 2026-03-17

### Changed
- feat:(members)  FARM-S85 — Member Management (Backend).

## [0.9.11] - 2026-03-17

### Added
- **web**: inject X-Organization-Id header in all API requests (FARM-E25).
- **org**: enforce multi-tenant org scoping via X-Organization-Id header (FARM-E25).

### Changed
- add multi-tenancy guide and update architecture docs (FARM-E25).

## [0.9.10] - 2026-03-17

### Security
- **multer**: upgraded to `2.1.1` via `@nestjs/platform-express@11.1.17` — resolves ReDoS vulnerability (CVE-2025-47944).
- **flatted**: upgraded to `3.4.1` — resolves prototype pollution vulnerability.
- **file-type**: upgraded to `21.3.2` — resolves ReDoS vulnerability (CVE-2024-4067).
- Migrated E2E test database driver from `sqlite3` (deprecated, 9 HIGH vulnerabilities) to `better-sqlite3@12` — reduces audit findings from 17 to 9, eliminates all HIGH severity issues in production dependencies.

### Fixed
- **email**: Handlebars templates (`*.hbs`) were not copied to `dist/` during build, causing `EmailService` to silently fail in production and Docker. Added `assets` declaration to `nest-cli.json`.
- **docker**: fix monorepo build and PostgreSQL migration compatibility.
- **config**: added `"better-sqlite3"` to the Joi `DATABASE_TYPE` allowlist to prevent config validation errors in E2E test startup.

### Changed
- Dependency version alignment across workspace packages.

## [0.9.2] - 2026-03-16

### Added
- **auth**: add GitHub and Google OAuth strategies (FARM-S113).

## [0.9.1] - 2026-03-16

### Changed
- Update index docs.

## [0.9.0] - 2026-03-16

### Added
- FARM-S113: Playwright E2E test suite for frontend authentication, catalog, deployments, and teams flows.
- FARM-S86 frontend: Complete frontend implementation with all pages and components.
- FARM-S87: Social authentication with GitHub and Google OAuth providers.
- FARM-E27: Validation improvements and release pipeline fixes.
- FARM-E28: Integrations module foundation.

### Fixed
- Release pipeline configuration and Makefile targets.
- Test suite stability across API and frontend.

## [0.8.6] - 2026-03-15

### Changed
- Bump to v0.8.6.

## [0.8.5] - 2026-03-15

### Changed
- Bump to v0.8.5.

## [0.8.4] - 2026-03-15

### Changed
- Bump to v0.8.4.

## [0.8.3] - 2026-03-15

### Fixed
- use --increment instead of --release-version in make release target.

## [0.8.1] - 2026-03-15

### Fixed
- **next.config.ts**: Removed invalid `telemetryDisabled` property (not a valid Next.js option); telemetry remains disabled via `NEXT_TELEMETRY_DISABLED=1` in Dockerfile and env files.
- **release-it config**: Set `requireCleanWorkingDir: false` and added `commitFiles` for monorepo compatibility where `CHANGELOG.md` lives at the repo root.
- **Documentation**: Updated all `src/` path references to `apps/api/src/` across developer guides; added `AuditLog` module to architecture docs and API reference.

## [0.8.0] - 2026-03-15

### Changed
- Monorepo workspace setup and project structure consolidation.

## [0.7.0] - 2026-03-15

### Added
- **Audit log module**: Immutable audit trail (`core-audit-log` plugin) with `AuditLog` entity, service, controller, and migration.
- **Notification queue processor**: `NotificationProcessor` with email and webhook support via BullMQ.
- **Catalog discovery processor**: `CatalogDiscoveryProcessor` for async catalog ingestion jobs.
- **Telemetry tracing**: OpenTelemetry tracing setup (`tracing.ts`) gated behind `OTEL_ENABLED=false` by default.
- **Metrics interceptor**: Prometheus HTTP metrics (`http_requests_total`, `http_request_duration_seconds`) via `MetricsInterceptor`.
- **Request logger middleware**: Structured request/response logging middleware.

### Changed
- **Monorepo restructure**: API source moved to `apps/api/`, web source to `apps/web/`; config files (`Dockerfile`, `tsconfig.json`, `nest-cli.json`, `eslint.config.mjs`) relocated accordingly.
- **`.gitignore`**: Fixed `dist/` and `coverage/` patterns to apply to all subdirectories (previously only matched repo root).
- **`.release-it.json`**: Moved to `apps/api/`; fixed `CHANGELOG.md` path to `../../CHANGELOG.md`.
- **Next.js telemetry disabled**: `NEXT_TELEMETRY_DISABLED=1` added to `next.config.ts`, `apps/web/.env.local`, and `apps/web/.env.example`.
- **`.env.example`**: Synced with all current configuration variables (`JWT_SECRET`, `ALLOWED_ORIGINS`, Redis, SMTP, OTEL).

### Fixed
- **Teams page crash**: `teams.list()` and `environments.list()` API client methods now correctly typed as `Promise<PaginatedResponse<T>>`; `TeamsClient` extracts `.data` from paginated response preventing `TypeError: allTeams.filter is not a function`.
- **Dashboard quick-stats**: Teams and environments counts now use `.total` instead of `.length` on paginated responses.
- **AuditLog entity**: Changed `payload` column from `jsonb` (PostgreSQL-only) to `simple-json` for SQLite E2E test compatibility.
- **Plugins E2E test**: Updated expected plugin count from 5 to 6 to include `core-audit-log`.
- **Lint errors**: Fixed `require-await`, `no-unsafe-return`, `no-unsafe-member-access`, and `no-require-imports` violations across test files.
- **Lint warnings**: Typed `Job<T>` generics in `notification.processor.spec.ts` and `catalog-discovery.processor.spec.ts`.

## [0.6.2] - 2026-03-08

### Added
- **Frontend test suite**: 101 tests across 11 files using Vitest + React Testing Library covering API client, WebSocket client, auth context, auth guard, dashboard widgets, and all page components.
- **Makefile targets**: `check-back`, `check-front`, and `web-test` targets; `check` now runs both backend and frontend checks.

### Changed
- **Developer Guide restructured**: Split into Backend and Frontend sub-sections; moved backend docs into `developer-guide/backend/` and created `developer-guide/frontend/` with architecture and testing guides.
- **Project description**: Updated across all files to canonical text: "Farm is an open-source full stack portal providing a centralized hub for managing software components, technical documentation, and team infrastructure."
- **ADR-001 removed**: Front-end technology stack content absorbed into `developer-guide/frontend/architecture.md`.

## [0.6.1] - 2026-03-08

### Added
- **Email service**: Integrated `nodemailer` with SMTP transport and `handlebars` template engine for transactional email notifications. Opt-in via `SMTP_HOST` environment variable with graceful degradation when not configured.
- **Email templates**: Welcome email and deployment notification templates with shared HTML layout, located in `src/common/email/templates/`.
- **NotificationProcessor email integration**: The BullMQ notification processor now sends emails via EmailService for `type: "email"` jobs, using the specified Handlebars template and context.
- **EmailModule**: Global module providing EmailService across the application with SMTP connection verification on startup.
- **Front-end foundation**: Next.js 16 application with React 19, TypeScript strict mode, Tailwind CSS 4, and Shadcn/ui component library in `web/` directory.
- **API client**: Type-safe HTTP client with JWT token management, automatic 401 refresh, and typed API methods for all backend endpoints.
- **WebSocket client**: Socket.IO client with JWT auth handshake, automatic reconnection with exponential backoff, and typed event subscription matching `FarmEvent` enum.
- **Login page**: Authentication form with error handling and session token storage.
- **Dashboard page**: System health overview displaying API health status with per-check detail cards, auto-refresh every 30 seconds.
- **Landing page**: Farm portal home with feature navigation cards.
- **Front-end Docker**: Multi-stage Dockerfile (`web/Dockerfile`) and `web` service in `docker-compose.yml` on port 3001.
- **ADR-001**: Architecture Decision Record documenting front-end stack selection (Next.js + Shadcn/ui + Tailwind CSS).
- **Authentication UI (FARM-E18)**: AuthProvider context with `useAuth()` hook, client-side route guard (`AuthGuard`), and app shell layout with sidebar navigation and user menu with sign-out.
- **Route groups**: Next.js `(protected)` route group wrapping Dashboard, Catalog, Deployments, and Teams pages with `AuthGuard` and `AppShell` layout.
- **Placeholder pages**: Catalog, Deployments, and Teams stub pages under the protected layout.
- **Dashboard panels (FARM-E19)**: Enhanced dashboard with four panels: quick stats (component/team/environment/deployment counts), system health (color-coded indicators with byte formatting), real-time activity feed (WebSocket event subscriptions), and background queue info (Bull Board link).
- **Catalog list page (FARM-E20)**: Component data table with name, kind, lifecycle, owner, tags columns. KindGroup filter tabs (All/Dev/Infra/Data/Security), client-side name search, pagination, and WebSocket live refresh on component changes.
- **Catalog detail page**: Dynamic `/catalog/[id]` route displaying component metadata, lifecycle badge, owner, tags, links, external metadata, dependency graph, and recent deployment history.
- **Component registration form**: Form-based and YAML import modes for `POST /catalog/components` and `POST /catalog/register-yaml`. Includes kind/lifecycle selects, tag input with preview, and validation error display.
- **API client extensions**: Added `catalog.registerYaml()` and `catalog.discoverFromLocation()` methods. Updated `listComponents` to use `kindGroup` filter matching backend API.
- **Deployment matrix page (FARM-E21)**: Visual grid with components as rows, environments as columns, color-coded cells by deployment status (succeeded/pending/in-progress/failed/rolled-back). KindGroup filter tabs and WebSocket live refresh on deployment changes.
- **Deployment history page**: Filterable deployment list at `/deployments/history` with status tabs, component/environment links, version, deployer, and pagination.
- **Deployment matrix types**: Added `DeploymentMatrixRow` and `DeploymentMatrixEnvironment` interfaces. Fixed deployment API routes from `/v1/environments/deployments` to `/v1/deployments`. Added `deployments.latest()` method.
- **Queue management API (FARM-E22)**: REST endpoints at `/api/v1/queues` for listing queues with job counts, inspecting individual queue stats, listing/filtering jobs by status, viewing job details (payload, result, errors, stack trace), and retrying failed jobs. Admin-only with Swagger documentation.
- **Queue dashboard page**: Queue overview at `/queues` with cards showing job counts by status (active/waiting/completed/failed/delayed), auto-refresh every 15 seconds, and Bull Board link.
- **Queue detail page**: Job listing at `/queues/:name` with status filter tabs, expandable job detail panels showing payload, result, errors, stack trace, and retry button for failed jobs.
- **Queue API client**: Added `queues.list()`, `queues.get()`, `queues.listJobs()`, `queues.getJob()`, `queues.retryJob()` methods and `QueueInfo`/`JobInfo` types.
- **Observability API (FARM-E23)**: REST endpoint at `/api/v1/observability/summary` returning process uptime, memory usage, HTTP request counts by status group, latency percentiles (p50/p90/p95/p99) from Prometheus histogram, and configurable Grafana URL. Admin-only with Swagger documentation.
- **Observability UI page**: Tabbed interface at `/observability` with Health (detailed component status, uptime, memory), Metrics (request counts, error rate, latency percentiles, Grafana dashboard link), and Traces (OpenTelemetry setup guide, Tempo/Grafana explore links, instrumented component overview).
- **GRAFANA_URL config**: Added `GRAFANA_URL` environment variable for linking to external Grafana instance from the observability dashboard.
- **Teams management UI (FARM-E24)**: Full team management with listing page showing team cards filtered by type (dev/infra/security/data/platform/other) with search, team detail page displaying members and owned components, team creation form, and inline editing/deletion for admins. Member management with add/remove actions using user search.
- **Teams API client**: Extended `teams` API client with `update()`, `delete()`, `getMembers()`, `addMember()`, `removeMember()`, and `getComponents()` methods.
- **Breadcrumb navigation (FARM-S83)**: Added path-based breadcrumb bar in the top header for contextual navigation across all pages.
- **Dark mode support**: Wired up `next-themes` ThemeProvider with system/light/dark modes and a theme toggle in the user dropdown menu.
- **Documentation browser (FARM-S82)**: Full documentation viewer at `/docs` with tree sidebar navigation per component, rendered Markdown content display, search by title with relevance scores, and admin create/edit/delete forms. Integrated `@tailwindcss/typography` for styled prose rendering.
- **Documentation API client**: Added `docs.list()`, `docs.get()`, `docs.getContent()`, `docs.getRendered()`, `docs.search()`, `docs.tree()`, `docs.create()`, `docs.update()`, `docs.delete()` methods and `DocumentationEntry`/`DocumentationTreeNode`/`DocumentationSearchResult` types.

## [0.6.0] - 2026-03-08

### Added
- **BullMQ job processing**: Integrated `@nestjs/bullmq` and `bullmq` for async background job processing using Redis.
- **Catalog discovery queue**: `POST /catalog/locations` now enqueues an async BullMQ job instead of processing synchronously, with graceful sync fallback when Redis is unavailable.
- **CatalogDiscoveryProcessor**: Dedicated BullMQ processor for async YAML catalog ingestion from git repositories.
- **NotificationProcessor**: Placeholder BullMQ processor for future email/webhook notification support.
- **Bull Board dashboard**: Queue monitoring UI at `/api/admin/queues` via `@bull-board/nestjs` and `@bull-board/express`.
- **QueuesModule**: Centralized queue module with conditional loading -- BullMQ/Bull Board skipped in test mode to prevent Redis connection leaks.
- **Database seeder**: Idempotent seed runner (`npm run seed` / `make seed`) with initial data: 2 users (admin + developer), 2 teams, 3 components (service, library, website), 2 environments (development, staging). Guarded against production execution.
- **API versioning**: Enabled URI-based versioning (`/api/v1/...`) via `VersioningType.URI` with `defaultVersion: '1'`. Health (`/api/health`) and root (`/api`) endpoints remain version-neutral. All E2E tests updated to versioned paths.

### Changed
- **TypeScript strict mode**: Enabled `noImplicitAny`, `strictBindCallApply`, `strictFunctionTypes`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`, and `noFallthroughCasesInSwitch` in tsconfig.json. Combined with existing `strictNullChecks`, the project now enforces near-full TypeScript strict mode (only `strictPropertyInitialization` excluded for NestJS DTO/entity compatibility).
- **WebSocket real-time events**: Added `EventsGateway` (`/events` namespace) with JWT-authenticated handshake via Socket.IO. Emits `component.created`, `component.updated`, `component.deleted`, `deployment.created`, and `deployment.updated` events. Clients connect with `io("ws://host:port/events", { auth: { token: "jwt" } })`.

## [0.5.0] - 2026-03-08

### Added
- **Prometheus metrics**: Integrated `prom-client` and `@willsoto/nestjs-prometheus` with default process metrics, custom HTTP request counter (`http_requests_total`), and request duration histogram (`http_request_duration_seconds`) by method, route, and status code. Exposed at `GET /api/metrics`.
- **OpenTelemetry tracing**: Integrated `@opentelemetry/sdk-node` with auto-instrumentations for HTTP, Express, and TypeORM. Exports traces via OTLP HTTP to configurable endpoint. Opt-in via `OTEL_ENABLED=true` environment variable.
- **Log-trace correlation**: Winston log entries in production include `trace_id` and `span_id` fields from the active OpenTelemetry span for cross-referencing logs with distributed traces.
- **MetricsInterceptor**: Global NestJS interceptor that records per-request Prometheus metrics with route-level granularity.
- **Redis caching**: Integrated `@nestjs/cache-manager` with `@keyv/redis` for response caching. Falls back to in-memory cache when `REDIS_HOST` is not set.
- **Cache interceptors**: Applied `CacheInterceptor` to `GET /catalog/components`, `GET /catalog/components/:id`, and all plugin GET endpoints for reduced database load.
- **Cache invalidation**: Automatic cache clear on component create, update, delete, and YAML registration operations.
- **Redis Docker service**: Added `redis:7-alpine` service with healthcheck to `docker-compose.yml`; API depends on Redis health.
- **Observability stack**: Added `docker-compose.observability.yml` with Grafana (port 3002), Prometheus (port 9090), and Grafana Tempo (ports 3200/4318) for metrics visualization and distributed trace inspection.
- **Pre-provisioned Grafana dashboard**: Farm API Overview dashboard with request rate, latency percentiles (p50/p95/p99), error rate, duration heatmap, and recent traces panels -- provisioned automatically on startup.
- **Makefile targets**: Added `make up-observability` and `make down-observability` for one-command observability stack management.
- **Observability documentation**: New `docs/developer-guide/observability.md` covering stack architecture, quick start, dashboard panels, metrics reference, PromQL examples, and extension guides.

## [0.4.7] - 2026-03-08

### Fixed
- **Dockerfile**: Pre-create `logs/` directory with `node` ownership to prevent EACCES permission error when running as non-root user.

## [0.4.6] - 2026-03-08

### Added
- **Helmet security headers**: Installed `helmet` and applied via `app.use(helmet())` in `main.ts` for X-Frame-Options, Content-Security-Policy, and other HTTP security headers.
- **Graceful shutdown**: Enabled `app.enableShutdownHooks()` in `main.ts` to drain active connections and close the database pool cleanly on SIGTERM/SIGINT.
- **Swagger bearer auth**: Added `.addBearerAuth()` to Swagger DocumentBuilder so the UI exposes an Authorize button for JWT tokens.

### Changed
- **Dockerfile**: Added `USER node` directive in production stage to run container as non-root user.

## [0.4.5] - 2026-03-08

### Added
- **Pagination**: All list endpoints now return paginated responses (`data`, `total`, `skip`, `take`). Accepts `skip` (default 0) and `take` (default 20, max 100) query parameters. Applied to Catalog, Teams, Documentation, Environments, and Deployments modules.
- **Per-endpoint Query DTOs**: `ListComponentsQueryDto`, `ListDocumentationQueryDto`, `ListDeploymentsQueryDto` extend `PaginationQueryDto` with module-specific filter fields.
- **LoginResponseDto / RefreshResponseDto**: Typed response DTOs for auth endpoints with Swagger annotations.
- **Request Logger Middleware**: Logs HTTP method, path, status code, duration, and authenticated user ID. Excludes health check endpoints from logging.
- **DATABASE_POOL_SIZE**: New environment variable (default 10, range 1-100) for PostgreSQL connection pool configuration.
- **Docker HEALTHCHECK**: Dockerfile includes a health check using Node.js (compatible with Alpine images without curl).
- **Docker env var extraction**: `docker-compose.yml` credentials use `${VAR:-default}` pattern; `.env.example` template created.
- **E2E Tests for Teams**: CRUD lifecycle, member management, and component ownership tests.
- **E2E Tests for Plugin Manager**: List plugins, menu items, routes, auth, and non-admin rejection tests.
- **Auth edge case E2E tests**: Malformed JWT returns 401, non-admin user returns 403.
- **Jest coverage thresholds**: Enforced minimums (65% branches, 70% functions/lines/statements) in `package.json`.

### Changed
- **DTO validation**: `componentId` in `CreateDocumentationDto` changed from `@IsString()` to `@IsUUID()`. `dependencyIds` in `CreateComponentDto` changed from `@IsString({each:true})` to `@IsUUID("4",{each:true})`.
- **Test assertions**: Replaced trivial `toBeDefined()` checks with meaningful assertions in documentation and teams specs.

### Fixed
- **Docker build failure**: Fixed TypeScript strict compilation error in `RequestLoggerMiddleware` (TS2352 cast through `unknown`).
- **Docker startup failure**: Hardcoded `DATABASE_HOST: postgres` in `docker-compose.yml` to prevent `.env` file from overriding the container-internal hostname.
- **Express path syntax**: Updated middleware path from `"api/health(.*)"` to `"api/health{*path}"` for current path-to-regexp version.

### Documentation
- Updated API reference docs (catalog, teams, environments, deployments, documentation) with pagination parameters and response format.
- Expanded `docs/api-reference/docs.md` with full endpoint list, properties table, and usage examples.
- Added `DATABASE_POOL_SIZE` to environment variables table in setup guide.
- Added `.env.example` copy step to getting started guide.
- Updated coverage thresholds in testing guide to match actual configuration.
- Updated `docs/user-guide/documentation.md` with `sourceUrl` field and new endpoints.
- Updated `README.md` with Teams, Environments, and Deployments endpoint sections.

## [0.4.4] - 2026-03-08

### Fixed
- **Docker JWT_SECRET**: Added `JWT_SECRET` env var to `docker-compose.yml` for production mode compatibility.

### Changed
- **Documentation Sync**: Updated 9 documentation files to reflect current implementation (rate limiting, JWT auth, refresh tokens, password validation, memory thresholds, env vars).

## [0.4.3] - 2026-03-08

### Added
- **Refresh Token Mechanism**: `POST /auth/refresh` endpoint with token rotation, bcrypt-hashed storage, and replay attack detection (invalidates token on reuse).
- **Password Strength Validation**: `RegisterUserDto.password` requires lowercase, uppercase, and digit; `username` enforces length 2-50.
- **CORS Configuration**: Configurable `ALLOWED_ORIGINS` env var with wildcard and comma-separated URL support.
- **Rate Limiting on Auth Endpoints**: `@Throttle` on login (5/min), register (5/min), refresh (10/min) with Swagger rate limit headers; skips throttling in test environment.
- **Database Indexes**: Added `@Index()` on `Component.owner` and `Documentation.componentId` with migration.

### Changed
- **JWT Secret Enforcement**: `JWT_SECRET` is required with min 32 characters in production via Joi validation.
- **ThrottlerModule**: Uses `skipIf` callback to disable rate limiting in test environment.

### Fixed
- **N+1 Query Performance**: Rewrote `findLatestByComponent()` and `getMatrix()` in DeploymentsService from O(M*N) loops to single QueryBuilder queries with SQL-level filtering.
- **Swagger Version**: Reads version dynamically from `package.json` instead of hardcoded string.

## [0.4.2] - 2026-03-07

### Added
- **Multi-Team Catalog Expansion**: Extended component kinds for Dev, Infra, Data, and Security teams (23 kinds total) with ComponentKindGroup enum and lifecycle stages.
- **Environments and Deployments Module**: Full environment management with deployment lifecycle tracking, status transitions, and deployment matrix endpoint.
- **Teams and Ownership Module**: Team CRUD, member management (ManyToMany with Users), and component ownership via teamId foreign key.
- **TechDocs Enhancement**: Markdown rendering with `marked`, documentation tree hierarchy (parentId/order), and in-memory search endpoint.
- **Plugin System Evolution**: Plugin manifest support, menu item and route contribution registries, directory scanning for external plugins.
- **E2E Test Suite**: 22 end-to-end tests covering auth, catalog, catalog-yaml, documentation, environments, and deployments.
- **Database Migrations**: Added migrations for environments/deployments, teams/ownership, and documentation tree fields.

### Changed
- **Health Check Thresholds**: Increased memory thresholds from 150MB/300MB to 512MB/1024MB to prevent false failures in CI environments.
- **CI Pipeline**: Migrated from deprecated `codecov/test-results-action@v1` to `codecov/codecov-action@v5` with `report_type: test_results`.

### Fixed
- **TypeScript Build Errors**: Fixed 13 compilation errors caused by `ConfigService.get()` returning `string | undefined` in ThrottlerModule, JwtModule, JwtStrategy, and multiple spec files.
- **Type Safety**: Fixed mock type mismatches in auth, catalog, documentation, and teams spec files.
- **Docker/PostgreSQL Startup**: Removed explicit `type: "datetime"` from `Deployment.startedAt` and `Deployment.finishedAt` columns; TypeORM now infers the correct native type per database (`timestamp` for PostgreSQL, `datetime` for SQLite).

## [0.4.1] - 2026-03-07

### Added
- **JWT Authentication**: Replaced placeholder auth with robust JWT-based authentication using Passport.js.
  - Implemented `LocalStrategy` for login validation.
  - Implemented `JwtStrategy` for endpoint protection.
  - Added `JwtAuthGuard` to secure sensitive routes.
- **Role-Based Access Control (RBAC)**: Implemented role management.
  - Added `@Roles()` decorator and `RolesGuard`.
  - Restricted write operations (POST, PATCH, DELETE) in Catalog and Documentation to `admin` users.
- **Rate Limiting**: Integrated `@nestjs/throttler` for API protection.
  - Configured global rate limiting with configurable TTL and limit via environment variables.
- **Security Enhancements**:
  - Implemented automatic password hashing using `bcrypt` in the `User` entity.
  - Added `ApiBearerAuth` to Swagger documentation for all protected endpoints.
- **Configuration**: Added `JWT_SECRET`, `JWT_EXPIRATION`, `THROTTLE_TTL`, and `THROTTLE_LIMIT` to environment variables.

## [0.2.5] - 2026-03-05

### Added
- **Infrastructure Orchestration**: Created `docker-compose.yml` to manage API and PostgreSQL database.
- **Advanced Health Monitoring**: Integrated `@nestjs/terminus` for detailed system health checks.
  - New endpoints: `GET /api/health` providing status for Database, Memory, Disk, and Version.
  - Integrated Docker healthchecks in `docker-compose.yml` using the new endpoint.
- **Structured Logging**: Integrated `nest-winston` and `winston` for professional log management.
  - Configurable log levels via `LOG_LEVEL` environment variable.
  - JSON-formatted logs for production and pretty-printed logs for development.
  - Automatic log rotation for production via `winston-daily-rotate-file`.
- **Database Migrations**: Set up TypeORM migration strategy.
  - Added `src/config/typeorm-cli.config.ts` for migration management.
  - Generated initial migration for current schema.
  - Added npm scripts: `migration:generate`, `migration:run`, `migration:revert`.
- **Environment Configuration**: Added `.env` support and improved validation schema in `src/config/configuration.ts`.

### Changed
- **Makefile Improvements**: Updated `up-docker` and `down-docker` to use Docker Compose and added `down-docker-clean` for full environment reset.
- **Documentation**: Updated `README.md` with Docker instructions and new project roadmap in `NEXT_STEPS.md`.

## [0.2.4] - 2026-03-05
### Changed
- Updated ESLint configuration to ignore the unbound-method rule in test files.
- Synchronized package.json version to 0.2.4.
- Added /coverage to .gitignore and removed the coverage/ directory from version control.

### Fixed
- Adjusted Jest mocks in src/documentation/documentation.service.spec.ts for ESLint compliance.

### Added
- **Gitignore Configuration**: Added agent configuration and project planning files to `.gitignore`:
  - `.github/agents/Farm-Developer.agent.md`: NestJS development standards agent configuration.
  - `NEXT_STEPS.md`: Project roadmap and improvement suggestions.

### Changed
- **Swagger Documentation**: Updated API documentation version from `0.2.3` to `0.2.4` in `src/main.ts` for consistency with package release.

## [0.2.3] - 2026-03-04

### Added
- **Swagger/OpenAPI Documentation**: Integrated `@nestjs/swagger` for comprehensive API documentation.
  - Added `@nestjs/swagger` and `swagger-ui-express` dependencies to `package.json`.
  - Configured `@nestjs/swagger` compiler plugin in `nest-cli.json`.
  - Initialized `SwaggerModule` in `src/main.ts` with title "Farm API" and version "0.2.3", served at `/api/docs`.
  - Applied OpenAPI decorators to `LoginDto` and `RegisterUserDto` in `src/auth/dto/`.
  - Documented API endpoints for `Auth`, `Catalog`, `Documentation`, and `Plugin Manager` modules.
  - Documented the `/health` check endpoint in `src/app.controller.ts`.

### Changed
- **DTO Inheritance**: Refactored `src/catalog/dto/update-component.dto.ts` and `src/documentation/dto/update-documentation.dto.ts` to use `@nestjs/swagger`'s `PartialType`.
- **Swagger Compatibility**: Converted `PluginMetadata` from interface to class in `src/plugin-manager/interfaces/plugin.interface.ts` for runtime reflection.
- **MkDocs Integration**: Updated static documentation to reference the new Swagger UI:
  - `docs/index.md`: Updated "Quick Start" to include Swagger UI link.
  - `docs/api-reference/index.md`: Added "Interactive Documentation" section pointing to `/api/docs`.
  - `docs/user-guide/getting-started.md`: Updated "Verifying the Installation" with Swagger UI check.
  - `docs/developer-guide/setup.md`: Added Swagger UI availability note to local development section.
- **API Reference Documentation Audit**: Audited `docs/api-reference/*.md` files to remove redundant API details, linking directly to Swagger UI for comprehensive endpoint and data model information.

## [0.2.2] - 2026-03-04

### Added
- **Docs Branding Asset**: Added `docs/img/farm01.svg` and configured it as project favicon.
- **Dockerized Test Workflow**: Added multi-stage `Dockerfile` with dedicated `test` and `production` targets.
- **Container Build Optimization**: Added `.dockerignore` for faster Docker builds.
- **Developer Commands**: Added Makefile targets for API validation via Docker (`test-docker`, `up-docker`, `down-docker`, `healthcheck`).

### Changed
- **Documentation Theme Customization**: Updated MkDocs Material configuration to support custom color tokens.
- **Visual Identity**: Applied Electric Indigo (`#6F00FF`) and Neon Fuchsia (`#FE59C2`) in `docs/stylesheets/extra.css`.
- **Header Styling**: Added gradient styling for header and tabs in documentation.
- **Homepage Content**: Updated `docs/index.md` to render the Farm logo in the page body.

### Fixed
- **MkDocs Color Configuration**: Replaced invalid theme color configuration approach with proper CSS variable overrides.

## [0.2.1] - 2026-03-04

### Added
- **System Discovery Documentation**: New guide for users to understand platform capabilities.
- **Plugin System Guide**: Detailed technical documentation for developers on how to extend Farm.
- **Plugins API Reference**: Documentation for the new `/api/plugins` discovery endpoint.
- **NestJS Development Standards**: Integrated specialized development guidelines in `.github/nestjs_instructions.md`.

### Changed
- **Developer Experience**: Updated setup guides with Docker and Makefile instructions.
- **Localization**: Translated Makefile commands and help messages to EN_US.
- **Documentation Structure**: Refined MkDocs navigation and indices for better discoverability.

## [0.2.0] - 2026-03-04

### Added
- **Plugin Manager Architecture**: Introduced a dynamic plugin system for modular extensibility.
  - `PluginManagerModule`: Handles dynamic registration of modules.
  - `PluginManagerService`: Centralized registry for plugin discovery.
  - `PluginManagerController`: API endpoint (`GET /api/plugins`) to list active features.
- Registered core modules (`Catalog`, `Documentation`, `Auth`) as plugins.

## [0.1.0] - 2026-03-04

### Added
- Initial NestJS project structure for Farm developer portal.
- **Catalog Module**: CRUD for software components (services, libraries, APIs).
- **Documentation Module**: Management of technical docs associated with components.
- **Auth Module**: Basic user registration and login functionality.
- **MkDocs Integration**: Comprehensive technical documentation using Material theme.
- **Docker Support**: `Dockerfile` and `docker-compose.docs.yml` for containerized deployment.
- **CI/CD**: GitHub Actions workflow for automatic documentation publishing to GitHub Pages.
- **Makefile**: Automation scripts for common tasks (build, test, docker, docs).

### Fixed
- MkDocs loading issues in production environments.
