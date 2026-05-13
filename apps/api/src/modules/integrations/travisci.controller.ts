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
import { TravisCIService, TravisCIBuild } from "./travisci.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing Travis CI build management endpoints.
 */
@ApiTags("Travis CI")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("travisci")
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
export class TravisCIController {
  constructor(private readonly travisCIService: TravisCIService) {}

  /**
   * Lists Travis CI builds, optionally filtered by repository slug.
   *
   * @param repoSlug - Optional repository slug filter
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns Array of Travis CI build objects
   */
  @Get("builds")
  @ApiOperation({ summary: "List Travis CI builds" })
  @ApiQuery({
    name: "repoSlug",
    required: false,
    description: "Filter builds by repository slug (e.g. owner/repo)",
  })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Organization UUID (defaults to request org context)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Travis CI builds.",
  })
  async listBuilds(
    @Query("repoSlug") repoSlug?: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<TravisCIBuild[]> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.travisCIService.listBuilds(effectiveOrgId, repoSlug);
  }

  /**
   * Restarts a Travis CI build by id.
   * Requires admin role.
   *
   * @param id - Travis CI build id
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns The restart response
   */
  @Post("builds/:id/restart")
  @Roles("admin")
  @ApiOperation({ summary: "Restart a Travis CI build" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Build restart triggered successfully.",
  })
  async restartBuild(
    @Param("id") id: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<Record<string, unknown>> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.travisCIService.restartBuild(effectiveOrgId, id);
  }
}
