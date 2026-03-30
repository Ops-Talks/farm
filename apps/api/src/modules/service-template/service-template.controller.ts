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
} from "@nestjs/swagger";
import { Request } from "express";
import { ServiceTemplateService } from "./service-template.service";
import { ScaffoldService } from "./scaffold.service";
import { CreateServiceTemplateDto } from "./dto/create-service-template.dto";
import { UpdateServiceTemplateDto } from "./dto/update-service-template.dto";
import { ListTemplatesQueryDto } from "./dto/list-templates-query.dto";
import { CreateScaffoldRequestDto } from "./dto/scaffold-request.dto";
import { ServiceTemplate } from "./entities/service-template.entity";
import { ScaffoldRequest } from "./entities/scaffold-request.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

/**
 * Controller for managing service templates and triggering scaffold
 * operations as part of the developer self-service workflow.
 */
@ApiTags("Service Templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("service-templates")
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
export class ServiceTemplateController {
  constructor(
    private readonly serviceTemplateService: ServiceTemplateService,
    private readonly scaffoldService: ScaffoldService,
  ) {}

  /**
   * Creates a new service template.
   * The organizationId is taken from the OrgContextInterceptor (X-Organization-Id header)
   * and cannot be overridden by the request body.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param createDto - The data for the new service template
   * @returns The created service template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new service template" })
  @ApiCreatedResponse({
    description: "The service template has been successfully created.",
    type: ServiceTemplate,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A service template with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() createDto: CreateServiceTemplateDto,
  ): Promise<ServiceTemplate> {
    return await this.serviceTemplateService.create(
      createDto,
      req.organizationId,
    );
  }

  /**
   * Retrieves all service templates with optional filters.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of service templates
   */
  @Get()
  @ApiOperation({ summary: "List all service templates" })
  @ApiOkResponse({
    description: "Successfully retrieved service templates list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListTemplatesQueryDto,
  ): Promise<PaginatedResponseDto<ServiceTemplate>> {
    const [data, total] = await this.serviceTemplateService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single service template by ID.
   * @param id - The UUID of the service template
   * @returns The service template with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get service template by ID" })
  @ApiParam({ name: "id", description: "The UUID of the service template" })
  @ApiOkResponse({
    description: "The service template was found.",
    type: ServiceTemplate,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<ServiceTemplate> {
    return await this.serviceTemplateService.findOne(id);
  }

  /**
   * Updates an existing service template.
   * @param id - The UUID of the service template to update
   * @param updateDto - Fields to update
   * @returns The updated service template
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update a service template" })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template to update",
  })
  @ApiOkResponse({
    description: "The service template has been successfully updated.",
    type: ServiceTemplate,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A service template with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateServiceTemplateDto,
  ): Promise<ServiceTemplate> {
    return await this.serviceTemplateService.update(id, updateDto);
  }

  /**
   * Removes a service template.
   * @param id - The UUID of the service template to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete a service template" })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template to remove",
  })
  @ApiNoContentResponse({
    description: "Service template successfully removed.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.serviceTemplateService.remove(id);
  }

  /**
   * Scaffolds a new service from a template.
   * Creates a new repository based on the template structure with
   * the provided variable values.
   * @param id - The UUID of the service template to scaffold from
   * @param req - The incoming request containing the JWT user payload and org context
   * @param dto - Scaffold request data (target repository, variables)
   * @returns The scaffold request with status and results
   */
  @Post(":id/scaffold")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Scaffold a new service from a template" })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template to scaffold from",
  })
  @ApiCreatedResponse({
    description: "The scaffold request has been created and processed.",
    type: ScaffoldRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Service template not found.",
    type: ErrorResponseDto,
  })
  async scaffold(
    @Param("id") id: string,
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() dto: CreateScaffoldRequestDto,
  ): Promise<ScaffoldRequest> {
    return await this.scaffoldService.scaffold(
      id,
      dto,
      req.user.userId,
      req.organizationId,
    );
  }

  /**
   * Performs a dry-run scaffold from a template.
   * Returns a preview of the file tree that would be generated without
   * actually creating the repository.
   * @param id - The UUID of the service template to preview
   * @param req - The incoming request containing the JWT user payload and org context
   * @param dto - Scaffold request data (target repository, variables)
   * @returns The scaffold request with rendered file tree preview
   */
  @Post(":id/scaffold/dry-run")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Dry-run scaffold from a template (preview only)",
  })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template to preview",
  })
  @ApiCreatedResponse({
    description: "The dry-run scaffold completed with a file tree preview.",
    type: ScaffoldRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Service template not found.",
    type: ErrorResponseDto,
  })
  async scaffoldDryRun(
    @Param("id") id: string,
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() dto: CreateScaffoldRequestDto,
  ): Promise<ScaffoldRequest> {
    return await this.scaffoldService.scaffold(
      id,
      { ...dto, dryRun: true },
      req.user.userId,
      req.organizationId,
    );
  }
}
