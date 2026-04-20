import { PluginMenuItem, PluginRouteContribution } from "./plugin.interface";

/**
 * Manifest v2 schema for Farm plugins.
 * Defines all metadata required for lifecycle management, registry publishing,
 * dependency resolution, and frontend rendering.
 */
export interface PluginManifestV2 {
  /** Unique identifier for this plugin, e.g. "farm-plugin-slack" */
  id: string;

  /** Display name shown in the UI */
  name: string;

  /** Semantic version string, e.g. "1.2.3" */
  version: string;

  /** Short description of what the plugin does */
  description: string;

  /** Plugin author name or contact */
  author?: string;

  /** SPDX license identifier, e.g. "MIT" */
  license?: string;

  /** Minimum Farm platform version required to run this plugin */
  farmMinVersion?: string;

  /** URL or npm package identifier used to load the plugin entry module */
  entryPoint: string;

  /** Permission scopes the plugin requires, e.g. ["catalog:read", "teams:write"] */
  permissions?: string[];

  /** Plugin IDs this plugin depends on; must be installed before this plugin */
  dependsOn?: string[];

  /** Menu items contributed to the Farm navigation */
  menuContributions?: PluginMenuItem[];

  /** Route contributions for lazy-loaded plugin pages */
  routeContributions?: PluginRouteContribution[];

  /** JSON Schema object describing plugin-specific configuration */
  settingsSchema?: Record<string, unknown>;
}
