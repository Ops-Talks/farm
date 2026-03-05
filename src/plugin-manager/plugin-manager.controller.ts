import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PluginManagerService } from "./plugin-manager.service";
import { PluginMetadata } from "./interfaces/plugin.interface";

@ApiTags("Plugins")
@Controller("plugins")
export class PluginManagerController {
  constructor(private readonly pluginManagerService: PluginManagerService) {}

  /**
   * Retrieves a list of all registered plugins
   */
  @Get()
  @ApiOperation({ summary: "Get all registered plugins" })
  @ApiResponse({
    status: 200,
    description: "Returns an array of plugin metadata.",
    type: [PluginMetadata],
  })
  async getPlugins(): Promise<PluginMetadata[]> {
    return this.pluginManagerService.getPlugins();
  }
}
