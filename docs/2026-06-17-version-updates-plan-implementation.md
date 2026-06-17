# Version Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all version/dependency issues in the Farm monorepo — rxjs duplicate (build-breaking), multer/opentelemetry/postcss/elliptic/esbuild advisories, Next.js middleware deprecation, lockfile SWC patching, and eslint fine-tuning.

**Architecture:** Three independent workstreams (apps/api, apps/web, shared/root) with no cross-dependencies. Each can be executed in parallel. The audit allowlist in `scripts/audit-actionable.mjs` already covers multer and opentelemetry — the main build fix is adding an rxjs override.

**Tech Stack:** NestJS 11, Next.js 16, rxjs 7.x, multer 2.x, @opentelemetry 0.219.x, Storybook 10, ESLint 10, TypeScript 5.9

---

### Task 1: Fix rxjs duplicate — add override in root package.json

**Files:**
- Modify: `package.json:37-75` (overrides section)
- Verify: `apps/api/node_modules/rxjs` (should be eliminated by deduping)
- Verify: `node_modules/rxjs/package.json` (version should become 7.8.2)

- [ ] **Step 1: Add `"rxjs": "7.8.2"` to root overrides**

Edit `package.json`, add inside the overrides object (maintain alphabetical order, before `"typeorm"` override):

```
    "rxjs": "7.8.2",
```

- [ ] **Step 2: Remove local rxjs copy and reinstall**

```bash
rm -rf apps/api/node_modules/rxjs
npm install
```

- [ ] **Step 3: Verify single rxjs version**

```bash
npm ls rxjs --all 2>&1 | grep rxjs | head -5
# Expected: all entries show "7.8.2", no second copy in apps/api/node_modules
```

- [ ] **Step 4: Run api build to verify 0 TS errors**

```bash
rm -rf apps/api/dist && npm run api:build
# Expected: no TypeScript errors, build completes successfully
```

- [ ] **Step 5: Run `make check` to verify full pipeline**

```bash
make check
# Expected: back-end passes (lint, test, e2e, build), front-end passes, knip OK
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix: pin rxjs to single version via override (7.8.2)

Root had rxjs@7.8.1 (hoisted from @nestjs/axios) while apps/api had
rxjs@7.8.2 locally, causing ~126 TS errors from structurally incompatible
Observable/Operator/Subscriber types. The override forces all workspaces
to use a single 7.8.2 copy.
"
```

---

### Task 2: Verify audit allowlist covers multer and opentelemetry

**Files:**
- Read: `scripts/audit-actionable.mjs:20-33`

- [ ] **Step 1: Confirm multer GHSA IDs are in UPSTREAM_UNFIXABLE**

The file already has (lines 28-32):
```
"GHSA-72gw-mp4g-v24j", // multer: DoS via deeply nested field names
"GHSA-3p4h-7m6x-2hcm", // multer: DoS via incomplete cleanup
"GHSA-xf7r-hgr6-v32p", // multer: DoS via malformed requests (CVE-2026-3304)
"GHSA-v52c-386h-88mc", // multer: DoS via malformed requests (CVE-2026-2359)
"GHSA-44fp-w29j-9vj5", // multer: DoS via memory leak (CVE-2025-47935)
```
Also confirm opentelemetry (line 27):
```
"GHSA-8988-4f7v-96qf", // @opentelemetry/core: Unbounded memory in W3C Baggage
```

- [ ] **Step 2: Verify audit script passes for api workspace**

```bash
node scripts/audit-actionable.mjs apps/api
# Expected: "No actionable high/critical vulnerabilities found in apps/api."
```

- [ ] **Step 3: Verify audit script passes for web workspace**

```bash
node scripts/audit-actionable.mjs apps/web
# Expected: "No actionable high/critical vulnerabilities found in apps/web."
```

Note: If any moderate advisories appear in the future (postcss, elliptic, esbuild), the audit-actionable script intentionally ignores them (only high/critical are checked). No action needed.

- [ ] **Step 4: No commit needed — allowlist was already current**

---

### Task 3: Fix Next.js middleware deprecation — rename to proxy

**Files:**
- Rename: `apps/web/src/middleware.ts` → `apps/web/src/proxy.ts`
- Rename: `apps/web/src/middleware.test.ts` → `apps/web/src/proxy.test.ts`

- [ ] **Step 1: Rename middleware.ts to proxy.ts and update named export**

```bash
mv apps/web/src/middleware.ts apps/web/src/proxy.ts
```

Edit `apps/web/src/proxy.ts`, change the exported function name from `middleware` to `proxy`:

```typescript
export function proxy(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  const upstreamUrl = `${UPSTREAM_BASE}${pathname}${search}`;
  return NextResponse.rewrite(new URL(upstreamUrl));
}
```

- [ ] **Step 2: Rename and update the test file**

```bash
mv apps/web/src/middleware.test.ts apps/web/src/proxy.test.ts
```

Read the file and update all `middleware` references to `proxy`.

- [ ] **Step 3: Build web to verify zero deprecation warnings**

```bash
npm run web:build 2>&1 | grep -i "middleware\|deprecat"
# Expected: no output (no middleware deprecation warnings)
```

- [ ] **Step 4: Run web tests**

```bash
npm run web:test
# Expected: all tests pass
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/proxy.ts apps/web/src/proxy.test.ts
git rm apps/web/src/middleware.ts apps/web/src/middleware.test.ts
git commit -m "fix: rename middleware to proxy per Next.js deprecation

Next.js 16 deprecated the 'middleware' file convention in favor of 'proxy'.
Renamed the file and updated the exported function name.
"
```

---

### Task 4: Fix lockfile SWC patching

**Files:**
- Modify: `package-lock.json` (regenerated by npm install)

- [ ] **Step 1: Regenerate lockfile**

```bash
npm install
```

- [ ] **Step 2: Verify SWC dependencies are in lockfile**

```bash
npm ls @next/swc-linux-x64-musl 2>&1
# Expected: shows the version (16.2.9) without missing dep warning
```

- [ ] **Step 3: Commit**

```bash
git add package-lock.json
git commit -m "chore: regenerate lockfile to include @next/swc deps

Prevents automatic lockfile patching during web build.
"
```

---

### Task 5: Re-evaluate typescript-eslint no-unsafe rules

**Files:**
- Read: `apps/api/eslint.config.mjs`

- [ ] **Step 1: Check current no-unsafe rule status**

Read `apps/api/eslint.config.mjs` and find the rules that were downgraded to warn in commit `5b5c5102`.

- [ ] **Step 2: Attempt to re-promote one rule to error**

Temporarily change one `no-unsafe-*` rule from `"warn"` to `"error"` and run lint:
```bash
npm run lint 2>&1 | head -20
```

If there are 0 violations, keep it as error. If violations exist, revert to warn and document how many.

- [ ] **Step 3: Commit adjustments (if any)**

```bash
git add apps/api/eslint.config.mjs
git commit -m "chore: re-promote typescript-eslint no-unsafe rules to error"
```

(If no changes, skip this step.)

---

### Task 6: Postcss/elliptic/esbuild advisories — verify and document

**Files:**
- Read: `scripts/audit-actionable.mjs`

- [ ] **Step 1: Check if postcss/elliptic/esbuild are high or critical**

```bash
npm audit --omit=dev 2>&1 | grep -E "postcss|elliptic|esbuild"
# If moderate only: no action needed (audit-actionable ignores moderate)
```

- [ ] **Step 2: If any become high/critical, add to allowlist**

Edit `scripts/audit-actionable.mjs` and add any new GHSA IDs to `UPSTREAM_UNFIXABLE` set with a comment explaining the dependency chain.

- [ ] **Step 3: Commit if changes were made**

---

### Task 7: Full verification

- [ ] **Step 1: Run complete `make check`**

```bash
make check
# Expected: all steps pass with 0 errors
```

- [ ] **Step 2: Final `npm ls rxjs` check**

```bash
npm ls rxjs 2>&1
# Expected: single version 7.8.2, no duplicates
```

- [ ] **Step 3: Final `npm audit` check for api**

```bash
node scripts/audit-actionable.mjs apps/api
# Expected: "No actionable high/critical vulnerabilities found"
```

- [ ] **Step 4: Final `npm audit` check for web**

```bash
node scripts/audit-actionable.mjs apps/web
# Expected: "No actionable high/critical vulnerabilities found"
```
