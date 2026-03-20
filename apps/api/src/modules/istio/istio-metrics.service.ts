import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import {
  IstioLatency,
  PrometheusApiResponse,
  PrometheusRangeResult,
  PrometheusTimeseries,
} from "./interfaces/istio.interfaces";

/** Default Prometheus base URL when PROMETHEUS_URL is not set. */
const DEFAULT_PROMETHEUS_URL = "http://prometheus:9090";

/**
 * Service that queries Prometheus for Istio-sourced traffic metrics
 * (requests-per-second, error rate, and latency percentiles).
 *
 * The Prometheus base URL is read from the PROMETHEUS_URL environment
 * variable; it defaults to http://prometheus:9090 when the variable is
 * absent.
 *
 * All public methods return empty result sets gracefully when Prometheus is
 * unreachable or returns an error response.
 */
@Injectable()
export class IstioMetricsService {
  private readonly logger = new Logger(IstioMetricsService.name);
  private readonly prometheusUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.prometheusUrl = process.env.PROMETHEUS_URL ?? DEFAULT_PROMETHEUS_URL;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Queries the rate of Istio requests (RPS) for a service over the given
   * time range using the `istio_requests_total` counter.
   *
   * @param service - Kubernetes service name (destination_service_name label)
   * @param namespace - Kubernetes namespace (destination_service_namespace label)
   * @param range - Prometheus range duration string, e.g. "5m", "1h"
   * @returns Parsed range query result; empty timeseries on error
   */
  async getServiceRps(
    service: string,
    namespace: string,
    range: string,
  ): Promise<PrometheusRangeResult> {
    const query = `rate(istio_requests_total{destination_service_name="${service}",destination_service_namespace="${namespace}"}[${range}])`;
    return this.executeRangeQuery(query, range);
  }

  /**
   * Queries the 5xx error rate for a service over the given time range.
   * The error rate is computed as the fraction of requests with a
   * response_code >= 500.
   *
   * @param service - Kubernetes service name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus range duration string
   * @returns Parsed range query result; empty timeseries on error
   */
  async getServiceErrorRate(
    service: string,
    namespace: string,
    range: string,
  ): Promise<PrometheusRangeResult> {
    const query =
      `sum(rate(istio_requests_total{destination_service_name="${service}",` +
      `destination_service_namespace="${namespace}",response_code=~"5.."}[${range}])) / ` +
      `sum(rate(istio_requests_total{destination_service_name="${service}",` +
      `destination_service_namespace="${namespace}"}[${range}]))`;
    return this.executeRangeQuery(query, range);
  }

  /**
   * Queries P50, P95, and P99 latency percentiles for a service using the
   * `istio_request_duration_milliseconds_bucket` histogram.
   *
   * @param service - Kubernetes service name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus range duration string
   * @returns Object with p50, p95, and p99 PrometheusRangeResult values
   */
  async getServiceLatency(
    service: string,
    namespace: string,
    range: string,
  ): Promise<IstioLatency> {
    const baseSelector =
      `destination_service_name="${service}",` +
      `destination_service_namespace="${namespace}"`;

    const [p50, p95, p99] = await Promise.all([
      this.executeRangeQuery(
        `histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
      this.executeRangeQuery(
        `histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
      this.executeRangeQuery(
        `histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
    ]);

    return { p50, p95, p99 };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Executes a Prometheus instant range query against the configured
   * Prometheus HTTP API and parses the response into a PrometheusRangeResult.
   *
   * Uses the `/api/v1/query_range` endpoint with a calculated end time of now
   * and a start time of (now - range duration).
   *
   * @param query - PromQL expression to execute
   * @param range - Duration string used to compute the query window start time
   * @returns Parsed range result; empty timeseries when Prometheus is unavailable
   */
  private async executeRangeQuery(
    query: string,
    range: string,
  ): Promise<PrometheusRangeResult> {
    const now = Math.floor(Date.now() / 1000);
    const durationSeconds = this.parseDurationToSeconds(range);
    const start = now - durationSeconds;

    const url = `${this.prometheusUrl}/api/v1/query_range`;
    const params = {
      query,
      start: String(start),
      end: String(now),
      step: this.resolveStep(durationSeconds),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<PrometheusApiResponse>(url, { params }),
      );

      const data = response.data;

      if (data.status !== "success" || !data.data) {
        this.logger.warn(
          `Prometheus query returned non-success status: ${data.status} — ${data.error ?? ""}`,
        );
        return { timeseries: [], query };
      }

      const timeseries: PrometheusTimeseries[] = data.data.result.map(
        (series) => ({
          metric: series.metric,
          values: series.values ?? [],
        }),
      );

      return { timeseries, query };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Prometheus query failed: ${message}`);
      return { timeseries: [], query };
    }
  }

  /**
   * Converts a Prometheus duration string (e.g. "5m", "1h", "30s") to a
   * number of seconds. Returns 300 (5 minutes) for unrecognized formats.
   *
   * @param duration - Prometheus duration string
   * @returns Duration in seconds
   */
  private parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) {
      return 300;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] ?? 60);
  }

  /**
   * Resolves an appropriate Prometheus query step for a given duration window.
   * Larger windows use coarser steps to limit response size.
   *
   * @param durationSeconds - Query window size in seconds
   * @returns Step string for the Prometheus query_range API
   */
  private resolveStep(durationSeconds: number): string {
    if (durationSeconds <= 300) return "15s";
    if (durationSeconds <= 3600) return "60s";
    if (durationSeconds <= 86400) return "300s";
    return "900s";
  }
}
