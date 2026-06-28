import { Controller, Get, HttpStatus, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { LinkerdService } from "./linkerd.service";
import { LinkerdMetricsService } from "./linkerd-metrics.service";
import {
  LinkerdAuthorizationPolicy,
  LinkerdLatency,
  LinkerdServerAuthorization,
  LinkerdServiceProfile,
  LinkerdStatus,
  LinkerdTopologyEdge,
  PrometheusRangeResult,
} from "./interfaces/linkerd.interfaces";

/**
 * Controller for Linkerd 2.x service mesh integration endpoints.
 * All routes are under /api/v1/linkerd and require JWT authentication.
 */
@ApiTags("Linkerd")
@ApiBearerAuth()
@Controller("linkerd")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - missing or invalid JWT token.",
})
export class LinkerdController {
  constructor(
    private readonly linkerdService: LinkerdService,
    private readonly linkerdMetricsService: LinkerdMetricsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  /**
   * Returns Linkerd installation status and control plane component readiness.
   *
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns LinkerdStatus with installed flag and component array
   */
  @Get("status")
  @ApiOperation({ summary: "Get Linkerd installation status" })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Linkerd status and control plane component readiness.",
  })
  async getStatus(
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<LinkerdStatus> {
    return this.linkerdService.getStatus(kubeconfig);
  }

  // ---------------------------------------------------------------------------
  // Security posture endpoints
  // ---------------------------------------------------------------------------

  /**
   * Lists Linkerd ServerAuthorization resources in a namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of ServerAuthorization objects
   */
  @Get("server-authorizations")
  @ApiOperation({
    summary: "List ServerAuthorization resources in a namespace",
  })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of ServerAuthorizations.",
  })
  async listServerAuthorizations(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<LinkerdServerAuthorization[]> {
    return this.linkerdService.listServerAuthorizations(
      namespace ?? "default",
      kubeconfig,
    );
  }

  /**
   * Lists Linkerd AuthorizationPolicy resources in a namespace.
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
    description: "List of AuthorizationPolicies.",
  })
  async listAuthorizationPolicies(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<LinkerdAuthorizationPolicy[]> {
    return this.linkerdService.listAuthorizationPolicies(
      namespace ?? "default",
      kubeconfig,
    );
  }

  // ---------------------------------------------------------------------------
  // ServiceProfile endpoint
  // ---------------------------------------------------------------------------

  /**
   * Lists Linkerd ServiceProfile resources in a namespace.
   *
   * @param namespace - Kubernetes namespace to query
   * @param kubeconfig - Optional kubeconfig file path or inline YAML
   * @returns Array of ServiceProfile objects with route rules
   */
  @Get("service-profiles")
  @ApiOperation({ summary: "List ServiceProfile resources in a namespace" })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "kubeconfig", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of ServiceProfiles with route definitions.",
  })
  async listServiceProfiles(
    @Query("namespace") namespace: string,
    @Query("kubeconfig") kubeconfig?: string | string[],
  ): Promise<LinkerdServiceProfile[]> {
    return this.linkerdService.listServiceProfiles(
      namespace ?? "default",
      kubeconfig,
    );
  }

  // ---------------------------------------------------------------------------
  // Metrics endpoints
  // ---------------------------------------------------------------------------

  /**
   * Returns the inbound requests-per-second timeseries for a deployment.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string (e.g. "5m", "1h")
   * @returns RPS timeseries result
   */
  @Get("metrics/rps")
  @ApiOperation({
    summary: "Get inbound RPS timeseries for a deployment (Linkerd)",
  })
  @ApiQuery({ name: "deployment", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "RPS timeseries." })
  async getMetricsRps(
    @Query("deployment") deployment: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<PrometheusRangeResult> {
    return this.linkerdMetricsService.getServiceRps(
      deployment,
      namespace,
      range,
    );
  }

  /**
   * Returns the failure rate timeseries for a deployment.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string
   * @returns Error rate timeseries result
   */
  @Get("metrics/error-rate")
  @ApiOperation({
    summary: "Get failure rate timeseries for a deployment (Linkerd)",
  })
  @ApiQuery({ name: "deployment", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "Error rate timeseries." })
  async getMetricsErrorRate(
    @Query("deployment") deployment: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<PrometheusRangeResult> {
    return this.linkerdMetricsService.getServiceErrorRate(
      deployment,
      namespace,
      range,
    );
  }

  /**
   * Returns P50, P95, and P99 latency percentiles for a deployment.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus duration string
   * @returns Latency percentiles result
   */
  @Get("metrics/latency")
  @ApiOperation({
    summary: "Get P50/P95/P99 latency percentiles for a deployment (Linkerd)",
  })
  @ApiQuery({ name: "deployment", required: true })
  @ApiQuery({ name: "namespace", required: true })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({ status: HttpStatus.OK, description: "Latency percentiles." })
  async getMetricsLatency(
    @Query("deployment") deployment: string,
    @Query("namespace") namespace: string,
    @Query("range") range = "5m",
  ): Promise<LinkerdLatency> {
    return this.linkerdMetricsService.getServiceLatency(
      deployment,
      namespace,
      range,
    );
  }

  // ---------------------------------------------------------------------------
  // Topology endpoint
  // ---------------------------------------------------------------------------

  /**
   * Returns the service dependency graph derived from Linkerd Prometheus
   * traffic metrics (request_total label edges).
   *
   * @param range - Prometheus duration string for the rate window
   * @returns Array of directed topology edges
   */
  @Get("topology")
  @ApiOperation({ summary: "Get Linkerd service dependency graph" })
  @ApiQuery({ name: "range", required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Service topology edges.",
  })
  async getTopology(
    @Query("range") range = "5m",
  ): Promise<LinkerdTopologyEdge[]> {
    return this.linkerdMetricsService.buildTopology(range);
  }

  // ---------------------------------------------------------------------------
  // Availability endpoint
  // ---------------------------------------------------------------------------

  /**
   * Returns whether Linkerd is installed in the cluster.
   */
  @Get("available")
  @ApiOperation({ summary: "Check if Linkerd is installed in the cluster" })
  @ApiResponse({ status: HttpStatus.OK, description: "Availability status." })
  async getAvailability(): Promise<{ available: boolean; reason?: string }> {
    const available = await this.linkerdService.isLinkerdEnabled();
    return available
      ? { available: true }
      : { available: false, reason: "Linkerd not detected in cluster" };
  }
}
