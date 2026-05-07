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
   * Searches traces in the configured Tempo instance.
   * Accepts optional `service`, `limit`, `lookback`, `start`, and `end` query
   * params. `lookback` (seconds, with optional "s" suffix) is translated to
   * `start`/`end` Unix timestamps for Tempo. The response is normalized into
   * the Jaeger-compatible TracesResponse contract expected by the frontend.
   * Returns a structured error if Tempo is not reachable.
   * @param params - Query parameters: service, limit, lookback, start, end
   * @returns Jaeger-compatible traces response or an error object
   */
  async queryTempoTraces(params: Record<string, string>): Promise<unknown> {
    const baseUrl =
      this.configService?.get<string>("tempo.url") ?? "http://localhost:3200";
    const url = `${baseUrl}/api/search`;

    const tempoParams: Record<string, string> = { limit: "20", ...params };
    if (params.service) {
      tempoParams.tags = `service.name=${params.service}`;
      delete tempoParams.service;
    }

    // Translate lookback (e.g. "3600s" or "3600") to start/end Unix seconds.
    if (tempoParams.lookback) {
      const secs = parseInt(tempoParams.lookback, 10);
      if (!isNaN(secs)) {
        const nowSecs = Math.floor(Date.now() / 1000);
        tempoParams.end = String(nowSecs);
        tempoParams.start = String(nowSecs - secs);
      }
      delete tempoParams.lookback;
    }

    try {
      const response = await firstValueFrom(
        this.httpService!.get(url, { params: tempoParams }),
      );
      return this.normalizeTempoSearchResponse(response.data);
    } catch (error) {
      this.logger.warn(
        `Tempo not available at ${url}: ${(error as Error).message}`,
      );
      return {
        data: null,
        total: 0,
        limit: 0,
        offset: 0,
        errors: null,
        error: "Tempo not available",
      };
    }
  }

  /**
   * Normalizes a Tempo search response into the Jaeger-compatible contract
   * expected by the frontend ({ data, total, limit, offset, errors }).
   */
  private normalizeTempoSearchResponse(tempoData: unknown): unknown {
    const typed = tempoData as { traces?: Record<string, unknown>[] } | null;
    const rawTraces = typed?.traces ?? [];
    const data = rawTraces.map((t) => this.buildJaegerTraceFromTempoSummary(t));
    return {
      data,
      total: data.length,
      limit: data.length,
      offset: 0,
      errors: null,
    };
  }

  /**
   * Converts a Tempo search-result trace summary into a minimal JaegerTrace
   * suitable for the list view (single root span per trace).
   */
  private buildJaegerTraceFromTempoSummary(
    t: Record<string, unknown>,
  ): unknown {
    const traceID = typeof t["traceID"] === "string" ? t["traceID"] : "";
    const startUs = Math.round(Number(t["startTimeUnixNano"] ?? 0) / 1000);
    const durationUs = Number(t["durationMs"] ?? 0) * 1000;
    const rootServiceName =
      typeof t["rootServiceName"] === "string" ? t["rootServiceName"] : "";
    const rootTraceName =
      typeof t["rootTraceName"] === "string" ? t["rootTraceName"] : "";

    return {
      traceID,
      spans: [
        {
          traceID,
          spanID: traceID.slice(0, 16) || "0000000000000000",
          operationName: rootTraceName,
          references: [],
          startTime: startUs,
          duration: durationUs,
          tags: [],
          logs: [],
          processID: "p1",
          warnings: null,
        },
      ],
      processes: {
        p1: { serviceName: rootServiceName, tags: [] },
      },
      warnings: null,
    };
  }

  /**
   * Lists service names discovered by Tempo from trace data.
   * Returns a Jaeger-compatible { data: string[] } shape.
   * Returns a structured error if Tempo is not reachable.
   * @returns Normalized service names response or an error object
   */
  async queryTempoServices(): Promise<unknown> {
    const baseUrl =
      this.configService?.get<string>("tempo.url") ?? "http://localhost:3200";
    const url = `${baseUrl}/api/search/tag/service.name/values`;

    try {
      const response = await firstValueFrom(this.httpService!.get(url));
      return this.normalizeTempoServicesResponse(response.data);
    } catch (error) {
      this.logger.warn(
        `Tempo not available at ${url}: ${(error as Error).message}`,
      );
      return { data: [], error: "Tempo not available" };
    }
  }

  /**
   * Normalizes a Tempo tag-values response into the { data: string[] } shape
   * expected by the frontend.
   */
  private normalizeTempoServicesResponse(tempoData: unknown): unknown {
    const typed = tempoData as {
      tagValues?: { type: string; value: string }[];
    } | null;
    const values = typed?.tagValues ?? [];
    return { data: values.map((v) => v.value) };
  }

  /**
   * Fetches a single trace by ID from the configured Tempo instance.
   * The OTLP-JSON response is normalized into the Jaeger-compatible
   * { data: JaegerTrace[] } shape expected by the frontend waterfall.
   * Returns a structured error if Tempo is not reachable.
   * @param traceId - The trace identifier to retrieve
   * @returns Normalized Jaeger trace response or an error object
   */
  async queryTempoTrace(traceId: string): Promise<unknown> {
    const baseUrl =
      this.configService?.get<string>("tempo.url") ?? "http://localhost:3200";
    const url = `${baseUrl}/api/traces/${traceId}`;

    try {
      const response = await firstValueFrom(this.httpService!.get(url));
      return this.normalizeOtlpTraceToJaeger(response.data);
    } catch (error) {
      this.logger.warn(
        `Tempo not available at ${url}: ${(error as Error).message}`,
      );
      return { data: null, error: "Tempo not available" };
    }
  }

  /**
   * Converts a Tempo OTLP-JSON trace response into the Jaeger-compatible
   * { data: JaegerTrace[] } shape expected by the frontend waterfall component.
   *
   * OTLP format: { batches: [{ resource: { attributes: [] }, scopeSpans: [{ spans: [] }] }] }
   * Jaeger format: { data: [{ traceID, spans, processes, warnings }] }
   */
  private normalizeOtlpTraceToJaeger(otlpData: unknown): unknown {
    const typed = otlpData as {
      batches?: {
        resource?: {
          attributes?: { key: string; value?: { stringValue?: string } }[];
        };
        scopeSpans?: {
          spans?: Record<string, unknown>[];
        }[];
      }[];
    } | null;

    if (!typed?.batches?.length) {
      return { data: null };
    }

    const processes: Record<string, { serviceName: string; tags: unknown[] }> =
      {};
    const spans: unknown[] = [];
    let traceID = "";
    let pIdx = 0;

    for (const batch of typed.batches) {
      pIdx++;
      const pid = `p${pIdx}`;
      const attrs = batch.resource?.attributes ?? [];
      const serviceName =
        attrs.find((a) => a.key === "service.name")?.value?.stringValue ??
        "unknown";
      processes[pid] = { serviceName, tags: [] };

      for (const scope of batch.scopeSpans ?? []) {
        for (const span of scope.spans ?? []) {
          const spanTraceId =
            typeof span["traceId"] === "string" ? span["traceId"] : "";
          if (!traceID && spanTraceId) traceID = spanTraceId;

          const startNano = Number(span["startTimeUnixNano"] ?? 0);
          const endNano = Number(span["endTimeUnixNano"] ?? 0);
          const startUs = Math.round(startNano / 1000);
          const durationUs = Math.max(
            0,
            Math.round((endNano - startNano) / 1000),
          );

          const parentSpanId =
            typeof span["parentSpanId"] === "string"
              ? span["parentSpanId"]
              : "";
          const refs = parentSpanId
            ? [
                {
                  refType: "CHILD_OF",
                  traceID: spanTraceId || traceID,
                  spanID: parentSpanId,
                },
              ]
            : [];

          spans.push({
            traceID: spanTraceId || traceID,
            spanID: typeof span["spanId"] === "string" ? span["spanId"] : "",
            operationName: typeof span["name"] === "string" ? span["name"] : "",
            references: refs,
            startTime: startUs,
            duration: durationUs,
            tags: [],
            logs: [],
            processID: pid,
            warnings: null,
          });
        }
      }
    }

    if (!traceID || spans.length === 0) {
      return { data: null };
    }

    return { data: [{ traceID, spans, processes, warnings: null }] };
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
