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
- [Winston](https://github.com/winstonjs/winston) - Structured logging
- [Terminus](https://docs.nestjs.com/recipes/terminus) - Advanced health monitoring
- [Swagger](https://swagger.io/) - API Documentation

## Development

Prerequisites: Node.js ≥20, npm ≥10 (PostgreSQL optional if using Docker).

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run start:dev    # watch mode
e npm run start:prod  # build+run
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

## API Endpoints

All endpoints are prefixed with `/api`. For full details, visit `/api/docs` when the server is running.

#### Health & Monitoring

- `GET /api/health` - Advanced health status (DB, Memory, Disk, Version)

#### Catalog

- `POST /api/catalog/components` - Register a new component
- `GET /api/catalog/components` - List all components
- `GET /api/catalog/components/:id` - Get a specific component
- `PATCH /api/catalog/components/:id` - Update a component
- `DELETE /api/catalog/components/:id` - Remove a component

#### Documentation

- `POST /api/docs` - Create a documentation entry
- `GET /api/docs` - List all documentation (supports `?componentId=` filter)
- `GET /api/docs/search` - Search documentation by title (`?q=&componentId=`)
- `GET /api/docs/tree` - Get documentation navigation tree (`?componentId=`)
- `GET /api/docs/:id` - Get documentation metadata
- `GET /api/docs/:id/content` - Get raw Markdown content
- `GET /api/docs/:id/rendered` - Get rendered HTML content
- `PATCH /api/docs/:id` - Update a documentation entry
- `DELETE /api/docs/:id` - Remove a documentation entry

#### Teams

- `POST /api/teams` - Create a team (admin)
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team by ID
- `PATCH /api/teams/:id` - Update a team (admin)
- `DELETE /api/teams/:id` - Delete a team (admin)
- `POST /api/teams/:id/members/:userId` - Add team member (admin)
- `DELETE /api/teams/:id/members/:userId` - Remove team member (admin)
- `GET /api/teams/:id/members` - List team members
- `GET /api/teams/:id/components` - List team components

#### Environments

- `POST /api/environments` - Create environment (admin)
- `GET /api/environments` - List all environments
- `GET /api/environments/:id` - Get environment by ID
- `PATCH /api/environments/:id` - Update environment (admin)
- `DELETE /api/environments/:id` - Delete environment (admin)

#### Deployments

- `POST /api/deployments` - Record a deployment (admin)
- `GET /api/deployments` - List deployments (filterable)
- `GET /api/deployments/:id` - Get deployment details
- `PATCH /api/deployments/:id` - Update deployment status (admin)
- `GET /api/deployments/latest` - Latest deployments per environment (`?componentId=`)
- `GET /api/deployments/matrix` - Component-environment deployment matrix

#### Auth

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate a user
- `GET /api/auth/users` - List all users

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
