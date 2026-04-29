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
| Phase 37: User Signup & Org Invitation | 1 | 5 | unreleased | `DONE` |
| Phase 33: UX/UI Quality and Accessibility | 1 | 6 | unreleased | `DONE` |

---

## Phase 33: UX/UI Quality and Accessibility `DONE`

### FARM-E79: UX/UI Quality and Accessibility `DONE`

> Systematic improvements to the Farm Web interface derived from a full UX/UI audit. The audit identified six areas requiring work: form validation feedback, loading state consistency, empty state standardization, accessibility hardening, mutation feedback and recovery, and Storybook coverage. All changes are purely frontend and do not require API modifications. The guiding principle is to fix patterns across the entire application uniformly rather than fixing individual pages in isolation.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S341 | Story | Form UX improvements — real-time inline validation, unsaved-changes detection, and scroll-to-first-error on submit failure across all React Hook Form forms | `DONE` |
| FARM-S342 | Story | Loading state standardization — branded page-level Suspense fallback, consistent row-count-aware skeletons on all list/table pages, and pending states on mutation buttons and confirmation dialogs | `DONE` |
| FARM-S343 | Story | Empty state standardization — replace all ad-hoc "No data" strings and raw `<TableCell>` fallbacks with the `EmptyState` component; add action CTAs where the user can immediately address the empty state | `DONE` |
| FARM-S344 | Story | Accessibility hardening — `aria-describedby` linking form errors to inputs, meaningful alt text and `aria-label` on icon-only buttons, minimum 44×44 px touch targets, and `<abbr>` for metric abbreviations | `DONE` |
| FARM-S345 | Story | Feedback and recovery improvements — loading spinner in confirmation dialogs during async actions, Sonner toast with a 5-second undo action for destructive operations, and distinct pending/success/error mutation phases | `DONE` |
| FARM-S346 | Story | Storybook coverage expansion — stories for all shared components (`EmptyState`, `ConfirmDialog`, `PageHeader`) and new UX patterns (form validation states, loading skeletons, empty states) | `DONE` |

#### FARM-S341 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T378 | Task | Real-time inline validation: configure React Hook Form with `mode: "onChange"` across all forms (login, team edit, alerting rule, component create, SLO create, pipeline create); wrap each field error in `<p role="alert" aria-live="polite">` so screen readers announce errors without a page reload; unit tests | `DONE` |
| FARM-T379 | Task | `useUnsavedChanges(isDirty: boolean)` hook: sets `window.onbeforeunload` when `isDirty` is true and clears it on submit or unmount; renders an "Unsaved changes" badge next to the submit button when `formState.isDirty`; applied to team edit, component edit, and alerting rule forms; unit tests | `DONE` |
| FARM-T380 | Task | Scroll-to-first-error on submit: after a failed form submission identify the first invalid field using `Object.keys(formState.errors)[0]`, call `scrollIntoView({ behavior: "smooth", block: "center" })` on the corresponding input ref; applied to all multi-section forms; unit tests | `DONE` |

##### FARM-T379 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST396 | Sub-task | Unit test: `useUnsavedChanges(true)` → `window.onbeforeunload` is set; `useUnsavedChanges(false)` → `window.onbeforeunload` is null | `DONE` |

#### FARM-S342 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T381 | Task | `AppLoadingFallback` component: replaces the generic `<Skeleton className="h-full w-full" />` in `app/(protected)/layout.tsx` Suspense fallback; renders the Farm logo centered with a subtle pulse animation to provide brand context during navigation; unit tests | `DONE` |
| FARM-T382 | Task | Standardize data-fetching skeletons: audit all pages that expose `isLoading`/`isPending` from React Query; ensure every list and table renders a skeleton with the same column structure as the real data (default 5 rows); affected pages: teams, environments, SLO list, alerting rules, pipelines, incidents, registry vulnerabilities panel; unit tests | `DONE` |
| FARM-T383 | Task | Mutation pending states: add `isPending: boolean` prop to `ConfirmDialog`; disable both action buttons and replace confirm label with "Processing…" and a `<Loader2 className="animate-spin" />` icon while pending; all standalone delete/trigger buttons set `disabled` and show a spinner during the mutation; unit tests | `DONE` |

##### FARM-T383 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST397 | Sub-task | Unit test: `ConfirmDialog` with `isPending=true` → confirm button is disabled and renders spinner; cancel button is also disabled; neither `onConfirm` nor `onCancel` fire on click | `DONE` |

#### FARM-S343 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T384 | Task | Replace ad-hoc empty state patterns: audit every page for raw "No X found" strings inside `<TableCell colSpan>` or bare `<div>` elements; replace with `<EmptyState icon title description />` component; affected: component CRD resources tab, incidents list, pipelines list, environments list, SLO list, registry vulnerabilities panel, gateway routes; unit tests | `DONE` |
| FARM-T385 | Task | Add action CTAs to empty states: where the user can immediately act, pass a primary button as `children` of `<EmptyState>`; examples — "Create SLO" in the SLO tab, "Add Alerting Rule" in the alerting rules page, "Add Pipeline" in the pipelines page; each CTA opens the existing create form/dialog; unit tests | `DONE` |

#### FARM-S344 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T386 | Task | Form error accessibility: for every React Hook Form `<Input>` with a `fieldState.error`, set `aria-invalid="true"` and `aria-describedby="<fieldName>-error"` on the input element; give the companion error `<p>` the matching `id="<fieldName>-error"`; affects all forms in the application; unit tests | `DONE` |
| FARM-T387 | Task | Touch target sizing: audit all interactive elements on mobile-relevant views; enforce minimum `min-h-11 min-w-11` (44 px) on icon-only buttons, navigation links, and table row action menus; update the `icon-sm` and `icon-xs` button variants in `components/ui/button.tsx` to meet the 44 px minimum; unit tests | `DONE` |
| FARM-T388 | Task | Alt text and icon accessibility: add descriptive `aria-label` to every icon-only button (e.g. edit, delete, refresh) that currently relies solely on `aria-hidden="true"` on the inner icon; add `alt` attributes to repository avatar images and provider logos; wrap metric abbreviations ("RPS", "P99", "P50", "P95") in `<abbr title="…">` with full expansion; unit tests | `DONE` |

##### FARM-T386 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST398 | Sub-task | Unit test: form input rendered with `fieldState.error` set → `aria-invalid="true"` present and `aria-describedby` value matches the `id` of the sibling error `<p>` element | `DONE` |

#### FARM-S345 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T389 | Task | Confirmation dialog loading state: wire `isPending` from the parent mutation into `ConfirmDialog` for all destructive action dialogs (delete team, delete component, remove team member, delete alerting rule, delete SLO, delete pipeline); validate that no dialog can be dismissed while an action is in flight; unit tests | `DONE` |
| FARM-T390 | Task | `useUndoableDelete(deleteFn, restoreFn, options?)` hook: calls `deleteFn` immediately on invoke; shows a Sonner toast with an "Undo" action button; if user clicks Undo within the 5-second window, calls `restoreFn` and dismisses the toast; after 5 seconds, the undo window closes silently; implement for team member removal and component deletion as the initial rollout; unit tests | `DONE` |

##### FARM-T390 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST399 | Sub-task | Unit test: `useUndoableDelete` — `deleteFn` called immediately on invoke; `restoreFn` called when `undo()` is triggered within window; `restoreFn` NOT called when window expires without undo action | `DONE` |

#### FARM-S346 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T391 | Task | Storybook stories for shared components: `EmptyState` (no CTA, with CTA, with icon, compact variant), `ConfirmDialog` (default, destructive, pending state), `PageHeader` (with breadcrumbs, without breadcrumbs, with action slot), data table (loading skeleton state, populated state, empty state) | `DONE` |
| FARM-T392 | Task | Storybook stories for new UX patterns: form field with inline validation error (valid, invalid, submitting states), unsaved-changes badge, `AppLoadingFallback` branded skeleton; documents the patterns from FARM-S341 and FARM-S342 so new contributors follow the established approach | `DONE` |

---

## Phase 34: Dead Code Elimination `TODO`

### FARM-E80: Knip Dead Code and Dependency Hygiene `TODO`

> Farm is a monorepo with 665+ source files across two workspaces (`apps/api` and `apps/web`). As each phase ships, unreferenced exports, orphaned components, and stale `package.json` entries accumulate. This Epic introduces [Knip](https://knip.dev) — a static analysis tool that finds unused files, unused exports, and unused dependencies at the workspace level, complementing ESLint which only sees within-file scope. The cleanup is split by workspace because NestJS (DI-based, decorator-heavy) requires a different ignore-rule strategy than Next.js. After cleanup, a CI step prevents regressions by failing on any new dead code introduced in a PR.

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-S347 | Story | Knip baseline setup — install Knip as a root devDependency, create a monorepo-aware `knip.config.ts` with workspace entries, Next.js plugin for `apps/web`, and NestJS-aware ignore rules for `apps/api`; capture initial dead-code report | `TODO` |
| FARM-S348 | Story | Web workspace cleanup — resolve all Knip findings in `apps/web`: unused React components, hooks, utility functions, and unused `package.json` dependencies; full Vitest and Playwright suites must pass after each removal batch | `TODO` |
| FARM-S349 | Story | API workspace cleanup — resolve all Knip findings in `apps/api` after NestJS ignore rules are applied: unused DTOs, enums, and utility exports; unused `package.json` dependencies; all unit and e2e tests must pass | `TODO` |
| FARM-S350 | Story | CI enforcement — add a Knip step to the GitHub Actions workflows in report-only mode first; escalate to hard-fail after the initial cleanup lands; add `knip` to `make check` for local developer feedback | `TODO` |

#### FARM-S347 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T393 | Task | Install `knip` as a root devDependency; create `knip.config.ts` with workspace entries for `apps/api` and `apps/web`; enable the Knip `next` plugin for the web workspace; run `knip --reporter json` to capture the initial dead-code baseline and commit it as `knip-baseline.json` | `TODO` |
| FARM-T394 | Task | Configure NestJS-aware ignore rules for `apps/api`: exclude DI-registered classes (modules, providers, guards, interceptors, pipes declared in `@Module()` arrays), TypeORM entities and migration files loaded dynamically, decorator factories, and the `main.ts` entry point from unused-export checks; document each rule with an inline comment explaining why it is needed | `TODO` |

##### FARM-T393 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST406 | Sub-task | Verify `knip --reporter compact` exits with a known, documented count on the baseline run after all structural ignores are applied; this count becomes the acceptance threshold for FARM-S348 and FARM-S349 | `TODO` |
| FARM-ST407 | Sub-task | Add a `"knip"` script to the root `package.json` (`knip --reporter compact`) and a `"knip:ci"` variant that writes findings to `knip-report.json` for CI artifact upload | `TODO` |

#### FARM-S348 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T395 | Task | Remove unused React components, hooks, and utility functions found in `apps/web` by Knip; run `npx vitest run` after each removal batch to confirm no regressions; update barrel exports and re-exports as needed | `TODO` |
| FARM-T396 | Task | Remove unused `package.json` dependencies and devDependencies in `apps/web` identified by Knip; run `npm install` and `npm run build` after removal; full Vitest suite and Playwright e2e suite must pass | `TODO` |

#### FARM-S349 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T397 | Task | Remove unused TypeScript exports in `apps/api` (DTOs, enums, utility functions) after NestJS ignore rules are applied; run `npm run test` and `npm run test:e2e` to confirm no regressions | `TODO` |
| FARM-T398 | Task | Remove unused `package.json` dependencies in `apps/api` identified by Knip; run `npm run build` to confirm a clean compilation; all unit and e2e tests must pass | `TODO` |

#### FARM-S350 Tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-T399 | Task | Add `knip --reporter compact --no-exit-code` step to both `ci.yml` and `web-ci.yml`; upload the JSON report as a workflow artifact; step never blocks the build in this first iteration | `TODO` |
| FARM-T400 | Task | After FARM-S348 and FARM-S349 are merged and the CI baseline is clean, remove `--no-exit-code` from both workflow steps so any new dead code introduced in a PR causes the workflow to fail; update `CONTRIBUTING.md` with Knip usage guidance (how to add an ignore rule, how to verify locally before opening a PR) | `TODO` |

##### FARM-T400 Sub-tasks

| ID | Type | Title | Status |
|----|------|-------|--------|
| FARM-ST408 | Sub-task | Verify the hard-fail gate works: introduce a deliberately unused export in a test branch, confirm Knip exits with code 1 and the CI workflow is blocked before enabling the gate on main | `TODO` |
| FARM-ST409 | Sub-task | Add `knip` to the `check` target in the root `Makefile` so developers receive Knip feedback alongside lint, format, and tests in a single `make check` run | `TODO` |

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
| Phase 34: Dead Code Elimination | 1 | 4 | `TODO` |
| Phase 35: Elasticsearch Index Visibility | 1 | 4 | `DONE` |
| Phase 36: Permission Scope Test Fixtures | 1 | 3 | `DONE` |
| Phase 37: User Signup & Org Invitation | 1 | 5 | `DONE` |
| **Total** | **87** | **352** | |
