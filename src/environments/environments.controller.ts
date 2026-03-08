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
} from "@nestjs/swagger";
import { EnvironmentsService } from "./environments.service";
import { CreateEnvironmentDto } from "./dto/create-environment.dto";
import { UpdateEnvironmentDto } from "./dto/update-environment.dto";
import { Environment } from "./entities/environment.entity";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import { PaginationQueryDto, PaginatedResponseDto } from "../common/dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

/**
 * Controller for managing deployment environments.
 */
@ApiTags("Environments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  description: "Forbidden - User does not have sufficient permissions.",
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
  ): Promise<Environment> {
    return await this.environmentsService.create(createEnvironmentDto);
  }

  /**
   * Retrieves all environments ordered by display order.
   * @returns An array of all environments
   */
  @Get()
  @ApiOperation({ summary: "List all environments" })
  @ApiOkResponse({
    description: "Successfully retrieved environment list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Environment>> {
    const [data, total] = await this.environmentsService.findAll(
      pagination.skip,
      pagination.take,
    );
    return new PaginatedResponseDto(
      data,
      total,
      pagination.skip ?? 0,
      pagination.take ?? 20,
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
  async findOne(@Param("id") id: string): Promise<Environment> {
    return await this.environmentsService.findOne(id);
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
  ): Promise<Environment> {
    return await this.environmentsService.update(id, updateEnvironmentDto);
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.environmentsService.remove(id);
  }
}
