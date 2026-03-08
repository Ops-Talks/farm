import { Test, TestingModule } from "@nestjs/testing";
import { ObservabilityService } from "./observability.service";
import { ConfigService } from "@nestjs/config";
import { getToken } from "@willsoto/nestjs-prometheus";

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
      if (key === "grafana.url") return "http://localhost:3001";
      return undefined;
    }),
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

    it("should compute latency percentiles from histogram buckets", async () => {
      const result = await service.getSummary();

      expect(result.latencyPercentiles.p50).toBe(0.01);
      expect(result.latencyPercentiles.p90).toBe(0.1);
      expect(result.latencyPercentiles.p95).toBe(0.25);
      expect(result.latencyPercentiles.p99).toBe(0.5);
    });

    it("should return grafanaUrl from config", async () => {
      const result = await service.getSummary();

      expect(result.grafanaUrl).toBe("http://localhost:3001");
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
});
