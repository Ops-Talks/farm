# Plugin System

Farm is built with an extensible architecture that uses a Plugin System to manage features and modules. This allows for a modular and maintainable codebase.

## Overview

The Plugin System is designed to:

- Decouple core platform logic from specific feature modules
- Enable dynamic registration of modules during application startup
- Provide a discovery mechanism for both the backend and frontend
- Facilitate the development of independent, feature-rich plugins

## Core Concepts

### Plugin Interface

Each plugin in Farm must implement the `FarmPlugin` interface, which includes metadata and the corresponding NestJS module.

```typescript
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
}

export interface FarmPlugin {
  metadata: PluginMetadata;
  module: Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;
}
```

### Plugin Manager

The `PluginManagerModule` is a global module responsible for:

1.  **Registry**: Maintaining a central registry of all active plugins and their metadata.
2.  **Dynamic Loading**: Using `forRoot` to dynamically import and configure plugin modules.
3.  **Discovery API**: Exposing an endpoint (`GET /api/plugins`) that lists all active features and their versions.

## Creating a New Plugin

To create a new plugin for Farm, follow these steps:

1.  **Create a Feature Module**: Develop a standard NestJS module (e.g., `MyFeatureModule`).
2.  **Define Metadata**: Create a metadata object describing your plugin.
3.  **Register in AppModule**: Add your plugin to the `PluginManagerModule.forRoot` array in `src/app.module.ts`.

### Example

```typescript
// src/app.module.ts

@Module({
  imports: [
    PluginManagerModule.forRoot([
      {
        metadata: {
          name: 'my-new-feature',
          version: '1.0.0',
          description: 'Adds amazing new capabilities to Farm',
        },
        module: MyFeatureModule,
      },
    ]),
  ],
})
export class AppModule {}
```

## Best Practices

- **Independence**: Plugins should be as independent as possible. Avoid direct dependencies between feature modules.
- **Communication**: Use shared providers or an event-driven approach for cross-plugin communication.
- **Metadata Accuracy**: Ensure the name and version in your plugin metadata reflect its current state.
- **Standardization**: Follow the NestJS development best practices and the Farm directory structure for all new plugins.
