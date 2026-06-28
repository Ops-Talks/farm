import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Optional,
  Inject,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { OrgRole } from "@farm/types";
import {
  ManagedUserView,
  UserListResult,
  UserManagementService,
} from "./user-management.service";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { SuspendUserDto } from "./dto/suspend-user.dto";
import { AdminCreateUserDto } from "./dto/admin-create-user.dto";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; username: string; roles: string[] };
}

/**
 * REST endpoints for Phase 37 user management dashboard.
 */
@ApiTags("User Management")
@ApiBearerAuth()
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
  type: ErrorResponseDto,
})
@Controller("users")
export class UserManagementController {
  constructor(
    private readonly userMgmt: UserManagementService,
    @Optional()
    @Inject(AuditLogService)
    private readonly auditLog?: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List users (platform-wide or org-scoped)" })
  @ApiOkResponse({ description: "Paginated user list." })
  async list(
    @Request() req: AuthenticatedRequest,
    @Query("orgId") orgId?: string,
    @Query("search") search?: string,
    @Query("role") role?: OrgRole,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<UserListResult> {
    return this.userMgmt.listUsers(req.user, {
      orgId,
      search,
      role,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new user (admin)" })
  @ApiBody({ type: AdminCreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "User created successfully.",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Username or email already taken.",
    type: ErrorResponseDto,
  })
  async create(
    @Body() dto: AdminCreateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ManagedUserView & { tempPassword?: string }> {
    return this.userMgmt.createUser(req.user, dto);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({ summary: "Get a single managed user" })
  @ApiOkResponse({ description: "Managed user details." })
  async getOne(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ManagedUserView> {
    return this.userMgmt.getUser(req.user, id);
  }

  @Patch(":id/role")
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({ summary: "Change a user's org role" })
  @ApiOkResponse({ description: "Role updated." })
  async updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ userId: string; orgId: string; role: OrgRole }> {
    const updated = await this.userMgmt.updateRole(
      req.user,
      id,
      dto.orgId,
      dto.role,
    );
    return {
      userId: updated.userId,
      orgId: updated.organizationId,
      role: updated.role,
    };
  }

  @Patch(":id/suspend")
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({ summary: "Suspend or unsuspend a user (platform admin)" })
  @ApiOkResponse({ description: "User suspension status updated." })
  async suspend(
    @Param("id") id: string,
    @Body() dto: SuspendUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ id: string; suspended: boolean }> {
    const user = await this.userMgmt.setSuspended(req.user, id, dto.suspended);
    return { id: user.id, suspended: user.suspended };
  }

  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({
    summary: "Reset a user's password and email a temporary password",
  })
  @ApiOkResponse({
    description: "Password reset, temporary password returned.",
  })
  async resetPassword(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{
    tempPasswordExpiresAt: Date;
    tempPassword?: string;
    fallback?: boolean;
  }> {
    return this.userMgmt.resetPassword(req.user, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({ summary: "Remove user from org or delete globally" })
  @ApiNoContentResponse({ description: "User removed." })
  async remove(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Query("orgId") orgId?: string,
  ): Promise<void> {
    await this.userMgmt.deleteUser(req.user, id, orgId);
  }

  @Get(":id/audit-trail")
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiOperation({ summary: "Audit trail for a managed user" })
  @ApiOkResponse({ description: "Audit trail entries." })
  async auditTrail(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown[]> {
    // Re-use the same authorization check as getUser
    await this.userMgmt.getUser(req.user, id);
    if (!this.auditLog) return [];
    const entries = await this.auditLog.findAll({
      resourceType: "User",
      resourceId: id,
      limit: 200,
    });
    return entries;
  }
}

// Suppress unused-pipe import warning while keeping it available for future filters.
void ParseIntPipe;
