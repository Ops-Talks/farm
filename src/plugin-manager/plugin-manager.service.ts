import { Injectable, Logger } from "@nestjs/common";
import { PluginMetadata } from "./interfaces/plugin.interface";

@Injectable()
export class PluginManagerService {
  private readonly logger = new Logger(PluginManagerService.name);
  private readonly plugins = new Map<string, PluginMetadata>();

  /**
   * Registers a plugin's metadata in the central registry
   * @param metadata The plugin metadata to register
   */
  register(metadata: PluginMetadata): void {
    if (this.plugins.has(metadata.name)) {
      this.logger.warn(
        `Plugin ${metadata.name} is already registered. Overwriting.`
      );
    }
    this.plugins.set(metadata.name, metadata);
    this.logger.log(`Plugin registered: ${metadata.name} (v${metadata.version})`);
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
}
