# API Reference

This section provides detailed reference documentation for all Farm API endpoints.

## Overview

Farm exposes a REST API for managing the portal. All endpoints are prefixed with `/api`.

## Base URL

```
http://localhost:3000/api
```

## Interactive Documentation

Farm provides an interactive API documentation interface using Swagger UI. This allows you to explore endpoints, view request/response schemas, and test API calls directly from your browser.

**Swagger UI Endpoint**: `http://localhost:3000/api/docs`

Access requires HTTP Basic Auth credentials. The defaults for local development are `farm` / `farm`. Set `SWAGGER_USER` and `SWAGGER_PASSWORD` environment variables to change them in production.

## Authentication

All endpoints are protected with JWT-based authentication. Include a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Mutation endpoints (POST, PATCH, DELETE) require the `admin` role.

## Available APIs

| API | Base Path | Description |
|-----|-----------|-------------|
| [Health](health.md) | `/api/health` | Health check endpoints |
| [Auth](auth.md) | `/api/v1/auth` | User registration and login |
| [Catalog](catalog.md) | `/api/v1/catalog` | Software component catalog |
| [Documentation](docs.md) | `/api/v1/docs` | Technical documentation |
| [Environments](environments.md) | `/api/v1/environments` | Deployment environments |
| [Deployments](deployments.md) | `/api/v1/deployments` | Component deployment tracking |
| [Teams](teams.md) | `/api/v1/teams` | Team ownership and membership |
| [Organizations](organizations.md) | `/api/v1/organizations` | Organization and member management |
| [Plugins](plugins.md) | `/api/v1/plugins` | Plugin registry |
| [Audit Log](audit-log.md) | `/api/v1/audit-log` | Immutable audit trail for system actions |
| [Analytics](analytics.md) | `/api/v1/analytics` | Catalog health, DORA metrics, usage reports |
| [Helm](helm.md) | `/api/v1/helm` | Helm release discovery and sync |
| [Kubernetes](kubernetes.md) | `/api/v1/kubernetes` | Kubernetes workload and CRD discovery |
| [CI/CD Integrations](cicd.md) | `/api/v1/argocd`, `/api/v1/circleci`, `/api/v1/jenkins`, `/api/v1/travisci` | External CI/CD platform integrations |

## Response Format

All responses are JSON formatted. Successful responses include the requested data, while error responses follow a standard format:

```json
{
  "statusCode": 404,
  "message": "Component with ID \"abc\" not found",
  "error": "Not Found"
}
```

## Rate Limiting

Rate limiting is enforced globally via the `@nestjs/throttler` module. Authentication endpoints have stricter per-endpoint limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/v1/auth/login` | 5 requests | 1 minute |
| `POST /api/v1/auth/register` | 5 requests | 1 minute |
| `POST /api/v1/auth/refresh` | 10 requests | 1 minute |
| All other endpoints | Configurable via `THROTTLE_LIMIT` | Configurable via `THROTTLE_TTL` |

When the rate limit is exceeded, the API returns `429 Too Many Requests`.

## Versioning

The API uses URI-based versioning. All resource endpoints are prefixed with `/api/v1/`. Infrastructure endpoints (`/api/health`, `/api/metrics`, `/api/docs`) remain version-neutral and do not include a version prefix.
