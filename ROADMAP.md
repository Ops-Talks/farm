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

## Summary

All 59 phases are complete. Detailed per-story breakdowns have been moved to git history (commit messages and release notes).

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
| Phase 34: Dead Code Elimination | 1 | 4 | `DONE` |
| Phase 35: Elasticsearch Index Visibility | 1 | 4 | `DONE` |
| Phase 36: Permission Scope Test Fixtures | 1 | 3 | `DONE` |
| Phase 37: User Signup & Org Invitation | 1 | 5 | `DONE` |
| Phase 38: LDAP Client Modernization | 1 | 3 | `DONE` |
| Phase 39: Service Maturity Scorecards | 1 | 6 | `DONE` |
| Phase 40: Observability 3.0 — Full-Stack Hardening | 7 | 23 | `DONE` |
| Phase 41: Swagger/OpenAPI Hardening | 4 | 14 | `DONE` |
| Phase 42: Kubernetes Deployment — Helm Chart | 6 | 24 | `DONE` |
| Phase 43: CI/CD Pipeline Orchestration | 5 | 16 | `DONE` |
| Phase 44: Multi-tenancy Hardening | 5 | 20 | `DONE` |
| Phase 45: Organization Context Hardening | 3 | 10 | `DONE` |
| Phase 46: Granular RBAC | 3 | 12 | `DONE` |
| Phase 47: API Contract Stability | 2 | 7 | `DONE` |
| Phase 48: Platform Resilience | 3 | 10 | `DONE` |
| Phase 49: Dependency Modernization | 1 | 3 | `DONE` |
| Phase 50: Docker & Container Hardening | 4 | 11 | `DONE` |
| Phase 51: Helm Chart Hardening | 7 | 21 | `DONE` |
| Phase 52: Helm Observability Integration | 3 | 6 | `DONE` |
| Phase 53: Helm Chart Quality Remediation | 6 | 31 | `DONE` |
| Phase 54: Helm Chart Quality, Correctness & Publishing | 7 | 32 | `DONE` |
| Phase 55: Backend API Best-Practices Audit & Remediation | 5 | 19 | `DONE` |
| Phase 56: Admin User Registration | 2 | 9 | `DONE` |
| Phase 57: Development Guidelines Compliance | 1 | 8 | `DONE` |
| Phase 58: CI/CD Pipeline Fixes | 1 | 3 | `DONE` |
| Phase 59: Security Vulnerability Remediation | 4 | 25 | `DONE` |
| Phase 60: ESLint Strict Mode, Type Safety & Test Infrastructure | 2 | 5 | `DONE` |
| Phase 61: NestJS Code Quality | 3 | 12 | `DONE` |
| Phase 62: API Docs & DB Hygiene | 2 | 7 | `TODO` |
| Phase 63: Security & Validation Hardening | 2 | 11 | `TODO` |
| Phase 64: ESM Build & Import Modernization | 1 | 4 | `TODO` |
| Phase 65: Dependency Update Governance — TypeScript 7 Block | 1 | 3 | `DONE` |
| Phase 66: TypeScript 6 — Config Preparation | 1 | 3 | `DONE` |
| Phase 67: TypeScript 6 — Version Bump | 1 | 3 | `DONE` |
| Phase 68: TypeScript 6 — Deprecation Cleanup | 1 | 3 | `DONE` |
| **Total** | **189** | **736** | |

---

## Future

Phases 60-64 cover NestJS best-practices remediation identified in the 2026-06-20 architecture audit. Phase 60 completed (ESLint strict mode, 2 stories). Phase 64 (ESM Build) extracted from deferred portions of Phase 60. [Design spec](docs/specs/2026-06-20-nestjs-best-practices-remediation-design.md). [Phase 61 plan](docs/superpowers/plans/2026-06-25-phase61-nestjs-code-quality.md). [Phase 62 plan](docs/superpowers/plans/2026-06-26-phase62-api-docs-db-hygiene.md).

Phase 65 blocks the premature TypeScript 7 major bump (Dependabot #268). TS7 is the native Go rewrite ("Corsa") shipped as a preview: it removes `node`/`node10` module resolution (`TS5108`), does not support declaration emit (required by `@farm/types` and `apps/api`), and is rejected by `ts-jest` (peer `<7`) and `typescript-eslint` (peer `<6.1.0`). Blocked at the ecosystem level, not by our config. The Dependabot ignore rule only excludes `>=7.0.0` -- TypeScript 6.x still runs on the classic JS compiler (declaration emit, `ts-jest`, and `typescript-eslint` all support it up to `6.1.0`) and remains a viable future upgrade. [Phase 65 plan](docs/superpowers/plans/2026-07-13-typescript-7-block.md).

Phases 66-68 migrate the monorepo from TypeScript 5.x to TypeScript 6.0.x. TS6 removes deprecated `moduleResolution: "node10"/"node"` (used in three tsconfig files) and is supported by `ts-jest` (peer `<7`) and `typescript-eslint` (peer `<6.1.0`). The migration uses a config-first, version-bump-last approach: Phase 66 replaces deprecated module resolution settings, Phase 67 bumps the version, Phase 68 cleans up deprecation warnings. [Design spec](docs/specs/2026-07-14-typescript-6-migration-design.md). [Implementation plan](docs/plans/2026-07-14-typescript-6-migration.md).

_See git log and release notes for per-story implementation details._
