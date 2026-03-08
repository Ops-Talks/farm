# Plugins API

The Plugins API provides endpoints for discovering and managing Farm plugins. This allows for dynamic feature detection and metadata-driven development.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/plugins` | List all registered plugins | JWT + Admin |
| `GET` | `/api/plugins/menu-items` | Get all plugin menu items | JWT |
| `GET` | `/api/plugins/routes` | Get all plugin route contributions | JWT + Admin |

## Caching

All GET endpoints in the Plugins API use automatic response caching. Cache TTL is configured via the `CACHE_TTL` environment variable (default: 30 seconds). Since plugins are registered at startup and rarely change at runtime, caching is highly effective for these endpoints.
