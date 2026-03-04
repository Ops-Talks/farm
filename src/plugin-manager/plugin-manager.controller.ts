import { Controller, Get } from "@nestjs/common";
import { PluginManagerService } from "./plugin-manager.service";
import { PluginMetadata } from "./interfaces/plugin.interface";

@Controller("plugins")
export class PluginManagerController {
  constructor(private readonly pluginManagerService: PluginManagerService) {}

  /**
   * Retrieves a list of all registered plugins
   */
  @Get()
  async getPlugins(): Promise<PluginMetadata[]> {
    return this.pluginManagerService.getPlugins();
  }
}
