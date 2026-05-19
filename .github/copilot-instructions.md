# Copilot Instructions for Farm

Farm is an open-source full stack portal providing a centralized hub for managing software components, technical documentation, and team infrastructure. Built with NestJS 11, TypeORM, PostgreSQL, and Next.js 16. Use EN_US for all docs and code comments. No emojis.

This is a monorepo: `apps/api/` (NestJS API), `apps/web/` (Next.js frontend), `packages/types/` (shared TypeScript types, published as `@farm/types`).

## Commands

All commands run from the monorepo root unless otherwise noted.

```bash
# Full check — MANDATORY before every PR and after every set of changes
make check               # format + lint (API + web) + unit tests + e2e tests + Playwright

# Build
cd apps/api && npm run build   # Compile API to dist/
cd apps/web && npm run build   # Build Next.js app

# Test (API — run from apps/api/)
npm run test             # Unit tests (Jest, rootDir: src/)
npm run test:e2e         # E2E tests (supertest + SQLite in-memory)
npx jest --testPathPattern=auth  # Run tests matching a pattern
npx jest src/modules/auth/__tests__/auth.service.spec.ts  # Single test file

# Lint & Format (run from apps/api/ or apps/web/)
npm run lint             # ESLint with auto-fix
npm run format           # Prettier

# Migrations (run from apps/api/)
npm run migration:generate  # Generate migration from entity changes
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration

# Docker
make up-docker            # Start API + PostgreSQL (docker-compose)
make down-docker-clean    # Stop and remove volumes
make healthcheck          # curl /api/health
```

## Architecture

### Plugin System

All feature modules are registered as plugins through `PluginManagerModule.forRoot()` in `src/app.module.ts`. Each plugin is a standard NestJS module with metadata (name, version, description). To add a new feature module, register it as a plugin in the `forRoot()` call alongside the existing five: `core-catalog`, `core-documentation`, `core-auth`, `core-environments`, `core-teams`.

The `PluginManagerService` maintains an in-memory registry of plugins and supports menu/route contributions via `plugin.json` manifests.

### Module Layout

Feature modules live at `apps/api/src/modules/`:

- `auth/` - JWT authentication, local strategy, user entity, refresh token rotation
- `catalog/` - Software component registry with YAML discovery (Backstage-compatible `catalog-info.yaml`)
- `documentation/` - Markdown docs fetched from URLs, rendered/sanitized to HTML, tree navigation
- `environments/` - Environments and deployments with status state machine
- `teams/` - Team management with user membership (ManyToMany) and component ownership
- `pipelines/` - CI/CD pipeline execution, stage orchestration, webhook receivers (GitHub Actions, ArgoCD)
- `organization/` - Multi-tenant organization management and member roles
- `integrations/` - External system integrations (GitHub Actions, ArgoCD, Kubernetes, Elasticsearch, etc.)
- `slo/`, `scorecards/`, `analytics/`, `audit-log/` - Observability and governance modules

Shared code:

- `apps/api/src/common/` - Guards (`JwtAuthGuard`, `OrgRequiredGuard`, `PermissionGuard`, `RolesGuard`), filters, decorators, RBAC (`common/rbac/permissions.ts`)
- `apps/api/src/config/` - App configuration with Joi validation schema
- `apps/api/src/migrations/` - TypeORM migrations
- `apps/api/src/plugin-manager/` - Plugin registry and discovery

Shared types package:

- `packages/types/src/` - Enums and interfaces used by both API and web: `OrgRole`, `Permission`, `RolePermissions`, `ComponentKind`, `ComponentLifecycle`, `TeamType`, etc. Import as `@farm/types`.

### Auth Flow

1. `POST /api/v1/auth/register` creates user with bcrypt-hashed password, default role `["user"]`
2. `POST /api/v1/auth/login` validates credentials, returns JWT access token + refresh token (40-byte hex stored hashed)
3. `POST /api/v1/auth/refresh` rotates refresh tokens; detects token reuse and clears all user tokens
4. `GET /api/v1/auth/profile` returns the current authenticated user
5. Auth-only routes: `@UseGuards(JwtAuthGuard)`; org-scoped routes add `OrgRequiredGuard`; permission-checked routes use the full chain (see RBAC section)
6. JWT payload: `{ sub: userId, username, roles }`

### Database

- **Primary**: PostgreSQL 16 (TypeORM, auto-loaded entities)
- **Tests**: SQLite in-memory (`:memory:`, `synchronize: true`)
- **Migrations**: `src/migrations/` - always use migrations for schema changes in production (`DATABASE_SYNC=false`)
- **Config env vars**: `DATABASE_TYPE`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SYNC`

### Key Entities and Relationships

- `User` has ManyToMany with `Team` via `team_members` join table
- `Component` has ManyToMany self-referential `dependencies` via `component_dependencies` join table
- `Component` has ManyToOne `Team` (optional `teamId` FK) plus a string `owner` field
- `Documentation` has tree hierarchy via `parentId` + `order` fields
- `Deployment` has ManyToOne to both `Component` and `Environment`

## Conventions

### API

- Global prefix: `/api` with URI versioning (default version `1`), so all routes resolve as `/api/v1/{resource}` (configured via `app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })` in `main.ts`)
- Swagger UI: `/api/docs` (auto-generated via `@nestjs/swagger` plugin in `nest-cli.json`)
- REST pattern: `GET/POST /api/v1/{resource}`, `GET/PATCH/DELETE /api/v1/{resource}/:id`
- Rate limiting: global `ThrottlerGuard` (configurable via `THROTTLE_TTL`, `THROTTLE_LIMIT`); auth endpoints override with stricter limits
- **Swagger annotations are mandatory**: any controller change — new endpoint, guard change, added header, removed parameter — must include updated `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, and `@ApiHeader` decorators. Never skip Swagger updates.

### RBAC and Guard Chain

The full guard chain for org-scoped, permission-checked endpoints:

```typescript
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@RequiresPermission(Permission.CATALOG_WRITE)
```

- `JwtAuthGuard` — validates JWT, populates `req.user`
- `OrgRequiredGuard` — reads `x-organization-id` header, validates membership, sets `req.organizationId` and `req.orgRole`; throws 403 if the header is missing or the user is not a member
- `PermissionGuard` — reads `@RequiresPermission()` metadata, checks `req.orgRole` against `RolePermissions` from `@farm/types`; throws 403 if insufficient
- Never add `RolesGuard` alongside `PermissionGuard` — they serve different concerns and their combination creates redundant/conflicting checks
- Use `RolesGuard` + `@Roles('admin')` only for global admin operations that are not org-scoped

On the frontend:

- `useOrganization()` from `OrganizationContext` provides `orgRole: OrgRole | null`
- `usePermission(Permission.X)` returns `true` if the current user's org role grants that permission
- Gate write-action UI elements: `const canWrite = usePermission(Permission.CATALOG_WRITE); return canWrite ? <Button /> : null;`
- `orgRole` is fetched when `currentOrg` changes in the context effect using the client path `GET /v1/organizations/:id/members/me`; because the web API client prefixes requests with `/api`, the actual network route is `GET /api/v1/organizations/:id/members/me`

### Migrations

- Migration files live in `apps/api/src/migrations/`
- **Do not duplicate column DDL**: TypeORM entity `@Column` definitions handle column creation. Production migrations should only add data backfills, constraints, or index changes — not `ALTER TABLE ADD COLUMN` for columns already declared in the entity.
- **Explicit type casts**: PostgreSQL has no implicit `varchar → uuid` cast. Always use `::uuid` when backfilling UUID columns from string sources.
- **Only PostgreSQL CI validates migration SQL**: Unit and e2e tests use SQLite in-memory (`synchronize: true`). The CI job "Migration integrity (PostgreSQL 16)" is the definitive validator. Never rely solely on local test results for migration correctness.
- **Column name casing**: Tables created before Phase 12 use camelCase column names (e.g., `"organizationId"`). New entities with `name: "organization_id"` are the exception. Migration SQL must match the target table's naming convention.

### Frontend

- `set-state-in-effect` lint rule: calling `setState` synchronously in a `useEffect` body triggers cascading renders. Always wrap in an `async` inner function with a `cancelled` cleanup flag:

  ```typescript
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const result = await someApi();
      if (!cancelled) setState(result);
    }
    void fetchData();
    return () => { cancelled = true; };
  }, [deps]);
  ```



All exceptions pass through `AllExceptionsFilter` (`src/common/filters/http-exception.filter.ts`) and return:

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/resource",
  "message": "Description of the error"
}
```

### Validation

Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `enableImplicitConversion: true`. DTOs use `class-validator` decorators. Sensitive fields use `@Exclude()` from `class-transformer` (applied via global `ClassSerializerInterceptor`).

### Entities

- UUID primary keys (`@PrimaryGeneratedColumn('uuid')`)
- `@CreateDateColumn()` and `@UpdateDateColumn()` on all entities
- Enum columns for type fields (e.g., `ComponentKind`, `ComponentLifecycle`, `TeamType`)
- Passwords hashed in `@BeforeInsert()` hook with bcrypt (10 rounds)

### Testing

- **Unit tests**: `apps/api/src/**/*.spec.ts` — use `Test.createTestingModule` with mock repositories (`jest.fn()` for each method) and mock services. Reset mocks in `afterEach()`.
- **E2E tests**: `apps/api/test/*.e2e-spec.ts` — use `createE2EApp()` and `registerAndLogin()` helpers from `test/helpers/e2e-setup.ts`. These configure SQLite in-memory and return a JWT token with admin role.
- **E2E helper pattern**: `registerAndLogin(app)` registers a user, promotes to admin via direct DB update, logs in, and returns the JWT token.
- **API test routes**: All routes use the `/api/v1/` prefix. E.g., `GET /api/v1/catalog/components`, `POST /api/v1/auth/login`, `GET /api/v1/auth/profile` (not `/api/auth/me`).
- **TeamType enum**: Valid string values are `"dev"`, `"infra"`, `"security"`, `"data"`, `"platform"`, `"other"`. The value `"stream_aligned"` does not exist in this codebase.
- **Playwright `setupOrgMock`**: All Playwright tests that use `setupOrgMock` must also mock `GET /organizations/*/members/me` returning `{ role: "owner" }`. Without this mock, `orgRole` is null and permission-gated UI elements (write buttons, register component, etc.) will be hidden, causing false negatives.
- **Mocking global.fetch**: Never assign directly to `global.fetch` without restoring. `jest.clearAllMocks()` does NOT restore raw global variable assignments — only `jest.fn()` instances tracked by Jest are affected. Use the capture-and-restore pattern scoped to the relevant `describe` block:
  ```ts
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  // inside the test:
  globalThis.fetch = jest.fn().mockResolvedValue({ ... }) as typeof fetch;
  ```
  Always use `globalThis.fetch` (not `global.fetch`) — it is type-safe in TypeScript.

### Configuration

Environment variables validated at startup with Joi (`src/config/configuration.ts`). `JWT_SECRET` must be at least 32 characters in production. All config has sensible defaults for local development.

### Logging

Winston via `nest-winston`. Development: colored console. Production: JSON console + daily-rotate file transports (`logs/application-%DATE%.log`, `logs/error-%DATE%.log`, 20MB max, 14-day retention).
