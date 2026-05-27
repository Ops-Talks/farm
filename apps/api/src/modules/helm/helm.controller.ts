import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { HelmService } from "./helm.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import { HelmRelease } from "./helm-release.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller for Helm release discovery and synchronization endpoints.
 */
@ApiTags("Helm")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("helm")
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
export class HelmController {
  constructor(
    private readonly helmService: HelmService,
    private readonly kubernetesService: KubernetesService,
  ) {}

  /**
   * Lists all Helm releases discovered from Kubernetes Secrets.
   * Optionally filtered by namespace.
   *
   * @param namespace - Kubernetes namespace to filter by (optional)
   * @returns Array of discovered Helm releases
   */
  @Get("releases")
  @ApiOperation({ summary: "List Helm releases discovered from the cluster" })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Filter releases by Kubernetes namespace",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Helm releases discovered from cluster Secrets.",
  })
  async listReleases(
    @Query("namespace") namespace?: string,
  ): Promise<HelmRelease[]> {
    return this.helmService.listReleases(namespace);
  }

  /**
   * Synchronizes Helm releases from the cluster into Farm Deployment records.
   * Requires the "admin" role.
   *
   * @param namespace - Kubernetes namespace to sync (optional; defaults to all)
   * @returns Sync result with count and any error messages
   */
  @Post("releases/sync")
  @OrgRequired()
  @UseGuards(OrgRequiredGuard, PermissionGuard)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @ApiHeader({
    name: "x-organization-id",
    required: true,
    description: "Organization ID",
  })
  @ApiOperation({
    summary: "Sync Helm releases into Farm deployment records (admin only)",
  })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Kubernetes namespace to sync; omit for all namespaces",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Returns the number of synced records and any error details.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden - Requires ENVIRONMENT_WRITE permission.",
    type: ErrorResponseDto,
  })
  async syncReleases(
    @Query("namespace") namespace?: string,
  ): Promise<{ synced: number; errors: string[] }> {
    return this.helmService.syncReleases(namespace);
  }

  /**
   * Returns whether Helm operations are available (requires Kubernetes).
   */
  @Get("available")
  @ApiOperation({
    summary: "Check if Helm operations are available (requires Kubernetes)",
  })
  @ApiResponse({ status: 200, description: "Availability status" })
  getAvailability(): { available: boolean; reason?: string } {
    const available = this.kubernetesService.isEnabled();
    return available
      ? { available: true }
      : {
          available: false,
          reason: "KUBECONFIG not set or cluster unreachable",
        };
  }
}
