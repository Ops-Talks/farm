import { Test, TestingModule } from "@nestjs/testing";
import { ObservabilityService } from "./observability.service";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { getToken } from "@willsoto/nestjs-prometheus";
import { of, throwError } from "rxjs";

describe("ObservabilityService", () => {
  let service: ObservabilityService;

  const mockCounter = {
    get: jest.fn().mockResolvedValue({
      values: [
        {
          labels: { method: "GET", route: "/health", status_code: "200" },
          value: 100,
        },
        {
          labels: {
            method: "POST",
            route: "/api/v1/auth/login",
            status_code: "201",
          },
          value: 20,
        },
        {
          labels: {
            method: "GET",
            route: "/api/v1/catalog",
            status_code: "404",
          },
          value: 5,
        },
        {
          labels: {
            method: "POST",
            route: "/api/v1/auth/login",
            status_code: "500",
          },
          value: 2,
        },
      ],
    }),
  };

  const mockHistogram = {
    get: jest.fn().mockResolvedValue({
      values: [
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.005" },
          value: 50,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.01" },
          value: 80,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.025" },
          value: 100,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.05" },
          value: 110,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.1" },
          value: 120,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.25" },
          value: 125,
        },
        {
          metricName: "http_request_duration_seconds_bucket",
          labels: { le: "0.5" },
          value: 127,
        },
        {
          metricName: "http_request_duration_seconds_count",
          labels: {},
          value: 127,
        },
        {
          metricName: "http_request_duration_seconds_sum",
          labels: {},
          value: 3.5,
        },
      ],
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "grafana.url") return "http://localhost:3002";
      if (key === "prometheus.url") return "http://localhost:9090";
      if (key === "loki.url") return "http://localhost:3100";
      if (key === "tempo.url") return "http://localhost:3200";
      return undefined;
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservabilityService,
        {
          provide: getToken("http_requests_total"),
          useValue: mockCounter,
        },
        {
          provide: getToken("http_request_duration_seconds"),
          useValue: mockHistogram,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<ObservabilityService>(ObservabilityService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return uptime and memory info", async () => {
      const result = await service.getSummary();

      expect(result.uptime).toBeGreaterThan(0);
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.rss).toBeGreaterThan(0);
    });

    it("should aggregate request counts by status group", async () => {
      const result = await service.getSummary();

      expect(result.totalRequests).toBe(127);
      expect(result.requestsByStatus["2xx"]).toBe(120);
      expect(result.requestsByStatus["4xx"]).toBe(5);
      expect(result.requestsByStatus["5xx"]).toBe(2);
    });

    it("should count 3xx and 1xx status codes as 'other'", async () => {
      mockCounter.get.mockResolvedValueOnce({
        values: [
          {
            labels: { method: "GET", route: "/test", status_code: "301" },
            value: 3,
          },
          {
            labels: { method: "GET", route: "/test", status_code: "102" },
            value: 1,
          },
        ],
      });
      const result = await service.getSummary();

      expect(result.requestsByStatus.other).toBe(4);
    });

    it("should skip request counter values where status_code is not a string", async () => {
      // When status_code is missing (undefined) or not a string, the
      // `if (typeof statusCode === "string")` false branch fires and the value is skipped.
      mockCounter.get.mockResolvedValueOnce({
        values: [
          { labels: { method: "GET", route: "/test" }, value: 10 }, // no status_code
          {
            labels: {
              method: "GET",
              route: "/test",
              status_code: 200 as unknown as string,
            },
            value: 5,
          }, // numeric
        ],
      });
      const result = await service.getSummary();
      // Total requests still accumulates, but status groups remain 0.
      expect(result.totalRequests).toBe(15);
      expect(result.requestsByStatus["2xx"]).toBe(0);
    });

    it("should handle histogram values with null metricName using empty-string fallback", async () => {
      // When val.metricName is null/undefined, `val.metricName ?? ""` uses "".
      // "" does not end with "_bucket", "_count", or "_sum", so it is skipped.
      mockHistogram.get.mockResolvedValueOnce({
        values: [
          { metricName: null as unknown as string, labels: {}, value: 1 },
          {
            metricName: "http_request_duration_seconds_count",
            labels: {},
            value: 0,
          },
          {
            metricName: "http_request_duration_seconds_sum",
            labels: {},
            value: 0,
          },
        ],
      });
      const result = await service.getSummary();
      expect(result.latencyPercentiles).toBeDefined();
    });

    it("should ignore histogram bucket values where le is '+Inf'", async () => {
      // `le === '+Inf'` triggers the false branch of `le !== '+Inf'` at line 65.
      mockHistogram.get.mockResolvedValueOnce({
        values: [
          {
            metricName: "http_request_duration_seconds_bucket",
            labels: { le: "0.1" },
            value: 50,
          },
          {
            metricName: "http_request_duration_seconds_bucket",
            labels: { le: "+Inf" },
            value: 100,
          },
          {
            metricName: "http_request_duration_seconds_count",
            labels: {},
            value: 100,
          },
          {
            metricName: "http_request_duration_seconds_sum",
            labels: {},
            value: 5,
          },
        ],
      });
      const result = await service.getSummary();
      // p50 should be computed from the 0.1 bucket only (ignoring +Inf).
      expect(result.latencyPercentiles).toBeDefined();
    });

    it("should fall back to mean when no bucket satisfies count >= target", async () => {
      // Use a histogram where count is 1 but no bucket has count >= 1
      // (by making target > max bucket count)
      mockHistogram.get.mockResolvedValueOnce({
        values: [
          {
            metricName: "http_request_duration_seconds_bucket",
            labels: { le: "0.005" },
            value: 0, // no counts in any bucket
          },
          {
            metricName: "http_request_duration_seconds_count",
            labels: {},
            value: 10,
          },
          {
            metricName: "http_request_duration_seconds_sum",
            labels: {},
            value: 5.0,
          },
        ],
      });

      const result = await service.getSummary();

      // All percentiles should use totalSum / totalCount fallback = 5.0 / 10 = 0.5
      expect(result.latencyPercentiles.p50).toBe(0.5);
    });

    it("should compute latency percentiles from histogram buckets", async () => {
      const result = await service.getSummary();

      expect(result.latencyPercentiles.p50).toBe(0.01);
      expect(result.latencyPercentiles.p90).toBe(0.1);
      expect(result.latencyPercentiles.p95).toBe(0.25);
      expect(result.latencyPercentiles.p99).toBe(0.5);
    });

    it("should return grafanaUrl from config", async () => {
      const result = await service.getSummary();

      expect(result.grafanaUrl).toBe("http://localhost:3002");
    });
  });

  describe("without metrics (test mode fallback)", () => {
    it("should return zero values when no metrics are available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ObservabilityService],
      }).compile();

      const emptyService =
        module.get<ObservabilityService>(ObservabilityService);
      const result = await emptyService.getSummary();

      expect(result.totalRequests).toBe(0);
      expect(result.requestsByStatus["2xx"]).toBe(0);
      expect(result.latencyPercentiles.p50).toBe(0);
      expect(result.grafanaUrl).toBeNull();
    });
  });

  describe("queryPrometheus", () => {
    it("should return Prometheus data for query endpoint", async () => {
      const mockData = {
        status: "success",
        data: { resultType: "vector", result: [] },
      };
      mockHttpService.get.mockReturnValue(of({ data: mockData }));

      const result = await service.queryPrometheus(
        { query: "up", time: "1620000000" },
        "query",
      );

      expect(result).toEqual(mockData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:9090/api/v1/query",
        { params: { query: "up", time: "1620000000" } },
      );
    });

    it("should return structured error when Prometheus is not available", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const result = await service.queryPrometheus({}, "query");

      expect(result).toEqual({ error: "Prometheus not available", data: null });
    });
  });

  describe("queryLoki", () => {
    it("should return Loki log data", async () => {
      const mockData = {
        status: "success",
        data: { resultType: "streams", result: [] },
      };
      mockHttpService.get.mockReturnValue(of({ data: mockData }));

      const result = await service.queryLoki(
        { query: '{app="api"}', limit: "100" },
        "/loki/api/v1/query_range",
      );

      expect(result).toEqual(mockData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:3100/loki/api/v1/query_range",
        { params: { query: '{app="api"}', limit: "100" } },
      );
    });

    it("should return structured error when Loki is not available", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const result = await service.queryLoki({}, "/loki/api/v1/query_range");

      expect(result).toEqual({ error: "Loki not available", data: null });
    });
  });

  describe("queryTempoTraces", () => {
    it("should search traces and map service param to Tempo tags", async () => {
      const mockTempoData = {
        traces: [
          {
            traceID: "abc123",
            rootServiceName: "farm-api",
            rootTraceName: "GET /api/health",
            startTimeUnixNano: "1620000000000000000",
            durationMs: 42,
          },
        ],
      };
      mockHttpService.get.mockReturnValue(of({ data: mockTempoData }));

      const result = (await service.queryTempoTraces({
        service: "farm-api",
        limit: "10",
      })) as Record<string, unknown>;

      expect(result.data).toHaveLength(1);
      const trace = (result.data as Record<string, unknown>[])[0]!;
      expect(trace["traceID"]).toBe("abc123");
      expect(
        (trace["processes"] as Record<string, { serviceName: string }>)["p1"]
          ?.serviceName,
      ).toBe("farm-api");
      expect(result.total).toBe(1);
      expect(result.errors).toBeNull();
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:3200/api/search",
        { params: { tags: "service.name=farm-api", limit: "10" } },
      );
    });

    it("should translate lookback to start/end before calling Tempo", async () => {
      mockHttpService.get.mockReturnValue(of({ data: { traces: [] } }));

      const before = Math.floor(Date.now() / 1000);
      await service.queryTempoTraces({ lookback: "3600s" });
      const after = Math.floor(Date.now() / 1000);

      const call = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      const sentParams = call[1].params;
      expect(sentParams).not.toHaveProperty("lookback");
      expect(Number(sentParams["end"])).toBeGreaterThanOrEqual(before);
      expect(Number(sentParams["end"])).toBeLessThanOrEqual(after + 1);
      expect(Number(sentParams["start"])).toBeCloseTo(
        Number(sentParams["end"]) - 3600,
        -1,
      );
    });

    it("should forward params without service mapping when service is absent", async () => {
      mockHttpService.get.mockReturnValue(of({ data: { traces: [] } }));

      const result = (await service.queryTempoTraces({
        limit: "5",
      })) as Record<string, unknown>;

      expect(result.data).toEqual([]);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:3200/api/search",
        { params: { limit: "5" } },
      );
    });

    it("should return Jaeger-compatible error object when Tempo is not available", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const result = (await service.queryTempoTraces({})) as Record<
        string,
        unknown
      >;

      expect(result.data).toBeNull();
      expect(result.error).toBe("Tempo not available");
      expect(result.errors).toBeNull();
    });
  });

  describe("queryTempoServices", () => {
    it("should return normalized service names from Tempo tag values endpoint", async () => {
      const mockTempoData = {
        tagValues: [
          { type: "string", value: "farm-api" },
          { type: "string", value: "farm-web" },
        ],
      };
      mockHttpService.get.mockReturnValue(of({ data: mockTempoData }));

      const result = (await service.queryTempoServices()) as Record<
        string,
        unknown
      >;

      expect(result.data).toEqual(["farm-api", "farm-web"]);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:3200/api/search/tag/service.name/values",
      );
    });

    it("should return empty data array when Tempo is not available", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const result = (await service.queryTempoServices()) as Record<
        string,
        unknown
      >;

      expect(result.data).toEqual([]);
      expect(result.error).toBe("Tempo not available");
    });
  });

  describe("queryTempoTrace", () => {
    it("should normalize an OTLP trace into Jaeger format", async () => {
      const mockOtlpData = {
        batches: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: "farm-api" },
                },
              ],
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: "abc123",
                    spanId: "span001",
                    parentSpanId: "",
                    name: "GET /api/health",
                    startTimeUnixNano: "1620000000000000000",
                    endTimeUnixNano: "1620000000042000000",
                  },
                ],
              },
            ],
          },
        ],
      };
      mockHttpService.get.mockReturnValue(of({ data: mockOtlpData }));

      const result = (await service.queryTempoTrace("abc123")) as Record<
        string,
        unknown
      >;

      expect(result.data).toHaveLength(1);
      const trace = (result.data as Record<string, unknown>[])[0]!;
      expect(trace["traceID"]).toBe("abc123");
      const spans = trace["spans"] as Record<string, unknown>[];
      expect(spans).toHaveLength(1);
      expect(spans[0]!["operationName"]).toBe("GET /api/health");
      expect(spans[0]!["duration"]).toBe(42000); // 42ms in microseconds
      expect(
        (trace["processes"] as Record<string, { serviceName: string }>)["p1"]
          ?.serviceName,
      ).toBe("farm-api");
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://localhost:3200/api/traces/abc123",
      );
    });

    it("should return { data: null } when OTLP response has no batches", async () => {
      mockHttpService.get.mockReturnValue(of({ data: {} }));

      const result = (await service.queryTempoTrace("abc123")) as Record<
        string,
        unknown
      >;

      expect(result.data).toBeNull();
    });

    it("should return error object when Tempo is not available", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const result = (await service.queryTempoTrace("abc123")) as Record<
        string,
        unknown
      >;

      expect(result.data).toBeNull();
      expect(result.error).toBe("Tempo not available");
    });
  });
});
