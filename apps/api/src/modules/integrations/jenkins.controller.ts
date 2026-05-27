import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { JenkinsService, JenkinsJob, JenkinsBuild } from "./jenkins.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing Jenkins job and build management endpoints.
 */
@ApiTags("Jenkins")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("jenkins")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden — insufficient role.",
  type: ErrorResponseDto,
})
export class JenkinsController {
  constructor(private readonly jenkinsService: JenkinsService) {}

  /**
   * Lists all Jenkins jobs with last build information.
   *
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns Array of Jenkins job objects
   */
  @Get("jobs")
  @ApiOperation({ summary: "List Jenkins jobs" })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Organization UUID (defaults to request org context)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Jenkins jobs.",
  })
  async listJobs(
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<JenkinsJob[]> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.jenkinsService.listJobs(effectiveOrgId);
  }

  /**
   * Returns the build history for a specific Jenkins job.
   *
   * @param name - Jenkins job name
   * @param limit - Maximum number of builds (default 10)
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns Array of Jenkins build objects
   */
  @Get("jobs/:name/builds")
  @ApiOperation({ summary: "Get Jenkins job build history" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of builds to return",
  })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Organization UUID (defaults to request org context)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Jenkins builds.",
  })
  async getBuildHistory(
    @Param("name") name: string,
    @Query("limit") limit?: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<JenkinsBuild[]> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.jenkinsService.getBuildHistory(
      effectiveOrgId,
      name,
      parsedLimit,
    );
  }

  /**
   * Triggers a new build for the specified Jenkins job.
   * Requires admin role.
   *
   * @param name - Jenkins job name
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   */
  @Post("jobs/:name/build")
  @RequiresPermission(Permission.PIPELINE_TRIGGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Trigger a Jenkins build" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Build triggered successfully.",
  })
  async triggerBuild(
    @Param("name") name: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<void> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.jenkinsService.triggerBuild(effectiveOrgId, name);
  }
}
