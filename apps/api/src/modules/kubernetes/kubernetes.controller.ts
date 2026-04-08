import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  KubernetesService,
  KubernetesWorkload,
  CrdResource,
  ArgoRolloutStatus,
  OperatorInfo,
  CustomResourceInstance,
  NodeRuntimeInfo,
  CrioStorageMetrics,
  DragonflyInstallStatus,
  DragonflyTask,
  DragonflyPeer,
  DragonflyTaskMetrics,
} from "./kubernetes.service";
import {
  KyvernoPolicyReportService,
  KyvernoPolicyReportResult,
} from "./kyverno-policy-report.service";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CreateOperatorBindingBodyDto } from "./dto/create-operator-binding-body.dto";
import { DeleteOperatorBindingDto } from "./dto/delete-operator-binding.dto";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

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
  constructor(
    private readonly kubernetesService: KubernetesService,
    private readonly kyvernoPolicyReportService: KyvernoPolicyReportService,
    private readonly operatorBindingService: OperatorBindingService,
  ) {}

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

  /**
   * Lists Kyverno PolicyReport resources from the specified namespace.
   * Returns an empty array when Kyverno is not installed in the cluster.
   *
   * @param namespace - Kubernetes namespace to query (optional, defaults to "default")
   * @returns Array of mapped Kyverno policy report results
   */
  @Get("policy-reports")
  @ApiOperation({
    summary: "List Kyverno PolicyReport resources from a namespace",
  })
  @ApiQuery({
    name: "namespace",
    required: false,
    description:
      "Kubernetes namespace to list policy reports from (defaults to default)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Kyverno PolicyReport results for the namespace.",
  })
  async listPolicyReports(
    @Query("namespace") namespace?: string,
  ): Promise<KyvernoPolicyReportResult[]> {
    return this.kyvernoPolicyReportService.listPolicyReports(namespace);
  }

  /**
   * Lists Kyverno ClusterPolicyReport resources (cluster-scoped).
   * Returns an empty array when Kyverno is not installed in the cluster.
   *
   * @returns Array of mapped Kyverno cluster policy report results
   */
  @Get("cluster-policy-reports")
  @ApiOperation({
    summary: "List Kyverno ClusterPolicyReport resources",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Kyverno ClusterPolicyReport results.",
  })
  async listClusterPolicyReports(): Promise<KyvernoPolicyReportResult[]> {
    return this.kyvernoPolicyReportService.listClusterPolicyReports();
  }

  // ---------------------------------------------------------------------------
  // Operator Discovery (FARM-S237)
  // ---------------------------------------------------------------------------

  /**
   * Lists all OLM-managed operators discovered in the cluster.
   * Returns an empty array when OLM is not installed.
   *
   * @returns Array of operator descriptors
   */
  @Get("operators")
  @ApiOperation({
    summary: "List all discovered OLM operators in the cluster",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Returns all discovered OLM operators (ClusterServiceVersions).",
  })
  async listOperators(): Promise<OperatorInfo[]> {
    return this.kubernetesService.listOperators();
  }

  /**
   * Returns a single OLM operator by its CSV name.
   * Returns null when the operator is not found.
   *
   * @param name - The ClusterServiceVersion name
   * @returns The matching operator descriptor or null
   */
  @Get("operators/:name")
  @ApiOperation({ summary: "Get a single OLM operator by CSV name" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the operator matching the given name, or null.",
  })
  async getOperator(@Param("name") name: string): Promise<OperatorInfo | null> {
    const operators = await this.kubernetesService.listOperators();
    return operators.find((op) => op.name === name) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Custom Resource Inventory (FARM-S238)
  // ---------------------------------------------------------------------------

  /**
   * Lists all custom resource instances managed by a specific operator.
   * Discovers owned CRDs from the operator's CSV and queries each one.
   *
   * @param name - The operator CSV name
   * @returns Array of custom resource instances
   */
  @Get("operators/:name/custom-resources")
  @ApiOperation({
    summary: "List custom resource instances managed by an operator",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns custom resource instances belonging to the operator.",
  })
  async listOperatorCustomResources(
    @Param("name") name: string,
  ): Promise<CustomResourceInstance[]> {
    return this.kubernetesService.listOperatorCustomResources(name);
  }

  // ---------------------------------------------------------------------------
  // CRI-O Runtime Detection (FARM-S241)
  // ---------------------------------------------------------------------------

  /**
   * Lists container runtime information for all cluster nodes.
   * Extracts runtime name, version, kernel, OS, and architecture from each node.
   *
   * @returns Array of node runtime descriptors
   */
  @Get("nodes/runtimes")
  @ApiOperation({
    summary: "List container runtime info for all cluster nodes",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns container runtime information for each node.",
  })
  async listNodeRuntimes(): Promise<NodeRuntimeInfo[]> {
    return this.kubernetesService.listNodeRuntimes();
  }

  /**
   * Returns CRI-O storage metrics for a specific node.
   * Returns unavailable status when the node does not use CRI-O.
   *
   * @param nodeName - The Kubernetes node name
   * @returns CRI-O storage metrics with availability info
   */
  @Get("nodes/:nodeName/crio-metrics")
  @ApiOperation({
    summary: "Get CRI-O storage metrics for a specific node",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns CRI-O storage metrics for the specified node.",
  })
  async getCrioMetrics(
    @Param("nodeName") nodeName: string,
  ): Promise<CrioStorageMetrics> {
    return this.kubernetesService.getCrioMetrics(nodeName);
  }

  // ---------------------------------------------------------------------------
  // Operator Bindings (FARM-T155 / FARM-T156)
  // ---------------------------------------------------------------------------

  /**
   * Creates a binding between a Kubernetes operator and a catalog component.
   *
   * @param operatorName - The operator CSV name
   * @param body - Binding details from the request body (namespace, componentId)
   * @param req - Request with organization context
   * @returns The created OperatorBinding entity
   */
  @Post("operators/:name/bindings")
  @ApiOperation({ summary: "Bind an operator to a catalog component" })
  @ApiParam({ name: "name", description: "Operator name" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Binding created successfully",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Binding already exists",
  })
  async createBinding(
    @Param("name") operatorName: string,
    @Body() body: CreateOperatorBindingBodyDto,
    @Req() req: RequestWithOrg,
  ): Promise<OperatorBinding> {
    return this.operatorBindingService.create({
      ...body,
      operatorName,
      organizationId: req.organizationId,
    });
  }

  /**
   * Removes a binding between a Kubernetes operator and a catalog component.
   *
   * @param operatorName - The operator CSV name
   * @param dto - Identifies the binding to remove (namespace, componentId)
   */
  @Delete("operators/:name/bindings")
  @ApiOperation({ summary: "Remove an operator-to-component binding" })
  @ApiParam({ name: "name", description: "Operator name" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Binding removed",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBinding(
    @Param("name") operatorName: string,
    @Body() dto: DeleteOperatorBindingDto,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    return this.operatorBindingService.remove(
      operatorName,
      dto.operatorNamespace,
      dto.componentId,
      req.organizationId,
    );
  }

  /**
   * Lists all bindings for a given operator.
   *
   * @param operatorName - The operator CSV name
   * @param req - Request with organization context
   * @returns Array of OperatorBinding entities with component relations
   */
  @Get("operators/:name/bindings")
  @ApiOperation({ summary: "List bindings for an operator" })
  @ApiParam({ name: "name", description: "Operator name" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all bindings for the specified operator.",
  })
  async listBindings(
    @Param("name") operatorName: string,
    @Req() req: RequestWithOrg,
  ): Promise<OperatorBinding[]> {
    return this.operatorBindingService.findByOperator(
      operatorName,
      req.organizationId,
    );
  }

  /**
   * Lists all operator bindings for a given catalog component.
   *
   * @param componentId - The catalog component UUID
   * @returns Array of OperatorBinding entities for the component
   */
  @Get("components/:componentId/bindings")
  @ApiOperation({ summary: "List operator bindings for a catalog component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all operator bindings for the specified component.",
  })
  async listBindingsByComponent(
    @Param("componentId") componentId: string,
  ): Promise<OperatorBinding[]> {
    return this.operatorBindingService.findByComponent(componentId);
  }

  // ---------------------------------------------------------------------------
  // Dragonfly P2P CDN (FARM-S245 / FARM-S246)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of the Dragonfly P2P CDN in the cluster.
   *
   * @returns Dragonfly installation status with component breakdown
   */
  @Get("dragonfly/status")
  @ApiOperation({ summary: "Get Dragonfly P2P CDN installation status" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Dragonfly installation status and component breakdown.",
  })
  async getDragonflyStatus(): Promise<DragonflyInstallStatus> {
    return this.kubernetesService.getDragonflyStatus();
  }

  /**
   * Returns recent Dragonfly P2P pull tasks.
   *
   * @returns List of recent P2P pull tasks
   */
  @Get("dragonfly/tasks")
  @ApiOperation({ summary: "Get recent Dragonfly P2P pull tasks" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of recent P2P pull tasks.",
  })
  async getDragonflyTasks(): Promise<DragonflyTask[]> {
    return this.kubernetesService.getDragonflyTasks();
  }

  /**
   * Returns active Dragonfly peer nodes.
   *
   * @returns List of active Dragonfly peers
   */
  @Get("dragonfly/peers")
  @ApiOperation({ summary: "Get active Dragonfly peers" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of active Dragonfly peers.",
  })
  async getDragonflyPeers(): Promise<DragonflyPeer[]> {
    return this.kubernetesService.getDragonflyPeers();
  }

  /**
   * Returns aggregated Dragonfly P2P task metrics from the Manager.
   *
   * @returns Aggregated task counters from the Dragonfly Manager
   */
  @Get("dragonfly/metrics")
  @ApiOperation({ summary: "Get aggregated Dragonfly P2P task metrics" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Aggregated task counters from the Dragonfly Manager.",
  })
  async getDragonflyMetrics(): Promise<DragonflyTaskMetrics> {
    return this.kubernetesService.getDragonflyMetrics();
  }
}
