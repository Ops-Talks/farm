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
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { EnvironmentsService } from "./environments.service";
import { CreateEnvironmentDto } from "./dto/create-environment.dto";
import { UpdateEnvironmentDto } from "./dto/update-environment.dto";
import { ListEnvironmentsQueryDto } from "./dto/list-environments-query.dto";
import { Environment } from "./entities/environment.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Controller for managing deployment environments.
 */
@ApiTags("Environments")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(OrgRequiredGuard, RolesGuard)
@Controller("environments")
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
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  /**
   * Creates a new environment.
   * @param createEnvironmentDto - The data for the new environment
   * @returns The created environment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new environment" })
  @ApiCreatedResponse({
    description: "The environment has been successfully created.",
    type: Environment,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An environment with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Body() createEnvironmentDto: CreateEnvironmentDto,
    @Req() req: RequestWithOrg,
  ): Promise<Environment> {
    return await this.environmentsService.create(
      createEnvironmentDto,
      req.organizationId,
    );
  }

  /**
   * Retrieves all environments ordered by display order.
   * @param query - Query params including optional organizationId filter
   * @returns A paginated list of environments
   */
  @Get()
  @ApiOperation({ summary: "List all environments" })
  @ApiOkResponse({
    description: "Successfully retrieved environment list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListEnvironmentsQueryDto,
    @Req() req: RequestWithOrg,
  ): Promise<PaginatedResponseDto<Environment>> {
    const [data, total] = await this.environmentsService.findAll(
      query.skip,
      query.take,
      req.organizationId,
    );
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single environment by ID.
   * @param id - The UUID of the environment
   * @returns The environment with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get environment by ID" })
  @ApiParam({ name: "id", description: "The UUID of the environment" })
  @ApiOkResponse({
    description: "The environment was found.",
    type: Environment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<Environment> {
    return await this.environmentsService.findOne(id, req.organizationId);
  }

  /**
   * Updates an existing environment.
   * @param id - The UUID of the environment to update
   * @param updateEnvironmentDto - Fields to update
   * @returns The updated environment
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update an environment" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment to update",
  })
  @ApiOkResponse({
    description: "The environment has been successfully updated.",
    type: Environment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An environment with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateEnvironmentDto: UpdateEnvironmentDto,
    @Req() req: RequestWithOrg,
  ): Promise<Environment> {
    return await this.environmentsService.update(
      id,
      updateEnvironmentDto,
      req.organizationId,
    );
  }

  /**
   * Removes an environment.
   * @param id - The UUID of the environment to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete an environment" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment to remove",
  })
  @ApiNoContentResponse({ description: "Environment successfully removed." })
  @ApiResponse({ status: 204, description: "Environment deleted" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    await this.environmentsService.remove(id, req.organizationId);
  }
}
