import { Test, TestingModule } from "@nestjs/testing";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";

describe("ObservabilityController", () => {
  let controller: ObservabilityController;

  const mockSummary = {
    uptime: 3600,
    memory: {
      heapUsed: 52428800,
      heapTotal: 104857600,
      rss: 157286400,
      external: 5242880,
    },
    totalRequests: 1500,
    requestsByStatus: { "2xx": 1400, "4xx": 80, "5xx": 20, other: 0 },
    latencyPercentiles: { p50: 0.005, p90: 0.025, p95: 0.1, p99: 0.5 },
    grafanaUrl: "http://localhost:3002",
  };

  const mockService = {
    getSummary: jest.fn().mockResolvedValue(mockSummary),
    queryPrometheus: jest
      .fn()
      .mockResolvedValue({ status: "success", data: {} }),
    queryJaegerTraces: jest.fn().mockResolvedValue({ data: [] }),
    queryJaegerServices: jest.fn().mockResolvedValue({ data: [] }),
    queryJaegerTrace: jest.fn().mockResolvedValue({ data: [] }),
    queryLoki: jest.fn().mockResolvedValue({ status: "success", data: {} }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [
        {
          provide: ObservabilityService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ObservabilityController>(ObservabilityController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return observability summary", async () => {
      const result = await controller.getSummary();

      expect(result.uptime).toBe(3600);
      expect(result.totalRequests).toBe(1500);
      expect(result.grafanaUrl).toBe("http://localhost:3002");
      expect(mockService.getSummary).toHaveBeenCalled();
    });
  });

  describe("prometheusQuery", () => {
    it("should call queryPrometheus with query endpoint", async () => {
      const params = { query: "up" };
      await controller.prometheusQuery(params);
      expect(mockService.queryPrometheus).toHaveBeenCalledWith(params, "query");
    });
  });

  describe("prometheusQueryRange", () => {
    it("should call queryPrometheus with query_range endpoint", async () => {
      const params = { query: "up", start: "0", end: "3600", step: "15" };
      await controller.prometheusQueryRange(params);
      expect(mockService.queryPrometheus).toHaveBeenCalledWith(
        params,
        "query_range",
      );
    });
  });

  describe("prometheusLabels", () => {
    it("should call queryPrometheus with labels endpoint", async () => {
      const params = {};
      await controller.prometheusLabels(params);
      expect(mockService.queryPrometheus).toHaveBeenCalledWith(
        params,
        "labels",
      );
    });
  });

  describe("jaegerTraces", () => {
    it("should call queryJaegerTraces with default limit and lookback", async () => {
      await controller.jaegerTraces({ service: "api" });
      expect(mockService.queryJaegerTraces).toHaveBeenCalledWith({
        service: "api",
        limit: "20",
        lookback: "1h",
      });
    });

    it("should allow overriding default limit and lookback", async () => {
      await controller.jaegerTraces({ limit: "50", lookback: "6h" });
      expect(mockService.queryJaegerTraces).toHaveBeenCalledWith({
        limit: "50",
        lookback: "6h",
      });
    });
  });

  describe("jaegerServices", () => {
    it("should call queryJaegerServices", async () => {
      await controller.jaegerServices();
      expect(mockService.queryJaegerServices).toHaveBeenCalled();
    });
  });

  describe("jaegerTrace", () => {
    it("should call queryJaegerTrace with the correct traceId", async () => {
      await controller.jaegerTrace("abc123");
      expect(mockService.queryJaegerTrace).toHaveBeenCalledWith("abc123");
    });
  });

  describe("lokiLogs", () => {
    it("should call queryLoki with default limit and query_range path", async () => {
      await controller.lokiLogs({ query: '{app="api"}' });
      expect(mockService.queryLoki).toHaveBeenCalledWith(
        { query: '{app="api"}', limit: "100" },
        "/loki/api/v1/query_range",
      );
    });
  });

  describe("lokiLabels", () => {
    it("should call queryLoki with labels path", async () => {
      await controller.lokiLabels({});
      expect(mockService.queryLoki).toHaveBeenCalledWith(
        {},
        "/loki/api/v1/labels",
      );
    });
  });

  describe("lokiLabelValues", () => {
    it("should call queryLoki with label values path", async () => {
      await controller.lokiLabelValues("app", {});
      expect(mockService.queryLoki).toHaveBeenCalledWith(
        {},
        "/loki/api/v1/label/app/values",
      );
    });
  });
});
