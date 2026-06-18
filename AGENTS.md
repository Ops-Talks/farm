# Farm Monorepo — Agent Instructions

## Build & Test

- Install: `npm install` (npm workspaces — never pnpm or yarn)
- Dev API: `npm run start:dev --workspace=apps/api`
- Dev Web: `npm run dev --workspace=apps/web`
- Full check: `make check` — runs format, lint, unit tests, e2e, Playwright
- API lint: `npm run lint --workspace=apps/api`
- Web lint: `npm run lint --workspace=apps/web`
- API unit: `npm run test --workspace=apps/api` (`.spec.ts`)
- API e2e: `npm run test:e2e --workspace=apps/api` (`.e2e-spec.ts`)
- Web unit: `npm run test --workspace=apps/web` (Vitest, `*.test.tsx`)
- Web e2e: `npm run test:e2e --workspace=apps/web` (Playwright)
- Helm lint: `make helm-lint`
- Coverage threshold: 80% (branches, functions, lines, statements)

## Monorepo Structure

```
apps/api/     — NestJS 11 (ES2023, Node 26)
apps/web/     — Next.js 16 App Router (Tailwind v4 + shadcn/ui)
packages/types/ — @farm/types (shared enums)
```

API modules at `apps/api/src/modules/` (22 common subdirs, 36 modules).
Web components at `apps/web/src/` (app/, components/, hooks/, lib/).

## Key Conventions

- **Guard chain**: `@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)` + `@RequiresPermission(Permission.X)`.
  `RolesGuard` only for global admin ops, never with `PermissionGuard`.
- **External HTTP**: Use `HttpCircuitBreakerService` (first arg = integration scope name).
  Native `fetch()` is flagged by ESLint `no-native-fetch` rule (error in src/).
  Exception: `opa.service.ts` (test interception, documented).
- **Response validation**: `validateResponse(ExternalDto, raw)` from `@common/http/validate-response`.
- **API routes**: `/api/v1/{resource}` (URI versioning v1, prefix `api`).
- **Swagger**: Mandatory on every controller change — `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiHeader`.
- **DB**: TypeORM + PostgreSQL. `@PrimaryGeneratedColumn('uuid')`. Mix of camelCase (old) and snake_case (new) column naming.
- **Validation**: Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). Use `class-validator` on DTOs.
- **Config**: Joi schema in `apps/api/src/config/configuration.ts`. No fallback URLs for external services.
- **Forms (web)**: `react-hook-form` + `zodResolver`. Server state via `@tanstack/react-query` (`api-client.ts`).
- **RBAC (web)**: `usePermission(Permission.X)` from `@/hooks/use-permission`. Import enums from `@farm/types`.
- **BullMQ**: `@nestjs/bullmq` with `@BullWorkerHost` decorator for worker DI scoping.

## Documentation Standards

Review and maintain these doc types with the checks listed:

- **MkDocs** (`docs/`): Every `.md` in nav must exist; no orphaned files outside nav; no broken internal links; mkdocs.yml nav entries use correct paths.
- **Swagger/OpenAPI**: Every controller needs `@ApiOperation`, `@ApiResponse(200/401/403)`, `@ApiBearerAuth` (if JWT), `@ApiHeader('x-organization-id')` (if org-scoped). DTOs need `@ApiProperty` with `enum:` for enum fields.
- **Helm docs**: `deploy/helm/*/README.md` parameters table must match `values.yaml`. `values.schema.json` must be in sync.
- **Code comments**: Remove stale/outdated comments. TODOs must have an owner or issue reference. Public APIs should have JSDoc.
- **READMEs**: Root and per-app READMEs must have accurate install/build instructions, badges, and version references.
- **CHANGELOG / ROADMAP**: New features/breaking changes must have entries; format follows keep-a-changelog convention.

Use `scripts/docs-lint/` tools when available for automated checks.

## Git & PRs

- Branch from `main`, PR to `main`
- Run `make check` before every PR
- Commit messages: conventional commits preferred
- AGENTS.md is for agent instructions — not a session log. Update as conventions change.
