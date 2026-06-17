# E-159: OpenAPI Contract Artifact Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static placeholder `openapi.json` with a generated spec, enforce contract-drift detection in CI.

**Architecture:** Extract `createSwaggerConfig()` from `main.ts` into a shared module. Create a generator script using `NestFactory.createApplicationContext` + `SwaggerModule.createDocument` to produce the real spec. Replace the CI `openapi-snapshot` job with a diff gate that runs `git diff --exit-code apps/api/openapi.json` after regeneration.

**Tech Stack:** NestJS 11, @nestjs/swagger 11, ts-node, GitHub Actions

---

### Task 1: Extract `createSwaggerConfig()` to shared module

**Files:**
- Create: `apps/api/src/common/swagger/swagger-config.ts`
- Modify: `apps/api/src/main.ts:157-225`

- [ ] **Step 1: Create `swagger-config.ts`**

Write `apps/api/src/common/swagger/swagger-config.ts`:

```typescript
import { DocumentBuilder, OpenAPIObject } from "@nestjs/swagger";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const { version } = require("../../../package.json");

export function createSwaggerConfig(): Omit<OpenAPIObject, "paths"> {
  return new DocumentBuilder()
    .setTitle("Farm API")
    .setDescription("The Farm platform API documentation")
    .setVersion(version as string)
    .addServer("/api/v1", "Versioned API (current)")
    .addServer("/api", "Deprecated alias (redirects to /api/v1)")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", in: "header", name: "x-ingest-token" },
      "IacIngestToken",
    )
    .addTag("Health", "Application health and readiness probes")
    .addTag("Authentication", "JWT auth, registration, and profile management")
    .addTag("User Management", "Platform-wide user management dashboard")
    .addTag("Organizations", "Organization and multi-tenant management")
    .addTag("Invitations", "Organization invitation workflows")
    .addTag("Catalog", "Software component registry")
    .addTag("Teams", "Team management and membership")
    .addTag("Environments", "Deployment environment management")
    .addTag("Deployments", "Component deployment tracking")
    .addTag("Pipelines", "CI/CD pipeline definitions and run history")
    .addTag("IaC", "Infrastructure-as-Code stack management and ingest")
    .addTag("IaC Modules", "IaC module catalog and versioning")
    .addTag("Kubernetes", "Kubernetes cluster discovery and workload management")
    .addTag("Helm", "Helm release discovery and synchronization")
    .addTag("Istio", "Istio service mesh integration")
    .addTag("Linkerd", "Linkerd 2.x service mesh integration")
    .addTag("Gateway", "API gateway route discovery and health checks")
    .addTag("Registry", "Container registry queries and vulnerability scanning")
    .addTag("Scorecards", "Component maturity scorecard evaluation")
    .addTag("SLOs", "Service Level Objective management")
    .addTag("Incidents", "Production incident management")
    .addTag("Post-Mortems", "Incident post-mortem analysis")
    .addTag("Alerting Rules", "PromQL-based alerting rule management")
    .addTag("Analytics", "Catalog health, DORA metrics, and usage reports")
    .addTag("Cloud", "Cloud resource discovery and cost management")
    .addTag("Dashboards", "Custom dashboard and widget management")
    .addTag("Documentation", "Technical documentation management")
    .addTag("Service Templates", "Service template and scaffold workflows")
    .addTag("OPA", "Open Policy Agent integration")
    .addTag("Observability", "Application observability and metrics")
    .addTag("Queues", "BullMQ queue monitoring and job management")
    .addTag("Webhooks", "Inbound CI/CD webhook receivers")
    .addTag("ArgoCD", "ArgoCD application management")
    .addTag("CircleCI", "CircleCI pipeline management")
    .addTag("Jenkins", "Jenkins job and build management")
    .addTag("Travis CI", "Travis CI build management")
    .addTag("Integrations", "CI/CD integration management")
    .addTag("Integration Credentials", "Encrypted integration credential management")
    .addTag("Tag Policies", "Cloud resource tag governance")
    .addTag("Elasticsearch Indices", "Elasticsearch index pattern management")
    .addTag("Plugins", "Plugin manager and registry")
    .addTag("Audit Log", "Immutable audit trail")
    .addTag("Features", "Platform feature availability flags")
    .addTag("Search", "Full-text and faceted search across catalog entities")
    .addTag("Setup", "Admin setup checklist")
    .addTag("FinOps", "Cost allocation and cloud spend management")
    .addTag("Environment Requests", "Developer self-service environment requests")
    .addTag("Traces", "OTLP trace ingestion")
    .build();
}
```

Note: the `require("../../../package.json")` path resolves from `apps/api/src/common/swagger/` → `apps/api/package.json`.

- [ ] **Step 2: Update `main.ts` to use `createSwaggerConfig()`**

Replace the inline `DocumentBuilder` chain in `apps/api/src/main.ts` (lines 157-226) with the imported function.

Old code (lines 157-226):
```typescript
  const config = new DocumentBuilder()
    .setTitle("Farm API")
    .setDescription("The Farm platform API documentation")
    .setVersion(version as string)
    .addServer("/api/v1", "Versioned API (current)")
    .addServer("/api", "Deprecated alias (redirects to /api/v1)")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", in: "header", name: "x-ingest-token" },
      "IacIngestToken",
    )
    .addTag("Health", "Application health and readiness probes")
    // ... (all 40+ tags)
    .build();
```

New code:
```typescript
  import { createSwaggerConfig } from "./common/swagger/swagger-config";

  // ... inside bootstrap()
  const config = createSwaggerConfig();
```

Also remove the unused `version` import from line 14 and the `DocumentBuilder` import.

Old imports to remove:
- `import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";` → `import { SwaggerModule } from "@nestjs/swagger";`
- Remove the `const { version } = require("../package.json");` line (entirely)

- [ ] **Step 3: Compile and verify**

Run: `npm run build -w apps/api`
Expected: exit 0, no errors

Run: `npx jest --passWithNoTests apps/api/src/common/swagger/swagger-config.spec.ts 2>&1 || true`
(No spec exists yet — we expect "no tests found" or similar, not a compilation error)

- [ ] **Step 4: Verify main.ts still works**

The `bootstrap()` function should now call `createSwaggerConfig()` instead of building inline. The rest of the function (Swagger UI setup with basic auth, `app.listen()`) stays unchanged.
Verify by reading the file at `apps/api/src/main.ts:155` — should show `const config = createSwaggerConfig();` and the `documentFactory` line unchanged.

---

### Task 2: Create generator script + npm script

**Files:**
- Create: `apps/api/tsconfig.scripts.json`
- Create: `apps/api/scripts/generate-openapi.ts`
- Modify: `apps/api/package.json` (add `openapi:generate` script)

- [ ] **Step 1: Create `tsconfig.scripts.json`**

Write `apps/api/tsconfig.scripts.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node"
  },
  "include": ["scripts/**/*.ts", "src/**/*.ts"]
}
```

This extends the main tsconfig but overrides `module` to `commonjs` so `ts-node` can run the script without ESM complications. Also includes `src/**/*.ts` so NestJS module imports resolve.

- [ ] **Step 2: Create generator script**

Write `apps/api/scripts/generate-openapi.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "../src/app.module";
import { createSwaggerConfig } from "../src/common/swagger/swagger-config";

async function generate(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.join(__dirname, "..", "openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf-8");
  console.log(`openapi.json written to ${outputPath}`);

  await app.close();
}

void generate().catch((err: unknown) => {
  console.error("Failed to generate openapi.json", err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm script**

In `apps/api/package.json`, add to the `"scripts"` object (alphabetically, after the existing scripts):

```json
    "openapi:generate": "ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/generate-openapi.ts"
```

- [ ] **Step 4: Run generator to produce initial committed spec**

Run (from workspace root):
```bash
npm run openapi:generate -w apps/api
```

Expected: command exits 0, `apps/api/openapi.json` is now a real spec file with populated `paths`, `components`, etc. (not the 11-line placeholder).

---

### Task 3: Replace CI `openapi-snapshot` with `openapi-diff`

**Files:**
- Modify: `.github/workflows/ci.yml:98-192`

Replace the entire `openapi-snapshot` job (lines 98-192) with a simpler `openapi-diff` job.

Old (lines 98-192):
```yaml
  openapi-snapshot:
    name: OpenAPI snapshot
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [api]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: farm
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-monorepo
        with:
          compile-types: 'false'
      - name: Build API
        run: npm run build -w apps/api
      - name: Generate ephemeral JWT secret
        id: secrets
        run: echo "jwt=$(openssl rand -hex 32)" >> $GITHUB_OUTPUT
      - name: Run migrations
        run: npm run migration:run -w apps/api
        env:
          DATABASE_TYPE: postgres
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: password
          DATABASE_NAME: farm
          DATABASE_SYNC: "false"
          JWT_SECRET: ${{ steps.secrets.outputs.jwt }}
          NODE_ENV: test
      - name: Start API server
        run: node apps/api/dist/main.js &
        env:
          DATABASE_TYPE: postgres
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: password
          DATABASE_NAME: farm
          DATABASE_SYNC: "false"
          JWT_SECRET: ${{ steps.secrets.outputs.jwt }}
          NODE_ENV: test
          PORT: 3000
          SWAGGER_USER: farm-ci-snapshot
          SWAGGER_PASSWORD: farm-ci-snapshot
      - name: Wait for API to be ready
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
              echo "API is ready after ${i}s"
              exit 0
            fi
            echo "Waiting for API... (attempt ${i}/30)"
            sleep 1
          done
          echo "::error::API did not become ready within 30 seconds"
          exit 1
      - name: Download OpenAPI spec
        run: |
          curl -sf \
            -u farm-ci-snapshot:farm-ci-snapshot \
            http://localhost:3000/api/docs-json \
            -o openapi-snapshot.json
          echo "OpenAPI spec downloaded ($(wc -c < openapi-snapshot.json) bytes)"
      - name: Upload OpenAPI spec artifact
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: openapi-spec
          path: openapi-snapshot.json
          retention-days: 30
```

Replace with:
```yaml
  openapi-diff:
    name: OpenAPI contract drift gate
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: farm
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3
        with:
          persist-credentials: false
      - uses: ./.github/actions/setup-monorepo
        with:
          compile-types: 'false'
      - name: Generate ephemeral JWT secret
        id: secrets
        run: echo "jwt=$(openssl rand -hex 32)" >> $GITHUB_OUTPUT
      - name: Generate OpenAPI spec
        run: npm run openapi:generate -w apps/api
        env:
          DATABASE_TYPE: postgres
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: password
          DATABASE_NAME: farm
          JWT_SECRET: ${{ steps.secrets.outputs.jwt }}
          NODE_ENV: test
      - name: Check for contract drift
        run: git diff --exit-code apps/api/openapi.json
      - name: Upload OpenAPI spec as artifact
        if: success()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: openapi-spec
          path: apps/api/openapi.json
          retention-days: 30
```

This removes:
- The build + migration + start server + wait + curl download steps (replaced by generator script)
- The `needs: [api]` dependency (new job runs in parallel)
- No `SWAGGER_USER/PASSWORD` env vars needed (no HTTP boot)

- [ ] **Step 2: Update ROADMAP.md**

Mark E-159 as `DONE` and Phase 55 as `DONE` (if no remaining stories).

---

### Verification

- [ ] **Task 1 verified:** `npm run build -w apps/api` compiles cleanly, Swagger UI still renders at `/api/docs`
- [ ] **Task 2 verified:** `npm run openapi:generate -w apps/api` produces populated `apps/api/openapi.json` with `paths` and `components`
- [ ] **Task 2 verified:** Re-running the generator produces byte-identical output (no drift between runs)
- [ ] **Task 3 verified:** CI job passes when `openapi.json` matches generated output, fails when it's stale
