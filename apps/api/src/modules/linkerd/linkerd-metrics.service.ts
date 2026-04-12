import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import {
  LinkerdLatency,
  LinkerdTopologyEdge,
  PrometheusApiResponse,
  PrometheusRangeResult,
  PrometheusTimeseries,
} from "./interfaces/linkerd.interfaces";

/** Default Prometheus base URL when PROMETHEUS_URL is not set. */
const DEFAULT_PROMETHEUS_URL = "http://prometheus:9090";

/**
 * Service that queries Prometheus for Linkerd-sourced traffic metrics
 * (requests-per-second, error rate, latency percentiles, and topology).
 *
 * Linkerd emits:
 * - `request_total{deployment, namespace, direction, classification}` — request counter
 * - `response_latency_ms_bucket{deployment, namespace, direction, le}` — latency histogram
 * - `request_total{dst_deployment, deployment, namespace}` — topology edges
 *
 * All public methods return empty result sets gracefully when Prometheus is
 * unreachable or returns an error response.
 */
@Injectable()
export class LinkerdMetricsService {
  private readonly logger = new Logger(LinkerdMetricsService.name);
  private readonly prometheusUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.prometheusUrl = process.env.PROMETHEUS_URL ?? DEFAULT_PROMETHEUS_URL;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Queries the inbound request rate (RPS) for a deployment over the given
   * time range using the Linkerd `request_total` counter.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus range duration string, e.g. "5m", "1h"
   * @returns Parsed range query result; empty timeseries on error
   */
  async getServiceRps(
    deployment: string,
    namespace: string,
    range: string,
  ): Promise<PrometheusRangeResult> {
    const query =
      `sum(rate(request_total{deployment="${deployment}",` +
      `namespace="${namespace}",direction="inbound"}[${range}])) by (deployment, namespace)`;
    return this.executeRangeQuery(query, range);
  }

  /**
   * Queries the failure rate for a deployment — the fraction of inbound
   * requests classified as "failure" by the Linkerd proxy.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus range duration string
   * @returns Parsed range query result; empty timeseries on error
   */
  async getServiceErrorRate(
    deployment: string,
    namespace: string,
    range: string,
  ): Promise<PrometheusRangeResult> {
    const selector = `deployment="${deployment}",namespace="${namespace}",direction="inbound"`;
    const query =
      `sum(rate(request_total{${selector},classification="failure"}[${range}])) / ` +
      `sum(rate(request_total{${selector}}[${range}]))`;
    return this.executeRangeQuery(query, range);
  }

  /**
   * Queries P50, P95, and P99 latency percentiles for a deployment using the
   * Linkerd `response_latency_ms_bucket` histogram.
   *
   * @param deployment - Kubernetes deployment name
   * @param namespace - Kubernetes namespace
   * @param range - Prometheus range duration string
   * @returns Object with p50, p95, and p99 PrometheusRangeResult values
   */
  async getServiceLatency(
    deployment: string,
    namespace: string,
    range: string,
  ): Promise<LinkerdLatency> {
    const baseSelector = `deployment="${deployment}",namespace="${namespace}",direction="inbound"`;

    const [p50, p95, p99] = await Promise.all([
      this.executeRangeQuery(
        `histogram_quantile(0.50, sum(rate(response_latency_ms_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
      this.executeRangeQuery(
        `histogram_quantile(0.95, sum(rate(response_latency_ms_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
      this.executeRangeQuery(
        `histogram_quantile(0.99, sum(rate(response_latency_ms_bucket{${baseSelector}}[${range}])) by (le))`,
        range,
      ),
    ]);

    return { p50, p95, p99 };
  }

  /**
   * Builds a service dependency topology by querying Prometheus for
   * `request_total` time series that include both a `deployment` (source) and
   * `dst_deployment` (destination) label. Each unique label pair becomes a
   * directed edge with an approximate RPS value.
   *
   * @param range - Prometheus range duration string used for the rate window
   * @returns Array of directed topology edges; empty when Prometheus unavailable
   */
  async buildTopology(range = "5m"): Promise<LinkerdTopologyEdge[]> {
    const query =
      `sum(rate(request_total{dst_deployment!=""}[${range}])) ` +
      `by (deployment, namespace, dst_deployment)`;

    const result = await this.executeRangeQuery(query, range);
    const edgeMap = new Map<string, LinkerdTopologyEdge>();

    for (const series of result.timeseries) {
      const source = series.metric["deployment"] ?? "";
      const destination = series.metric["dst_deployment"] ?? "";
      const namespace = series.metric["namespace"] ?? "default";
      if (!source || !destination) continue;

      const key = `${namespace}/${source}->${destination}`;
      if (edgeMap.has(key)) continue;

      // Use the last data point as the approximate current RPS.
      const lastValue = series.values[series.values.length - 1];
      const rps = lastValue ? parseFloat(lastValue[1]) : undefined;

      edgeMap.set(key, { source, destination, namespace, rps });
    }

    return Array.from(edgeMap.values());
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Executes a Prometheus range query and parses the response.
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
   * Converts a Prometheus duration string (e.g. "5m", "1h", "30s") to seconds.
   * Returns 300 for unrecognized formats.
   */
  private parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return 300;
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
   */
  private resolveStep(durationSeconds: number): string {
    if (durationSeconds <= 300) return "15s";
    if (durationSeconds <= 3600) return "60s";
    if (durationSeconds <= 86400) return "300s";
    return "900s";
  }
}
