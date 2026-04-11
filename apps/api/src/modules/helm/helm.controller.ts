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
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
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
  @UseGuards(RolesGuard)
  @Roles("admin")
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
    description: "Forbidden - Requires admin role.",
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
