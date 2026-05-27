import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { AuditLogService } from "./audit-log.service";
import { AuditLog } from "./entities/audit-log.entity";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Query parameters accepted by the GET /audit-logs endpoint.
 */
class AuditLogsQueryDto {
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  limit?: number;
}

/**
 * Controller for querying the immutable audit log trail.
 * Access is restricted to users with the 'admin' role.
 */
@ApiTags("Audit Log")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("audit-logs")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - Insufficient org-scoped permissions.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Returns a filtered list of audit log entries, ordered newest first.
   * @param query - Optional filter parameters
   * @returns An array of audit log entries
   */
  @Get()
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: "List audit log entries" })
  @ApiQuery({
    name: "resourceType",
    required: false,
    description: "Filter by resource type (e.g., Component, Team)",
  })
  @ApiQuery({
    name: "resourceId",
    required: false,
    description: "Filter by resource UUID",
  })
  @ApiQuery({
    name: "actorId",
    required: false,
    description: "Filter by actor user ID",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of entries to return (default: 100)",
    type: Number,
  })
  @ApiOkResponse({
    description: "Successfully retrieved audit log entries.",
    type: [AuditLog],
  })
  async findAll(
    @Query() query: AuditLogsQueryDto,
    @Req() req: RequestWithOrg,
  ): Promise<AuditLog[]> {
    return await this.auditLogService.findAll({
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorId: query.actorId,
      limit: query.limit ? Number(query.limit) : undefined,
      organizationId: req.organizationId,
    });
  }
}
