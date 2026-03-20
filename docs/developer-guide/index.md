# Developer Guide

Welcome to the Farm Developer Guide. This section provides comprehensive documentation for developers who want to contribute to Farm or deploy it in their environment.

## Overview

Farm is a full-stack application consisting of a **NestJS backend** (API, database, queues, WebSockets) and a **Next.js frontend** (dashboard, catalog browser, monitoring). This guide is organized into shared topics and stack-specific sections.

## Getting Started

If you are new to Farm development, start with the [Development Setup](setup.md) guide to configure your environment.

## Backend

The [Backend Developer Guide](backend/index.md) covers the NestJS API server:

| Topic | Description |
|-------|-------------|
| [Architecture](backend/architecture.md) | Module structure, request flow, data storage, and caching |
| [Plugin System](backend/plugins.md) | Extending Farm with metadata-driven plugins |
| [Testing](backend/testing.md) | Unit tests with Jest, E2E tests, coverage thresholds |
| [Observability](backend/observability.md) | Prometheus metrics, Grafana dashboards, OpenTelemetry tracing |
| [WebSockets](backend/websockets.md) | Real-time event streaming via Socket.IO |
| [Queues](backend/queues.md) | Background job processing with BullMQ and Redis |
| [Email](backend/email.md) | Transactional email with SMTP and Handlebars templates |

## Frontend

The [Frontend Developer Guide](frontend/index.md) covers the Next.js web application:

| Topic | Description |
|-------|-------------|
| [Architecture](frontend/architecture.md) | Project structure, routing, API integration, and design decisions |
| [Testing](frontend/testing.md) | Vitest setup, writing component tests, and coverage |

## Shared Topics

| Topic | Description |
|-------|-------------|
| [Development Setup](setup.md) | Prerequisites, installation, Docker, and environment variables |
| [Contributing](contributing.md) | Contribution workflow, code style, and pull request guidelines |
| [System Design](system-design.md) | High-level system architecture, data models, and API design |
| [Security Testing](security-testing.md) | SAST, DAST, secret scanning, container CVE scanning, and accessibility testing |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend Framework | NestJS 11 (TypeScript) |
| Frontend Framework | Next.js 16 (React 19) |
| Database | PostgreSQL (SQLite for tests) |
| Cache | Redis (in-memory fallback) |
| Queue | BullMQ with Redis |
| UI Components | Shadcn/ui + Tailwind CSS v4 |
| Backend Tests | Jest (unit + E2E) |
| Frontend Tests | Vitest + React Testing Library |
| Observability | Prometheus, Grafana, OpenTelemetry, Tempo |
| Containerization | Docker + Docker Compose |

## Quick Reference

```bash
# Full stack (Docker)
make up-all

# Backend only
make up-docker

# Run all checks
make check          # Backend + Frontend
make check-back     # Backend only (fmt, lint, test, e2e)
make check-front    # Frontend only (lint, build, test)

# Seed sample data
make seed
```
