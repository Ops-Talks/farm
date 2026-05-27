import {
  Controller,
  Get,
  Post,
  Param,
  Query,
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
import { CircleCIService, CircleCIPipeline } from "./circleci.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing CircleCI pipeline management endpoints.
 */
@ApiTags("CircleCI")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("circleci")
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
export class CircleCIController {
  constructor(private readonly circleCIService: CircleCIService) {}

  /**
   * Lists CircleCI pipelines, optionally filtered by VCS repository URL.
   *
   * @param vcsUrl - Optional VCS URL filter
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns Array of CircleCI pipeline objects
   */
  @Get("pipelines")
  @ApiOperation({ summary: "List CircleCI pipelines" })
  @ApiQuery({
    name: "vcsUrl",
    required: false,
    description: "Filter pipelines by VCS repository URL",
  })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Organization UUID (defaults to request org context)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns CircleCI pipelines.",
  })
  async listPipelines(
    @Query("vcsUrl") vcsUrl?: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<CircleCIPipeline[]> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.circleCIService.listPipelines(effectiveOrgId, vcsUrl);
  }

  /**
   * Triggers a CircleCI pipeline run for the given project slug.
   * Requires admin role.
   *
   * @param slug - URL-encoded CircleCI project slug (e.g. "gh/org/repo")
   * @param branch - Optional branch to run against
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns The triggered pipeline object
   */
  @Post("pipelines/:slug/trigger")
  @RequiresPermission(Permission.PIPELINE_TRIGGER)
  @ApiOperation({ summary: "Trigger a CircleCI pipeline" })
  @ApiQuery({
    name: "branch",
    required: false,
    description: "Branch to trigger the pipeline on",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Pipeline triggered successfully.",
  })
  async triggerPipeline(
    @Param("slug") slug: string,
    @Query("branch") branch?: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<CircleCIPipeline> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.circleCIService.triggerPipeline(
      effectiveOrgId,
      decodeURIComponent(slug),
      branch,
    );
  }
}
