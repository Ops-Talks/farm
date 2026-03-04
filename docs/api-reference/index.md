# API Reference

This section provides detailed reference documentation for all Farm API endpoints.

## Overview

Farm exposes a REST API for managing the developer portal. All endpoints are prefixed with `/api`.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, most endpoints are publicly accessible. Authentication middleware is planned for future releases.

## Response Format

All responses are JSON formatted. Successful responses include the requested data, while error responses follow a standard format:

```json
{
  "statusCode": 404,
  "message": "Component with ID \"abc\" not found",
  "error": "Not Found"
}
```

## API Sections

| Section | Description |
|---------|-------------|
| [Health](health.md) | Application health check |
| [Catalog](catalog.md) | Software component management |
| [Documentation](docs.md) | Technical documentation management |
| [Authentication](auth.md) | User authentication and management |

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded with no response body |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required or failed |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists |

## Common Request Headers

| Header | Value | Description |
|--------|-------|-------------|
| Content-Type | application/json | Required for POST/PATCH requests |

## Rate Limiting

Rate limiting is not currently implemented. This feature is planned for future releases.

## Versioning

The API does not currently use versioning. Breaking changes will be documented in release notes.
