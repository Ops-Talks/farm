import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { PluginManagerService } from "./plugin-manager.service";
import {
  PluginMetadata,
  PluginMenuItem,
  PluginRouteContribution,
} from "./interfaces/plugin.interface";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

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
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get all registered plugins" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of plugin metadata.",
    type: [PluginMetadata],
  })
  getPlugins(): PluginMetadata[] {
    return this.pluginManagerService.getPlugins();
  }

  /**
   * Retrieves all menu items contributed by registered plugins
   */
  @Get("menu-items")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get all plugin menu items" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of menu items from all plugins.",
    type: [PluginMenuItem],
  })
  getMenuItems(): PluginMenuItem[] {
    return this.pluginManagerService.getMenuItems();
  }

  /**
   * Retrieves all route contributions from registered plugins
   */
  @Get("routes")
  @Roles("admin")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get all plugin route contributions" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of route contributions from all plugins.",
    type: [PluginRouteContribution],
  })
  getRoutes(): PluginRouteContribution[] {
    return this.pluginManagerService.getRoutes();
  }
}
