import { Injectable, Logger } from "@nestjs/common";
import {
  PluginMetadata,
  PluginMenuItem,
  PluginRouteContribution,
  PluginManifest,
} from "./interfaces/plugin.interface";
import * as fs from "fs";
import * as path from "path";

/**
 * Central registry for platform plugins registered at startup via
 * PluginManagerModule.forRoot().
 *
 * All mutable state (plugins map, menuItems array, routes array) is populated
 * deterministically during module initialization from the static configuration
 * passed to forRoot(). No runtime writes occur after bootstrap, making this
 * service safe for multi-replica deployments: every replica builds identical
 * state from the same configuration without requiring cross-replica
 * synchronization.
 */
@Injectable()
export class PluginManagerService {
  private readonly logger = new Logger(PluginManagerService.name);
  private readonly plugins = new Map<string, PluginMetadata>();
  private readonly menuItems: PluginMenuItem[] = [];
  private readonly routes: PluginRouteContribution[] = [];

  /**
   * Registers a plugin's metadata in the central registry
   * @param metadata The plugin metadata to register
   */
  register(metadata: PluginMetadata): void {
    if (this.plugins.has(metadata.name)) {
      this.logger.warn(
        `Plugin ${metadata.name} is already registered. Overwriting.`,
      );
    }
    this.plugins.set(metadata.name, metadata);
    this.logger.log(
      `Plugin registered: ${metadata.name} (v${metadata.version})`,
    );
  }

  /**
   * Returns a list of all registered plugins
   */
  getPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Gets metadata for a specific plugin
   * @param name The unique name of the plugin
   */
  getPlugin(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  /**
   * Registers menu items contributed by a plugin.
   * @param items Array of menu items to register
   */
  registerMenuItems(items: PluginMenuItem[]): void {
    this.menuItems.push(...items);
    this.menuItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Returns all registered menu items, sorted by order.
   */
  getMenuItems(): PluginMenuItem[] {
    return [...this.menuItems];
  }

  /**
   * Registers route contributions from a plugin.
   * @param contributions Array of route contributions
   */
  registerRoutes(contributions: PluginRouteContribution[]): void {
    this.routes.push(...contributions);
  }

  /**
   * Returns all registered route contributions.
   */
  getRoutes(): PluginRouteContribution[] {
    return [...this.routes];
  }

  /**
   * Scans a directory for plugin manifests (plugin.json files).
   * Each subdirectory that contains a valid plugin.json is read, validated,
   * and registered via register(). Errors in individual manifests are logged
   * without interrupting the overall scan.
   * @param dir The directory to scan
   * @returns Array of discovered and registered plugin manifests
   */
  scanDirectory(dir: string): PluginManifest[] {
    const manifests: PluginManifest[] = [];

    if (!fs.existsSync(dir)) {
      // Plugin directory is optional; a missing directory simply means no
      // user-installed plugins are present. Log at DEBUG to avoid noise in
      // local dev / containers that ship without a plugin folder.
      this.logger.debug(`Plugin directory does not exist: ${dir}`);
      return manifests;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(dir, entry.name, "plugin.json");
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, "utf-8");
        const manifest = JSON.parse(raw) as PluginManifest;

        if (!manifest.name || !manifest.version || !manifest.description) {
          this.logger.warn(
            `Invalid plugin manifest in ${entry.name}: missing required fields (name, version, description)`,
          );
          continue;
        }

        this.register({
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
        });

        manifests.push(manifest);
        this.logger.log(
          `Discovered plugin: ${manifest.name} (v${manifest.version})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to parse plugin.json in ${entry.name}`,
          error,
        );
      }
    }

    return manifests;
  }
}
