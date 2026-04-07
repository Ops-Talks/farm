# Development Setup

This guide walks you through setting up a development environment for Farm.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| npm | 10+ | Package manager |
| Docker | 24+ | Containerization and environment isolation |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Make | 4+ | Task automation and simplified commands |
| Git | Latest | Version control |

### Recommended Tools

- **Visual Studio Code** with the following extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Ops-Talks/farm.git
cd farm
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies (API + Web)
npm install
```

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

### 3. Start the Development Server

#### Option A: Full Stack with Docker (Recommended)

Start the entire stack (API, database, Redis, observability, docs, and web) with a single command:

```bash
make up-all
```

This builds all images and starts all containers. Access points:

| Service | URL |
|---------|-----|
| Web UI | [http://localhost:3001](http://localhost:3001) |
| API | [http://localhost:3000/api](http://localhost:3000/api) |
| Swagger UI | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (Basic Auth: `farm` / `farm`) |
| Grafana | [http://localhost:3002](http://localhost:3002) |
| Prometheus | [http://localhost:9090](http://localhost:9090) |
| MkDocs | [http://localhost:8000](http://localhost:8000) |

To stop and clean up:

```bash
make down-all
# Or to wipe database data as well:
make down-docker-clean
```

#### Seeding Sample Data

After starting the application, populate the database with sample data:

```bash
DATABASE_PASSWORD=password DATABASE_SYNC=true make seed
```

This creates default users and sample catalog entries. The seeder is idempotent and only runs in development/test environments.

| User | Password | Role |
|------|----------|------|
| admin | Admin1234 | admin |
| developer | Developer1 | user |

#### Option B: Backend Only (Docker)

```bash
make up-docker
```

This starts the API and PostgreSQL database. Use when working on backend features without the full observability stack.

#### Option C: Local Development (Node.js)

For local development with hot-reload, start the database with Docker and run the backend and frontend locally:

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Start backend (port 3000)
npm run start:dev -w apps/api

# Start frontend (port 3001, separate terminal)
npm run web:dev -- --port 3001
```

#### Running Documentation Server

The documentation server is part of the main `docker-compose.yml` under the `docs` profile:

```bash
make docs-up        # Start MkDocs at http://localhost:8000
make docs-down      # Stop
make docs-build     # Build static site into ./site
make docs-logs      # Follow container logs
```

## Project Structure

```
farm/
  apps/
    api/                   # NestJS backend
      src/
        app.module.ts      # Root application module
        main.ts            # Application entry point
        common/            # Shared utilities (filters, guards, health, logger)
        config/            # Environment configuration with Joi validation
        database/          # Seeds and database utilities
        migrations/        # TypeORM migrations
        modules/           # Feature modules
          auth/            # Authentication, JWT, OAuth (GitHub, Google), Keycloak OIDC
          catalog/         # Software component catalog with YAML discovery
          documentation/   # Markdown documentation with tree navigation
          environments/    # Environments and deployment tracking
          teams/           # Teams and ownership management
          organization/    # Multi-tenant org isolation and RBAC
          audit-log/       # Immutable audit trail
          plugin-manager/  # Plugin registry and discovery
          analytics/       # Catalog health, DORA metrics, usage reports
          alerting/        # PromQL-based alerting rules
          dashboard/       # Custom dashboard builder with widgets
          slo/             # Service Level Objectives and error budgets
          incident/        # Incident lifecycle and post-mortem
          pipelines/       # Multi-stage pipeline execution with WebSocket streaming
          service-template/ # Golden path templates and service scaffolding
          environment-request/ # Environment provisioning approval workflow
          helm/            # Helm release discovery and sync
          kubernetes/      # Kubernetes workload, CRD, Rollout, Kyverno discovery
          istio/           # Istio service mesh traffic and security
          integrations/    # CI/CD integrations (ArgoCD, CircleCI, Jenkins, TravisCI)
          cloud/           # AWS, GCP, Azure resource discovery and cost
          tag-policy/      # Tag governance and compliance
          gateway/         # API gateway (Kong, AWS API Gateway) integration
          api-specs/       # API specification lifecycle and consumer tracking
      test/                # End-to-end tests (supertest + SQLite in-memory)
    apps/web/              # Next.js frontend
      src/
        app/               # App Router pages
        components/        # React components
        contexts/          # Context providers
        lib/               # API client, WebSocket, utilities
        types/             # TypeScript types
      e2e/                 # Playwright browser-level E2E tests
  docs/                    # MkDocs documentation source
```

## Available Scripts

### Backend

Run these from the monorepo root, or from within `apps/api/` directly.

| Script | Description |
|--------|-------------|
| `npm run api:dev` | Start API with hot-reload (root workspace command) |
| `npm run api:build` | Build the API |
| `npm run api:test` | Run API unit tests |
| `npm run api:test:e2e` | Run API E2E tests |
| `npm run start:dev` (in apps/api) | Start with hot-reload (run from within apps/api/) |
| `npm run lint` (in apps/api) | Run ESLint |
| `npm run format` (in apps/api) | Format code with Prettier |

### Frontend

| Script | Description |
|--------|-------------|
| `make web-dev` | Start dev server with hot-reload |
| `make web-build` | Build for production |
| `make web-lint` | Run ESLint |
| `make web-test` | Run Vitest tests |
| `npm run web:dev` | Start dev server (direct npm workspace command) |
| `npm run web:build` | Build for production (direct) |
| `npm run web:test` | Run Vitest tests (direct) |

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make up-docker` | Build and start API and PostgreSQL database |
| `make down-docker` | Stop Docker containers |
| `make down-docker-clean` | Stop containers and remove database volumes |
| `make up-observability` | Start API + DB + Redis + Grafana + Prometheus + Tempo |
| `make up-all` | Start the full stack (API + DB + Redis + Observability + Docs + Web) |
| `make down-all` | Stop the full stack |
| `make healthcheck` | Query the local API advanced health endpoint |
| `make seed` | Seed the database with sample data |
| `make check` | Run all checks (backend + frontend) |
| `make check-back` | Run backend checks (fmt, lint, test, e2e) |
| `make check-front` | Run frontend checks (lint, build, test) |
| `make web-dev` | Start the frontend dev server |
| `make web-build` | Build the frontend for production |
| `make web-lint` | Lint the frontend code |
| `make web-test` | Run frontend tests |
| `make docs-up` | Start the documentation server (MkDocs) |
| `make docs-down` | Stop documentation container |
| `make test-docker` | Execute backend tests in a clean container |
| `make release` | Create a new release using release-it |

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run checks:
   ```bash
   make check          # Full check (backend + frontend)
   make check-back     # Backend only
   make check-front    # Frontend only
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Code Style

Farm uses ESLint and Prettier to maintain consistent code style:

- Run `npm run lint` to check for linting issues
- Run `npm run format` to automatically format code
- Most editors can be configured to format on save

### Debugging

#### Backend (VS Code)

Create a `.vscode/launch.json` file:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Farm API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### Backend (Command Line)

```bash
npm run start:debug
# Attach debugger to port 9229
```

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | HTTP server port |
| `LOG_LEVEL` | `info` | Minimum log level for Winston |
| `DATABASE_TYPE` | `postgres` | Database engine (`postgres`, `sqlite`) |
| `DATABASE_HOST` | `localhost` | Database hostname |
| `DATABASE_PORT` | `5432` | Database port |
| `DATABASE_USER` | `postgres` | Database username |
| `DATABASE_PASSWORD` | `postgres` | Database password |
| `DATABASE_NAME` | `farm` | Database name |
| `DATABASE_SYNC` | `false` | Enable TypeORM auto-sync |
| `DATABASE_POOL_SIZE` | `10` | Database connection pool size |
| `JWT_SECRET` | (auto-generated in dev) | Secret key for JWT signing (min 32 chars in production) |
| `JWT_EXPIRATION` | `3600s` | JWT token expiration time |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |
| `SWAGGER_USER` | `farm` | HTTP Basic Auth username for `/api/docs` |
| `SWAGGER_PASSWORD` | `farm` | HTTP Basic Auth password for `/api/docs` |
| `THROTTLE_TTL` | `60000` | Rate limit time window (ms) |
| `THROTTLE_LIMIT` | `10` | Maximum requests per TTL window |
| `REDIS_HOST` | *(empty)* | Redis hostname (empty for in-memory cache) |
| `REDIS_PORT` | `6379` | Redis port |
| `CACHE_TTL` | `30` | Cache time-to-live (seconds) |
| `SMTP_HOST` | *(empty)* | SMTP server hostname (empty to disable email) |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Use TLS (`true` for port 465) |
| `SMTP_USER` | *(empty)* | SMTP authentication username |
| `SMTP_PASS` | *(empty)* | SMTP authentication password |
| `SMTP_FROM` | `Farm <noreply@farm.local>` | Default sender address |
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry trace export |
| `OTEL_EXPORTER_ENDPOINT` | `http://localhost:4318/v1/traces` | OTLP HTTP endpoint |
| `OTEL_SERVICE_NAME` | `farm-api` | Service name in trace metadata |
| `GRAFANA_URL` | *(empty)* | Grafana base URL (leave empty to disable Grafana links) |
| `PROMETHEUS_URL` | `http://localhost:9090` | Prometheus endpoint for metrics proxy |
| `JAEGER_URL` | `http://localhost:16686` | Jaeger UI endpoint for traces proxy |
| `LOKI_URL` | `http://localhost:3100` | Loki endpoint for log aggregation proxy |
| `GITHUB_CLIENT_ID` | *(empty)* | GitHub OAuth application client ID |
| `GITHUB_CLIENT_SECRET` | *(empty)* | GitHub OAuth application client secret |
| `GITHUB_CALLBACK_URL` | `http://localhost:3000/api/v1/auth/github/callback` | GitHub OAuth redirect URI |
| `GOOGLE_CLIENT_ID` | *(empty)* | Google OAuth application client ID |
| `GOOGLE_CLIENT_SECRET` | *(empty)* | Google OAuth application client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/v1/auth/google/callback` | Google OAuth redirect URI |
| `SLACK_WEBHOOK_URL` | *(empty)* | Slack incoming webhook URL for notifications (leave empty to disable) |
| `TEAMS_WEBHOOK_URL` | *(empty)* | Microsoft Teams webhook URL for notifications (leave empty to disable) |
| `PLUGINS_DIR` | `./plugins` | Directory for external runtime plugins |
| `KUBECONFIG_PATH` | *(empty)* | Path to a kubeconfig file; leave empty to use in-cluster config (Kubernetes, Helm, and CRD features) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | *(none)* | Public API URL (fallback for rewrites) |
| `API_INTERNAL_URL` | `http://api:3000/api` | Internal Docker API URL (build-time) |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:3000` | WebSocket server URL |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js anonymous telemetry (set in `apps/web/.env.local`) |

## OAuth Social Login

Farm supports login via GitHub and Google using OAuth 2.0. Both providers are optional — if the credentials are not configured, the buttons are still rendered in the UI but will fail at the GitHub/Google authorization page. Leave all six variables empty to disable social login entirely.

### GitHub OAuth

1. Go to **github.com → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in the fields:

   | Field | Value |
   |-------|-------|
   | Application name | Farm |
   | Homepage URL | `http://localhost:3000` (or your production domain) |
   | Authorization callback URL | `http://localhost:3000/api/v1/auth/github/callback` |

3. After creating the app, copy the **Client ID** and generate a **Client Secret**.
4. Add to `apps/api/.env`:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/v1/auth/github/callback
```

### Google OAuth

1. Go to **console.cloud.google.com → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
2. Set application type to **Web application**.
3. Add an authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**.
5. Add to `apps/api/.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

### Production

Replace `http://localhost:3000` with your public domain in all callback URLs. Update the registered callback URL in the GitHub/Google developer console to match.

When running via Docker Compose, add the variables to the `api` service environment in `docker-compose.yml` or pass them via a `.env` file at the repository root.

### How it works

1. User clicks "Continue with GitHub" or "Continue with Google" on the login page.
2. The browser navigates to `GET /api/v1/auth/github` (or `/google`), which redirects to the provider's authorization page.
3. After the user authorizes, the provider redirects back to the callback URL.
4. The API finds or creates the user account, then returns a JWT access token and refresh token.
5. The browser is redirected to the Farm dashboard with the session established.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
PORT=3001 npm run api:dev
```

### Dependency Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Frontend Build Errors

```bash
cd apps/web
rm -rf node_modules .next
cd ../..
npm install
npm run web:build
```

### Docker Port Conflicts

The default port mapping is:

| Container | Port |
|-----------|------|
| farm-api | 3000 |
| farm-web | 3001 |
| farm-grafana | 3002 |
| farm-prometheus | 9090 |
| farm-tempo | 3200, 4318 |
| farm-docs | 8000 |
| farm-db | 5432 |
| farm-redis | 6379 |

If a port is already in use, stop the conflicting process or adjust the port mapping in `docker-compose.yml` or `docker-compose.observability.yml`.
