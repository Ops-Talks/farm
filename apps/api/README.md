# Farm API

NestJS 11 backend for the Farm developer portal. Provides RESTful APIs for catalog, deployments, pipelines, observability, RBAC, and infrastructure management.

## Tech Stack

- **Runtime:** Node 26 (ES2023)
- **Framework:** NestJS 11
- **Database:** PostgreSQL 16 (via TypeORM)
- **Queue:** BullMQ (Redis-backed)
- **Validation:** class-validator + global ValidationPipe
- **Auth:** JWT (passport), RBAC, and org-scoped permissions
- **API Docs:** Swagger/OpenAPI at `/api/docs`

## Quick Start

```bash
npm install
npm run start:dev --workspace=apps/api
```

Requires PostgreSQL and Redis running (see `docker-compose.yml` at project root).

## Test

```bash
npm run test --workspace=apps/api        # unit tests
npm run test:e2e --workspace=apps/api     # e2e tests
```

## Project Structure

```
src/
  config/           — Joi-validated configuration
  common/           — shared guards, decorators, pipes, filters
  database/         — TypeORM entities, migrations, seeds
  modules/          — feature modules (catalog, pipelines, ...)
  main.ts           — application entrypoint
```

## Configuration

All configuration is loaded from environment variables and validated via Joi schemas in `src/config/configuration.ts`. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `JWT_SECRET` | Token signing secret | — |

See `deploy/helm/farm/README.md` for the full parameter reference.
