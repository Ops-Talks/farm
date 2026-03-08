# Farm Project - NEXT STEPS

This document outlines the roadmap for **Farm**, an open-source developer portal platform designed to serve Dev, Infra, Security, and Data teams. It is organized following Jira hierarchy: **EPIC > Story > Task > Sub-task**.

Each item uses a prefix code for traceability:

- `FARM-E##` -- Epic
- `FARM-S##` -- Story
- `FARM-T##` -- Task
- `FARM-ST##` -- Sub-task

Status legend: `[x]` Done | `[ ]` To Do | `[~]` In Progress

---

## Completed Work (Archived)

The following EPICs have been fully delivered and are kept here for historical reference.

<details>
<summary>Click to expand completed EPICs</summary>

### FARM-E01: Architectural Foundation

- [x] FARM-S01: Establish Common/Shared Layers (`src/common` with filters, interceptors, pipes, decorators)
- [x] FARM-S02: Configuration Management (`@nestjs/config` with Joi validation)
- [x] FARM-S03: Global Exception Filter (`AllExceptionsFilter`)
- [x] FARM-S04: Global Validation Pipe (`whitelist`, `forbidNonWhitelisted`, `transform`)
- [x] FARM-S05: Swagger Documentation (full `@ApiProperty()` coverage on DTOs and Entities)

### FARM-E02: Infrastructure and Dockerization

- [x] FARM-S06: Multi-stage Docker Builds (base, deps, test, build, production)
- [x] FARM-S07: Local Orchestration with Docker Compose (API + PostgreSQL)
- [x] FARM-S08: Container Healthchecks and dependency readiness
- [x] FARM-S09: Unified Makefile tooling (`up-docker`, `down-docker`, `healthcheck`, `test`, `lint`, `fmt`)
- [x] FARM-S10: Structured Logging (Winston with JSON in production, pretty in development)
- [x] FARM-S11: Advanced Terminus Healthchecks (DB, Memory Heap/RSS, Disk, Version)

### FARM-E03: Database and Persistence

- [x] FARM-S12: TypeORM + PostgreSQL integration
- [x] FARM-S13: Entity refactoring with TypeORM decorators
- [x] FARM-S14: Migration strategy (away from `synchronize: true`)
- [x] FARM-S15: Relationship modeling (Component dependencies via M2M join table)

### FARM-E04: Core Software Catalog

- [x] FARM-S16: YAML-driven catalog registration (`catalog-info.yaml`, Backstage-compatible)
- [x] FARM-S17: Component kinds (service, library, website, api, component, system, domain, resource)
- [x] FARM-S18: Discovery service (clone git repos, scan for YAML files)
- [x] FARM-S19: Dependency mapping between components (M2M `component_dependencies`)

### FARM-E05: Security and Authentication

- [x] FARM-S20: JWT authentication with Passport.js
- [x] FARM-S21: Role-Based Access Control (`@Roles()` decorator + `RolesGuard`)
- [x] FARM-S22: Rate limiting with `ThrottlerModule`

### FARM-E06: CI/CD Pipeline

- [x] FARM-S23: Docker-based testing (`make test-docker`)
- [x] FARM-S24: Automated lint/format/test in CI via GitHub Actions
- [x] FARM-S25: Codecov Test Analytics with `jest-junit` reporter

</details>

---

## FARM-E07: Multi-Team Catalog Expansion

**Goal:** Extend the component catalog beyond software development to serve Infrastructure, Security, and Data teams. Add new component kinds that model the assets each team manages, so every team sees their resources in the same portal.

**Current state:** The `ComponentKind` enum has 8 values (`service`, `library`, `website`, `api`, `component`, `system`, `domain`, `resource`). These cover Dev use cases well but do not explicitly model infrastructure primitives, data assets, or security constructs.

### FARM-S26: Infrastructure Component Kinds

**As an** Infra/SRE engineer, **I want** to register infrastructure primitives in the catalog, **so that** I have visibility into what infrastructure exists and how it relates to services.

- [x] FARM-T01: Add new values to `ComponentKind` enum
  - [x] FARM-ST01: Add `PIPELINE = "pipeline"` -- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
  - [x] FARM-ST02: Add `QUEUE = "queue"` -- Message queues and event buses (SQS, RabbitMQ, Kafka topics)
  - [x] FARM-ST03: Add `DATABASE = "database"` -- Database instances (RDS, Cloud SQL, self-hosted)
  - [x] FARM-ST04: Add `STORAGE = "storage"` -- Object storage buckets (S3, GCS, MinIO)
  - [x] FARM-ST05: Add `CLUSTER = "cluster"` -- Kubernetes clusters, ECS clusters, compute groups
  - [x] FARM-ST06: Add `NETWORK = "network"` -- VPCs, subnets, load balancers, DNS zones
- [x] FARM-T02: Update `CreateComponentDto` and `UpdateComponentDto` validation to accept new kinds
- [x] FARM-T03: Update Swagger documentation and enum descriptions
- [x] FARM-T04: Add unit tests for new enum values in catalog service
- [x] FARM-T05: Update `docs/developer-guide/architecture.md` with new kinds and their intended audiences

### FARM-S27: Data Team Component Kinds

**As a** Data engineer, **I want** to register datasets, ETL pipelines, and ML models in the catalog, **so that** data assets are discoverable and linked to the services that produce or consume them.

- [x] FARM-T06: Add new values to `ComponentKind` enum
  - [x] FARM-ST07: Add `DATASET = "dataset"` -- Tables, views, data lakes, feature stores
  - [x] FARM-ST08: Add `DATA_PIPELINE = "data-pipeline"` -- ETL/ELT workflows (Airflow DAGs, dbt jobs, Spark jobs)
  - [x] FARM-ST09: Add `ML_MODEL = "ml-model"` -- Trained ML models, inference endpoints
- [x] FARM-T07: Update `CreateComponentDto` and `UpdateComponentDto` validation
- [x] FARM-T08: Update Swagger documentation for data kinds
- [x] FARM-T09: Add unit tests for data kind values
- [x] FARM-T10: Document data catalog usage patterns in developer guide

### FARM-S28: Security Component Kinds

**As a** Security engineer, **I want** to register security-relevant resources like secrets vaults and policies, **so that** I can map which services depend on which security boundaries and track compliance.

- [x] FARM-T11: Add new values to `ComponentKind` enum
  - [x] FARM-ST10: Add `SECRET = "secret"` -- Secret managers, vaults (Vault, AWS Secrets Manager)
  - [x] FARM-ST11: Add `POLICY = "policy"` -- Security policies, OPA bundles, IAM policies
  - [x] FARM-ST12: Add `CERTIFICATE = "certificate"` -- TLS certificates, CA chains
- [x] FARM-T12: Update `CreateComponentDto` and `UpdateComponentDto` validation
- [x] FARM-T13: Update Swagger documentation for security kinds
- [x] FARM-T14: Add unit tests for security kind values
- [x] FARM-T15: Document security catalog usage patterns

### FARM-S29: Component Kind Grouping

**As a** portal user, **I want** component kinds to be grouped by domain (Dev, Infra, Data, Sec), **so that** I can filter and browse the catalog by audience.

- [x] FARM-T16: Create a `ComponentKindGroup` enum (`DEV`, `INFRA`, `DATA`, `SECURITY`)
- [x] FARM-T17: Create a mapping constant (`COMPONENT_KIND_GROUPS`) that associates each `ComponentKind` to its group
- [x] FARM-T18: Add `GET /catalog/components?kindGroup=infra` query filter to `CatalogController`
- [x] FARM-T19: Add unit tests for kind group filtering logic
- [x] FARM-T20: Update Swagger documentation with `kindGroup` query parameter

### FARM-S30: Extended Component Lifecycle

**As a** platform engineer, **I want** more granular lifecycle states, **so that** I can track components through their full lifecycle from planning to decommissioning.

- [x] FARM-T21: Add new values to `ComponentLifecycle` enum
  - [x] FARM-ST13: Add `PLANNED = "planned"` -- Approved but not yet built
  - [x] FARM-ST14: Add `DECOMMISSIONED = "decommissioned"` -- Fully retired and removed
- [x] FARM-T22: Update `CreateComponentDto` and `UpdateComponentDto` validation
- [x] FARM-T23: Add unit tests for new lifecycle values
- [x] FARM-T24: Generate and apply TypeORM migration for any schema changes

---

## FARM-E08: Environments and Deployments

**Goal:** Track where components are deployed and their deployment history. This gives SRE, Infra, and Dev teams a unified view of what version of each component runs in each environment.

**Current state:** No environment or deployment tracking exists. Components have no awareness of where they run.

### FARM-S31: Environment Entity and CRUD

**As an** SRE engineer, **I want** to define environments (dev, staging, production), **so that** I can map which components are deployed where.

- [x] FARM-T25: Create `Environment` entity (`src/environments/entities/environment.entity.ts`)
  - [x] FARM-ST15: Fields: `id` (UUID), `name` (unique, e.g., "production"), `description`, `type` (enum: `development`, `staging`, `production`, `sandbox`), `order` (integer for display sorting), `metadata` (JSON), `createdAt`, `updatedAt`
  - [x] FARM-ST16: Add `@ApiProperty()` decorators on all fields for Swagger schema generation
- [x] FARM-T26: Create `EnvironmentType` enum (`development`, `staging`, `production`, `sandbox`)
- [x] FARM-T27: Create `CreateEnvironmentDto` with class-validator decorators
  - [x] FARM-ST17: Required fields: `name` (string, 2-50 chars), `type` (EnvironmentType enum)
  - [x] FARM-ST18: Optional fields: `description` (string), `order` (integer), `metadata` (object)
- [x] FARM-T28: Create `UpdateEnvironmentDto` using `PartialType(CreateEnvironmentDto)`
- [x] FARM-T29: Create `EnvironmentsService` with CRUD operations
  - [x] FARM-ST19: `create()` -- validate name uniqueness, persist environment
  - [x] FARM-ST20: `findAll()` -- return all environments ordered by `order` field
  - [x] FARM-ST21: `findOne()` -- find by ID, throw `NotFoundException` if missing
  - [x] FARM-ST22: `update()` -- partial update, validate name uniqueness on change
  - [x] FARM-ST23: `remove()` -- soft validation (warn if deployments reference this environment)
- [x] FARM-T30: Create `EnvironmentsController` with full REST endpoints
  - [x] FARM-ST24: `POST /environments` -- create (admin only)
  - [x] FARM-ST25: `GET /environments` -- list all
  - [x] FARM-ST26: `GET /environments/:id` -- get by ID
  - [x] FARM-ST27: `PATCH /environments/:id` -- update (admin only)
  - [x] FARM-ST28: `DELETE /environments/:id` -- delete (admin only)
- [x] FARM-T31: Create `EnvironmentsModule` and register as plugin in `app.module.ts`
  - [x] FARM-ST29: Register with `PluginManagerModule` as `core-environments` plugin
- [x] FARM-T32: Generate and apply TypeORM migration for `environments` table
- [x] FARM-T33: Add `@ApiTags('environments')` and full Swagger decorators on controller
- [x] FARM-T34: Write unit tests for `EnvironmentsService` (target: 90% coverage)
- [x] FARM-T35: Write unit tests for `EnvironmentsController` (target: 90% coverage)

### FARM-S32: Deployment Entity and Tracking

**As a** developer or SRE, **I want** to record deployments of components to environments with version info, **so that** I can see what is running where and trace deployment history.

- [x] FARM-T36: Create `Deployment` entity (`src/environments/entities/deployment.entity.ts`)
  - [x] FARM-ST30: Fields: `id` (UUID), `version` (string, e.g., "v2.3.1"), `status` (enum: `pending`, `in_progress`, `succeeded`, `failed`, `rolled_back`), `deployedBy` (string -- username or CI system), `commitSha` (string, nullable), `description` (string, nullable), `metadata` (JSON, nullable), `startedAt` (timestamp), `finishedAt` (timestamp, nullable), `createdAt`, `updatedAt`
  - [x] FARM-ST31: `ManyToOne` relation to `Component` (FK: `componentId`)
  - [x] FARM-ST32: `ManyToOne` relation to `Environment` (FK: `environmentId`)
  - [x] FARM-ST33: Add `@ApiProperty()` decorators on all fields
- [x] FARM-T37: Create `DeploymentStatus` enum (`pending`, `in_progress`, `succeeded`, `failed`, `rolled_back`)
- [x] FARM-T38: Create `CreateDeploymentDto` with class-validator decorators
  - [x] FARM-ST34: Required fields: `componentId` (UUID), `environmentId` (UUID), `version` (string)
  - [x] FARM-ST35: Optional fields: `deployedBy` (string), `commitSha` (string), `description` (string), `metadata` (object)
- [x] FARM-T39: Create `UpdateDeploymentDto` (status transitions only: `status`, `finishedAt`, `metadata`)
- [x] FARM-T40: Create `DeploymentsService`
  - [x] FARM-ST36: `create()` -- validate component and environment exist, set `startedAt`, persist
  - [x] FARM-ST37: `findAll()` -- support filters: `componentId`, `environmentId`, `status`
  - [x] FARM-ST38: `findOne()` -- find by ID with relations loaded
  - [x] FARM-ST39: `update()` -- validate status transitions (e.g., `pending` -> `in_progress` -> `succeeded`/`failed`)
  - [x] FARM-ST40: `findLatestByComponent()` -- return the most recent successful deployment per environment for a given component
  - [x] FARM-ST41: `getDeploymentHistory()` -- paginated deployment history for a component+environment pair
- [x] FARM-T41: Create `DeploymentsController`
  - [x] FARM-ST42: `POST /deployments` -- record a deployment (admin only)
  - [x] FARM-ST43: `GET /deployments` -- list with filters (`componentId`, `environmentId`, `status`)
  - [x] FARM-ST44: `GET /deployments/:id` -- get deployment details
  - [x] FARM-ST45: `PATCH /deployments/:id` -- update status (admin only)
  - [x] FARM-ST46: `GET /deployments/latest?componentId=` -- latest deployment per environment for a component
- [x] FARM-T42: Add deployment endpoints to `EnvironmentsModule` (same module, shared context)
- [x] FARM-T43: Generate and apply TypeORM migration for `deployments` table with FKs
- [x] FARM-T44: Add full Swagger decorators on deployment controller
- [x] FARM-T45: Write unit tests for `DeploymentsService` (target: 90% coverage)
- [x] FARM-T46: Write unit tests for `DeploymentsController` (target: 90% coverage)

### FARM-S33: Component-Environment Matrix View

**As a** platform engineer, **I want** an API endpoint that returns a matrix of components vs environments showing the latest deployed version in each, **so that** I get a dashboard-ready overview of the entire platform state.

- [x] FARM-T47: Add `getMatrix()` method to `DeploymentsService`
  - [x] FARM-ST47: Query: for each component, return the latest successful deployment per environment
  - [x] FARM-ST48: Response shape: `{ components: [{ id, name, kind, environments: [{ envId, envName, version, status, deployedAt }] }] }`
- [x] FARM-T48: Add `GET /deployments/matrix` endpoint to `DeploymentsController`
- [x] FARM-T49: Support optional query filters: `kindGroup`, `owner`, `lifecycle`
- [x] FARM-T50: Add Swagger documentation for matrix endpoint
- [x] FARM-T51: Write unit tests for matrix aggregation logic

---

## FARM-E09: Teams and Ownership

**Goal:** Replace the free-text `owner` string on components with a formal `Team` entity, enabling team-based views, contact information, and organizational structure.

**Current state:** Components have an `owner` string field. Users have `roles` as a string array. No Team entity exists.

### FARM-S34: Team Entity and CRUD

**As a** platform administrator, **I want** to manage teams as first-class entities with type, description, and contact channels, **so that** ownership is consistent and actionable (e.g., "who do I contact when this service is down?").

- [x] FARM-T52: Create `Team` entity (`src/teams/entities/team.entity.ts`)
  - [x] FARM-ST49: Fields: `id` (UUID), `name` (unique), `displayName`, `description`, `type` (enum: `dev`, `infra`, `security`, `data`, `platform`, `other`), `contactEmail` (nullable), `slackChannel` (nullable), `metadata` (JSON, nullable), `createdAt`, `updatedAt`
  - [x] FARM-ST50: `ManyToMany` relation to `User` (join table `team_members`)
  - [x] FARM-ST51: `OneToMany` relation to `Component` (components owned by this team)
- [x] FARM-T53: Create `TeamType` enum (`dev`, `infra`, `security`, `data`, `platform`, `other`)
- [x] FARM-T54: Create `CreateTeamDto` and `UpdateTeamDto` with class-validator decorators
- [x] FARM-T55: Create `TeamsService` with CRUD operations and member management
  - [x] FARM-ST52: `create()`, `findAll()`, `findOne()`, `update()`, `remove()`
  - [x] FARM-ST53: `addMember(teamId, userId)`, `removeMember(teamId, userId)`, `getMembers(teamId)`
  - [x] FARM-ST54: `findByUser(userId)` -- return all teams a user belongs to
- [x] FARM-T56: Create `TeamsController` with REST endpoints
  - [x] FARM-ST55: `POST /teams`, `GET /teams`, `GET /teams/:id`, `PATCH /teams/:id`, `DELETE /teams/:id`
  - [x] FARM-ST56: `POST /teams/:id/members`, `DELETE /teams/:id/members/:userId`, `GET /teams/:id/members`
  - [x] FARM-ST57: `GET /teams/:id/components` -- list all components owned by this team
- [x] FARM-T57: Create `TeamsModule` and register as `core-teams` plugin
- [x] FARM-T58: Generate and apply TypeORM migration for `teams` and `team_members` tables
- [x] FARM-T59: Add full Swagger decorators
- [x] FARM-T60: Write unit tests (target: 90% coverage)

### FARM-S35: Migrate Component Ownership to Team FK

**As a** developer, **I want** the component `owner` field to reference a Team entity, **so that** ownership data is validated and consistent across the catalog.

- [x] FARM-T61: Add `teamId` (UUID, nullable) FK column to `Component` entity
  - [x] FARM-ST58: `ManyToOne` relation from `Component` to `Team`
  - [x] FARM-ST59: Keep `owner` string field as deprecated (backward compatibility)
- [x] FARM-T62: Generate TypeORM migration: add `teamId` FK column, populate from existing `owner` values where team names match
- [x] FARM-T63: Update `CreateComponentDto` to accept optional `teamId` alongside `owner`
- [x] FARM-T64: Update `CatalogService` to resolve team on component creation/update
- [x] FARM-T65: Add deprecation notice to `owner` field in Swagger docs
- [x] FARM-T66: Update catalog YAML registration to support `spec.teamId` alongside `spec.owner`
- [x] FARM-T67: Write unit tests covering team-based ownership resolution

---

## FARM-E10: TechDocs Enhancement

**Goal:** Evolve the documentation module from basic metadata storage to a full technical documentation platform with rendering, navigation, and search.

**Current state:** `DocumentationService` supports CRUD and raw Markdown fetching via `GET /docs/:id/content`. No rendering, no hierarchy, no search.

### FARM-S36: Markdown Rendering

**As a** developer, **I want** the API to render Markdown documentation to HTML, **so that** frontend clients do not need their own Markdown parser.

- [x] FARM-T68: Install `marked` and `@types/marked` as dependencies
- [x] FARM-T69: Add `renderContent()` method to `DocumentationService` (fetch raw MD, convert to HTML via `marked`)
- [x] FARM-T70: Add `GET /docs/:id/rendered` endpoint returning `Content-Type: text/html`
- [x] FARM-T71: Integrate HTML sanitization (`dompurify` or equivalent) to prevent XSS
- [x] FARM-T72: Write unit tests for rendering and sanitization

### FARM-S37: Navigation Tree

**As a** developer, **I want** documentation entries to support a parent-child hierarchy, **so that** I can build a navigation sidebar for component docs.

- [x] FARM-T73: Add `parentId` (nullable UUID, self-referencing FK) and `order` (integer) columns to `Documentation` entity
- [x] FARM-T74: Generate and apply TypeORM migration for new columns
- [x] FARM-T75: Add `buildTree()` method to `DocumentationService` (recursive tree builder filtered by `componentId`)
- [x] FARM-T76: Add `GET /docs/tree?componentId=` endpoint
- [x] FARM-T77: Write unit tests for tree building logic

### FARM-S38: Search Engine

**As a** user, **I want** to search documentation and catalog components by keyword, **so that** I can find relevant resources quickly.

- [x] FARM-T78: Create `SearchProvider` interface (`src/common/interfaces/search-provider.interface.ts`) with `index()` and `search()` methods
- [x] FARM-T79: Implement `InMemorySearchProvider` (fallback using `Array.filter` + `String.includes`)
- [x] FARM-T80: Add `GET /docs/search?q=` endpoint
- [x] FARM-T81: Add `GET /catalog/search?q=` endpoint
- [x] FARM-T82: (Optional) Implement `ElasticsearchSearchProvider` registered conditionally via config
- [x] FARM-T83: Write unit tests for search providers and endpoints

---

## FARM-E11: Plugin System Evolution

**Goal:** Enable dynamic plugin discovery and standardized plugin interfaces for third-party extensions.

**Current state:** `PluginManagerService` handles manual in-memory registration. `FarmPlugin` interface and `PluginMetadata` are defined. Three core plugins are registered. No dynamic loading.

### FARM-S39: Plugin Discovery

**As a** platform operator, **I want** plugins to be auto-discovered from a directory on startup, **so that** I can extend the portal by dropping in plugin packages.

- [x] FARM-T84: Add `plugins.dir` config key to `configuration.ts` (env: `PLUGINS_DIR`)
- [x] FARM-T85: Implement `PluginLoaderService` (`OnModuleInit`) to scan `PLUGINS_DIR`, read `plugin.json` manifests, and register plugins
- [x] FARM-T86: Define `plugin.json` manifest schema (fields: `name`, `version`, `description`, `entrypoint`)
- [x] FARM-T87: Add `GET /plugins/:name` endpoint for individual plugin metadata
- [x] FARM-T88: Write unit tests for plugin loader and error handling (malformed manifest, missing directory)

### FARM-S40: Plugin Route and Menu Contributions

**As a** plugin author, **I want** to declare routes and menu items in my plugin metadata, **so that** the portal frontend can dynamically build navigation from installed plugins.

- [x] FARM-T89: Define `PluginRouteContribution` interface (prefix, description)
- [x] FARM-T90: Define `PluginMenuItem` interface (label, path, icon, order)
- [x] FARM-T91: Extend `FarmPlugin` interface with optional `routes` and `menuItems`
- [x] FARM-T92: Add `GET /plugins/menu-items` aggregation endpoint
- [x] FARM-T93: Write unit tests for route and menu aggregation

---

## FARM-E12: Quality and Testing

**Goal:** Raise unit test coverage from 51% to 80% and expand E2E test scenarios.

**Current state:** Overall coverage is 51% statements, 45% branches, 40% functions, 52% lines.

### FARM-S41: High-Priority Unit Test Coverage

**As a** maintainer, **I want** critical modules to have at least 90% coverage, **so that** regressions are caught early.

- [x] FARM-T94: `documentation/documentation.controller.spec.ts` (0% -> 90%): Cover `create`, `findAll`, `findOne`, `getContent`, `update`, `remove`. Mock `DocumentationService`.
- [x] FARM-T95: `catalog/catalog.service.spec.ts` -- discovery paths (62% -> 85%): Test `discoverFromLocation`, `findYamlFiles`, `registerYaml` with valid/invalid YAML.
- [x] FARM-T96: `common/filters/http-exception.filter.spec.ts` (0% -> 100%): Test `HttpException` path, non-`HttpException` 500 path, logger assertion.
- [x] FARM-T97: `common/guards/roles.guard.spec.ts` (44% -> 100%): Test all role matching scenarios.
- [x] FARM-T98: `auth/strategies/jwt.strategy.spec.ts` (0% -> 100%): Test `validate()` payload mapping. Mock `ConfigService`.
- [x] FARM-T99: `auth/strategies/local.strategy.spec.ts` (0% -> 100%): Test success and `UnauthorizedException` paths.

### FARM-S42: Low-Priority Unit Test Coverage

- [x] FARM-T100: `plugin-manager/plugin-manager.service.spec.ts` (0% -> 100%)
- [x] FARM-T101: `plugin-manager/plugin-manager.controller.spec.ts` (0% -> 100%)
- [x] FARM-T102: `documentation/documentation.service.spec.ts` -- `getContent` path (70% -> 90%)

### FARM-S43: E2E Testing Expansion

**As a** maintainer, **I want** E2E tests covering the full API lifecycle, **so that** integration issues are caught before deployment.

- [x] FARM-T103: Auth lifecycle E2E: register -> login -> JWT -> list users
- [x] FARM-T104: Catalog CRUD E2E: create -> list -> get -> update -> delete -> assert 404
- [x] FARM-T105: Catalog YAML registration E2E: `POST /catalog/register-yaml` with valid YAML
- [x] FARM-T106: Documentation CRUD E2E: create -> get metadata -> update -> delete
- [x] FARM-T107: Environments CRUD E2E: create -> list -> get -> update -> delete (after FARM-E08)
- [x] FARM-T108: Deployments lifecycle E2E: create deployment -> update status -> get latest (after FARM-E08)

### Current Code Coverage

Overall: **51% statements | 45% branches | 40% functions | 52% lines**

| Module | Stmts | Branch | Funcs | Priority |
|---|---|---|---|---|
| `auth/auth.service.ts` | 100% | 89% | 100% | Done |
| `auth/auth.controller.ts` | 100% | 75% | 100% | Done |
| `common/logger/logger.config.ts` | 100% | 100% | 100% | Done |
| `catalog/catalog.controller.ts` | 90% | 75% | 75% | Low |
| `catalog/catalog.service.ts` | 62% | 45% | 50% | High |
| `documentation/documentation.controller.ts` | 0% | 0% | 0% | High |
| `documentation/documentation.service.ts` | 70% | 67% | 50% | Medium |
| `auth/strategies/jwt.strategy.ts` | 0% | 0% | 0% | Medium |
| `auth/strategies/local.strategy.ts` | 0% | 0% | 0% | Medium |
| `common/filters/http-exception.filter.ts` | 0% | 0% | 0% | Medium |
| `common/guards/roles.guard.ts` | 44% | 30% | 33% | Medium |
| `plugin-manager/plugin-manager.service.ts` | 0% | 0% | 0% | Low |
| `plugin-manager/plugin-manager.controller.ts` | 0% | 0% | 0% | Low |

---

## Upcoming Work

The following EPICs were identified through a comprehensive codebase audit (bugs, performance, security, documentation, and new features).

### FARM-E13: Critical Bug Fixes

> **Priority:** CRITICAL -- Must resolve before any production deployment.

#### FARM-S29: Release Pipeline Blocked

`make release` fails because (a) the working directory has uncommitted changes (package.json version bump 0.3.1 to 0.4.0) and (b) `release-it` runs `npm run build` in its `after:bump` hook, which fails due to TypeScript compilation errors. Both issues must be resolved before any release can be cut.

- [x] FARM-T108: Fix TypeScript build errors so `npm run build` succeeds (see FARM-S30)
- [x] FARM-T108b: Stage and commit all pending changes so the working directory is clean for `release-it`
- [x] FARM-T108c: Fix CI E2E failure in `app.e2e-spec.ts` -- health check returns 503 because memory thresholds (150MB heap / 300MB RSS) are too low for CI runners; raised to 512MB / 1024MB

#### FARM-S30: TypeScript Build Errors

The project fails `tsc --noEmit` due to `ConfigService.get<T>()` returning `T | undefined` while consumers expect non-nullable values.

- [x] FARM-T109: Fix ThrottlerModule config in `app.module.ts`
  - [x] FARM-ST60: Add null-coalescing defaults for `throttle.ttl` and `throttle.limit` in the `useFactory` return
- [x] FARM-T110: Fix JwtModule config in `auth.module.ts`
  - [x] FARM-ST61: Add null-coalescing defaults for `auth.jwtSecret` and `auth.jwtExpiresIn`
- [x] FARM-T111: Fix JwtStrategy constructor in `jwt.strategy.ts`
  - [x] FARM-ST62: Add null-coalescing default for `secretOrKey` so it satisfies `string | Buffer`
- [x] FARM-T112: Fix auth spec type mismatches in `auth/__tests__/`
  - [x] FARM-ST63: Fix `auth.controller.spec.ts` mock type to satisfy `AuthService` interface
  - [x] FARM-ST64: Fix `auth.service.spec.ts` mock type and duplicated `id` property

#### FARM-S31: N+1 Query Performance Bugs

`DeploymentsService` has two methods with nested-loop queries that scale as O(M*N).

- [x] FARM-T113: Optimize `findLatestByComponent()` in `deployments.service.ts`
  - [x] FARM-ST65: Replace per-environment loop with a single QueryBuilder query using subquery for `MAX(createdAt)` grouped by `environmentId`
  - [x] FARM-ST66: Update unit tests to verify single-query behavior
- [x] FARM-T114: Optimize `getMatrix()` in `deployments.service.ts`
  - [x] FARM-ST67: Replace M*N nested loop with a single aggregation query (`GROUP BY componentId, environmentId`)
  - [x] FARM-ST68: Apply `kindGroup`, `owner`, `lifecycle` filters at the query level instead of in-memory post-filtering
  - [x] FARM-ST69: Update unit tests and E2E test for matrix endpoint

#### FARM-S32: Database Schema Fixes

- [x] FARM-T115: Fix `Deployment.startedAt` and `finishedAt` column types
  - [x] FARM-ST70: Remove explicit `type: "datetime"` from `deployment.entity.ts`; let TypeORM infer the correct native type per database (PostgreSQL `timestamp` / SQLite `datetime`)
  - [x] FARM-ST71: No migration needed; TypeORM column type inference is transparent to existing data
- [x] FARM-T116: Add missing database indexes
  - [x] FARM-ST72: Add `@Index()` on `Component.owner` column
  - [x] FARM-ST73: Add `@Index()` on `Documentation.componentId` column
  - [x] FARM-ST74: Create migration `AddMissingIndexes` (`1773084586800-add-missing-indexes.ts`)

---

### FARM-E14: Security Hardening

> **Priority:** HIGH -- Security issues that should be resolved before exposing the API.

#### FARM-S33: Authentication Strengthening

- [x] FARM-T117: Enforce JWT secret in production
  - [x] FARM-ST75: Update `validationSchema` in `configuration.ts` to make `JWT_SECRET` required when `NODE_ENV=production` (remove default)
  - [x] FARM-ST76: Add `@Min(32)` length validation on the secret value
- [x] FARM-T118: Add password strength validation
  - [x] FARM-ST77: Add `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)` to `RegisterUserDto.password`
  - [x] FARM-ST78: Add `@Length(2, 50)` to `RegisterUserDto.username`
  - [x] FARM-ST79: Update unit tests and E2E auth tests with new validation rules
- [x] FARM-T119: Implement refresh token mechanism
  - [x] FARM-ST80: Add `refreshToken` column to `User` entity (hashed, nullable)
  - [x] FARM-ST81: Create `POST /auth/refresh` endpoint that accepts a refresh token and returns a new JWT + rotated refresh token
  - [x] FARM-ST82: Add refresh token rotation (invalidate old token on use)
  - [x] FARM-ST83: Add unit and E2E tests for refresh flow

#### FARM-S34: API Security Configuration

- [x] FARM-T120: Add CORS configuration
  - [x] FARM-ST84: Add `ALLOWED_ORIGINS` env var to `configuration.ts` and `validationSchema`
  - [x] FARM-ST85: Call `app.enableCors()` in `main.ts` with configurable origins
- [x] FARM-T121: Add stricter rate limiting on auth endpoints
  - [x] FARM-ST86: Apply `@Throttle({ default: { ttl: 60000, limit: 5 } })` decorator on `login()` and `register()` endpoints; skip throttling in test environment via `skipIf`
  - [x] FARM-ST87: Document rate limit headers in Swagger

---

### FARM-E15: API Maturity (Pagination, Validation, Consistency)

> **Priority:** HIGH -- Required for production-scale usage.

#### FARM-S35: Pagination Support

- [x] FARM-T122: Create shared pagination infrastructure
  - [x] FARM-ST88: Create `PaginationQueryDto` with `@IsOptional() @IsInt() @Min(0) skip` and `@IsOptional() @IsInt() @Min(1) @Max(100) take` fields
  - [x] FARM-ST89: Create `PaginatedResponseDto<T>` with `data: T[]`, `total: number`, `skip: number`, `take: number` fields
- [x] FARM-T123: Add pagination to Catalog endpoints
  - [x] FARM-ST90: Update `CatalogService.findAll()` to accept `skip`/`take` and return `[entities, count]`
  - [x] FARM-ST91: Update `CatalogController.findAll()` with `@Query()` pagination params and Swagger decorators
- [x] FARM-T124: Add pagination to Teams endpoints
  - [x] FARM-ST92: Update `TeamsService.findAll()` and `TeamsController.findAll()`
- [x] FARM-T125: Add pagination to Documentation endpoints
  - [x] FARM-ST93: Update `DocumentationService.findAll()` and `DocumentationController.findAll()`
- [x] FARM-T126: Add pagination to Environments and Deployments endpoints
  - [x] FARM-ST94: Update `EnvironmentsService.findAll()`, `DeploymentsService.findAll()`, and their controllers
- [x] FARM-T127: Update E2E tests to verify pagination behavior
  - [x] FARM-ST95: Test default pagination, custom skip/take, and total count in response

#### FARM-S36: DTO Validation Improvements

- [x] FARM-T128: Fix `componentId` validation in `CreateDocumentationDto`
  - [x] FARM-ST96: Change `@IsString()` to `@IsUUID()` for `componentId` field
- [x] FARM-T129: Audit and fix all DTOs for consistent validation
  - [x] FARM-ST97: Ensure all UUID fields use `@IsUUID()` across all DTOs
  - [x] FARM-ST98: Ensure all `@ApiProperty()` decorators have `example` values

#### FARM-S37: Response Consistency

- [x] FARM-T130: Standardize DELETE responses
  - [x] FARM-ST99: Ensure all DELETE endpoints return `@HttpCode(HttpStatus.NO_CONTENT)` with void return
- [x] FARM-T131: Create `LoginResponseDto` for auth
  - [x] FARM-ST100: Create DTO with `@ApiProperty()` for `user` and `token` fields
  - [x] FARM-ST101: Apply as `@ApiResponse({ type: LoginResponseDto })` on login endpoint

---

### FARM-E16: Observability and Operational Readiness

> **Priority:** MEDIUM -- Important for production operations.

#### FARM-S38: Request Audit Logging

- [x] FARM-T132: Create request logging middleware
  - [x] FARM-ST102: Create `RequestLoggerMiddleware` in `src/common/middleware/` that logs method, path, status, duration, and user ID (from JWT)
  - [x] FARM-ST103: Apply middleware globally in `AppModule.configure()`
  - [x] FARM-ST104: Exclude health check endpoints from logging to reduce noise

#### FARM-S39: Health Check Enhancement

- [x] FARM-T133: Extend health endpoint with detailed checks
  - [x] FARM-ST105: Add database connectivity check using `TypeOrmHealthIndicator`
  - [x] FARM-ST106: Add memory usage check using `MemoryHealthIndicator`
  - [x] FARM-ST107: Return structured health response with individual check statuses

#### FARM-S40: Database Connection Management

- [x] FARM-T134: Add connection pool configuration
  - [x] FARM-ST108: Add `DATABASE_POOL_SIZE` env var to `configuration.ts` (default: 10)
  - [x] FARM-ST109: Pass `extra: { max: poolSize }` to TypeORM config in `app.module.ts`

#### FARM-S41: Docker Hardening

- [x] FARM-T135: Add Dockerfile HEALTHCHECK instruction
  - [x] FARM-ST110: Add `HEALTHCHECK CMD node -e "..." http://localhost:3000/api/health` (uses node instead of curl for alpine)
- [x] FARM-T136: Move Docker Compose hardcoded credentials to `.env`
  - [x] FARM-ST111: Replace inline passwords with `${VARIABLE:-default}` references in `docker-compose.yml`
  - [x] FARM-ST112: Create `.env.example` with placeholder values

---

### FARM-E17: Documentation Accuracy

> **Priority:** MEDIUM -- User-facing documentation must match the implementation.

#### FARM-S42: Fix Outdated User Guide

- [x] FARM-T137: Fix `docs/user-guide/documentation.md`
  - [x] FARM-ST113: Replace all references to `content` field with `sourceUrl`
  - [x] FARM-ST114: Update curl examples with correct payload shape (sourceUrl instead of content)
  - [x] FARM-ST115: Add documentation for new endpoints: `GET /docs/:id/rendered`, `GET /docs/tree`, `GET /docs/search`
  - [x] FARM-ST116: Update properties table to include `parentId` and `order` fields

#### FARM-S43: Update README

- [x] FARM-T138: Sync README with current project state
  - [x] FARM-ST117: Update module list to include Teams, Environments, Deployments
  - [x] FARM-ST118: Fix Node.js version badge if incorrect
  - [x] FARM-ST119: Add new endpoints to the quick reference section

---

### FARM-E18: Test Coverage Expansion

> **Priority:** MEDIUM -- Fill gaps identified by the test audit.

#### FARM-S44: Missing E2E Tests

- [x] FARM-T139: Add E2E tests for Teams module
  - [x] FARM-ST120: Test team CRUD lifecycle (create, list, get, update, delete)
  - [x] FARM-ST121: Test member management (add member, remove member, list members)
  - [x] FARM-ST122: Test component ownership (assign team to component, list team components)
- [x] FARM-T140: Add E2E tests for Plugin Manager module
  - [x] FARM-ST123: Test `GET /plugins` list endpoint
  - [x] FARM-ST124: Test `GET /plugins/menu-items` and `GET /plugins/routes`

#### FARM-S45: Auth Edge Case Tests

- [x] FARM-T141: Add auth security E2E tests
  - [x] FARM-ST125: Test login with invalid credentials returns 401
  - [x] FARM-ST126: Test access with expired/malformed JWT returns 401
  - [x] FARM-ST127: Test user role endpoint returns 403 for non-admin users
  - [x] FARM-ST128: Test registration with duplicate username returns 409

#### FARM-S46: Test Quality Improvements

- [x] FARM-T142: Replace trivial assertions
  - [x] FARM-ST129: Audit all `toBeDefined()` assertions and replace with meaningful checks where appropriate
- [x] FARM-T143: Add Jest coverage thresholds
  - [x] FARM-ST130: Add `coverageThreshold` to `package.json` Jest config (65% branches, 70% functions/lines/statements)

---

### FARM-E19: Production Readiness Hardening

> **Priority:** HIGH -- Required before serving production traffic.

#### FARM-S47: Security Headers

- [x] FARM-T144: Install and configure Helmet
  - [x] FARM-ST131: Install `helmet` package via npm
  - [x] FARM-ST132: Add `app.use(helmet())` in `src/main.ts` after app creation
  - [x] FARM-ST133: Verify build, unit tests, and E2E tests pass with Helmet enabled

#### FARM-S48: Graceful Shutdown

- [x] FARM-T145: Enable NestJS shutdown hooks
  - [x] FARM-ST134: Add `app.enableShutdownHooks()` in `src/main.ts` to drain connections on SIGTERM/SIGINT
  - [x] FARM-ST135: Log shutdown events via the application logger

#### FARM-S49: Swagger Authentication

- [x] FARM-T146: Add bearer auth to Swagger UI
  - [x] FARM-ST136: Add `.addBearerAuth()` to `DocumentBuilder` chain in `src/main.ts` so Swagger UI exposes an Authorize button for JWT tokens

#### FARM-S50: Container Security

- [x] FARM-T147: Run container as non-root user
  - [x] FARM-ST137: Add `USER node` directive before `CMD` in the Dockerfile production stage

---

### FARM-E20: Advanced Observability

> **Priority:** MEDIUM -- Enhances production monitoring and incident response capabilities.

#### FARM-S51: Application Metrics

- [x] FARM-T148: Integrate Prometheus metrics
  - [x] FARM-ST138: Install `prom-client` and `@willsoto/nestjs-prometheus` packages
  - [x] FARM-ST139: Configure default metrics (event loop lag, heap size, GC) in `AppModule`
  - [x] FARM-ST140: Expose `/metrics` endpoint (unauthenticated, behind internal network in production)
  - [x] FARM-ST141: Add custom counters for HTTP requests by route, method, and status code
  - [x] FARM-ST142: Add histogram for request duration by endpoint

#### FARM-S52: Distributed Tracing

- [x] FARM-T149: Integrate OpenTelemetry tracing
  - [x] FARM-ST143: Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
  - [x] FARM-ST144: Create tracing configuration factory with Jaeger/OTLP exporter support
  - [x] FARM-ST145: Add `OTEL_EXPORTER_ENDPOINT` and `OTEL_SERVICE_NAME` to configuration and Joi validation
  - [x] FARM-ST146: Propagate trace context through HTTP headers (W3C Trace Context)
  - [x] FARM-ST147: Add trace IDs to Winston log output for log-trace correlation

#### FARM-S52b: Observability Visualization Stack

- [x] FARM-T149b: Add Grafana observability stack
  - [x] Create `docker-compose.observability.yml` with Grafana, Prometheus, and Tempo
  - [x] Add `observability/prometheus.yml` scrape config targeting Farm API metrics
  - [x] Add `observability/tempo.yml` with OTLP HTTP receiver and local storage
  - [x] Pre-provision Grafana data sources (Prometheus + Tempo) and starter dashboard
  - [x] Add Farm API Overview dashboard (request rate, latency percentiles, error rate, heatmap, traces)
  - [x] Add `make up-observability` and `make down-observability` Makefile targets
  - [x] Add `docs/developer-guide/observability.md` documentation

---

### FARM-E21: Caching and Performance ✅

> **Priority:** MEDIUM -- Reduces database load and improves response times for read-heavy endpoints.

#### FARM-S53: In-Memory and Redis Caching

- [x] FARM-T150: Integrate NestJS cache manager with Redis
  - [x] FARM-ST148: Install `@nestjs/cache-manager` and `@keyv/redis` packages (cache-manager v7 uses Keyv adapters)
  - [x] FARM-ST149: Configure `CacheModule.registerAsync()` in `AppModule` with Redis connection from env vars (`REDIS_HOST`, `REDIS_PORT`)
  - [x] FARM-ST150: Add fallback to in-memory cache when Redis is unavailable (development mode)
  - [x] FARM-ST151: Add `REDIS_HOST`, `REDIS_PORT`, and `CACHE_TTL` to configuration and Joi validation
- [x] FARM-T151: Apply caching to high-traffic read endpoints
  - [x] FARM-ST152: Add `@UseInterceptors(CacheInterceptor)` to `GET /catalog/components` and `GET /catalog/components/:id`
  - [x] FARM-ST153: Add cache invalidation on component create, update, and delete operations
  - [x] FARM-ST154: Add `@UseInterceptors(CacheInterceptor)` to `GET /plugins` endpoints (menu-items, routes)
- [x] FARM-T152: Add Redis service to Docker Compose
  - [x] FARM-ST155: Add `redis:7-alpine` service with healthcheck to `docker-compose.yml`
  - [x] FARM-ST156: Add API service dependency on Redis container health

---

### FARM-E22: Background Job Processing ✅

> **Priority:** MEDIUM -- Enables async operations for catalog discovery, notifications, and scheduled tasks.
> **Status:** DONE (v0.5.0)

#### FARM-S54: Bull Queue Integration

- [x] FARM-T153: Set up BullMQ job processing infrastructure
  - [x] FARM-ST157: Install `@nestjs/bullmq` and `bullmq` packages
  - [x] FARM-ST158: Configure `BullModule.forRootAsync()` in `AppModule` with Redis connection (via `QueuesModule`)
  - [x] FARM-ST159: Create `CatalogDiscoveryProcessor` to handle async YAML catalog ingestion
  - [x] FARM-ST160: Create `NotificationProcessor` placeholder for future email/webhook notifications
- [x] FARM-T154: Add Bull Board dashboard
  - [x] FARM-ST161: Install `@bull-board/nestjs` and `@bull-board/api` packages
  - [x] FARM-ST162: Mount Bull Board UI at `/api/admin/queues` with Express adapter

---

### FARM-E23: Database Seeders and Developer Experience

> **Priority:** LOW -- Improves onboarding and local development workflow.

#### FARM-S55: Database Seeding

- [ ] FARM-T155: Create TypeORM seed infrastructure
  - [ ] FARM-ST163: Create `src/database/seeds/` directory with seed runner script
  - [ ] FARM-ST164: Create `initial-seed.ts` with sample admin user, 3 components (service, library, website), 2 teams, 2 environments
  - [ ] FARM-ST165: Add `npm run seed` script to `package.json` and `make seed` to `Makefile`
  - [ ] FARM-ST166: Guard seeder to only run in development/test environments

#### FARM-S56: API Versioning

- [ ] FARM-T156: Implement URI-based API versioning
  - [ ] FARM-ST167: Enable NestJS versioning with `app.enableVersioning({ type: VersioningType.URI })` in `main.ts`
  - [ ] FARM-ST168: Add `@Version('1')` to all existing controllers as baseline
  - [ ] FARM-ST169: Update Swagger configuration to reflect versioned paths
  - [ ] FARM-ST170: Update all E2E tests to use `/api/v1/` prefixed paths

---

### FARM-E24: Communication and Notifications

> **Priority:** LOW -- Enables user-facing notifications and external integrations.

#### FARM-S57: Email Service

- [ ] FARM-T157: Integrate nodemailer for transactional emails
  - [ ] FARM-ST171: Install `@nestjs-modules/mailer` and `nodemailer` packages
  - [ ] FARM-ST172: Configure `MailerModule.forRootAsync()` with SMTP settings from env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
  - [ ] FARM-ST173: Create email templates directory with Handlebars templates (welcome, password-reset)
  - [ ] FARM-ST174: Add `SMTP_*` variables to configuration, Joi validation, and `.env.example`

#### FARM-S58: WebSocket Real-Time Updates

- [ ] FARM-T158: Add WebSocket gateway for live events
  - [ ] FARM-ST175: Install `@nestjs/websockets` and `@nestjs/platform-socket.io` packages
  - [ ] FARM-ST176: Create `EventsGateway` with `@WebSocketGateway()` decorator
  - [ ] FARM-ST177: Emit events on deployment status changes (`deployment.created`, `deployment.updated`)
  - [ ] FARM-ST178: Emit events on catalog changes (`component.created`, `component.updated`, `component.deleted`)
  - [ ] FARM-ST179: Add JWT-based authentication to WebSocket handshake

---

### FARM-E25: TypeScript Strictness

> **Priority:** LOW -- Improves type safety and catches bugs at compile time.

#### FARM-S59: Enable Strict TypeScript Compiler Options

- [ ] FARM-T159: Enable `noImplicitAny` in tsconfig.json
  - [ ] FARM-ST180: Set `noImplicitAny: true` in `tsconfig.json`
  - [ ] FARM-ST181: Fix all resulting type errors across the codebase
  - [ ] FARM-ST182: Verify build, unit tests, and E2E tests pass
- [ ] FARM-T160: Enable `strictBindCallApply` in tsconfig.json
  - [ ] FARM-ST183: Set `strictBindCallApply: true` in `tsconfig.json`
  - [ ] FARM-ST184: Fix all resulting type errors
  - [ ] FARM-ST185: Verify build, unit tests, and E2E tests pass

---

## Implementation Priority

The recommended execution order, respecting dependencies:

### Completed Phases

| Phase | Epic | Status |
|---|---|---|
| 1 | FARM-E07: Multi-Team Catalog Expansion | Done |
| 2 | FARM-E08: Environments and Deployments | Done |
| 3 | FARM-E09: Teams and Ownership | Done |
| 4 | FARM-E10: TechDocs Enhancement | Done |
| 5 | FARM-E11: Plugin System Evolution | Done |
| 6 | FARM-E12: Quality and Testing | Done |
| 7 | FARM-E13: Critical Bug Fixes | Done |
| 8 | FARM-E14: Security Hardening | Done |
| 9 | FARM-E15: API Maturity | Done |
| 10 | FARM-E17: Documentation Accuracy | Done |
| 11 | FARM-E16: Observability and Ops | Done |
| 12 | FARM-E18: Test Coverage Expansion | Done |
| 13 | FARM-E19: Production Readiness Hardening | Done |
| 14 | FARM-E20: Advanced Observability | Done |
| 15 | FARM-E21: Caching and Performance | Done |
| 16 | FARM-E22: Background Job Processing | Done |

### Upcoming Phases

| Phase | Epic | Dependency | Priority |
|---|---|---|---|
| 17 | FARM-E25: TypeScript Strictness | None | LOW |
| 18 | FARM-E23: Database Seeders and Developer Experience | None | LOW |
| 19 | FARM-E24: Communication and Notifications | FARM-E22 (Queues) | LOW |
