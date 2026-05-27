import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { IstioService } from "./istio.service";
import { IstioMetricsService } from "./istio-metrics.service";
import { PatchWeightsDto } from "./dto/patch-weights.dto";
import {
  IstioAuthorizationPolicy,
  IstioLatency,
  IstioPeerAuthentication,
  IstioTopologyEdge,
  IstioVirtualService,
  PrometheusRangeResult,
} from "./interfaces/istio.interfaces";

/**
 * Controller for Istio service mesh integration endpoints.
 * All routes are under /api/v1/istio and require JWT authentication.
 *
 * Operations that mutate cluster state (weight patching) additionally
 * require the ENVIRONMENT_WRITE permission, enforced by PermissionGuard.
 */
@ApiTags("Istio")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("istio")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - missing or invalid JWT token.",
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden — insufficient role.",
})
export class IstioController {
  constructor(
    private readonly istioService: IstioService,
    private readonly istioMetricsService: IstioMetricsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  /**
   * Returns whether Istio is installed in the target cluster.
   *
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Object containing the istioEnabled boolean flag
   */
  @Get("status")
  @ApiOperation({ summary: "Check if Istio is installed in the cluster" })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Istio availability status.",
  })
  async getStatus(
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<{ istioEnabled: boolean }> {
    const istioEnabled = await this.istioService.isIstioEnabled(kubeconfig);
    return { istioEnabled };
  }

  // ---------------------------------------------------------------------------
  // VirtualService endpoints
  // ---------------------------------------------------------------------------

  /**
   * Lists all VirtualService resources in the given namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of VirtualService objects
   */
  @Get("virtual-services")
  @ApiOperation({ summary: "List VirtualServices in a namespace" })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of VirtualServices.",
  })
  async listVirtualServices(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<IstioVirtualService[]> {
    return this.istioService.getVirtualServices(
      namespace ?? "default",
      kubeconfig,
    );
  }

  /**
   * Retrieves a single VirtualService by namespace and name.
   *
   * @param namespace - Kubernetes namespace
   * @param name - VirtualService resource name
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns The requested VirtualService
   */
  @Get("virtual-services/:namespace/:name")
  @ApiOperation({ summary: "Get a single VirtualService" })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "VirtualService detail." })
  async getVirtualService(
    @Param("namespace") namespace: string,
    @Param("name") name: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<IstioVirtualService> {
    return this.istioService.getVirtualService(namespace, name, kubeconfig);
  }

  /**
   * Patches the route weights of a VirtualService's first HTTP route rule.
   * Requires ADMIN role.
   *
   * @param namespace - Kubernetes namespace
   * @param name - VirtualService resource name
   * @param body - Patch body containing ordered destination/weight pairs
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   */
  @Patch("virtual-services/:namespace/:name/weights")
  @HttpCode(HttpStatus.NO_CONTENT)
  @OrgRequired()
  @UseGuards(OrgRequiredGuard, PermissionGuard)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiHeader({
    name: "x-organization-id",
    required: true,
    description: "Organization ID",
  })
  @ApiOperation({ summary: "Patch VirtualService route weights (admin only)" })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Weights updated.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden - requires ENVIRONMENT_WRITE permission.",
  })
  async patchWeights(
    @Param("namespace") namespace: string,
    @Param("name") name: string,
    @Body() body: PatchWeightsDto,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<void> {
    await this.istioService.patchVirtualServiceWeights(
      namespace,
      name,
      body.weights,
      kubeconfig,
    );
  }

  // ---------------------------------------------------------------------------
  // Security posture endpoints
  // ---------------------------------------------------------------------------

  /**
   * Lists PeerAuthentication resources (mTLS policies) in a namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of PeerAuthentication objects
   */
  @Get("peer-authentications")
  @ApiOperation({ summary: "List PeerAuthentication resources in a namespace" })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of PeerAuthentications.",
  })
  async listPeerAuthentications(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<IstioPeerAuthentication[]> {
    return this.istioService.getPeerAuthentications(
      namespace ?? "default",
      kubeconfig,
    );
  }

  /**
   * Lists AuthorizationPolicy resources in a namespace.
   * Each policy includes a hasNoRules flag as a security warning indicator.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of AuthorizationPolicy objects
   */
  @Get("authorization-policies")
  @ApiOperation({
    summary: "List AuthorizationPolicy resources in a namespace",
  })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of AuthorizationPolicies with security warning flags.",
  })
  async listAuthorizationPolicies(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<IstioAuthorizationPolicy[]> {
    return this.istioService.getAuthorizationPolicies(
      namespace ?? "default",
      kubeconfig,
    );
  }

  // ---------------------------------------------------------------------------
  // Metrics endpoints
  // ---------------------------------------------------------------------------

  /**
   * Returns the requests-per-second timeseries for a service.
   *
   * @param service - Kubernetes service name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string (e.g. "5m", "1h")
   * @returns RPS timeseries result
   */
  @Get("metrics/rps")
  @ApiOperation({ summary: "Get requests-per-second timeseries for a service" })
  @ApiQuery({ name: "service", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "RPS timeseries." })
  async getMetricsRps(
    @Query("service") service: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<PrometheusRangeResult> {
    return this.istioMetricsService.getServiceRps(service, namespace, range);
  }

  /**
   * Returns the 5xx error rate timeseries for a service.
   *
   * @param service - Kubernetes service name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string
   * @returns Error rate timeseries result
   */
  @Get("metrics/error-rate")
  @ApiOperation({ summary: "Get 5xx error rate timeseries for a service" })
  @ApiQuery({ name: "service", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "Error rate timeseries." })
  async getMetricsErrorRate(
    @Query("service") service: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<PrometheusRangeResult> {
    return this.istioMetricsService.getServiceErrorRate(
      service,
      namespace,
      range,
    );
  }

  /**
   * Returns P50, P95, and P99 latency percentiles for a service.
   *
   * @param service - Kubernetes service name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string
   * @returns Latency percentiles result
   */
  @Get("metrics/latency")
  @ApiOperation({
    summary: "Get P50/P95/P99 latency percentiles for a service",
  })
  @ApiQuery({ name: "service", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "Latency percentiles." })
  async getMetricsLatency(
    @Query("service") service: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<IstioLatency> {
    return this.istioMetricsService.getServiceLatency(
      service,
      namespace,
      range,
    );
  }

  // ---------------------------------------------------------------------------
  // Topology endpoint
  // ---------------------------------------------------------------------------

  /**
   * Returns the service dependency graph derived from VirtualService routing
   * configuration.
   *
   * @param orgId - Organization identifier for multi-tenant scoping
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of directed topology edges
   */
  @Get("topology")
  @ApiOperation({ summary: "Get Istio service dependency graph" })
  @ApiQuery({ name: "orgId", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Service topology edges.",
  })
  async getTopology(
    @Query("orgId") orgId: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<IstioTopologyEdge[]> {
    return this.istioService.buildTopology(orgId ?? "", kubeconfig);
  }

  /**
   * Returns whether Istio is installed in the cluster.
   */
  @Get("available")
  @ApiOperation({ summary: "Check if Istio is installed in the cluster" })
  @ApiResponse({ status: 200, description: "Availability status" })
  async getAvailability(): Promise<{ available: boolean; reason?: string }> {
    const available = await this.istioService.isIstioEnabled();
    return available
      ? { available: true }
      : { available: false, reason: "Istio not detected in cluster" };
  }
}
