import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";
import { ObservabilitySummaryDto } from "./dto/observability-summary.dto";

@Injectable()
export class ObservabilityService {
  constructor(
    @Optional()
    @InjectMetric("http_requests_total")
    private readonly requestCounter?: Counter<string>,
    @Optional()
    @InjectMetric("http_request_duration_seconds")
    private readonly requestDuration?: Histogram<string>,
    @Optional()
    private readonly configService?: ConfigService,
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
}
