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
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
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
  FluxInstallStatus,
  FluxKustomization,
  FluxHelmRelease,
  FluxSource,
  KedaInstallStatus,
  KedaScaledObject,
  KedaScaledJob,
  KedaScaledObjectTrigger,
} from "./kubernetes.service";
import {
  KyvernoPolicyReportService,
  KyvernoPolicyReportResult,
} from "./kyverno-policy-report.service";
import {
  GatekeeperService,
  GatekeeperConstraintTemplate,
  GatekeeperViolation,
} from "./gatekeeper.service";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CreateOperatorBindingBodyDto } from "./dto/create-operator-binding-body.dto";
import { DeleteOperatorBindingDto } from "./dto/delete-operator-binding.dto";
import { FluxBindingService } from "./flux-binding.service";
import { FluxBinding } from "./entities/flux-binding.entity";
import { CreateFluxBindingDto } from "./dto/create-flux-binding.dto";
import { KedaBindingService } from "./keda-binding.service";
import { KedaBinding } from "./entities/keda-binding.entity";
import { CreateKedaBindingDto } from "./dto/create-keda-binding.dto";
import {
  ElasticStackService,
  ElasticStackResult,
} from "./elastic-stack.service";
import { ThanosService, ThanosResult } from "./thanos.service";
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
    @Optional()
    private readonly gatekeeperService?: GatekeeperService,
    @Optional()
    private readonly fluxBindingService?: FluxBindingService,
    @Optional()
    private readonly kedaBindingService?: KedaBindingService,
    @Optional()
    private readonly elasticStackService?: ElasticStackService,
    @Optional()
    private readonly thanosService?: ThanosService,
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
  // Gatekeeper (OPA Gatekeeper) endpoints
  // ---------------------------------------------------------------------------

  /**
   * Returns whether OPA Gatekeeper is installed in the cluster by checking
   * for the presence of the "gatekeeper-system" namespace.
   *
   * @returns Object with enabled boolean
   */
  @Get("gatekeeper/enabled")
  @ApiOperation({
    summary: "Check whether OPA Gatekeeper is installed in the cluster",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns { enabled: boolean }.",
  })
  async isGatekeeperEnabled(): Promise<{ enabled: boolean }> {
    if (!this.gatekeeperService) {
      return { enabled: false };
    }
    const enabled = await this.gatekeeperService.isGatekeeperEnabled();
    return { enabled };
  }

  /**
   * Lists Gatekeeper ConstraintTemplate resources installed in the cluster.
   * Returns an empty array when Gatekeeper is not installed.
   *
   * @returns Array of mapped ConstraintTemplate descriptors
   */
  @Get("gatekeeper/constraint-templates")
  @ApiOperation({
    summary: "List Gatekeeper ConstraintTemplate resources",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all Gatekeeper ConstraintTemplate resources.",
  })
  async listConstraintTemplates(): Promise<GatekeeperConstraintTemplate[]> {
    if (!this.gatekeeperService) {
      return [];
    }
    return this.gatekeeperService.listConstraintTemplates();
  }

  /**
   * Lists aggregated Gatekeeper violations across all Constraint instances.
   * An optional namespace query parameter filters results to that namespace.
   *
   * @param namespace - Optional Kubernetes namespace to filter violations
   * @returns Array of mapped GatekeeperViolation entries
   */
  @Get("gatekeeper/violations")
  @ApiOperation({
    summary: "List Gatekeeper violations across all Constraint instances",
  })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Optional namespace to filter violations",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns Gatekeeper violations.",
  })
  async listGatekeeperViolations(
    @Query("namespace") namespace?: string,
  ): Promise<GatekeeperViolation[]> {
    if (!this.gatekeeperService) {
      return [];
    }
    return this.gatekeeperService.listViolations(namespace);
  }

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

  // ---------------------------------------------------------------------------
  // Flux GitOps (FARM-S248 / FARM-S249 / FARM-S250)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of Flux v2, including per-controller
   * readiness information.
   *
   * @returns FluxInstallStatus with overall installed flag and controller list
   */
  @Get("flux/status")
  @ApiOperation({ summary: "Get Flux v2 installation status" })
  @ApiOkResponse({
    description: "Flux installation status with controller info",
  })
  getFluxStatus(): Promise<FluxInstallStatus> {
    return this.kubernetesService.getFluxStatus();
  }

  /**
   * Lists all Flux Kustomization custom resources discovered in the cluster.
   *
   * @returns Array of FluxKustomization descriptors
   */
  @Get("flux/kustomizations")
  @ApiOperation({ summary: "List Flux Kustomizations" })
  @ApiOkResponse({ description: "Array of Flux Kustomization resources" })
  listFluxKustomizations(): Promise<FluxKustomization[]> {
    return this.kubernetesService.listFluxKustomizations();
  }

  /**
   * Lists all Flux HelmRelease custom resources discovered in the cluster.
   *
   * @returns Array of FluxHelmRelease descriptors
   */
  @Get("flux/helm-releases")
  @ApiOperation({ summary: "List Flux HelmReleases" })
  @ApiOkResponse({ description: "Array of Flux HelmRelease resources" })
  listFluxHelmReleases(): Promise<FluxHelmRelease[]> {
    return this.kubernetesService.listFluxHelmReleases();
  }

  /**
   * Lists all Flux bindings for a given catalog component.
   *
   * @param componentId - The catalog component UUID
   * @param req - The authenticated request carrying optional org context
   * @returns Array of FluxBinding entities for the component
   */
  @Get("components/:componentId/flux-bindings")
  @ApiOperation({ summary: "List Flux bindings for a catalog component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all Flux bindings for the specified component.",
  })
  listFluxBindingsByComponent(
    @Param("componentId") componentId: string,
    @Req() req: RequestWithOrg,
  ): Promise<FluxBinding[]> {
    if (!this.fluxBindingService) {
      throw new ServiceUnavailableException("FluxBindingService not available");
    }
    return this.fluxBindingService.findByComponent(
      componentId,
      req.organizationId,
    );
  }

  /**
   * Creates a binding between a Flux resource and a catalog component.
   * The organization scope is derived from the authenticated request context;
   * any organizationId supplied in the body is ignored and replaced.
   *
   * @param dto - Binding details from the request body
   * @param req - The authenticated request carrying optional org context
   * @returns The created FluxBinding entity
   */
  @Post("flux/binding")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Bind a Flux resource to a catalog component" })
  @ApiCreatedResponse({ description: "Binding created" })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Binding already exists",
  })
  createFluxBinding(
    @Body() dto: CreateFluxBindingDto,
    @Req() req: RequestWithOrg,
  ): Promise<FluxBinding> {
    if (!this.fluxBindingService) {
      throw new ServiceUnavailableException("FluxBindingService not available");
    }
    return this.fluxBindingService.create({
      ...dto,
      organizationId: req.organizationId,
    });
  }

  /**
   * Removes a Flux-resource-to-component binding by its UUID.
   * The operation is scoped to the caller's organization; bindings belonging
   * to another organization cannot be removed.
   *
   * @param id - The binding UUID
   * @param req - The authenticated request carrying optional org context
   */
  @Delete("flux/binding/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a Flux-component binding" })
  @ApiParam({ name: "id", description: "Binding UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Binding removed",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Binding not found",
  })
  removeFluxBinding(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    if (!this.fluxBindingService) {
      throw new ServiceUnavailableException("FluxBindingService not available");
    }
    return this.fluxBindingService.remove(id, req.organizationId);
  }

  /**
   * Lists all Flux GitRepository and OCIRepository source resources in the
   * cluster.
   *
   * @returns Array of FluxSource descriptors
   */
  @Get("flux/sources")
  @ApiOperation({
    summary: "List Flux GitRepository and OCIRepository sources",
  })
  @ApiOkResponse({ description: "Array of Flux source resources" })
  listFluxSources(): Promise<FluxSource[]> {
    return this.kubernetesService.listFluxSources();
  }

  // ---------------------------------------------------------------------------
  // KEDA Autoscaling (FARM-S252 / FARM-S253)
  // ---------------------------------------------------------------------------

  /**
   * Returns the installation status of the KEDA autoscaler in the cluster.
   *
   * @returns KEDA installation status with version
   */
  @Get("keda/status")
  @ApiOperation({ summary: "Get KEDA installation status" })
  @ApiOkResponse({ description: "KEDA installation status" })
  getKedaStatus(): Promise<KedaInstallStatus> {
    return this.kubernetesService.getKedaStatus();
  }

  /**
   * Lists all KEDA ScaledObject resources cluster-wide.
   *
   * @returns Array of KEDA ScaledObject resources
   */
  @Get("keda/scaled-objects")
  @ApiOperation({ summary: "List KEDA ScaledObjects" })
  @ApiOkResponse({ description: "Array of KEDA ScaledObject resources" })
  listKedaScaledObjects(): Promise<KedaScaledObject[]> {
    return this.kubernetesService.listKedaScaledObjects();
  }

  /**
   * Lists all KEDA ScaledJob resources cluster-wide.
   *
   * @returns Array of KEDA ScaledJob resources
   */
  @Get("keda/scaled-jobs")
  @ApiOperation({ summary: "List KEDA ScaledJobs" })
  @ApiOkResponse({ description: "Array of KEDA ScaledJob resources" })
  listKedaScaledJobs(): Promise<KedaScaledJob[]> {
    return this.kubernetesService.listKedaScaledJobs();
  }

  /**
   * Returns the list of triggers for a specific KEDA ScaledObject.
   *
   * @param namespace - Kubernetes namespace of the ScaledObject
   * @param name - ScaledObject name
   * @returns Array of scaler trigger descriptors
   */
  @Get("keda/scaled-objects/:namespace/:name/triggers")
  @ApiOperation({ summary: "Get triggers for a KEDA ScaledObject" })
  @ApiParam({ name: "namespace", description: "Kubernetes namespace" })
  @ApiParam({ name: "name", description: "ScaledObject name" })
  @ApiOkResponse({ description: "Array of scaler trigger descriptors" })
  getKedaScaledObjectTriggers(
    @Param("namespace") namespace: string,
    @Param("name") name: string,
  ): Promise<KedaScaledObjectTrigger[]> {
    return this.kubernetesService.getKedaScaledObjectTriggers(name, namespace);
  }

  /**
   * Lists all KEDA bindings for a given catalog component.
   *
   * @param componentId - The catalog component UUID
   * @param req - The authenticated request carrying optional org context
   * @returns Array of KedaBinding entities for the component
   */
  @Get("components/:componentId/keda-bindings")
  @ApiOperation({ summary: "List KEDA bindings for a catalog component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all KEDA bindings for the specified component.",
  })
  listKedaBindingsByComponent(
    @Param("componentId") componentId: string,
    @Req() req: RequestWithOrg,
  ): Promise<KedaBinding[]> {
    if (!this.kedaBindingService) {
      throw new ServiceUnavailableException("KedaBindingService not available");
    }
    return this.kedaBindingService.findByComponent(
      componentId,
      req.organizationId,
    );
  }

  /**
   * Creates a binding between a KEDA ScaledObject and a catalog component.
   * The organization scope is derived from the authenticated request context;
   * any organizationId supplied in the body is ignored and replaced.
   *
   * @param dto - Binding details from the request body
   * @param req - The authenticated request carrying optional org context
   * @returns The created KedaBinding entity
   */
  @Post("keda/binding")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Bind a KEDA ScaledObject to a catalog component" })
  @ApiCreatedResponse({ description: "Binding created" })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Binding already exists",
  })
  createKedaBinding(
    @Body() dto: CreateKedaBindingDto,
    @Req() req: RequestWithOrg,
  ): Promise<KedaBinding> {
    if (!this.kedaBindingService) {
      throw new ServiceUnavailableException("KedaBindingService not available");
    }
    return this.kedaBindingService.create({
      ...dto,
      organizationId: req.organizationId,
    });
  }

  /**
   * Removes a KEDA ScaledObject-to-component binding by its UUID.
   * The operation is scoped to the caller's organization; bindings belonging
   * to another organization cannot be removed.
   *
   * @param id - The binding UUID
   * @param req - The authenticated request carrying optional org context
   */
  @Delete("keda/binding/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a KEDA-component binding" })
  @ApiParam({ name: "id", description: "Binding UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Binding removed",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Binding not found",
  })
  removeKedaBinding(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    if (!this.kedaBindingService) {
      throw new ServiceUnavailableException("KedaBindingService not available");
    }
    return this.kedaBindingService.remove(id, req.organizationId);
  }

  /**
   * Returns whether the Kubernetes integration is configured and reachable.
   */
  @Get("available")
  @ApiOperation({ summary: "Check if Kubernetes is configured and reachable" })
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

  // ---------------------------------------------------------------------------
  // Elastic Stack (FARM-S331, FARM-S332, FARM-S333)
  // ---------------------------------------------------------------------------

  /**
   * Returns a full Elastic Stack discovery report for the cluster.
   *
   * Aggregates ECK-managed resources (Elasticsearch, Kibana, Logstash, Beats),
   * in-cluster log forwarders (Fluent Bit, Fluentd, Logstash Helm deployments),
   * and an optional external Elasticsearch reachability probe.
   *
   * All sub-queries degrade gracefully: if any individual discovery call fails
   * the remaining results are still returned with safe empty defaults.
   *
   * @param namespace - Optional Kubernetes namespace to scope all queries
   * @returns ElasticStackResult aggregating all discovered components
   */
  @Get("elastic-stack")
  @ApiOperation({
    summary: "Discover Elastic Stack components in the cluster",
  })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Scope all discovery queries to this Kubernetes namespace",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Returns ECK resources, in-cluster log forwarders, and external Elasticsearch status.",
  })
  async getElasticStack(
    @Query("namespace") namespace?: string,
  ): Promise<ElasticStackResult> {
    if (!this.elasticStackService) {
      throw new ServiceUnavailableException(
        "ElasticStackService not available",
      );
    }
    return this.elasticStackService.getAll(namespace);
  }

  /**
   * @returns ThanosResult aggregating Thanos component discovery and backend detection
   */
  @Get("thanos")
  @ApiOperation({
    summary: "Discover Thanos components and detect metrics backend",
  })
  @ApiQuery({
    name: "namespace",
    required: false,
    description: "Scope discovery queries to this Kubernetes namespace",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Returns operator-managed Thanos components, Helm/YAML-installed components, detected backend type, and long-term retention flag.",
  })
  async getThanos(
    @Query("namespace") namespace?: string,
  ): Promise<ThanosResult> {
    if (!this.thanosService) {
      throw new ServiceUnavailableException("ThanosService not available");
    }
    return this.thanosService.getAll(namespace);
  }
}
