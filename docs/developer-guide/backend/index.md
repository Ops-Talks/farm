# Backend Developer Guide

This section covers the NestJS backend of Farm, including its architecture, modules, and infrastructure services.

## Technology Stack

- **NestJS 11** -- Progressive Node.js framework with TypeScript
- **TypeORM** -- Object-Relational Mapper with PostgreSQL support
- **Passport + JWT** -- Authentication with token refresh rotation
- **BullMQ + Redis** -- Background job processing
- **Socket.IO** -- Real-time WebSocket events
- **OpenTelemetry** -- Distributed tracing
- **Prometheus** -- Metrics collection
- **Winston** -- Structured logging

## Sections

| Topic | Description |
|-------|-------------|
| [Architecture](architecture.md) | Module structure, request flow, data storage, and caching |
| [Multi-Tenancy and RBAC](multi-tenancy.md) | Organizations, org roles, OrgContextInterceptor, and query scoping |
| [Plugin System](plugins.md) | Extending Farm with metadata-driven plugins |
| [Testing](testing.md) | Unit tests with Jest, E2E tests, coverage thresholds |
| [Observability](observability.md) | Prometheus metrics, Grafana dashboards, OpenTelemetry tracing |
| [WebSockets](websockets.md) | Real-time event streaming via Socket.IO |
| [Queues](queues.md) | Background job processing with BullMQ and Redis |
| [Email](email.md) | Transactional email with SMTP and Handlebars templates |
| [Migrations](index.md#database-migrations-and-seeding) | TypeORM migrations, Kubernetes migration Job, pre-install hooks |
| [Database Seeding](index.md#database-seeding) | Seed Job architecture, post-install hook, idempotency patterns |

## Project Structure

```text
apps/api/src/
  app.module.ts          # Root application module
  main.ts                # Application entry point
  common/                # Shared utilities (filters, health, logger, observability)
  config/                # Environment configuration
  migrations/            # TypeORM migrations
  database/seeds/        # Database seeders
  modules/
    auth/                # Authentication module
    catalog/             # Catalog module
    documentation/       # Documentation module
    environments/        # Environments and Deployments module
    teams/               # Teams and Ownership module
    audit-log/           # Audit log module
    organization/        # Organization and multi-tenancy module
    plugin-manager/      # Plugin manager module
    kubernetes/          # Kubernetes workload, CRD, Rollout, Gatekeeper, Dragonfly, Flux, KEDA
    istio/               # Istio service mesh
    linkerd/             # Linkerd service mesh
    opa/                 # OPA policy evaluation
    registry/            # Container registry integration
    finops/              # OpenCost cost sync and budget tracking
    search/              # Cross-entity quick search
    features/            # Feature availability flags
    setup/               # Admin onboarding checklist
apps/api/test/           # End-to-end tests
```

## Quick Start

```bash
# Install backend dependencies
npm install

# Start with Docker (API + PostgreSQL)
make up-docker

# Seed sample data
make seed

# Run backend checks
make check-back
```

## Database Migrations and Seeding

Farm uses **TypeORM migrations** for schema management and **Kubernetes Job hooks** for data seeding:

- **Migrations** (`src/migrations/`) run as a Kubernetes Job with `pre-install,pre-upgrade` hook weights (-1), ensuring the database schema is ready before the application starts.
- **Seeds** (`src/database/seeds/`) populate demo or initial data via a post-install Job hook (weight 1) after deployments succeed. Seeds never run on upgrades because the Seed Job hook is `post-install` only.

Production deployments use:

```yaml
migration:
  enabled: true        # Run schema migrations
seed:
  enabled: false       # Disable seed data in production
```

For local development with `values-dev.yaml`:

```yaml
migration:
  enabled: true
seed:
  enabled: true        # Populate demo data
```

## Database Seeding

The Seed Job (`deploy/helm/farm/templates/seed-job.yaml`) is a post-install Helm hook that runs the seed-runner application after successful deployment. It populates demo organizations, teams, users, and sample catalog components.

Key patterns:

- **Idempotency**: Seeds use `findOrCreate` patterns to avoid duplicate inserts on retries
- **Bypass flag**: `SEED_FORCE=true` bypasses the seed-runner environment guard (allows seeding when `NODE_ENV` is not in the allowed list, e.g. in a controlled Kubernetes Job)
- **Node environment**: Seeds set `NODE_ENV=production` when running in K8s
- **Exclusivity**: Seeds never run during application startup (seed-runner has `require.main === module` guard)

See `src/database/seeds/seed-runner.ts` for implementation details and test coverage.


