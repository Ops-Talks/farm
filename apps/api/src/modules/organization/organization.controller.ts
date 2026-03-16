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
  Request,
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
import { Request as ExpressRequest } from "express";
import { OrganizationService } from "./organization.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { Organization } from "./entities/organization.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginationQueryDto, PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRolesGuard } from "../../common/guards/org-roles.guard";
import { OrgRoles } from "../../common/decorators/org-roles.decorator";

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    roles: string[];
  };
}

/**
 * Controller for managing organizations and multi-tenant isolation.
 */
@ApiTags("Organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("organizations")
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
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Creates a new organization. The authenticated user becomes the owner.
   * @param createOrganizationDto - The data for the new organization
   * @param req - The authenticated request
   * @returns The created organization
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new organization" })
  @ApiCreatedResponse({
    description: "The organization has been successfully created.",
    type: Organization,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An organization with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Organization> {
    return this.organizationService.create(
      createOrganizationDto,
      req.user.userId,
    );
  }

  /**
   * Retrieves all organizations with pagination.
   * @param pagination - Pagination query parameters
   * @returns A paginated list of organizations
   */
  @Get()
  @ApiOperation({ summary: "List all organizations" })
  @ApiOkResponse({
    description: "Successfully retrieved organization list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Organization>> {
    const [data, total] = await this.organizationService.findAll(
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
   * Retrieves a single organization by ID.
   * @param id - The UUID of the organization
   * @returns The organization with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get organization by ID" })
  @ApiParam({ name: "id", description: "The UUID of the organization" })
  @ApiOkResponse({
    description: "The organization was found.",
    type: Organization,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  /**
   * Updates an existing organization. Requires at least ADMIN role in the organization.
   * @param id - The UUID of the organization to update
   * @param updateOrganizationDto - Fields to update
   * @param req - The authenticated request
   * @returns The updated organization
   */
  @Patch(":id")
  @UseGuards(OrgRolesGuard)
  @OrgRoles("admin")
  @ApiOperation({ summary: "Update an organization" })
  @ApiParam({
    name: "id",
    description: "The UUID of the organization to update",
  })
  @ApiOkResponse({
    description: "The organization has been successfully updated.",
    type: Organization,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An organization with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Organization> {
    return this.organizationService.update(
      id,
      updateOrganizationDto,
      req.user.userId,
    );
  }

  /**
   * Removes an organization. Requires OWNER role in the organization.
   * @param id - The UUID of the organization to remove
   * @param req - The authenticated request
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(OrgRolesGuard)
  @OrgRoles("owner")
  @ApiOperation({ summary: "Delete an organization" })
  @ApiParam({
    name: "id",
    description: "The UUID of the organization to remove",
  })
  @ApiNoContentResponse({ description: "Organization successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.organizationService.remove(id, req.user.userId);
  }
}
