import { Type, DynamicModule, ForwardReference } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Metadata for a Farm plugin
 */
export class PluginMetadata {
  @ApiProperty({
    example: "github-actions",
    description: "The unique plugin name",
  })
  name: string;

  @ApiProperty({ example: "1.0.0", description: "The plugin version" })
  version: string;

  @ApiProperty({
    example: "Integrates GitHub Actions workflows",
    description: "A brief description of what the plugin does",
  })
  description: string;

  @ApiProperty({
    example: "Ops-Talks",
    description: "The plugin author",
    required: false,
  })
  author?: string;
}

/**
 * Describes a route contribution provided by a plugin.
 */
export class PluginRouteContribution {
  @ApiProperty({ example: "/ci/pipelines", description: "Route path" })
  path: string;

  @ApiProperty({ example: "GET", description: "HTTP method" })
  method: string;

  @ApiProperty({ example: "List CI pipelines", description: "Description" })
  description: string;
}

/**
 * Describes a menu item contributed by a plugin for UI navigation.
 */
export class PluginMenuItem {
  @ApiProperty({ example: "CI/CD", description: "Display label" })
  label: string;

  @ApiProperty({ example: "/ci", description: "Navigation path or URL" })
  path: string;

  @ApiProperty({ example: "rocket", description: "Icon name", required: false })
  icon?: string;

  @ApiProperty({
    example: 10,
    description: "Sort order in the menu",
    required: false,
  })
  order?: number;

  @ApiProperty({
    example: "github-actions",
    description: "Plugin that contributes this item",
  })
  pluginName: string;
}

/**
 * Manifest for externally loaded plugins (plugin.json).
 */
export class PluginManifest {
  @ApiProperty({ example: "my-plugin", description: "Plugin name" })
  name: string;

  @ApiProperty({ example: "1.0.0", description: "Plugin version" })
  version: string;

  @ApiProperty({ example: "My plugin description", description: "Description" })
  description: string;

  @ApiProperty({
    example: "John Doe",
    description: "Plugin author",
    required: false,
  })
  author?: string;

  @ApiProperty({
    example: "./index.js",
    description: "Main module entry point",
  })
  main: string;

  @ApiProperty({
    description: "Route contributions",
    type: [PluginRouteContribution],
    required: false,
  })
  routes?: PluginRouteContribution[];

  @ApiProperty({
    description: "Menu item contributions",
    type: [PluginMenuItem],
    required: false,
  })
  menuItems?: PluginMenuItem[];
}

/**
 * Base interface for Farm plugins
 * A plugin is essentially a NestJS module with additional metadata
 */
export interface FarmPlugin {
  metadata: PluginMetadata;
  module:
    | Type<unknown>
    | DynamicModule
    | Promise<DynamicModule>
    | ForwardReference;
}
