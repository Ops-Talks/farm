# Farm

[![CI](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Ops-Talks/farm/graph/badge.svg)](https://codecov.io/gh/Ops-Talks/farm)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018-brightgreen)](https://nodejs.org/)
[![NestJS Version](https://img.shields.io/badge/nestjs-%5E11.0.1-red)](https://nestjs.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Farm is an open-source developer portal platform. It provides a centralized hub for managing software components, technical documentation, and team infrastructure.

## Quick Start (Docker)

The fastest way to get Farm running is using Docker and Docker Compose. This starts both the API and a PostgreSQL database.

```bash
# Start the entire environment (API + Database)
make up-docker

# Check if everything is healthy
make healthcheck

# Stop and remove containers
make down-docker

# Stop and remove everything including database volumes (clean reset)
make down-docker-clean
```

The API will be available at [http://localhost:3000/api](http://localhost:3000/api).
Interactive API documentation (Swagger) is available at [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

## Technology Stack

- [NestJS](https://docs.nestjs.com) - Progressive Node.js framework
- [TypeORM](https://typeorm.io) - Data persistence with PostgreSQL
- [Winston](https://github.com/winstonjs/winston) - Structured logging
- [Terminus](https://docs.nestjs.com/recipes/terminus) - Advanced health monitoring
- [Swagger](https://swagger.io/) - API Documentation

## Getting Started (Local Development)

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL (or use Docker for the database)

### Installation

```bash
npm install
```

### Database Migrations

Farm uses TypeORM migrations to manage the database schema.

```bash
# Generate a new migration based on entity changes
npm run migration:generate --name=Description

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

### Running the Application

```bash
# Development mode (with watch)
npm run start:dev

# Production mode
npm run start:prod
```

## Makefile Commands

A `Makefile` is provided for common development tasks:

| Command | Description |
|---------|-------------|
| `make up-docker` | Build and start API and DB in Docker |
| `make down-docker` | Stop Docker containers |
| `make healthcheck` | Query the local API health endpoint |
| `make test` | Run local unit tests |
| `make test-e2e` | Run local end-to-end tests |
| `make test-docker` | Run tests inside a Docker container |
| `make lint` | Run linter and fix issues |
| `make fmt` | Format code with Prettier |
| `make check` | Run fmt, lint, and all tests |

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
- `GET /api/docs/:id` - Get a specific documentation entry
- `PATCH /api/docs/:id` - Update a documentation entry
- `DELETE /api/docs/:id` - Remove a documentation entry

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

Full documentation is available at [https://ops-talks.github.io/farm/](https://ops-talks.github.io/farm/).

### Building Documentation Locally

Documentation is built using [MkDocs](https://www.mkdocs.org/) with the [Material theme](https://squidfunk.github.io/mkdocs-material/).

```bash
# Install dependencies
pip install mkdocs-material mkdocs mkdocs-minify-plugin

# Serve documentation locally
mkdocs serve

# Build documentation
mkdocs build
```

### Enabling GitHub Pages (for repository administrators)

To enable documentation deployment for this repository:

1. Go to **Settings** > **Pages** in the repository
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**
3. Select the **gh-pages** branch and **/ (root)** folder
4. The documentation will automatically deploy when changes are pushed to `main` or when a new release is published

## License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for details.
