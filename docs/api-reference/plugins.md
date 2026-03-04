# Plugins API

The Plugins API provides endpoints for discovering and managing Farm plugins. This allows for dynamic feature detection and metadata-driven development.

## Overview

All plugins registered in the `PluginManagerModule` are accessible via these endpoints.

## Endpoints

### List Plugins

Retrieves a list of all active plugins and their metadata.

**Request**

`GET /api/plugins`

**Response**

- **Status Code**: 200 OK
- **Body**: An array of `PluginMetadata` objects.

```json
[
  {
    "name": "core-catalog",
    "version": "1.0.0",
    "description": "Software catalog management"
  },
  {
    "name": "core-documentation",
    "version": "1.0.0",
    "description": "Technical documentation management"
  },
  {
    "name": "core-auth",
    "version": "1.0.0",
    "description": "Authentication and authorization"
  }
]
```

## Data Models

### PluginMetadata

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique name of the plugin |
| `version` | string | Current version of the plugin |
| `description` | string | Brief description of the plugin's purpose |
| `author` | string (optional) | The plugin author's name |
