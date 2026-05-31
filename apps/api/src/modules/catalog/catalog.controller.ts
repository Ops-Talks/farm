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
  Inject,
  Optional,
  Req,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
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
  ApiHeader,
} from "@nestjs/swagger";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
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
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "../../common/rbac/permissions";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { FinOpsService } from "../finops/finops.service";
import { CostEstimateResponseDto } from "../finops/dto/cost-estimate-response.dto";
import {
  CATALOG_DISCOVERY_QUEUE,
  CatalogDiscoveryJobData,
} from "./processors/catalog-discovery.processor";
import { PipelinesService } from "../pipelines/pipelines.service";
import { Pipeline } from "../pipelines/entities/pipeline.entity";

/**
 * Controller for the software component catalog.
 * Provides REST endpoints to manage components tracked in Farm.
 */
@ApiTags("Catalog")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
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
  description:
    "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
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
    @Optional()
    private readonly finOpsService?: FinOpsService,
    @Optional()
    private readonly pipelinesService?: PipelinesService,
  ) {}

  /**
   * Triggers discovery on a new repository location.
   * @param createLocationDto - The location to scan
   * @returns A summary of the discovery process
   */
  @Post("locations")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequiresPermission(Permission.CATALOG_WRITE)
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
  @RequiresPermission(Permission.CATALOG_WRITE)
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
  @RequiresPermission(Permission.CATALOG_WRITE)
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
  async findOne(
    @Param("id") id: string,
    @Req() req: Request & RequestWithOrg,
  ): Promise<Component> {
    return await this.catalogService.findOne(id, req.organizationId);
  }

  /**
   * Updates an existing component.
   * @param id - The UUID of the component to update
   * @param updateComponentDto - Fields to update
   * @returns The updated component
   */
  @Patch("components/:id")
  @RequiresPermission(Permission.CATALOG_WRITE)
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
    @Req() req: Request & RequestWithOrg,
  ): Promise<Component> {
    const result = await this.catalogService.update(
      id,
      updateComponentDto,
      req.organizationId,
    );
    await this.cacheManager.clear();
    return result;
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   */
  @Delete("components/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(Permission.CATALOG_DELETE)
  @ApiOperation({ summary: "Delete a component" })
  @ApiParam({ name: "id", description: "The UUID of the component to remove" })
  @ApiNoContentResponse({ description: "Component successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(
    @Param("id") id: string,
    @Req() req: Request & RequestWithOrg,
  ): Promise<void> {
    await this.catalogService.remove(id, req.organizationId);
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

  /**
   * Returns the latest infracost estimate for a component.
   * Returns 404 when no estimate has been recorded yet.
   *
   * @param id - Component UUID
   */
  @Get("components/:id/cost-estimate")
  @ApiOperation({
    summary: "Get the latest infracost estimate for a component",
  })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiOkResponse({
    description: "Latest cost estimate",
    type: CostEstimateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No cost estimate found for this component",
    type: ErrorResponseDto,
  })
  async getCostEstimate(
    @Param("id") id: string,
  ): Promise<CostEstimateResponseDto> {
    if (!this.finOpsService) {
      throw new NotFoundException(`Cost estimate not available`);
    }
    const estimate = await this.finOpsService.getCostEstimate(id);
    if (!estimate) {
      throw new NotFoundException(`No cost estimate found for component ${id}`);
    }
    return {
      id: estimate.id,
      componentId: estimate.componentId,
      pipelineRunId: estimate.pipelineRunId,
      estimatedMonthlyCost: Number(estimate.estimatedMonthlyCost),
      diffMonthlyCost: Number(estimate.diffMonthlyCost),
      currency: estimate.currency,
      breakdown: estimate.breakdown,
      measuredAt: estimate.measuredAt,
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
    };
  }

  /**
   * Lists pipelines bound to a specific component.
   *
   * @param id - Component UUID
   * @param skip - Number of records to skip (default 0)
   * @param take - Number of records to return (default 10)
   * @returns Paginated list of pipelines
   */
  @Get("components/:id/pipelines")
  @ApiOperation({ summary: "List pipelines bound to a component" })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiResponse({
    status: 200,
    description: "List of pipelines with latest run status",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/Pipeline" },
        },
        total: { type: "integer", example: 42 },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Component not found" })
  async findComponentPipelines(
    @Param("id") id: string,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("take", new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Req() req: Request & RequestWithOrg,
  ): Promise<{ items: Pipeline[]; total: number }> {
    // Throws NotFoundException if component does not exist or belongs to another org.
    await this.catalogService.findOne(id, req.organizationId);
    if (!this.pipelinesService) {
      return { items: [], total: 0 };
    }
    const [items, total] = await this.pipelinesService.findByComponent(
      id,
      undefined,
      skip,
      take,
    );
    return { items, total };
  }
}
