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
  ApiQuery,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { OrganizationService } from "./organization.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { MemberResponseDto } from "./dto/member-response.dto";
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

  // ---------------------------------------------------------------------------
  // Member management endpoints
  // ---------------------------------------------------------------------------

  /**
   * Lists all members of the organization with pagination.
   * Requires at least MEMBER role in the organization.
   * @param id - The UUID of the organization
   * @param pagination - Pagination query parameters
   * @returns A paginated list of organization members
   */
  @Get(":id/members")
  @UseGuards(OrgRolesGuard)
  @OrgRoles("member")
  @ApiOperation({ summary: "List members of an organization" })
  @ApiParam({ name: "id", description: "The UUID of the organization" })
  @ApiQuery({
    name: "skip",
    required: false,
    description: "Number of records to skip",
  })
  @ApiQuery({
    name: "take",
    required: false,
    description: "Number of records to return",
  })
  @ApiOkResponse({
    description: "Successfully retrieved member list.",
    type: PaginatedResponseDto,
  })
  async findMembers(
    @Param("id") id: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
    const [data, total] = await this.organizationService.findMembers(
      id,
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
   * Adds a user to the organization by username.
   * Requires at least ADMIN role. The OWNER role cannot be assigned.
   * @param id - The UUID of the organization
   * @param addMemberDto - Data containing the username and optional role
   * @param req - The authenticated request
   * @returns The newly added member
   */
  @Post(":id/members")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OrgRolesGuard)
  @OrgRoles("admin")
  @ApiOperation({ summary: "Add a member to an organization" })
  @ApiParam({ name: "id", description: "The UUID of the organization" })
  @ApiCreatedResponse({
    description: "The member has been successfully added.",
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User is already a member of this organization.",
    type: ErrorResponseDto,
  })
  async addMember(
    @Param("id") id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<MemberResponseDto> {
    return this.organizationService.addMember(
      id,
      req.user.userId,
      addMemberDto,
    );
  }

  /**
   * Updates the role of an existing organization member.
   * Requires at least ADMIN role. The OWNER role cannot be assigned.
   * A requester cannot modify a member with an equal or higher role.
   * @param id - The UUID of the organization
   * @param userId - The UUID of the member whose role should be updated
   * @param updateMemberRoleDto - Data containing the new role
   * @param req - The authenticated request
   * @returns The updated member
   */
  @Patch(":id/members/:userId/role")
  @UseGuards(OrgRolesGuard)
  @OrgRoles("admin")
  @ApiOperation({ summary: "Update the role of an organization member" })
  @ApiParam({ name: "id", description: "The UUID of the organization" })
  @ApiParam({
    name: "userId",
    description: "The UUID of the member to update",
  })
  @ApiOkResponse({
    description: "The member role has been successfully updated.",
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Member not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Cannot set the owner role, or cannot change your own role.",
    type: ErrorResponseDto,
  })
  async updateMemberRole(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<MemberResponseDto> {
    return this.organizationService.updateMemberRole(
      id,
      req.user.userId,
      userId,
      updateMemberRoleDto,
    );
  }

  /**
   * Removes a member from the organization.
   * Requires at least ADMIN role. The owner cannot be removed.
   * A requester cannot remove a member with an equal or higher role.
   * @param id - The UUID of the organization
   * @param userId - The UUID of the member to remove
   * @param req - The authenticated request
   */
  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(OrgRolesGuard)
  @OrgRoles("admin")
  @ApiOperation({ summary: "Remove a member from an organization" })
  @ApiParam({ name: "id", description: "The UUID of the organization" })
  @ApiParam({
    name: "userId",
    description: "The UUID of the member to remove",
  })
  @ApiNoContentResponse({ description: "Member successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Member not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Cannot remove the owner, or cannot remove yourself.",
    type: ErrorResponseDto,
  })
  async removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.organizationService.removeMember(id, req.user.userId, userId);
  }
}
