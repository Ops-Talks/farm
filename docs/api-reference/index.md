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

## Rate Limiting

Rate limiting is not currently implemented. This feature is planned for future releases.

## Versioning

The API does not currently use versioning. Breaking changes will be documented in release notes.
