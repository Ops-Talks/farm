# System Discovery

Farm includes a System Discovery feature that allows users and developers to easily identify which modules and features are active within the platform.

## Overview

As Farm grows and more plugins are added, it's important to have a central place where you can see all available platform capabilities. The System Discovery mechanism provides this visibility by:

1.  **Transparency**: Showing exactly which versions of core modules and optional plugins are running.
2.  **Metadata-Driven**: Displaying descriptions and authorship for each component.
3.  **Real-Time**: Reflecting the current state of the application as it was started.

## How it Works

The backend exposes an API endpoint (`/api/plugins`) that lists all modules that have been registered with the `PluginManager`.

### Active Plugins

Each module in Farm, including core features like the Software Catalog and Technical Documentation, is treated as a plugin. This ensures a consistent approach to feature detection across the platform.

When you access the system discovery features, you can see information such as:

- **Plugin Name**: The unique identifier for the feature.
- **Version**: The current release version of the module.
- **Description**: A brief explanation of what the feature provides.

## Benefits for Users

- **Feature Awareness**: Know which tools are at your disposal without having to search through multiple menus.
- **Platform Updates**: Easily verify when new versions of features have been deployed.
- **Support**: Provide specific version information when reporting issues or requesting assistance.

## Benefits for Developers

- **API Compatibility**: Programmatically check if a specific plugin is available before making calls to its endpoints.
- **Modularity**: Build new features that can optionally interact with other plugins if they are present.
- **Extensibility**: Add your own custom plugins and have them automatically appear in the system discovery list.
