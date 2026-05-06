import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { ObservabilityService } from "./observability.service";
import { ObservabilitySummaryDto } from "./dto/observability-summary.dto";

/**
 * Controller for application observability data.
 * Provides metrics summary, health, tooling links, and proxy endpoints for
 * Prometheus, Jaeger, and Loki.
 */
@ApiTags("Observability")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("observability")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - Insufficient role.",
  type: ErrorResponseDto,
})
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  /** Aggregated metrics summary for the observability dashboard. */
  @Get("summary")
  @Roles("admin")
  @ApiOperation({
    summary: "Get observability metrics summary",
    description:
      "Returns process uptime, memory usage, HTTP request counts by status, latency percentiles, and external tool links.",
  })
  @ApiOkResponse({
    description: "Metrics summary retrieved.",
    type: ObservabilitySummaryDto,
  })
  async getSummary(): Promise<ObservabilitySummaryDto> {
    return this.observabilityService.getSummary();
  }

  // ---------------------------------------------------------------------------
  // S92: PromQL proxy endpoints
  // ---------------------------------------------------------------------------

  /**
   * Proxies an instant PromQL query to the configured Prometheus instance.
   * Returns a graceful error object if Prometheus is not reachable.
   */
  @Get("metrics/query")
  @Roles("admin")
  @ApiOperation({
    summary: "Instant PromQL query",
    description: "Proxies an instant PromQL query to Prometheus /api/v1/query.",
  })
  @ApiQuery({ name: "query", required: true, description: "PromQL expression" })
  @ApiQuery({
    name: "time",
    required: false,
    description: "Evaluation timestamp (Unix or RFC3339)",
  })
  @ApiOkResponse({ description: "Prometheus instant query result." })
  async prometheusQuery(
    @Query() query: Record<string, string>,
  ): Promise<unknown> {
    return this.observabilityService.queryPrometheus(query, "query");
  }

  /**
   * Proxies a range PromQL query to the configured Prometheus instance.
   * Returns a graceful error object if Prometheus is not reachable.
   */
  @Get("metrics/query-range")
  @Roles("admin")
  @ApiOperation({
    summary: "Range PromQL query",
    description:
      "Proxies a range PromQL query to Prometheus /api/v1/query_range.",
  })
  @ApiQuery({ name: "query", required: true, description: "PromQL expression" })
  @ApiQuery({
    name: "start",
    required: true,
    description: "Start timestamp (Unix or RFC3339)",
  })
  @ApiQuery({
    name: "end",
    required: true,
    description: "End timestamp (Unix or RFC3339)",
  })
  @ApiQuery({
    name: "step",
    required: true,
    description: "Query resolution step (e.g. 15s, 1m)",
  })
  @ApiOkResponse({ description: "Prometheus range query result." })
  async prometheusQueryRange(
    @Query() query: Record<string, string>,
  ): Promise<unknown> {
    return this.observabilityService.queryPrometheus(query, "query_range");
  }

  /**
   * Proxies a label names request to the configured Prometheus instance.
   * Returns a graceful error object if Prometheus is not reachable.
   */
  @Get("metrics/labels")
  @Roles("admin")
  @ApiOperation({
    summary: "List Prometheus label names",
    description: "Proxies a label names request to Prometheus /api/v1/labels.",
  })
  @ApiOkResponse({ description: "Prometheus labels list." })
  async prometheusLabels(
    @Query() query: Record<string, string>,
  ): Promise<unknown> {
    return this.observabilityService.queryPrometheus(query, "labels");
  }

  // ---------------------------------------------------------------------------
  // S94: Jaeger/Tempo trace proxy endpoints
  // ---------------------------------------------------------------------------

  /**
   * Proxies a trace list request to the configured Jaeger instance.
   * Returns a graceful error object if Jaeger is not reachable.
   */
  @Get("traces")
  @Roles("admin")
  @ApiOperation({
    summary: "List traces",
    description: "Proxies a trace list request to Jaeger /api/traces.",
  })
  @ApiQuery({
    name: "service",
    required: false,
    description: "Service name to filter traces",
  })
  @ApiQuery({
    name: "operation",
    required: false,
    description: "Operation name to filter traces",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of traces to return (default 20)",
  })
  @ApiQuery({
    name: "lookback",
    required: false,
    description: "Time window for traces (default 1h)",
  })
  @ApiOkResponse({ description: "Jaeger traces list." })
  async jaegerTraces(@Query() query: Record<string, string>): Promise<unknown> {
    const params: Record<string, string> = {
      limit: "20",
      lookback: "1h",
      ...query,
    };
    return this.observabilityService.queryJaegerTraces(params);
  }

  /**
   * Proxies a services list request to the configured Jaeger instance.
   * Returns a graceful error object if Jaeger is not reachable.
   */
  @Get("traces/services")
  @Roles("admin")
  @ApiOperation({
    summary: "List Jaeger services",
    description: "Proxies a services list request to Jaeger /api/services.",
  })
  @ApiOkResponse({ description: "Jaeger services list." })
  async jaegerServices(): Promise<unknown> {
    return this.observabilityService.queryJaegerServices();
  }

  /**
   * Proxies a trace detail request to the configured Jaeger instance.
   * Returns a graceful error object if Jaeger is not reachable.
   */
  @Get("traces/:traceId")
  @Roles("admin")
  @ApiOperation({
    summary: "Get trace by ID",
    description:
      "Proxies a trace detail request to Jaeger /api/traces/:traceId.",
  })
  @ApiParam({ name: "traceId", description: "The trace identifier" })
  @ApiOkResponse({ description: "Jaeger trace detail." })
  async jaegerTrace(@Param("traceId") traceId: string): Promise<unknown> {
    return this.observabilityService.queryJaegerTrace(traceId);
  }

  // ---------------------------------------------------------------------------
  // S95: Loki log proxy endpoints
  // ---------------------------------------------------------------------------

  /**
   * Proxies a log query to the configured Loki instance.
   * Returns a graceful error object if Loki is not reachable.
   */
  @Get("logs")
  @Roles("admin")
  @ApiOperation({
    summary: "Query logs",
    description: "Proxies a log query to Loki /loki/api/v1/query_range.",
  })
  @ApiQuery({
    name: "query",
    required: true,
    description: "LogQL expression",
  })
  @ApiQuery({
    name: "start",
    required: false,
    description: "Start timestamp (Unix nanoseconds or RFC3339)",
  })
  @ApiQuery({
    name: "end",
    required: false,
    description: "End timestamp (Unix nanoseconds or RFC3339)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of log lines to return (default 100)",
  })
  @ApiQuery({
    name: "direction",
    required: false,
    description: "Log order: forward or backward",
  })
  @ApiOkResponse({ description: "Loki log query result." })
  async lokiLogs(@Query() query: Record<string, string>): Promise<unknown> {
    const params: Record<string, string> = { limit: "100", ...query };
    return this.observabilityService.queryLoki(
      params,
      "/loki/api/v1/query_range",
    );
  }

  /**
   * Proxies a label names request to the configured Loki instance.
   * Returns a graceful error object if Loki is not reachable.
   */
  @Get("logs/labels")
  @Roles("admin")
  @ApiOperation({
    summary: "List Loki label names",
    description: "Proxies a label names request to Loki /loki/api/v1/labels.",
  })
  @ApiOkResponse({ description: "Loki label names." })
  async lokiLabels(@Query() query: Record<string, string>): Promise<unknown> {
    return this.observabilityService.queryLoki(query, "/loki/api/v1/labels");
  }

  /**
   * Proxies a label values request to the configured Loki instance.
   * Returns a graceful error object if Loki is not reachable.
   */
  @Get("logs/label/:name/values")
  @Roles("admin")
  @ApiOperation({
    summary: "Get Loki label values",
    description:
      "Proxies a label values request to Loki /loki/api/v1/label/:name/values.",
  })
  @ApiParam({ name: "name", description: "The label name" })
  @ApiOkResponse({ description: "Loki label values." })
  async lokiLabelValues(
    @Param("name") name: string,
    @Query() query: Record<string, string>,
  ): Promise<unknown> {
    return this.observabilityService.queryLoki(
      query,
      `/loki/api/v1/label/${name}/values`,
    );
  }
}
