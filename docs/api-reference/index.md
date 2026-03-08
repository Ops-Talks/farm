# API Reference

This section provides detailed reference documentation for all Farm API endpoints.

## Overview

Farm exposes a REST API for managing the developer portal. All endpoints are prefixed with `/api`.

## Base URL

```
http://localhost:3000/api
```

## Interactive Documentation

Farm provides an interactive API documentation interface using Swagger UI. This allows you to explore endpoints, view request/response schemas, and test API calls directly from your browser.

**Swagger UI Endpoint**: `http://localhost:3000/api/docs`

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
| [Auth](auth.md) | `/api/auth` | User registration and login |
| [Catalog](catalog.md) | `/api/catalog` | Software component catalog |
| [Documentation](docs.md) | `/api/documentation` | Technical documentation |
| [Environments](environments.md) | `/api/environments` | Deployment environments |
| [Deployments](deployments.md) | `/api/deployments` | Component deployment tracking |
| [Teams](teams.md) | `/api/teams` | Team ownership and membership |
| [Plugins](plugins.md) | `/api/plugins` | Plugin registry |

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

Rate limiting is not currently implemented. This feature is planned for future releases.

## Versioning

The API does not currently use versioning. Breaking changes will be documented in release notes.
