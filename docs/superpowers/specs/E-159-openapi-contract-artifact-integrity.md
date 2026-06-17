# E-159: OpenAPI Contract Artifact Integrity

## Goal
Eliminate drift between NestJS decorator-based route definitions and the published `openapi.json`. The committed spec must always reflect what the running API actually serves.

## Approach (Approach 1 — Generator Script + Committed Spec + CI Diff Gate)

### Why This Approach
- **Committed spec**: makes every PR diff visible in code review. Breaking API changes appear as `openapi.json` diffs.
- **Generator script**: uses `NestFactory.createApplicationContext(AppModule)` to boot NestJS DI without starting an HTTP server, then calls `SwaggerModule.createDocument()`. No runtime dependencies.
- **CI diff gate**: replaces the current `openapi-snapshot` job (which uploads `openapi.json` as a build artifact with no diff enforcement). New job runs `npm run openapi:generate` then `git diff --exit-code apps/api/openapi.json`. If the committed spec doesn't match the generated spec, CI fails.

## Implementation Plan

### S653 — Generator script + committed spec

1. **Extract `createSwaggerConfig()`**
   - Move `DocumentBuilder` configuration from `main.ts` (lines 157-200+) to `apps/api/src/common/swagger/swagger-config.ts`
   - Export `createSwaggerConfig(): Omit<OpenAPIObject, 'paths'>`
   - Call it from both `main.ts` and the generator script
   - Config includes: title, version, description, servers, security scheme, and ~40 `.addTag()` calls

2. **Create generator script** `apps/api/scripts/generate-openapi.ts`
   - Uses `NestFactory.createApplicationContext(AppModule)` to bootstrap the module graph
   - Retrieves `SwaggerExplorer` or uses `SwaggerModule.createDocument()` with the config
   - Writes result as pretty-printed JSON to `apps/api/openapi.json`
   - Include shebang and proper module resolution

3. **Add npm script** `openapi:generate` in `apps/api/package.json`
   - Runs `ts-node -r tsconfig-paths/register scripts/generate-openapi.ts` (or the project's standard runner)

4. **Run generator once** to produce the committed initial spec
   - Replaces the current 11-line placeholder `openapi.json`

### S654 — CI contract-drift gate

1. **Modify `.github/workflows/ci.yml`**
   - Remove the current `openapi-snapshot` job (or replace it)
   - Add new job `openapi-diff`:
     ```yaml
     openapi-diff:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: ./.github/actions/setup
         - run: npm run openapi:generate
         - run: git diff --exit-code apps/api/openapi.json
     ```
   - No `needs:` dependency on other jobs — can run in parallel

2. **Update ROADMAP.md** — mark E-159 as `DONE`

## Configuration Decisions
| Aspect | Decision |
|--------|----------|
| Bootstrap method | `NestFactory.createApplicationContext` (no HTTP boot) |
| Stale spec removal | CI diff gate fails if spec drifts |
| OpenAPI version | Parsed from `package.json` (already done in `main.ts`) |
| Swagger UI path | Unchanged — still served at `/api/docs` |

## Verification
- `npm run openapi:generate` produces valid JSON
- `npm run openapi:generate` output is byte-identical on re-run (no drift between runs)
- CI job fails when `openapi.json` is stale and passes when it matches
- `main.ts` still boots and serves Swagger UI at `/api/docs`
- All existing tests pass
