import {
  Controller,
  Get,
  Param,
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
import {
  KubernetesService,
  KubernetesWorkload,
  CrdResource,
  ArgoRolloutStatus,
} from "./kubernetes.service";
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

  /**
   * Lists all Custom Resource Definitions installed in the cluster.
   * @returns Array of CRD descriptors with well-known operator display names
   */
  @Get("crds")
  @ApiOperation({
    summary: "List all Custom Resource Definitions in the cluster",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all discovered CRDs with operator display names.",
  })
  async listCRDs(): Promise<CrdResource[]> {
    return this.kubernetesService.listCRDs();
  }

  /**
   * Lists Custom Resource Definitions filtered by API group.
   * @param group - The API group to filter by, e.g. "argoproj.io"
   * @returns Array of CRD descriptors belonging to the specified group
   */
  @Get("crds/:group")
  @ApiOperation({ summary: "List CRDs filtered by API group" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns CRDs belonging to the specified API group.",
  })
  async listCRDsByGroup(@Param("group") group: string): Promise<CrdResource[]> {
    const all = await this.kubernetesService.listCRDs();
    return all.filter((crd) => crd.group === group);
  }

  /**
   * Lists Argo Rollout custom resources, optionally filtered by namespace.
   * Returns an empty array when the Argo Rollouts CRD is not installed.
   *
   * @param namespace - Kubernetes namespace to filter by (optional)
   * @returns Array of Argo Rollout status objects
   */
  @Get("rollouts")
  @ApiOperation({ summary: "List Argo Rollout statuses" })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Filter rollouts by Kubernetes namespace",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Argo Rollout status objects.",
  })
  async listRollouts(
    @Query("namespace") namespace?: string,
  ): Promise<ArgoRolloutStatus[]> {
    return this.kubernetesService.listRollouts(namespace);
  }
}
