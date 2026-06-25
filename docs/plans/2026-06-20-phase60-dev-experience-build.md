# Phase 60: Dev Experience & Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ESLint `no-explicit-any` (11 occurrences in 4 files) and modernize build output from CommonJS to ESM.

**Architecture:** Two independent epics — ESLint config hardening and ESM build migration. ESM depends on fixing `require()`/`__dirname` first.

**Tech Stack:** TypeScript 5.x, NestJS 11, ESLint flat config, TypeORM with migration runner

---

## Task 1: Enable no-explicit-any as warn, audit existing usage

**Files:**
- Modify: `apps/api/eslint.config.mjs`

- [ ] **Step 1: Change rule from 'off' to 'warn'**

In `apps/api/eslint.config.mjs`, find the line where `no-explicit-any` is set to `'off'` and change it to `'warn'`:

```js
// Before:  '@typescript-eslint/no-explicit-any': 'off',
// After:
'@typescript-eslint/no-explicit-any': 'warn',
```

- [ ] **Step 2: Run lint to see current any usage count**

Run: `npm run lint --workspace=apps/api 2>&1 | grep "no-explicit-any"`

Expected output: Shows 11 warnings with file/line locations across 4 files

- [ ] **Step 3: Commit**

```bash
git add apps/api/eslint.config.mjs
git commit -m "feat: enable @typescript-eslint/no-explicit-any as warn"
```

---

## Task 2: Fix http-circuit-breaker.service.ts (8 occurrences)

**Files:**
- Modify: `apps/api/src/common/http/http-circuit-breaker.service.ts`

- [ ] **Step 1: Read current file to understand generic signatures**

Run: `head -80 apps/api/src/common/http/http-circuit-breaker.service.ts`

The file uses `T = any` as default generic on `get`, `post`, `put`, `patch`, `delete` methods, and `data?: any` on request body params.

- [ ] **Step 2: Replace all `T = any` with `T = unknown`**

In `http-circuit-breaker.service.ts`, replace each method signature. There are 5 methods with generic defaults:

```typescript
// Before:
async get<T = any>(
  url: string,
// After:
async get<T = unknown>(
  url: string,
```

Apply the same change to `post<T = unknown>`, `put<T = unknown>`, `patch<T = unknown>`, `delete<T = unknown>`.

- [ ] **Step 3: Replace `data?: any` with `data?: unknown` on all 4 methods**

```typescript
// Before:
async post<T = unknown>(
  url: string,
  data?: any,
// After:
async post<T = unknown>(
  url: string,
  data?: unknown,
```

Apply to `post`, `put`, `patch` methods (the `delete` method doesn't have data param — remove if it does).

- [ ] **Step 4: Run lint to verify warnings dropped by 8**

Run: `npm run lint --workspace=apps/api 2>&1 | grep "no-explicit-any"`

Expected: Now shows ~3 warnings (only remaining in 3 files)

- [ ] **Step 5: Run unit tests to verify no breakage**

Run: `npm run test --workspace=apps/api -- --testPathPattern="http-circuit-breaker"`

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/http/http-circuit-breaker.service.ts
git commit -m "fix: replace T = any with T = unknown in HttpCircuitBreakerService"
```

---

## Task 3: Fix local.strategy.ts (1 occurrence)

**Files:**
- Modify: `apps/api/src/modules/auth/strategies/local.strategy.ts`

- [ ] **Step 1: Read file to see Promise<any> usage**

Run: `head -40 apps/api/src/modules/auth/strategies/local.strategy.ts`

The `validate()` method returns `Promise<any>` but should return `Promise<User>` (the User entity).

- [ ] **Step 2: Check User entity type exists**

Run: `rg "export class User" apps/api/src/modules --include="*.ts" --max-count 1`

Expected: User entity found at `modules/auth/entities/user.entity.ts` or similar

- [ ] **Step 3: Replace `Promise<any>` with `Promise<User>`**

Add the User import (if not already imported) and change the return type:

```typescript
// At top of file, add if not present:
import { User } from "../entities/user.entity";

// Line 22:
// Before:
async validate(username: string, password: string): Promise<any> {
// After:
async validate(username: string, password: string): Promise<User | null> {
```

- [ ] **Step 4: Run lint to verify warning dropped by 1**

Run: `npm run lint --workspace=apps/api 2>&1 | grep "no-explicit-any"`

Expected: Shows ~2 warnings (component.entity.ts and plugin.interface.ts)

- [ ] **Step 5: Run auth-related tests to verify no breakage**

Run: `npm run test --workspace=apps/api -- --testPathPattern="local.strategy|auth" 2>&1 | tail -5`

Expected: Tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/strategies/local.strategy.ts
git commit -m "fix: replace Promise<any> with Promise<User> in local.strategy"
```

---

## Task 4: Fix component.entity.ts (1 occurrence)

**Files:**
- Modify: `apps/api/src/modules/catalog/entities/component.entity.ts`

- [ ] **Step 1: Read the entity around line 201**

Run: `sed -n '190,210p' apps/api/src/modules/catalog/entities/component.entity.ts`

The field `team: any;` is a `@ManyToOne("Team")` relation typed as `any` to avoid circular dependency.

- [ ] **Step 2: Check if Team entity import exists**

Run: `head -30 apps/api/src/modules/catalog/entities/component.entity.ts`

Check if `Team` is already imported. If so, replace `any` with `Team`. If not, add a type-only import:

```typescript
// Add import if not present:
import type { Team } from "../../teams/entities/team.entity" with { type: "type" };
// Or if circular dep is a real issue, use a forward reference:
import { Team } from "../../teams/entities/team.entity";

// Line 201:
// Before:
  @ManyToOne("Team")
  team: any;
// After:
  @ManyToOne(() => Team)
  team: Team;
```

- [ ] **Step 3: Check if import causes circular dependency**

Run: `tsc --noEmit -p apps/api/tsconfig.json 2>&1 | head -10`

Expected: Either compiles cleanly or shows a circular import error. If circular, use:

```typescript
import { Team } from "../../teams/entities/team.entity";
// Replace @ManyToOne("Team") with @ManyToOne(() => Team, { lazy: true }) if needed
```

- [ ] **Step 4: Run lint to verify warning dropped by 1**

Run: `npm run lint --workspace=apps/api 2>&1 | grep "no-explicit-any"`

Expected: Shows ~1 warning (plugin.interface.ts only)

- [ ] **Step 5: Run catalog module tests**

Run: `npm run test --workspace=apps/api -- --testPathPattern="catalog" 2>&1 | tail -5`

Expected: Tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/catalog/entities/component.entity.ts
git commit -m "fix: replace team: any with typed Team relation"
```

---

## Task 5: Fix plugin.interface.ts (1 occurrence)

**Files:**
- Modify: `apps/api/src/modules/plugin-manager/interfaces/plugin.interface.ts`

- [ ] **Step 1: Read the interface around line 119**

Run: `sed -n '115,125p' apps/api/src/modules/plugin-manager/interfaces/plugin.interface.ts`

The field `module: Type<any>` accepts any NestJS module type.

- [ ] **Step 2: Replace `Type<any>` with `Type<unknown>`**

```typescript
// Before:
  module: Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;
// After:
  module: Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference;
```

- [ ] **Step 3: Run lint to verify zero warnings**

Run: `npm run lint --workspace=apps/api 2>&1 | grep "no-explicit-any"`

Expected: No output (zero warnings for this rule)

- [ ] **Step 4: Run plugin-manager tests**

Run: `npm run test --workspace=apps/api -- --testPathPattern="plugin" 2>&1 | tail -5`

Expected: Tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/plugin-manager/interfaces/plugin.interface.ts
git commit -m "fix: replace Type<any> with Type<unknown> in PluginInterface"
```

---

## Task 6: Promote no-explicit-any from warn to error

**Files:**
- Modify: `apps/api/eslint.config.mjs`

- [ ] **Step 1: Change 'warn' to 'error'**

```js
// Before:
'@typescript-eslint/no-explicit-any': 'warn',
// After:
'@typescript-eslint/no-explicit-any': 'error',
```

- [ ] **Step 2: Run full lint to confirm zero errors**

Run: `npm run lint --workspace=apps/api`

Expected: No errors, lint passes cleanly

- [ ] **Step 3: Commit**

```bash
git add apps/api/eslint.config.mjs
git commit -m "feat: promote no-explicit-any from warn to error (all fixes complete)"
```

---

## Task 7: Replace require(package.json) with createRequire

**Files:**
- Modify: `apps/api/src/common/swagger/swagger-config.ts`
- Modify: `apps/api/src/config/configuration.ts`

- [ ] **Step 1: Fix swagger-config.ts**

```typescript
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../../../package.json") as { version: string };
```

- [ ] **Step 2: Fix configuration.ts**

```typescript
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };
```

- [ ] **Step 3: Run tests for both modules**

Run: `npm run test --workspace=apps/api -- --testPathPattern="swagger-config|configuration"`

Expected: Tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/swagger/swagger-config.ts apps/api/src/config/configuration.ts
git commit -m "refactor: replace require(package.json) with createRequire"
```

---

## Task 8: Replace __dirname with import.meta.url equivalents

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/common/email/email.service.ts`
- Modify: `apps/api/src/modules/plugin-manager/services/plugin-validator.service.ts`
- Modify: `apps/api/src/database/seeds/seed.data-source.ts`

- [ ] **Step 1: Fix app.module.ts migration path**

```typescript
// At top of file, add import:
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usage at line ~131:
migrations: [join(__dirname, "migrations", "*.{ts,js}")],
```

- [ ] **Step 2: Fix email.service.ts template path**

```typescript
// At top of file:
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usage at line ~106:
this.templateDir = join(__dirname, "templates");
```

- [ ] **Step 3: Fix plugin-validator.service.ts**

```typescript
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usage at line ~37:
const pkgPath = resolve(__dirname, "../../../../package.json");
```

- [ ] **Step 4: Fix seed.data-source.ts**

```typescript
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usage:
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../../../../.env") });
```

- [ ] **Step 5: Verify the fix compiles**

Run: `npx tsc --noEmit -p apps/api/tsconfig.json 2>&1 | head -10`

Expected: No errors

- [ ] **Step 6: Run tests for all affected modules**

Run: `npm run test --workspace=apps/api -- --testPathPattern="email|plugin|seed" 2>&1 | tail -10`

Expected: Tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/common/email/email.service.ts apps/api/src/modules/plugin-manager/services/plugin-validator.service.ts apps/api/src/database/seeds/seed.data-source.ts
git commit -m "refactor: replace __dirname with import.meta.url + fileURLToPath"
```

---

## Task 9: Convert tsconfig.build.json to ESM output

**Files:**
- Modify: `apps/api/tsconfig.build.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add `"type": "module"` to package.json**

```json
// In apps/api/package.json, add:
"type": "module",
```

- [ ] **Step 2: Update tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "test", "dist", "web", "**/*spec.ts"]
}
```

- [ ] **Step 3: Update tsconfig.json to fully specify ESM**

No changes needed — it already uses `"module": "nodenext"` and `"moduleResolution": "nodenext"`. Verify the eslint config's `sourceType`:

- [ ] **Step 4: Update eslint config to use ESM sourceType**

In `apps/api/eslint.config.mjs`:

```js
// Before:
sourceType: 'commonjs',
// After:
sourceType: 'module',
```

- [ ] **Step 5: Build the project**

Run: `npm run build --workspace=apps/api`

Expected: Build succeeds, output in `apps/api/dist/`

- [ ] **Step 6: Run all unit tests**

Run: `npm run test --workspace=apps/api 2>&1 | tail -10`

Expected: All tests pass

- [ ] **Step 7: Run lint**

Run: `npm run lint --workspace=apps/api`

Expected: Lint passes

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.build.json apps/api/eslint.config.mjs
git commit -m "feat: migrate build output from CommonJS to ESM (module: nodenext)"
```

---

## Task 10: Handle CJS-only dependencies with createRequire

**Files:**
- Modify: `apps/api/src/modules/auth/strategies/ldap.strategy.ts`
- Modify: `apps/api/src/modules/observability/pyroscope-init.service.ts`

- [ ] **Step 1: Fix ldap.strategy.ts**

```typescript
// Replace require("passport-ldapauth") with createRequire:
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const LdapAuthStrategy = require("passport-ldapauth");
```

- [ ] **Step 2: Fix pyroscope-init.service.ts**

```typescript
// Replace dynamic require with createRequire:
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// In the try block where it used require("@pyroscope/nodejs"):
let PyroscopeNodejs: any;
try {
  PyroscopeNodejs = require("@pyroscope/nodejs");
} catch {
  this.logger.warn("@pyroscope/nodejs not available, profiling disabled");
  return;
}
```

- [ ] **Step 3: Build the project to verify**

Run: `npm run build --workspace=apps/api 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 4: Run auth and observability tests**

Run: `npm run test --workspace=apps/api -- --testPathPattern="ldap|pyroscope" 2>&1 | tail -5`

Expected: Tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/strategies/ldap.strategy.ts apps/api/src/modules/observability/pyroscope-init.service.ts
git commit -m "fix: use createRequire for CJS-only deps (passport-ldapauth, @pyroscope/nodejs)"
```

---

## Task 11: Full pipeline verification

**Files:** None (verification only)

- [ ] **Step 1: Run full project check**

Run: `make check`

Expected: All checks pass — format, lint, unit tests, e2e

- [ ] **Step 2: Verify production build**

Run: `npm run build --workspace=apps/api`

Expected: Build succeeds with ESM output

- [ ] **Step 3: Update ROADMAP.md status**

Change Phase 60 row from `TODO` to `IN PROGRESS`, then after verification to `DONE`.

```bash
git add ROADMAP.md
git commit -m "docs: mark Phase 60 (Dev Experience & Build) as done"
```
