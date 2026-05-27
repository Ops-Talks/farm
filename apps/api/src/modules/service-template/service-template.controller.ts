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
  ApiQuery,
} from "@nestjs/swagger";
import { Request } from "express";
import { ServiceTemplateService } from "./service-template.service";
import { ScaffoldService } from "./scaffold.service";
import { CreateServiceTemplateDto } from "./dto/create-service-template.dto";
import { UpdateServiceTemplateDto } from "./dto/update-service-template.dto";
import { ListTemplatesQueryDto } from "./dto/list-templates-query.dto";
import { CreateScaffoldRequestDto } from "./dto/scaffold-request.dto";
import { DryRunRequestDto } from "./dto/dry-run-request.dto";
import { DryRunResultDto } from "./dto/dry-run-result.dto";
import { PreviewQueryDto } from "./dto/preview-query.dto";
import { ServiceTemplate } from "./entities/service-template.entity";
import { ScaffoldRequest } from "./entities/scaffold-request.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";

/**
 * Controller for managing service templates and triggering scaffold
 * operations as part of the developer self-service workflow.
 */
@ApiTags("Service Templates")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
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
   * The organizationId is resolved from the X-Organization-Id header by
   * OrgRequiredGuard and must be present in the request header.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param createDto - The data for the new service template
   * @returns The created service template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission(Permission.CATALOG_WRITE)
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
  @RequiresPermission(Permission.CATALOG_WRITE)
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
  @RequiresPermission(Permission.CATALOG_WRITE)
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

  /**
   * Validates template variables and returns a structured result with
   * errors and a rendered preview string.
   * Unlike POST /:id/scaffold/dry-run, this endpoint does NOT persist a
   * ScaffoldRequest — it is a lightweight validation-only operation.
   * @param id - The UUID of the service template to validate against
   * @param dto - Optional variables to validate
   * @returns DryRunResultDto with validity status, errors, and preview
   */
  @Post(":id/dry-run")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Validate template variables and get a rendered preview",
  })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template to validate against",
  })
  @ApiOkResponse({
    description: "Dry-run validation completed.",
    type: DryRunResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Service template not found.",
    type: ErrorResponseDto,
  })
  async dryRun(
    @Param("id") id: string,
    @Body() dto: DryRunRequestDto,
  ): Promise<DryRunResultDto> {
    return await this.scaffoldService.dryRun(id, dto.variables);
  }

  /**
   * Returns a live rendered preview for a template using variables supplied
   * as a Base64URL-encoded JSON query parameter.
   * Useful for real-time frontend previews without a POST body.
   * @param id - The UUID of the service template
   * @param query - Query params containing optional Base64URL-encoded variables
   * @returns DryRunResultDto with validity status, errors, and preview
   */
  @Get(":id/preview")
  @ApiOperation({
    summary: "Live preview of a template with Base64URL-encoded variables",
  })
  @ApiParam({
    name: "id",
    description: "The UUID of the service template",
  })
  @ApiQuery({
    name: "vars",
    required: false,
    description:
      "Base64URL-encoded JSON object of template variable key-value pairs",
  })
  @ApiOkResponse({
    description: "Live preview rendered successfully.",
    type: DryRunResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Service template not found.",
    type: ErrorResponseDto,
  })
  async preview(
    @Param("id") id: string,
    @Query() query: PreviewQueryDto,
  ): Promise<DryRunResultDto> {
    let decodedVars: Record<string, string> | undefined;

    if (query.vars) {
      try {
        decodedVars = JSON.parse(
          Buffer.from(query.vars, "base64url").toString("utf8"),
        ) as Record<string, string>;
      } catch {
        // Invalid base64url or JSON — treat as empty vars
        decodedVars = undefined;
      }
    }

    return await this.scaffoldService.dryRun(id, decodedVars);
  }
}
