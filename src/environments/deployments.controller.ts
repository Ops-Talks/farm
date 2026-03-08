import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DeploymentsService } from "./deployments.service";
import { CreateDeploymentDto } from "./dto/create-deployment.dto";
import { UpdateDeploymentDto } from "./dto/update-deployment.dto";
import { Deployment, DeploymentStatus } from "./entities/deployment.entity";
import {
  ComponentKindGroup,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import {
  PaginationQueryDto,
  PaginatedResponseDto,
} from "../common/dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

/**
 * Controller for managing component deployments to environments.
 */
@ApiTags("Deployments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("deployments")
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
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  /**
   * Records a new deployment.
   * @param createDeploymentDto - The deployment data
   * @returns The created deployment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Record a new deployment" })
  @ApiCreatedResponse({
    description: "The deployment has been successfully recorded.",
    type: Deployment,
  })
  async create(
    @Body() createDeploymentDto: CreateDeploymentDto,
  ): Promise<Deployment> {
    return await this.deploymentsService.create(createDeploymentDto);
  }

  /**
   * Lists deployments with optional filters.
   * @param componentId - Optional component ID filter
   * @param environmentId - Optional environment ID filter
   * @param status - Optional status filter
   * @returns An array of matching deployments
   */
  @Get()
  @ApiOperation({ summary: "List deployments" })
  @ApiQuery({
    name: "componentId",
    required: false,
    description: "Filter by component UUID",
  })
  @ApiQuery({
    name: "environmentId",
    required: false,
    description: "Filter by environment UUID",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: DeploymentStatus,
    description: "Filter by deployment status",
  })
  @ApiOkResponse({
    description: "Successfully retrieved deployment list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query("componentId") componentId?: string,
    @Query("environmentId") environmentId?: string,
    @Query("status") status?: DeploymentStatus,
  ): Promise<PaginatedResponseDto<Deployment>> {
    const [data, total] = await this.deploymentsService.findAll(
      pagination.skip,
      pagination.take,
      { componentId, environmentId, status },
    );
    return new PaginatedResponseDto(
      data,
      total,
      pagination.skip ?? 0,
      pagination.take ?? 20,
    );
  }

  /**
   * Returns a matrix of all components with their latest deployment per environment.
   * @returns The deployment matrix
   */
  @Get("matrix")
  @ApiOperation({
    summary:
      "Get deployment matrix (latest version per component per environment)",
  })
  @ApiQuery({
    name: "kindGroup",
    required: false,
    enum: ComponentKindGroup,
    description: "Filter components by domain group",
  })
  @ApiQuery({
    name: "owner",
    required: false,
    description: "Filter components by owner",
  })
  @ApiQuery({
    name: "lifecycle",
    required: false,
    enum: ComponentLifecycle,
    description: "Filter components by lifecycle stage",
  })
  @ApiOkResponse({
    description: "Successfully retrieved deployment matrix.",
  })
  async getMatrix(
    @Query("kindGroup") kindGroup?: ComponentKindGroup,
    @Query("owner") owner?: string,
    @Query("lifecycle") lifecycle?: ComponentLifecycle,
  ) {
    return await this.deploymentsService.getMatrix({
      kindGroup,
      owner,
      lifecycle,
    });
  }

  /**
   * Returns the latest successful deployment for each environment of a given component.
   * @param componentId - The component UUID
   * @returns An array of the latest deployments per environment
   */
  @Get("latest")
  @ApiOperation({
    summary: "Get latest successful deployment per environment for a component",
  })
  @ApiQuery({
    name: "componentId",
    required: true,
    description: "The component UUID",
  })
  @ApiOkResponse({
    description: "Successfully retrieved latest deployments for the component.",
    type: [Deployment],
  })
  async findLatest(
    @Query("componentId") componentId: string,
  ): Promise<Deployment[]> {
    return await this.deploymentsService.findLatestByComponent(componentId);
  }

  /**
   * Retrieves a single deployment by ID.
   * @param id - The UUID of the deployment
   * @returns The deployment with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get deployment by ID" })
  @ApiParam({ name: "id", description: "The UUID of the deployment" })
  @ApiOkResponse({
    description: "The deployment was found.",
    type: Deployment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Deployment> {
    return await this.deploymentsService.findOne(id);
  }

  /**
   * Updates a deployment status.
   * @param id - The UUID of the deployment to update
   * @param updateDeploymentDto - Fields to update
   * @returns The updated deployment
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update deployment status" })
  @ApiParam({
    name: "id",
    description: "The UUID of the deployment to update",
  })
  @ApiOkResponse({
    description: "The deployment has been successfully updated.",
    type: Deployment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDeploymentDto: UpdateDeploymentDto,
  ): Promise<Deployment> {
    return await this.deploymentsService.update(id, updateDeploymentDto);
  }
}
