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
| [Plugin System](plugins.md) | Extending Farm with metadata-driven plugins |
| [Testing](testing.md) | Unit tests with Jest, E2E tests, coverage thresholds |
| [Observability](observability.md) | Prometheus metrics, Grafana dashboards, OpenTelemetry tracing |
| [WebSockets](websockets.md) | Real-time event streaming via Socket.IO |
| [Queues](queues.md) | Background job processing with BullMQ and Redis |
| [Email](email.md) | Transactional email with SMTP and Handlebars templates |

## Project Structure

```
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
    plugin-manager/      # Plugin manager module
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
