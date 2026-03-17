import { Controller, Get, Param, UseGuards, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { KubernetesService, KubernetesWorkload } from "./kubernetes.service";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller for Kubernetes cluster discovery endpoints.
 */
@ApiTags("Kubernetes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kubernetes")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
export class KubernetesController {
  constructor(private readonly kubernetesService: KubernetesService) {}

  /**
   * Lists all discovered Kubernetes Deployment workloads across all namespaces.
   * @returns Array of workload descriptors
   */
  @Get("workloads")
  @ApiOperation({ summary: "List all discovered Kubernetes workloads" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all discovered Kubernetes Deployment workloads.",
  })
  async listWorkloads(): Promise<KubernetesWorkload[]> {
    return this.kubernetesService.discoverWorkloads();
  }

  /**
   * Finds Kubernetes workloads that match a given catalog component name.
   * Matches by workload name or label values.
   * @param componentName - The catalog component name to match against
   * @returns Array of matching workloads
   */
  @Get("workloads/match/:componentName")
  @ApiOperation({
    summary: "Match Kubernetes workloads for a catalog component",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns workloads matching the given component name.",
  })
  async matchComponent(
    @Param("componentName") componentName: string,
  ): Promise<KubernetesWorkload[]> {
    return this.kubernetesService.matchComponent(componentName);
  }
}
