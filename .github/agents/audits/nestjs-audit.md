# Farm API — NestJS 11 Deep Audit

**Audited tree:** `apps/api/` (NestJS 11.1.21, TypeORM 0.3, BullMQ, PostgreSQL, Redis, Passport JWT, Terminus, Throttler, cache-manager v5+keyv).
**Audit type:** Read-only review against official NestJS 11 documentation and modern best practices.
**Date:** generated from current `main`.

> Documentation references throughout this report use the following base URL: `https://docs.nestjs.com/` (NestJS 11 docs are the latest published version at the time of audit).

---

## 1. Executive Summary — Top 5 Critical Issues

| # | Severity | Issue | Where | One-line Fix |
|---|----------|-------|-------|--------------|
| 1 | Critical | Insecure default secrets baked into source: JWT signs with `"super-secret-key-change-me-in-production"`, Swagger UI defaults to `farm:farm`. Joi schema only enforces `min(32)` for `JWT_SECRET` in `production`, leaving every other environment (including hosted demos using `NODE_ENV=development` or unset) wide open. | `apps/api/src/config/configuration.ts:41,119–120,192–197`, `apps/api/src/modules/auth/auth.module.ts:55`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts:18–22`, `apps/api/src/main.ts:238–270` | Remove the literal fallback; require the env var in **all** non-test environments and fail fast at boot. |
| 2 | Critical | Bcrypt cost factor is **10** everywhere (`user.entity`, `auth.service`, `user-management.service`, `initial-seed`). OWASP ASVS v4 recommends `>= 12` for bcrypt as of 2024-2025; with `10` a modern GPU cracks ~30 k hashes/s. | `apps/api/src/modules/auth/entities/user.entity.ts:64`, `apps/api/src/modules/auth/auth.service.ts:89,136,307,335`, `apps/api/src/modules/auth/user-management.service.ts:343`, `apps/api/src/database/seeds/initial-seed.ts:247` | Centralize bcrypt cost in a constant (`BCRYPT_ROUNDS = 12`), make it configurable via env. Re-hash on next login. |
| 3 | Critical | `OrgContextInterceptor` is registered globally with `APP_INTERCEPTOR` and runs a `UserOrganization.findOne()` on **every** HTTP request that carries `x-organization-id` — duplicating the same membership check already performed by `OrgRequiredGuard`. Adds a DB round-trip to every request and creates inconsistent semantics (interceptor sets `req.organizationId`, guard sets `req.organizationId` + `req.orgRole`). | `apps/api/src/common/interceptors/org-context.interceptor.ts:30–60`, `apps/api/src/app.module.ts:527–530`, `apps/api/src/common/guards/org-required.guard.ts:48–88` | Delete the global interceptor; use `OrgRequiredGuard` (mandatory) + an explicit `@OptionalOrgContext()` guard for the few read endpoints that need soft scoping. |
| 4 | Critical | `cacheManager.clear()` is invoked across the API on every mutation (catalog, plugin manager, etc.). This flushes **all keys for the whole process across all tenants** — invalidating other organizations' caches and defeating the purpose of caching under multi-tenant load. | `apps/api/src/modules/catalog/catalog.controller.ts:167,192,298,322`, several other controllers | Replace with scoped key invalidation (`cacheManager.del(\`org:${orgId}:catalog:*\`)` via a key-prefix helper) — never `clear()` outside admin tooling. |
| 5 | High → Critical (governance) | Project rule (`Farm-Developer.agent.md`) prohibits combining `RolesGuard` with org-scoped endpoints, yet **>20 org-scoped controllers** use `@UseGuards(JwtAuthGuard, RolesGuard) + @Roles("admin")` (alerting-rules, audit-logs, ArgoCD, Jenkins, CircleCI, Travis, alerting, tag-policy, api-specs, integration-credential, deployments, ...). This both violates the convention and silently bypasses `PermissionGuard`, so RBAC matrix in `RolePermissions` is unenforced for those resources. | `apps/api/src/modules/alerting/alerting.controller.ts:40`, `apps/api/src/modules/audit-log/audit-log.controller.ts:41`, `apps/api/src/modules/integrations/{argocd,jenkins,circleci,travisci}.controller.ts`, `apps/api/src/modules/tag-policy/tag-policy.controller.ts:43`, `apps/api/src/modules/api-specs/api-specs.controller.ts:41`, `apps/api/src/modules/environments/deployments.controller.ts:43`, `apps/api/src/modules/integrations/integration-credential.controller.ts:38`, `apps/api/src/modules/plugin-manager/plugin-manager.controller.ts:46`, `apps/api/src/modules/auth/auth.controller.ts:193,549` | Replace each with `@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard) + @RequiresPermission(...)` and remove the corresponding `@Roles("admin")`. Keep `RolesGuard` only for genuinely global admin endpoints (user-management, plugin registry). |

---

## 2. Detailed Findings

> Severity legend: **C**ritical / **H**igh / **M**edium / **L**ow. Effort: **S** ≤ 0.5 d, **M** 0.5–2 d, **L** > 2 d.

### 2.1 Module Architecture & DI

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | Architecture | `apps/api/src/app.module.ts:86–561` | `AppModule` is 561 lines and imports 40+ feature modules directly *plus* registers them again as plugin manifests in `PluginManagerModule.forRoot([...])`. The list is duplicated, drifts easily, and forces a full recompile for every plugin. | Generate the plugin manifest array from a single declarative source (e.g. `core-plugins.ts` exporting `[{ module, metadata }]`) and import only that. Optionally split bootstrap imports vs feature imports into a `CoreFeaturesModule`. Docs: https://docs.nestjs.com/modules#dynamic-modules | M |
| H | Architecture | `apps/api/src/modules/pipelines/pipelines.module.ts:1,42`, `apps/api/src/modules/integrations/integrations.module.ts:1,33` | Mutual `forwardRef()` between `PipelinesModule` and `IntegrationsModule` — a documented code smell. | Extract the shared types/contract into a thin `pipelines-contracts` module (interface + injection token) consumed by both, or move the cross-cutting service into a new module. Docs: https://docs.nestjs.com/fundamentals/circular-dependency | M |
| M | Architecture | `apps/api/src/modules/plugin-manager/plugin-manager.module.ts:8–60` | `@Global()` + `forRoot()` pattern works, but plugin modules are pushed into `imports` of the same dynamic module that exports the controller; an exception in any plugin constructor crashes the whole API. There is no isolation. | Wrap `pluginModules` registration so failures are logged and surfaced via `PluginRegistryService` rather than aborting bootstrap. Use `OnModuleInit` per plugin so failures are localized. | M |
| M | DI | `apps/api/src/common/queues/queues.module.ts:16–33` | `register()` returns two completely different module shapes depending on `process.env.NODE_ENV`. This couples production behavior to env state at import time and makes a test-time module that **omits the processor** (so jobs added by tests silently never run). | Replace with `registerAsync({ useFactory })` and inject a `QueueConnectionStrategy`; in tests provide an in-memory strategy. Document that processors must always be registered. Docs: https://docs.nestjs.com/techniques/queues#async-configuration | M |
| L | DI | `apps/api/src/app.module.ts:556–559` | `onApplicationBootstrap` uses `moduleRef.get(..., { strict: false })` inside `try/catch` that silently swallows errors. Plugin scan failure is invisible. | Log the error at warn level with stack to surface plugin discovery issues. | S |
| L | DI | n/a | No provider uses `Scope.REQUEST` or `Scope.TRANSIENT` — good (matches Nest performance guidance). Verify continued discipline. Docs: https://docs.nestjs.com/fundamentals/injection-scopes | — | — |

### 2.2 Controllers, DTOs, Validation, Swagger

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | Validation | `apps/api/src/main.ts:121–129`, `apps/api/test/helpers/e2e-setup.ts:42–48` | Global `ValidationPipe` configured twice (main + e2e helper) with slightly different options (`enableImplicitConversion` only in main). E2E is therefore not validating the production behavior. | Export a single `validationPipeFactory()` from `src/common/pipes/validation-pipe.factory.ts` and reuse in main, e2e helper, and any local `UsePipes(new ValidationPipe(...))` call (e.g. `istio.controller.ts:147`). Docs: https://docs.nestjs.com/techniques/validation | S |
| M | Validation | `apps/api/src/main.ts:122–128` | `ValidationPipe` registered manually with `new ValidationPipe(...)`. Per docs the preferred way for proper DI of custom validators is via `APP_PIPE`. | Register through `{ provide: APP_PIPE, useValue: validationPipeFactory() }` in `AppModule.providers`. Docs: https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe | S |
| M | Swagger | `apps/api/src/modules/auth/auth.controller.ts:222–249,282` (and many others) | Several routes that require authentication declare only `@ApiBearerAuth()` and skip `@ApiHeader({ name: 'x-organization-id' })` even though the org-scoped guard chain requires it. Mandatory per project rule "Swagger — Always Mandatory". | Add `@ApiHeader({ name: 'x-organization-id', required: true })` to every endpoint guarded by `OrgRequiredGuard`. Consider a custom decorator `@OrgScopedEndpoint()` that bundles ApiBearerAuth + ApiHeader + UseGuards + 401/403 ApiResponses. Docs: https://docs.nestjs.com/openapi/decorators | M |
| M | Swagger | `apps/api/src/modules/auth/auth.controller.ts:228` | `@HttpCode(HttpStatus.OK)` on `GET /profile` is redundant but harmless; more importantly the OpenAPI document declares `200` while the global default for `@Post`-style success would be `201` — review all controllers for status alignment. | Sweep controllers; ensure declared `@ApiResponse({ status })` matches the actual `@HttpCode`. | M |
| L | REST | `apps/api/src/main.ts:142–161` | Legacy 308 redirect from `/api/{path}` to `/api/v1/{path}` is custom middleware appended **after** `useGlobalInterceptors` and pipes register but **before** `setGlobalPrefix`. The exclude regex misses `/api/v1/docs` since `docs` is anchored, but is acceptable. Test coverage for redirect behavior is unclear. | Add a focused e2e test asserting 308 for `POST /api/foo` (preserving body & method). | S |

### 2.3 TypeORM, Entities & Migrations

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | TypeORM | `apps/api/src/app.module.ts:107–137`, `apps/api/src/config/configuration.ts:24,165` | `synchronize: process.env.DATABASE_SYNC === "true"` — production safety relies entirely on operators never setting this env var. There is no explicit refusal when `NODE_ENV=production` and `DATABASE_SYNC=true`. | Hard-fail in `useFactory` if `synchronize && env === "production"`. Docs: https://docs.nestjs.com/techniques/database#typeorm-integration (synchronize warning). | S |
| H | TypeORM | `apps/api/src/app.module.ts:107–137` | TypeORM is configured **once** for the whole app, but no `retryAttempts`/`retryDelay` (TypeORM defaults to 10 retries; explicit is safer) and no `keepConnectionAlive`. Also no `logging`/`maxQueryExecutionTime` to flag slow queries. | Add `retryAttempts: 5, retryDelay: 3000, maxQueryExecutionTime: 1000`. Wire a custom logger that emits to Winston/OTel. Docs: https://docs.nestjs.com/techniques/database#async-configuration | S |
| M | TypeORM | `apps/api/src/migrations/` (58 files) | Several pre-existing migrations contain `ADD COLUMN` for columns also declared in entity `@Column()` decorators (known antipattern per project doc). This creates `synchronize` drift when devs use it locally and ambiguous truth between entity and SQL. | Generate a baseline migration from the current schema and squash the legacy `ADD COLUMN` migrations behind a sealed `0000-baseline.ts`. Document policy: "all schema lives in migrations; entity-only changes require a generated migration". Docs: https://docs.nestjs.com/recipes/sql-typeorm | L |
| M | TypeORM | `apps/api/src/modules/organization/entities/user-organization.entity.ts:54–59`, `org-invitation.entity.ts:41` | Cascade `onDelete: "CASCADE"` only on a subset of relations; `Team`, `Component`, `Environment`, etc. typically lack a documented orphan-deletion policy. | Audit every entity that holds `organizationId` and decide explicit cascade vs soft delete; document the choice in the entity JSDoc. | M |
| L | Repositories | `apps/api/src/common/guards/org-required.guard.ts:42–47` | Guard pulls a `Repository<UserOrganization>` out of the global DataSource. Works, but bypasses Nest DI and prevents transactional context propagation. | Inject via `@InjectRepository(UserOrganization)` after exporting it from a shared `OrganizationCoreModule`. Docs: https://docs.nestjs.com/techniques/database#auto-load-entities | S |

### 2.4 Auth & RBAC

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| C | Auth | `apps/api/src/modules/auth/auth.module.ts:54–62`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts:18–22` | JWT signing & verification secret falls back to the hard-coded literal `"super-secret-key-change-me-in-production"` when `JWT_SECRET` is unset. Joi only enforces strength when `NODE_ENV === "production"`. | Remove `??` fallbacks. Require `JWT_SECRET` (>=32 chars) for *any* env except `test`. Docs: https://docs.nestjs.com/security/authentication#jwt-functionality | S |
| H | Auth | `apps/api/src/modules/auth/auth.service.ts:60–98` | `login()`: refresh token is generated, hashed, stored — but every successful refresh **overwrites** the single column `refreshToken`. This prevents multi-device login (Browser A logs in, Browser B logs in, Browser A's refresh token is invalidated silently). | Move refresh tokens to a dedicated `refresh_tokens` table keyed by `(userId, jti)` with `issuedAt`, `expiresAt`, `revokedAt`, `userAgent`, `ip`. Implement proper rotation + reuse detection per family. Docs: https://docs.nestjs.com/security/authentication#implementing-passport-jwt (refresh tokens guidance + community pattern). | L |
| H | Auth | `apps/api/src/modules/auth/strategies/jwt.strategy.ts:22` | JWT payload validation only echoes claims — does not check user existence, suspension, role drift, or token version. A suspended user keeps API access for `JWT_EXPIRATION` (default 3600 s). | In `validate()`, look up the user, reject if `suspended`, and compare a `tokenVersion` claim against `user.tokenVersion` so admins can invalidate sessions. | M |
| H | Auth | `apps/api/src/modules/auth/auth.service.ts:80` | Password verification uses `bcrypt.compare()` against plaintext but does **not** apply a constant-time guard for unknown usernames — the early return after `findOne()` creates a tiny but measurable timing oracle. | Always call `bcrypt.compare(password, FAKE_HASH)` when user not found to equalize timing. | S |
| H | RBAC | Multiple controllers (see executive issue #5) | `@UseGuards(JwtAuthGuard, RolesGuard) + @Roles("admin")` is applied to org-scoped resources, bypassing `PermissionGuard`. | Switch all such controllers to the canonical chain `JwtAuthGuard → OrgRequiredGuard → PermissionGuard` + `@RequiresPermission(...)`. Map each existing `@Roles("admin")` to the appropriate `Permission` enum value. Reference: `.github/agents/Farm-Developer.agent.md` "Guard Chain Convention". | L |
| M | RBAC | `apps/api/src/common/guards/permission.guard.ts:42–66` | Permission guard correctly throws when `orgRole` missing but **does not** verify that `JwtAuthGuard` actually ran (relies on convention). If a developer applies the guard alone, every request is silently rejected with 403 — masking misconfiguration. | Throw a distinct `Logger.error` (not 403) when `req.user` is missing — signals "guard misconfiguration" vs "missing org". | S |
| M | Auth | `apps/api/src/modules/auth/auth.service.ts:35–53` | `register()` defaults `roles: ['user']`; first-ever user is not auto-promoted to admin which is acceptable, but registration is publicly enabled and not behind `SETUP_TOKEN`. | Add a `REGISTRATION_MODE` config (`open|invite|disabled`) and short-circuit `register()` accordingly. | M |

### 2.5 Multi-tenancy & Data Isolation

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| C | Multi-tenancy | See exec issue #3 | Duplicate org resolution: global `OrgContextInterceptor` + per-route `OrgRequiredGuard` both query `UserOrganization`. Wasted DB call and divergent semantics. | Remove the interceptor. | S |
| H | Multi-tenancy | `apps/api/src/modules/analytics/analytics.service.ts:62–215`, `deployments.service.ts:227–324`, `teams.service.ts:238` (and others) | `QueryBuilder` chains are constructed without unconditional `andWhere("entity.organizationId = :orgId", { orgId })`. Tenant scoping relies on controllers passing `organizationId` correctly to every service method. | Introduce a `TenantScopedRepository<T>` mixin that wraps `Repository<T>` and injects `organizationId` from a `REQUEST`-scoped `OrgContextService` (CLS / ALS), forbidding queries without org. Cover with `cross-tenant-security.e2e-spec.ts` extensions. Docs: https://docs.nestjs.com/recipes/cls | L |
| M | Multi-tenancy | `apps/api/src/common/interfaces/request-with-org.interface.ts` | `req.organizationId` is typed as optional everywhere, so accessing it without `!` triggers TS noise — devs use `!` or `as string`, defeating safety. | Provide two interfaces: `OrgScopedRequest` (required) returned by guard, `OptionalOrgRequest` for the few permissive routes. | S |

### 2.6 Serialization & Sensitive Data

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | Serialization | `apps/api/src/modules/auth/entities/user.entity.ts:55–58,72–73` | `password` and `refreshToken` use `@Exclude()` from class-transformer — relies on `ClassSerializerInterceptor` being applied globally. But several service methods do `userRepository.findOne()` and pass the result through manual JSON.stringify or websockets where the interceptor never runs. | Mark password column as `select: false` so it is **never** loaded unless explicitly requested via `.addSelect('user.password')`. Same for `refreshToken`. Docs: https://docs.nestjs.com/techniques/serialization | S |
| M | Serialization | `apps/api/src/modules/auth/auth.service.ts:50,67` | `userRepository.findOne({ where: { username } })` returns the entity including the password (because select isn't restricted on the column). | Combine with the above; explicitly `.addSelect('password')` only in login/refresh flows. | S |

### 2.7 Error Handling

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | Errors | `apps/api/src/common/filters/http-exception.filter.ts:114–134` | PG error code mapping is correct but limited to 3 codes. `23514 check_violation`, `22P02 invalid_text_representation`, `40001 serialization_failure`, `57014 statement_timeout` are not mapped. The latter is especially relevant given the configured `statement_timeout`. | Extend `resolveException()` to cover those codes (→ 400 / 409 / 503). Docs: https://docs.nestjs.com/exception-filters | S |
| M | Errors | Same file lines 73–90 | Log line emits `JSON.stringify(resolved)` for non-Error values — risks leaking secrets if an upstream service throws an object with credentials. | Strip known sensitive keys (`password`, `token`, `secret`) before serialization, or log only `typeof exception`. | S |
| L | Errors | Same file lines 36–43 | `AllExceptionsFilter` is registered both via `app.useGlobalFilters(new AllExceptionsFilter())` and **not** via `APP_FILTER`. This means it cannot use DI to inject a logger; uses `new Logger(...)` instead which works but bypasses Winston transports until `app.useLogger()` settles. | Migrate to `APP_FILTER`. Docs: https://docs.nestjs.com/exception-filters#binding-filters | S |

### 2.8 Logging & Observability

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | Logging | `apps/api/src/common/logger/logger.config.ts:36–60` | Daily-rotate file transport writes to `logs/application-%DATE%.log` inside the container. In Kubernetes this defeats stdout/stderr log collection (Fluent Bit, Loki, etc.) and the volume isn't declared. | Disable the file transport when running in K8s (`NODE_ENV=production && KUBERNETES_SERVICE_HOST`). Default to console-only. Docs: https://docs.nestjs.com/techniques/logger | S |
| M | Logging | n/a | No PII redaction layer. Request bodies for `/api/v1/auth/login` and `/api/v1/auth/register` may be logged at `debug`/`verbose` levels through the request-logger middleware. | Add a Winston format that masks fields named `password`, `token`, `secret`, `authorization`, `cookie`. | S |
| L | Observability | `apps/api/src/main.ts:23` | `initTracing()` runs **before** `NestFactory.create()` — good. But Pyroscope init at line 49 uses dynamic `require` inside a `try`; failures are warned. Add a metric so silent profiling drops are visible. | Emit a Prometheus gauge `pyroscope_initialized` (0/1). | S |

### 2.9 Queues

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | Queues | `apps/api/src/common/queues/queues.module.ts:33–65` | `BullModule.forRootAsync` does **not** set `defaultJobOptions` (attempts, backoff, removeOnComplete, removeOnFail). Each queue inherits BullMQ defaults: `attempts: 1`, jobs kept forever. Redis memory will grow unbounded. | Add `defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: { age: 86400, count: 1000 }, removeOnFail: { age: 7 * 86400 } }`. Docs: https://docs.nestjs.com/techniques/queues#configuration | S |
| H | Queues | `apps/api/src/common/queues/notification.processor.ts:24–60` | `process(job)` has no try/catch; any throw bubbles correctly to BullMQ for retry, but there is no dead-letter or failure metric. `EmailService` returning `false` is treated as success (just logged), losing the failure signal. | Throw on `!sent`. Add a `failed` event listener via `@OnWorkerEvent('failed')` that increments a Prometheus counter and writes to a `failed_jobs` table for DLQ semantics. Docs: https://docs.nestjs.com/techniques/queues#event-listeners | M |
| M | Queues | `apps/api/src/common/queues/queues.module.ts:17–28` | Test branch returns a module with **no Bull connection at all** and no processor; tests that call `queue.add(...)` resolve trivially. False sense of coverage. | In tests provide a `@golevelup/ts-jest` mock queue and assert `add()` calls. | M |
| M | Queues | `apps/api/src/modules/auth/auth.module.ts:64–68`, `documentation.module.ts:22–23` | Per-module `BullModule.registerQueue` is gated by `NODE_ENV === 'test'` ternary — production-only registration. Same code is repeated in 6+ modules. | Extract into a helper `registerQueueUnlessTest(name)` to DRY and centralize the test-skipping decision. | S |

### 2.10 Health Checks

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | Health | `apps/api/src/common/health/health.controller.ts:57–95` | `GET /api/health` is both liveness and readiness; `GET /api/health/live` was added for pure liveness, but **no `GET /api/health/ready`** exists. The `/health` endpoint pings DB + memory + disk + version — that is readiness, not "health". Kubernetes guidance: separate liveness from readiness. | Add `GET /api/health/ready` that runs DB ping + Redis ping + critical downstream checks; reserve `GET /api/health` as a documented "full diagnostic" page or remove. Docs: https://docs.nestjs.com/recipes/terminus | S |
| M | Health | `apps/api/src/common/health/health.module.ts` | `HealthModule` does not expose a Redis indicator despite the API hard-depending on Redis for cache and BullMQ. A Redis outage will not flip readiness. | Add `@nestjs/microservices` `RedisHealthIndicator` or a tiny custom indicator that pings Redis. | S |
| L | Health | `apps/api/src/common/health/health.controller.ts:60` | Memory thresholds default to 512 MB / 1024 MB but version string fallback is hard-coded to `"0.2.4"` — drift bait. | Remove the literal; require `version` from config. | S |

### 2.11 Rate Limiting

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | Throttler | `apps/api/src/app.module.ts:195–210`, `apps/api/src/common/guards/per-user-throttler.guard.ts:18–32` | Throttler uses in-memory storage (`@nestjs/throttler` default). In a multi-replica deployment each replica enforces its own bucket, multiplying the effective limit by replica count. | Configure `ThrottlerStorageRedisService` from `@nest-lab/throttler-storage-redis` or equivalent. Docs: https://docs.nestjs.com/security/rate-limiting | M |
| L | Throttler | `apps/api/src/app.module.ts:202` | `skipIf` skips throttling for the entire `test` env via env-var lookup at request time — fine, but consider a global `ThrottlerModule` `ignoreUserAgents` for health probes. | Add `ignoreUserAgents: [/kube-probe/i]`. | S |

### 2.12 Caching

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| C | Caching | See exec issue #4 (`catalog.controller.ts:167,192,298,322`) | Global `cacheManager.clear()` across all tenants on every mutation. | Use scoped key invalidation. | S |
| M | Caching | `apps/api/src/app.module.ts:146–192` | `CacheModule` is registered async but `useFactory` is annotated `// eslint-disable @typescript-eslint/require-await` — that's a code smell indicating the function shouldn't be async. | Make the factory sync OR add the actual async work (Redis ping at boot to fail fast). | S |
| M | Caching | `apps/api/src/modules/plugin-manager/plugin-manager.controller.ts:70,85,101...` | `@UseInterceptors(CacheInterceptor)` applied to org-scoped reads but the default cache key derivation does not include `x-organization-id`. Tenant A may see Tenant B's plugin list. | Provide a custom `CacheKeyGenerator` that includes user/org context, or apply `@CacheKey` with explicit org-scoped keys. Docs: https://docs.nestjs.com/techniques/caching#different-stores | M |

### 2.13 Configuration & Secrets

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| C | Config | `apps/api/src/config/configuration.ts:41,119–120,135` | Hard-coded fallbacks for `JWT_SECRET`, `SWAGGER_USER`, `SWAGGER_PASSWORD`, `IAC_INGEST_TOKEN`. | Drop fallbacks; require env at startup. | S |
| H | Config | `apps/api/src/config/configuration.ts:192–197` | `JWT_SECRET` validation is `Joi.when('NODE_ENV', { is: 'production', ... })`. Staging/preview deploys frequently use `NODE_ENV=staging` or `development` and silently inherit the weak literal. | Require min(32) for all values except literal `test`. | S |
| M | Config | `apps/api/src/config/configuration.ts:243–244` | `SWAGGER_USER`/`SWAGGER_PASSWORD` default to `farm:farm` and are not env-conditional. Anyone hitting `/api/docs` on a deployment that forgot to override gets full schema and the IacIngestToken header name. | Refuse to mount Swagger when defaults are used in non-`development` envs. | S |
| L | Config | `apps/api/src/config/configuration.ts` | Configuration is a giant flat object loaded in one factory; no typed access (developers use string keys like `configService.get<string>("auth.jwtSecret")`). Typos compile fine. | Generate typed config namespaces via `registerAs` per domain (`auth`, `cache`, `database`, `oauth`...) and inject with `@Inject(authConfig.KEY)`. Docs: https://docs.nestjs.com/techniques/configuration#configuration-namespaces | M |

### 2.14 Testing

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | Testing | `apps/api/test/helpers/e2e-setup.ts:25–50` | E2E suite imports the full `AppModule` against an in-memory `better-sqlite3`. PostgreSQL-specific features (`uuid_generate_v4()`, `jsonb`, partial indexes, advisory locks, `::uuid` casts) are silently shimmed by the better-sqlite3 compat layer, so migrations & queries are not validated. The only true validation is the "Migration integrity (PostgreSQL 16)" CI job (mentioned in agent docs). | Add a parallel e2e profile that runs against a disposable Postgres (`testcontainers` or the existing docker-compose). Mark SQLite e2e as "smoke", Postgres e2e as "integration". Docs: https://docs.nestjs.com/fundamentals/testing | L |
| M | Testing | `apps/api/test/helpers/e2e-setup.ts:42–50` | The helper sets `forbidNonWhitelisted: true` like main, but skips `enableImplicitConversion`. Behaviour drift means a DTO that depends on implicit type coercion (e.g. `@IsInt()` on a query string) passes in prod and fails in e2e (or vice-versa). | Share the same `ValidationPipe` factory. | S |
| M | Testing | n/a | No explicit coverage thresholds for the auth module despite its criticality — verify `jest.config.js` enforces e.g. `branches >= 85, lines >= 90` for `src/modules/auth/**`. | Add per-path thresholds. | S |

### 2.15 Security (general)

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| H | Security | `apps/api/src/main.ts:114` | `app.use(helmet())` with default settings. Default helmet **disables** `crossOriginEmbedderPolicy` since v6 and applies a default CSP that may break Swagger UI assets; current code may also need `contentSecurityPolicy: false` only for `/api/docs` not globally. | Configure helmet explicitly: enable `hsts` with `maxAge: 31536000`, `frameguard: { action: "deny" }`, `referrerPolicy: { policy: "no-referrer" }`. Apply a relaxed CSP only on the Swagger paths. Docs: https://docs.nestjs.com/security/helmet | S |
| H | Security | `apps/api/src/main.ts:134–140` | `enableCors({ origin: allowedOrigins === "*" ? true : ... , credentials: true })`. Setting `credentials: true` with `origin: true` reflects any origin — defeats CORS protection. | Refuse to start when `ALLOWED_ORIGINS === "*"` and `credentials: true` (or force `credentials: false` in that case). Docs: https://docs.nestjs.com/security/cors | S |
| M | Security | `apps/api/src/main.ts:69–110` | Multiple `app.use(express.json(...))` calls add raw-body capture for webhook routes — verified-correctly. The fallback `express.json({ limit: '1mb' })` is registered **after** the OTLP `/v1/traces/ingest` route, so the larger 10 MB limit wins for that specific path: good. Confirm no other large-payload routes exist. | Add a unit test that asserts `POST /api/v1/x` with 2 MB body is rejected with 413. | S |
| M | Security | `apps/api/src/main.ts:238–270` | Swagger Basic Auth implemented manually with `Buffer.from(...).toString('utf8').split(':')` — vulnerable to timing attacks. | Use `crypto.timingSafeEqual` with same-length buffers. Move the whole block behind an auth middleware. | S |
| L | Security | `apps/api/src/common/middleware/request-id.middleware.ts:12–25` | Good — client-supplied `x-request-id` validated with regex and length cap. Keep. | — | — |

### 2.16 Database (pooling, timeouts)

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| M | DB | `apps/api/src/app.module.ts:120–135` | Pool size defaults to **10**, statement timeout 30 s. With 5+ replicas you may exhaust PostgreSQL's `max_connections` (default 100). No PgBouncer guidance. | Document pool sizing relative to replicas; ship a PgBouncer config in `deploy/`. Add `idle_in_transaction_session_timeout` via `extra`. | M |
| L | DB | `apps/api/src/common/database/migration-lock.service.ts` (not opened) | Advisory-lock migration coordinator exists — good. Confirm it is invoked from `main.ts` or an `OnApplicationBootstrap` hook with proper failure handling. | Review. | S |

### 2.17 OpenTelemetry & Metrics

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| L | Observability | `apps/api/src/main.ts:23, 280` | `initTracing()` runs before `NestFactory.create()`. `shutdownTracing()` is called from fatal handlers but **not** from `enableShutdownHooks` events. SIGTERM may exit before spans flush. | Wire `app.enableShutdownHooks([Signals.SIGTERM, Signals.SIGINT])` and call `shutdownTracing()` in `OnApplicationShutdown`. Docs: https://docs.nestjs.com/fundamentals/lifecycle-events | S |

### 2.18 Dockerfile

| Sev | Cat | File:Line | Issue | Recommendation | Effort |
|-----|-----|-----------|-------|----------------|--------|
| L | Docker | `apps/api/Dockerfile` (full) | Multi-stage build, non-root user (UID 1001), pinned digest base image, `npm ci --ignore-scripts`, healthcheck script — all good. | Minor: add `--no-audit --no-fund` to `npm ci` for speed; pass `--frozen-lockfile` semantics via `npm ci`. | S |
| L | Docker | `apps/api/Dockerfile:54` | `npm ci --omit=dev --workspace=apps/api` followed by `rm -rf .../npm` — good hardening. Consider running `npm prune --omit=dev` after install as belt-and-braces. | Optional. | S |
| L | Docker | `apps/api/Dockerfile:81` | `HEALTHCHECK` cadence `30s` with `start-period=30s` is sensible. Could add `--start-interval=5s` (Docker 25+) for faster boot detection. | Optional. | S |

---

## 3. Action Plan by Severity

### CRITICAL — must fix before next release

1. **Remove insecure secret defaults (Exec #1, 2.4, 2.13).**
   - Delete the literal fallback `"super-secret-key-change-me-in-production"` from `configuration.ts`, `auth.module.ts`, `jwt.strategy.ts`.
   - Update Joi schema: `JWT_SECRET: Joi.string().min(32).required()` regardless of `NODE_ENV` except when `NODE_ENV === "test"`.
   - Same treatment for `SWAGGER_USER`, `SWAGGER_PASSWORD`, `IAC_INGEST_TOKEN`, `DOCS_WEBHOOK_SECRET`.
   - Acceptance: app refuses to boot in non-test envs when any required secret is missing or under 32 chars; new e2e tests cover registration & login with the test-only secret.

2. **Raise bcrypt cost to 12 (Exec #2).**
   - Add `BCRYPT_ROUNDS` constant + env override (`BCRYPT_COST=12`, validated 10–14).
   - Replace all six call sites (`user.entity.ts`, `auth.service.ts`, `user-management.service.ts`, `initial-seed.ts`).
   - On successful login, if `bcrypt.getRounds(user.password) < BCRYPT_ROUNDS`, re-hash and update.
   - Acceptance: unit test confirms login re-hashes legacy `$2b$10$` hashes; new hashes contain `$2b$12$`.

3. **Remove `OrgContextInterceptor` (Exec #3, 2.5).**
   - Delete `APP_INTERCEPTOR` registration; remove the file or keep as legacy only for backward compat tests.
   - Ensure every controller that needs org context uses `@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)`.
   - Acceptance: `cross-tenant-security.e2e-spec.ts` still passes; new perf test shows ≥1 fewer DB query per request on org-scoped endpoints.

4. **Scope cache invalidation (Exec #4, 2.12).**
   - Introduce `CacheKeyService` exposing `orgKey(orgId, ...parts)` and `invalidateOrg(orgId, prefix)`.
   - Replace every `cacheManager.clear()` with a scoped invalidation.
   - Acceptance: two tenants caching the same endpoint produce two distinct cache keys; mutating tenant A does not evict tenant B (unit test).

5. **Guard chain hygiene (Exec #5, 2.4).**
   - Sweep the ~20 controllers using `RolesGuard + @Roles("admin")` for org-scoped resources.
   - For each, decide the correct `Permission` and replace.
   - Acceptance: grep `RolesGuard` in `src/modules/**` returns only auth/user-management/plugin-registry global-admin routes; permission unit tests prove that a member without the new permission is rejected with 403 `INSUFFICIENT_PERMISSIONS`.

### HIGH — schedule for next sprint

- **Refresh-token redesign** (2.4): new `refresh_tokens` table, per-device support, reuse-detection invalidation chain.
- **JWT validate() hardening** (2.4): user existence + suspension check + `tokenVersion` claim.
- **Constant-time login compare** (2.4).
- **DB hardening** (2.3): hard-fail when `synchronize && env === "production"`; add `retryAttempts`, `maxQueryExecutionTime`.
- **Sensitive columns `select: false`** (2.6).
- **Cross-tenant query isolation via TenantScopedRepository / CLS** (2.5).
- **CORS + Helmet tightening** (2.15): refuse `origin:true + credentials:true`; explicit HSTS/CSP.
- **BullMQ `defaultJobOptions`** (2.9).
- **BullMQ failure listener + DLQ table** (2.9).
- **Helm/K8s logging** (2.8): remove file transport in K8s.
- **Postgres-based e2e profile** (2.14).
- **`forwardRef` between Pipelines/Integrations** (2.1).

### MEDIUM

- Centralize `ValidationPipe`; register via `APP_PIPE` (2.2).
- Add `@ApiHeader('x-organization-id')` everywhere org-scoped (2.2).
- Extend exception filter PG-code mapping (2.7).
- Redact sensitive log fields (2.8).
- Add `GET /api/health/ready` + Redis indicator (2.10).
- Redis-backed throttler storage (2.11).
- Custom cache-key generator that includes org (2.12).
- Typed config namespaces via `registerAs` (2.13).
- Auth coverage thresholds in Jest (2.14).
- Swagger Basic Auth: `timingSafeEqual` (2.15).
- PgBouncer + pool sizing docs (2.16).
- `OrgRequiredGuard` via DI repository (2.3).
- Migration squash baseline (2.3).
- Per-entity cascade audit (2.3).

### LOW

- AppModule splitting + plugin manifest source-of-truth (2.1).
- Logger info-disclosure (2.8).
- Pyroscope gauge (2.8).
- OTel shutdown via lifecycle hook (2.17).
- Dockerfile micro-optimizations (2.18).
- `request-id` middleware — already solid (2.15).

---

## 4. Documentation Citations

- Modules & dynamic modules — https://docs.nestjs.com/modules
- Custom providers — https://docs.nestjs.com/fundamentals/custom-providers
- Injection scopes — https://docs.nestjs.com/fundamentals/injection-scopes
- Circular dependency — https://docs.nestjs.com/fundamentals/circular-dependency
- Configuration & namespaces — https://docs.nestjs.com/techniques/configuration
- Validation — https://docs.nestjs.com/techniques/validation
- Serialization — https://docs.nestjs.com/techniques/serialization
- Database / TypeORM — https://docs.nestjs.com/techniques/database
- Caching — https://docs.nestjs.com/techniques/caching
- Queues (BullMQ) — https://docs.nestjs.com/techniques/queues
- Logger — https://docs.nestjs.com/techniques/logger
- Authentication (Passport) — https://docs.nestjs.com/security/authentication
- Authorization (RBAC) — https://docs.nestjs.com/security/authorization
- CORS — https://docs.nestjs.com/security/cors
- Helmet — https://docs.nestjs.com/security/helmet
- Rate limiting — https://docs.nestjs.com/security/rate-limiting
- Exception filters — https://docs.nestjs.com/exception-filters
- Interceptors — https://docs.nestjs.com/interceptors
- Lifecycle events — https://docs.nestjs.com/fundamentals/lifecycle-events
- Versioning — https://docs.nestjs.com/techniques/versioning
- OpenAPI / Swagger — https://docs.nestjs.com/openapi/introduction
- Testing — https://docs.nestjs.com/fundamentals/testing
- Health checks (Terminus) — https://docs.nestjs.com/recipes/terminus
- CLS / ALS — https://docs.nestjs.com/recipes/cls

---

## 5. Out-of-Scope Notes

- `apps/web/` Next.js audit — covered separately by `Farm-Developer-Nextjs.agent.md`.
- SRE / infra / Helm chart hardening — covered by `Farm-SRE.agent.md`.
- `packages/types` audit — not required (pure TS types).

---

**End of audit.** No source files were modified during this review. Recommend converting Critical findings into individual issues with the IDs `FARM-NEST-AUDIT-{01..05}` to unblock the next release.
