import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { PluginManagerService } from "./plugin-manager.service";
import {
  PluginMetadata,
  PluginMenuItem,
  PluginRouteContribution,
  PluginManifest,
} from "./interfaces/plugin.interface";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PluginInstanceService } from "./services/plugin-instance.service";
import { PluginRegistryService } from "./services/plugin-registry.service";
import { InstallPluginDto } from "./dto/install-plugin.dto";
import { PublishPluginDto } from "./dto/publish-plugin.dto";
import { RegistrySearchDto } from "./dto/registry-search.dto";
import { ListInstancesDto } from "./dto/list-instances.dto";
import { PluginInstance } from "./entities/plugin-instance.entity";
import { PluginRegistryEntry } from "./entities/plugin-registry-entry.entity";

@ApiTags("Plugins")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
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
  constructor(
    private readonly pluginManagerService: PluginManagerService,
    private readonly configService: ConfigService,
    private readonly pluginInstanceService: PluginInstanceService,
    private readonly pluginRegistryService: PluginRegistryService,
  ) {}

  /**
   * Retrieves a list of all registered plugins
   */
  @Get()
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
  @RequiresPermission(Permission.ORG_MANAGE)
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

  /**
   * Re-scans the plugins directory and registers any newly discovered plugins.
   * Requires admin role.
   * @returns Array of manifests discovered during the reload scan
   */
  @Post("reload")
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: "Reload plugins from the plugins directory" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Returns the list of manifests discovered after reload.",
    type: [PluginManifest],
  })
  reloadPlugins(): PluginManifest[] {
    const pluginsDir =
      this.configService.get<string>("plugins.dir") || "./plugins";
    return this.pluginManagerService.scanDirectory(pluginsDir);
  }

  // -------------------------------------------------------------------------
  // Registry endpoints (FARM-T356, FARM-T357)
  // -------------------------------------------------------------------------

  /**
   * Searches the community plugin registry.
   */
  @Get("registry")
  @ApiOperation({ summary: "Search the community plugin registry" })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Full-text search query",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Category filter",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns matching registry entries.",
    type: [PluginRegistryEntry],
  })
  searchRegistry(
    @Query() query: RegistrySearchDto,
  ): Promise<PluginRegistryEntry[]> {
    return this.pluginRegistryService.search(query.q, query.category);
  }

  /**
   * Publishes a plugin manifest to the community registry. Admin only.
   */
  @Post("registry")
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: "Publish a plugin manifest to the registry" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Returns the created or updated registry entry.",
    type: PluginRegistryEntry,
  })
  publishPlugin(@Body() dto: PublishPluginDto): Promise<PluginRegistryEntry> {
    return this.pluginRegistryService.publish(dto);
  }

  /**
   * Returns a single registry entry by plugin ID.
   */
  @Get("registry/:pluginId")
  @ApiOperation({ summary: "Get a registry entry by plugin ID" })
  @ApiParam({ name: "pluginId", description: "Unique plugin identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the registry entry.",
    type: PluginRegistryEntry,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin not found in the registry.",
    type: ErrorResponseDto,
  })
  getRegistryEntry(
    @Param("pluginId") pluginId: string,
  ): Promise<PluginRegistryEntry> {
    return this.pluginRegistryService.findOne(pluginId);
  }

  /**
   * Returns the version history for a registry plugin.
   */
  @Get("registry/:pluginId/versions")
  @ApiOperation({ summary: "Get version history for a registry plugin" })
  @ApiParam({ name: "pluginId", description: "Unique plugin identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of version strings.",
    type: [String],
  })
  getRegistryVersions(@Param("pluginId") pluginId: string): Promise<string[]> {
    return this.pluginRegistryService.getVersions(pluginId);
  }

  // -------------------------------------------------------------------------
  // Instance lifecycle endpoints (FARM-T358, FARM-T359)
  // -------------------------------------------------------------------------

  /**
   * Lists all plugin instances, optionally filtered by organization.
   */
  @Get("instances")
  @ApiOperation({ summary: "List all plugin instances" })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Filter by organization ID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns an array of plugin instances.",
    type: [PluginInstance],
  })
  listInstances(@Query() query: ListInstancesDto): Promise<PluginInstance[]> {
    return this.pluginInstanceService.findAll(query.orgId);
  }

  /**
   * Installs a plugin for an organization. Admin only.
   */
  @Post(":pluginId/install")
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: "Install a plugin" })
  @ApiParam({ name: "pluginId", description: "Registry plugin ID to install" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Returns the created plugin instance.",
    type: PluginInstance,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin not found in the registry.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid manifest or unresolved dependencies.",
    type: ErrorResponseDto,
  })
  installPlugin(
    @Param("pluginId") pluginId: string,
    @Body() dto: InstallPluginDto,
  ): Promise<PluginInstance> {
    return this.pluginInstanceService.install(pluginId, dto.orgId);
  }

  /**
   * Enables a disabled plugin instance. Admin only.
   */
  @Post(":id/enable")
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enable a plugin instance" })
  @ApiParam({ name: "id", description: "Plugin instance UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the updated plugin instance.",
    type: PluginInstance,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin instance not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Instance is not in disabled status.",
    type: ErrorResponseDto,
  })
  enablePlugin(@Param("id") id: string): Promise<PluginInstance> {
    return this.pluginInstanceService.enable(id);
  }

  /**
   * Disables an active plugin instance. Admin only.
   */
  @Post(":id/disable")
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable a plugin instance" })
  @ApiParam({ name: "id", description: "Plugin instance UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the updated plugin instance.",
    type: PluginInstance,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin instance not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Instance is not in active status.",
    type: ErrorResponseDto,
  })
  disablePlugin(@Param("id") id: string): Promise<PluginInstance> {
    return this.pluginInstanceService.disable(id);
  }

  /**
   * Uninstalls a plugin instance. Admin only.
   */
  @Delete(":id")
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Uninstall a plugin instance" })
  @ApiParam({ name: "id", description: "Plugin instance UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Plugin instance successfully uninstalled.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin instance not found.",
    type: ErrorResponseDto,
  })
  async uninstallPlugin(@Param("id") id: string): Promise<void> {
    return this.pluginInstanceService.uninstall(id);
  }

  /**
   * Returns the current health status of a plugin instance.
   */
  @Get(":id/health")
  @ApiOperation({ summary: "Get the health status of a plugin instance" })
  @ApiParam({ name: "id", description: "Plugin instance UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the current health status.",
    schema: {
      type: "object",
      properties: { status: { type: "string", example: "healthy" } },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Plugin instance not found.",
    type: ErrorResponseDto,
  })
  getPluginHealth(@Param("id") id: string): Promise<{ status: string }> {
    return this.pluginInstanceService.getHealth(id);
  }
}
