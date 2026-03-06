import { Controller, Get, UseGuards, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PluginManagerService } from "./plugin-manager.service";
import { PluginMetadata } from "./interfaces/plugin.interface";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

@ApiTags("Plugins")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("plugins")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - User does not have sufficient permissions.",
  type: ErrorResponseDto,
})
export class PluginManagerController {
  constructor(private readonly pluginManagerService: PluginManagerService) {}

  /**
   * Retrieves a list of all registered plugins
   */
  @Get()
  @Roles("admin")
  @ApiOperation({ summary: "Get all registered plugins" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of plugin metadata.",
    type: [PluginMetadata],
  })
  getPlugins(): PluginMetadata[] {
    return this.pluginManagerService.getPlugins();
  }
}
