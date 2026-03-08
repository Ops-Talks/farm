# Farm

[![CI](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Ops-Talks/farm/graph/badge.svg)](https://codecov.io/gh/Ops-Talks/farm)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018-brightgreen)](https://nodejs.org/)
[![NestJS Version](https://img.shields.io/badge/nestjs-%5E11.0.1-red)](https://nestjs.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Farm is an open-source developer portal providing a centralized hub for managing software components, technical documentation, and team infrastructure.

## Quick Start (Docker)

Use Docker Compose to launch the API together with a PostgreSQL database:

```bash
# start API + DB
make up-docker

# verify health
make healthcheck

# stop containers
make down-docker

# stop and remove volumes (clean slate)
make down-docker-clean
```

Once running, the API is at [http://localhost:3000/api](http://localhost:3000/api) and Swagger UI at `/api/docs`.

## Technology Stack

- [NestJS](https://docs.nestjs.com) - Progressive Node.js framework
- [TypeORM](https://typeorm.io) - Data persistence with PostgreSQL
- [Passport](http://www.passportjs.org/) + [JWT](https://jwt.io/) - Authentication and authorization
- [Socket.IO](https://socket.io/) - WebSocket real-time events
- [BullMQ](https://docs.bullmq.io/) - Background job processing with Redis
- [Redis](https://redis.io) - Response caching and job queues
- [Winston](https://github.com/winstonjs/winston) - Structured logging
- [Terminus](https://docs.nestjs.com/recipes/terminus) - Advanced health monitoring
- [Swagger](https://swagger.io/) - API documentation
- [Helmet](https://helmetjs.github.io/) - HTTP security headers
- [Prometheus](https://prometheus.io) - Metrics collection
- [Grafana](https://grafana.com) - Observability dashboards
- [OpenTelemetry](https://opentelemetry.io) - Distributed tracing

## Development

Prerequisites: Node.js ≥20, npm ≥10 (PostgreSQL optional if using Docker).

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run start:dev    # watch mode
npm run start:prod   # build+run
```

Migrations are handled via TypeORM: see `npm run migration:*` commands documented in package.json.

## Makefile Commands

### Common tasks

| Command | Description |
|---------|-------------|
| `make up-docker` | Build & start API + DB |
| `make down-docker` | Stop containers |
| `make healthcheck` | Hit health endpoint |
| `make test` | Unit tests |
| `make test-e2e` | End-to-end tests |
| `make test-docker` | Run tests in Docker |
| `make lint` | Lint code |
| `make fmt` | Prettier format |
| `make check` | Lint, fmt, and tests |
| `make seed` | Seed database with sample data |
| `make up-observability` | Start with Grafana + Prometheus + Tempo |
| `make down-observability` | Stop observability stack |
| `make release` | Create a release (interactive) |

## API Endpoints

All versioned endpoints use the `/api/v1/` prefix. Health and metrics remain at `/api/` (version-neutral). For full details, visit `/api/docs` when the server is running.

#### Health & Monitoring

- `GET /api/health` - Advanced health status (DB, Memory, Disk, Version)
- `GET /api/metrics` - Prometheus metrics

#### Catalog

- `POST /api/v1/catalog/components` - Register a new component
- `GET /api/v1/catalog/components` - List all components
- `GET /api/v1/catalog/components/:id` - Get a specific component
- `PATCH /api/v1/catalog/components/:id` - Update a component
- `DELETE /api/v1/catalog/components/:id` - Remove a component

#### Documentation

- `POST /api/v1/docs` - Create a documentation entry
- `GET /api/v1/docs` - List all documentation (supports `?componentId=` filter)
- `GET /api/v1/docs/search` - Search documentation by title (`?q=&componentId=`)
- `GET /api/v1/docs/tree` - Get documentation navigation tree (`?componentId=`)
- `GET /api/v1/docs/:id` - Get documentation metadata
- `GET /api/v1/docs/:id/content` - Get raw Markdown content
- `GET /api/v1/docs/:id/rendered` - Get rendered HTML content
- `PATCH /api/v1/docs/:id` - Update a documentation entry
- `DELETE /api/v1/docs/:id` - Remove a documentation entry

#### Teams

- `POST /api/v1/teams` - Create a team (admin)
- `GET /api/v1/teams` - List all teams
- `GET /api/v1/teams/:id` - Get team by ID
- `PATCH /api/v1/teams/:id` - Update a team (admin)
- `DELETE /api/v1/teams/:id` - Delete a team (admin)
- `POST /api/v1/teams/:id/members/:userId` - Add team member (admin)
- `DELETE /api/v1/teams/:id/members/:userId` - Remove team member (admin)
- `GET /api/v1/teams/:id/members` - List team members
- `GET /api/v1/teams/:id/components` - List team components

#### Environments

- `POST /api/v1/environments` - Create environment (admin)
- `GET /api/v1/environments` - List all environments
- `GET /api/v1/environments/:id` - Get environment by ID
- `PATCH /api/v1/environments/:id` - Update environment (admin)
- `DELETE /api/v1/environments/:id` - Delete environment (admin)

#### Deployments

- `POST /api/v1/deployments` - Record a deployment (admin)
- `GET /api/v1/deployments` - List deployments (filterable)
- `GET /api/v1/deployments/:id` - Get deployment details
- `PATCH /api/v1/deployments/:id` - Update deployment status (admin)
- `GET /api/v1/deployments/latest` - Latest deployments per environment (`?componentId=`)
- `GET /api/v1/deployments/matrix` - Component-environment deployment matrix

#### Auth

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Authenticate a user
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/users` - List all users

#### WebSocket Events

Real-time events are available on the `/events` namespace via Socket.IO. See [WebSocket docs](docs/developer-guide/websockets.md) for details.

### Component Kinds

Components in the catalog can be of the following kinds:

- `service` - A backend service or microservice
- `library` - A shared library or package
- `website` - A frontend website or application
- `api` - An API definition or gateway
- `component` - A generic software component

### Component Lifecycle

- `experimental` - Under development, not production-ready
- `production` - Stable and in active use
- `deprecated` - Scheduled for removal

## Development

### Running Tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# End-to-end tests
npm run test:e2e
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Documentation

Full user and developer docs are published at [https://ops-talks.github.io/farm/](https://ops-talks.github.io/farm/).

Local builds are possible with MkDocs if you need to preview changes; otherwise just edit the `docs/` directory and commit.

## License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for details.
