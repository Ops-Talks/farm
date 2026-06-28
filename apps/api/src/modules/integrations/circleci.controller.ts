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
} from "@nestjs/swagger";
import { CircleCIService, CircleCIPipeline } from "./circleci.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing CircleCI pipeline management endpoints.
 */
@ApiTags("CircleCI")
@ApiBearerAuth()
@UseGuards(RolesGuard)
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
  @Roles("admin")
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
