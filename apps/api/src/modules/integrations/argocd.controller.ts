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
import { ArgoCDService, ArgoCDApplication } from "./argocd.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing ArgoCD application management endpoints.
 */
@ApiTags("ArgoCD")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("argocd")
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
export class ArgoCDController {
  constructor(private readonly argoCDService: ArgoCDService) {}

  /**
   * Lists all ArgoCD applications for the resolved organization.
   *
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns Array of ArgoCD application objects
   */
  @Get("applications")
  @ApiOperation({ summary: "List ArgoCD applications" })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Organization UUID (defaults to request org context)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns ArgoCD applications.",
  })
  async listApplications(
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<ArgoCDApplication[]> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.argoCDService.listApplications(effectiveOrgId);
  }

  /**
   * Returns a single ArgoCD application by name.
   *
   * @param name - ArgoCD application name
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns The ArgoCD application object
   */
  @Get("applications/:name")
  @ApiOperation({ summary: "Get a single ArgoCD application" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the ArgoCD application.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "ArgoCD credential not configured or application not found.",
    type: ErrorResponseDto,
  })
  async getApplication(
    @Param("name") name: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<ArgoCDApplication> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.argoCDService.getApplication(effectiveOrgId, name);
  }

  /**
   * Triggers an ArgoCD sync for the specified application.
   * Requires admin role.
   *
   * @param name - ArgoCD application name
   * @param orgId - Optional organization UUID query override
   * @param req - Request carrying resolved org context
   * @returns The sync response from ArgoCD
   */
  @Post("applications/:name/sync")
  @RequiresPermission(Permission.PIPELINE_TRIGGER)
  @ApiOperation({ summary: "Trigger an ArgoCD application sync" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Sync triggered successfully.",
  })
  async syncApplication(
    @Param("name") name: string,
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<Record<string, unknown>> {
    const effectiveOrgId = orgId ?? req?.organizationId ?? "";
    return this.argoCDService.syncApplication(effectiveOrgId, name);
  }
}
