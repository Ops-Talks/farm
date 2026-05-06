import { Injectable, Optional, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";
import { firstValueFrom } from "rxjs";
import { ObservabilitySummaryDto } from "./dto/observability-summary.dto";

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    @Optional()
    @InjectMetric("http_requests_total")
    private readonly requestCounter?: Counter<string>,
    @Optional()
    @InjectMetric("http_request_duration_seconds")
    private readonly requestDuration?: Histogram<string>,
    @Optional()
    private readonly configService?: ConfigService,
    @Optional()
    private readonly httpService?: HttpService,
  ) {}

  async getSummary(): Promise<ObservabilitySummaryDto> {
    const mem = process.memoryUsage();

    const requestsByStatus = { "2xx": 0, "4xx": 0, "5xx": 0, other: 0 };
    let totalRequests = 0;

    if (this.requestCounter) {
      const counterData = await this.requestCounter.get();
      for (const val of counterData.values) {
        const statusCode = val.labels["status_code"];
        const count = val.value;
        totalRequests += count;

        if (typeof statusCode === "string") {
          if (statusCode.startsWith("2")) {
            requestsByStatus["2xx"] += count;
          } else if (statusCode.startsWith("4")) {
            requestsByStatus["4xx"] += count;
          } else if (statusCode.startsWith("5")) {
            requestsByStatus["5xx"] += count;
          } else {
            requestsByStatus.other += count;
          }
        }
      }
    }

    const latencyPercentiles = { p50: 0, p90: 0, p95: 0, p99: 0 };

    if (this.requestDuration) {
      const histData = await this.requestDuration.get();
      const buckets: { le: number; count: number }[] = [];
      let totalCount = 0;
      let totalSum = 0;

      for (const val of histData.values) {
        const metricName = val.metricName ?? "";
        if (metricName.endsWith("_bucket")) {
          const le = val.labels["le"];
          if (typeof le === "string" && le !== "+Inf") {
            buckets.push({ le: parseFloat(le), count: val.value });
          }
        } else if (metricName.endsWith("_count")) {
          totalCount += val.value;
        } else if (metricName.endsWith("_sum")) {
          totalSum += val.value;
        }
      }

      if (totalCount > 0 && buckets.length > 0) {
        const aggregated = new Map<number, number>();
        for (const b of buckets) {
          aggregated.set(b.le, (aggregated.get(b.le) ?? 0) + b.count);
        }
        const sorted = [...aggregated.entries()].sort((a, b) => a[0] - b[0]);

        const percentile = (p: number): number => {
          const target = totalCount * p;
          for (const [le, count] of sorted) {
            if (count >= target) return le;
          }
          return totalSum / totalCount;
        };

        latencyPercentiles.p50 = percentile(0.5);
        latencyPercentiles.p90 = percentile(0.9);
        latencyPercentiles.p95 = percentile(0.95);
        latencyPercentiles.p99 = percentile(0.99);
      }
    }

    const grafanaUrl = this.configService?.get<string>("grafana.url") ?? null;

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      },
      totalRequests,
      requestsByStatus,
      latencyPercentiles,
      grafanaUrl,
    };
  }

  /**
   * Proxies a PromQL query to the configured Prometheus instance.
   * Returns a structured error if Prometheus is not reachable.
   * @param params - Query parameters to forward
   * @param endpoint - The Prometheus API endpoint to call
   * @returns The Prometheus response data or an error object
   */
  async queryPrometheus(
    params: Record<string, string>,
    endpoint: "query_range" | "query" | "labels",
  ): Promise<unknown> {
    const baseUrl =
      this.configService?.get<string>("prometheus.url") ??
      "http://localhost:9090";
    const url = `${baseUrl}/api/v1/${endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService!.get(url, { params }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Prometheus not available at ${url}: ${(error as Error).message}`,
      );
      return { error: "Prometheus not available", data: null };
    }
  }

  /**
   * Proxies a log query to the configured Loki instance.
   * Returns a structured error if Loki is not reachable.
   * @param params - Query parameters to forward
   * @param lokiPath - The Loki API path to call
   * @returns The Loki response data or an error object
   */
  async queryLoki(
    params: Record<string, string>,
    lokiPath: string,
  ): Promise<unknown> {
    const baseUrl =
      this.configService?.get<string>("loki.url") ?? "http://localhost:3100";
    const url = `${baseUrl}${lokiPath}`;

    try {
      const response = await firstValueFrom(
        this.httpService!.get(url, { params }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Loki not available at ${url}: ${(error as Error).message}`,
      );
      return { error: "Loki not available", data: null };
    }
  }
}
