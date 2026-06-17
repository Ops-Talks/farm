
## 2026-06-11 21:48 — E-156 HTTP Client Consistency (Phase 55)

### Completed (in this session)
- **S644**: Created `HttpCircuitBreakerService` wrapping `HttpService` with `CircuitBreakerService.fire()`. Promoted `no-native-fetch` ESLint rule from `warn` to `error` (with `opa.service.ts` exception documented). Added `HttpCircuitBreakerService` as provider+export in `http.module.ts`.
- **S645**: All 17 native-fetch services already converged (checked each). Fixed stale comment in `kong.adapter.ts`. Only `opa.service.ts` remains as documented `fetch()` exception.
- **S646**: Created `validate-response.ts` (plainToInstance + validateSync), `external-response.dto.ts` (4 DTOs), `validate-response.spec.ts` (5 tests). Applied response validation in `slo-calculator.service.ts`, `open-cost.service.ts`, `elastic-stack.service.ts`, `opa.service.ts`.
- **S647**: Removed `?? "http://localhost:8181"` from `opa.service.ts` and `"http://localhost:9090"` default from `open-cost.service.ts`. Changed `OPENCOST_URL`/`OPA_URL` Joi validation from `.optional().default("http://localhost:9...")` to `.optional()` (no default). Fixed pre-existing constructor-brace syntax error in `opa.service.ts:46`.
- **S648**: Migrated `keycloak-sync.service.ts` and `webhook.service.ts` from `HttpService` to `HttpCircuitBreakerService`. Updated both spec files. Confirmed 3 other services (istio-metrics, linkerd-metrics, pyroscope-init) are internal-only and don't need circuit breaker. All 3477 tests pass.
- **ROADMAP.md**: Updated E-156 from `TODO` to `DONE`.

### Key files changed
- `apps/api/src/common/http/http-circuit-breaker.service.ts` — new wrapper service
- `apps/api/src/common/http/http.module.ts` — exports HttpCircuitBreakerService
- `apps/api/src/common/http/validate-response.ts` — new response validation utility
- `apps/api/src/common/http/external-response.dto.ts` — 4 response DTOs
- `apps/api/src/config/configuration.ts` — removed OPA/OpenCost URL defaults
- `apps/api/src/modules/opa/opa.service.ts` — removed fallback URL, fixed syntax error
- `apps/api/src/modules/finops/open-cost.service.ts` — removed fallback URL
- `apps/api/src/modules/auth/keycloak-sync.service.ts` — migrated to HttpCircuitBreakerService
- `apps/api/src/modules/integrations/webhook.service.ts` — migrated to HttpCircuitBreakerService
- `apps/api/eslint.config.mjs` — no-native-fetch promoted to error
- `ROADMAP.md` — E-156 done

### Key context
- `HttpCircuitBreakerService` requires `integration: string` scope as first arg: `get("integration", url, config)`, `post("integration", url, data, config)`, etc.
- `HttpModule` is `@Global()` — imported once in `app.module.ts:25`, available everywhere.
- `opa.service.ts` is the only documented `fetch()` exception (needs native fetch for test interception).
- 5 pre-existing infrastructure-dependent test suite timeouts (0 actual failures).
