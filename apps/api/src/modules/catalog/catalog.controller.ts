import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
  Inject,
  Optional,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CacheInterceptor, Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CatalogService } from "./catalog.service";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { RegisterComponentYamlDto } from "./dto/register-component-yaml.dto";
import { CreateLocationDto } from "./dto/create-location.dto";
import { SetContainerImageDto } from "./dto/set-container-image.dto";
import { Component, ComponentKindGroup } from "./entities/component.entity";
import { ListComponentsQueryDto } from "./dto/list-components-query.dto";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import {
  CATALOG_DISCOVERY_QUEUE,
  CatalogDiscoveryJobData,
} from "./processors/catalog-discovery.processor";

/**
 * Controller for the software component catalog.
 * Provides REST endpoints to manage components tracked in Farm.
 */
@ApiTags("Catalog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("catalog")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
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
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional()
    @InjectQueue(CATALOG_DISCOVERY_QUEUE)
    private readonly discoveryQueue?: Queue<CatalogDiscoveryJobData>,
  ) {}

  /**
   * Triggers discovery on a new repository location.
   * @param createLocationDto - The location to scan
   * @returns A summary of the discovery process
   */
  @Post("locations")
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles("admin")
  @ApiOperation({ summary: "Register a new location for discovery" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "The discovery process has been initiated.",
  })
  async discoverFromLocation(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<{ message: string; jobId?: string; discovered?: number }> {
    if (this.discoveryQueue) {
      const job = await this.discoveryQueue.add("discover", {
        url: createLocationDto.url,
      });
      return {
        message: `Discovery job enqueued for ${createLocationDto.url}`,
        jobId: job.id,
      };
    }

    // Synchronous fallback when queue is unavailable
    const discovered = await this.catalogService.discoverFromLocation(
      createLocationDto.url,
    );
    return {
      message: `Discovery completed for ${createLocationDto.url}`,
      discovered,
    };
  }

  /**
   * Registers a component using YAML content.
   * @param registerYamlDto - The YAML content
   * @returns The registered component
   */
  @Post("register-yaml")
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Register a component via YAML content" })
  @ApiCreatedResponse({
    description: "The component has been successfully registered.",
    type: Component,
  })
  async registerYaml(
    @Body() registerYamlDto: RegisterComponentYamlDto,
    @Req() req: RequestWithOrg,
  ): Promise<Component> {
    const result = await this.catalogService.registerYaml(
      registerYamlDto.yaml,
      req.organizationId,
    );
    await this.cacheManager.clear();
    return result;
  }

  /**
   * Creates a new component in the catalog.
   * @param createComponentDto - The data for the new component
   * @returns The created component
   */
  @Post("components")
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new component" })
  @ApiCreatedResponse({
    description: "The component has been successfully created.",
    type: Component,
  })
  async create(
    @Body() createComponentDto: CreateComponentDto,
    @Req() req: RequestWithOrg,
  ): Promise<Component> {
    const result = await this.catalogService.create(
      createComponentDto,
      req.organizationId,
    );
    await this.cacheManager.clear();
    return result;
  }

  /**
   * Retrieves all components from the catalog.
   * @param query - Query params including optional kindGroup and organizationId filters
   * @param teamId - Optional team UUID to scope results to a specific team
   * @returns A paginated list of components
   */
  @Get("components")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "List all components" })
  @ApiQuery({
    name: "kindGroup",
    required: false,
    enum: ComponentKindGroup,
    description:
      "Filter components by domain group (dev, infra, data, security)",
  })
  @ApiQuery({
    name: "organizationId",
    required: false,
    description: "Filter components by organization UUID",
  })
  @ApiQuery({
    name: "teamId",
    required: false,
    description: "Filter components by team UUID",
  })
  @ApiOkResponse({
    description: "Successfully retrieved component list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListComponentsQueryDto,
    @Query("teamId") teamId: string | undefined,
    @Req() req: RequestWithOrg,
  ): Promise<PaginatedResponseDto<Component>> {
    const [data, total] = await this.catalogService.findAll(
      query.skip,
      query.take,
      query.kindGroup,
      req.organizationId,
      teamId,
    );
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single component by ID.
   * @param id - The UUID of the component
   * @returns The component with the specified ID
   */
  @Get("components/:id")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get component by ID" })
  @ApiParam({ name: "id", description: "The UUID of the component" })
  @ApiOkResponse({
    description: "The component was found.",
    type: Component,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Component> {
    return await this.catalogService.findOne(id);
  }

  /**
   * Updates an existing component.
   * @param id - The UUID of the component to update
   * @param updateComponentDto - Fields to update
   * @returns The updated component
   */
  @Patch("components/:id")
  @Roles("admin")
  @ApiOperation({ summary: "Update a component" })
  @ApiParam({ name: "id", description: "The UUID of the component to update" })
  @ApiOkResponse({
    description: "The component has been successfully updated.",
    type: Component,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ): Promise<Component> {
    const result = await this.catalogService.update(id, updateComponentDto);
    await this.cacheManager.clear();
    return result;
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   */
  @Delete("components/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete a component" })
  @ApiParam({ name: "id", description: "The UUID of the component to remove" })
  @ApiNoContentResponse({ description: "Component successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.catalogService.remove(id);
    await this.cacheManager.clear();
  }

  /**
   * Sets or updates container image metadata for a component.
   * @param id - The UUID of the component
   * @param dto - Container image metadata to set
   * @returns The updated component
   */
  @Post("components/:id/container-image")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Set or update container image metadata for a component",
  })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiOkResponse({
    description: "Container image metadata updated",
    type: Component,
  })
  @ApiResponse({
    status: 404,
    description: "Component not found",
    type: ErrorResponseDto,
  })
  async setContainerImage(
    @Param("id") id: string,
    @Body() dto: SetContainerImageDto,
  ): Promise<Component> {
    return this.catalogService.setContainerImage(id, dto);
  }
}
