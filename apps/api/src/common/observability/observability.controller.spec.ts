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
    queryLoki: jest.fn().mockResolvedValue({ status: "success", data: {} }),
    queryTempoTraces: jest.fn().mockResolvedValue({ traces: [] }),
    queryTempoServices: jest
      .fn()
      .mockResolvedValue({ tagValues: [{ value: "farm-api" }] }),
    queryTempoTrace: jest.fn().mockResolvedValue({ resourceSpans: [] }),
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

  describe("tempoTraces", () => {
    it("should call queryTempoTraces with the query params", async () => {
      await controller.tempoTraces({ service: "farm-api", limit: "10" });
      expect(mockService.queryTempoTraces).toHaveBeenCalledWith({
        service: "farm-api",
        limit: "10",
      });
    });
  });

  describe("tempoServices", () => {
    it("should call queryTempoServices", async () => {
      await controller.tempoServices();
      expect(mockService.queryTempoServices).toHaveBeenCalled();
    });
  });

  describe("tempoTrace", () => {
    it("should call queryTempoTrace with the trace ID", async () => {
      await controller.tempoTrace("abc123");
      expect(mockService.queryTempoTrace).toHaveBeenCalledWith("abc123");
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("ObservabilityController — additional branches", () => {
  let controller: ObservabilityController;
  const mockService = {
    getSummary: jest.fn().mockResolvedValue({}),
    queryPrometheus: jest.fn().mockResolvedValue({}),
    queryLoki: jest.fn().mockResolvedValue({ streams: [] }),
    queryTempoTraces: jest.fn().mockResolvedValue({ traces: [] }),
    queryTempoServices: jest.fn().mockResolvedValue({ tagValues: [] }),
    queryTempoTrace: jest.fn().mockResolvedValue({ resourceSpans: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [{ provide: ObservabilityService, useValue: mockService }],
    }).compile();

    controller = module.get<ObservabilityController>(ObservabilityController);
    jest.clearAllMocks();
  });

  describe("lokiLogs — with overridden limit", () => {
    it("should use provided limit when given", async () => {
      await controller.lokiLogs({ query: "{app=my-app}", limit: "200" });
      expect(mockService.queryLoki).toHaveBeenCalledWith(
        { query: "{app=my-app}", limit: "200" },
        "/loki/api/v1/query_range",
      );
    });

    it("should use default limit=100 when not provided", async () => {
      await controller.lokiLogs({ query: "{app=my-app}" });
      expect(mockService.queryLoki).toHaveBeenCalledWith(
        { query: "{app=my-app}", limit: "100" },
        "/loki/api/v1/query_range",
      );
    });
  });

  describe("prometheusQueryRange", () => {
    it("should call queryPrometheus with query_range endpoint", async () => {
      await controller.prometheusQueryRange({
        query: "rate(requests[5m])",
        start: "0",
        end: "300",
        step: "15",
      });
      expect(mockService.queryPrometheus).toHaveBeenCalledWith(
        { query: "rate(requests[5m])", start: "0", end: "300", step: "15" },
        "query_range",
      );
    });
  });

  describe("prometheusLabels", () => {
    it("should call queryPrometheus with labels endpoint", async () => {
      await controller.prometheusLabels({});
      expect(mockService.queryPrometheus).toHaveBeenCalledWith({}, "labels");
    });
  });
});
