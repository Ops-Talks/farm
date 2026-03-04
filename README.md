# Farm

Farm is an open-source developer portal platform. It provides a centralized hub for managing software components, technical documentation, and team infrastructure.

## Overview

Farm enables engineering teams to:

- Track all software components (services, libraries, APIs, websites) in a unified catalog
- Manage technical documentation associated with each component
- Handle user authentication and role-based access
- Discover and understand the software ecosystem within an organization

## Technology Stack

- [NestJS](https://docs.nestjs.com) - Progressive Node.js framework for building server-side applications
- TypeScript - Typed superset of JavaScript
- REST API - HTTP-based API following REST principles

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

The API server starts on port 3000 by default. Set the `PORT` environment variable to use a different port.

### API Endpoints

All endpoints are prefixed with `/api`.

#### Health

- `GET /api/health` - Check application health status

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
