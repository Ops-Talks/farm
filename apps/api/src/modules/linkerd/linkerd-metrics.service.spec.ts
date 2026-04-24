import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { LinkerdMetricsService } from "./linkerd-metrics.service";
import type { AxiosResponse } from "axios";
import type { PrometheusApiResponse } from "./interfaces/linkerd.interfaces";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPrometheusResponse(
  result: NonNullable<PrometheusApiResponse["data"]>["result"],
): AxiosResponse<PrometheusApiResponse> {
  return {
    data: {
      status: "success",
      data: {
        resultType: "matrix",
        result,
      },
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse["config"],
  };
}

function buildEmptyPrometheusResponse(): AxiosResponse<PrometheusApiResponse> {
  return buildPrometheusResponse([]);
}

function buildSingleSeriesResponse(): AxiosResponse<PrometheusApiResponse> {
  return buildPrometheusResponse([
    {
      metric: { deployment: "my-service", namespace: "default" },
      values: [
        [1700000000, "0.5"],
        [1700000060, "0.8"],
      ],
    },
  ]);
}

function buildTopologyResponse(): AxiosResponse<PrometheusApiResponse> {
  return buildPrometheusResponse([
    {
      metric: {
        deployment: "frontend",
        dst_deployment: "backend",
        namespace: "default",
      },
      values: [
        [1700000000, "1.5"],
        [1700000060, "2.0"],
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("LinkerdMetricsService", () => {
  let service: LinkerdMetricsService;
  let mockHttpService: { get: jest.Mock };

  beforeEach(async () => {
    mockHttpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkerdMetricsService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<LinkerdMetricsService>(LinkerdMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getServiceRps
  // ---------------------------------------------------------------------------

  describe("getServiceRps", () => {
    it("returns parsed timeseries for a valid Prometheus response", async () => {
      mockHttpService.get.mockReturnValue(of(buildSingleSeriesResponse()));

      const result = await service.getServiceRps("my-service", "default", "5m");

      expect(result.timeseries).toHaveLength(1);
      expect(result.timeseries[0].metric.deployment).toBe("my-service");
      expect(result.timeseries[0].values).toHaveLength(2);
      expect(result.query).toContain("request_total");
      expect(result.query).toContain("my-service");
    });

    it("returns empty timeseries when Prometheus returns no data", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      const result = await service.getServiceRps("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("returns empty timeseries when Prometheus is unreachable", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("connect ECONNREFUSED")),
      );

      const result = await service.getServiceRps("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("includes inbound direction filter in the query", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "5m");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.query).toContain('direction="inbound"');
    });

    it("returns empty timeseries when result series has no values field", async () => {
      const response = buildPrometheusResponse([
        {
          metric: { deployment: "svc", namespace: "default" },
          values: undefined,
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const result = await service.getServiceRps("svc", "default", "5m");
      expect(result.timeseries).toHaveLength(1);
      expect(result.timeseries[0].values).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getServiceErrorRate
  // ---------------------------------------------------------------------------

  describe("getServiceErrorRate", () => {
    it("returns parsed timeseries for a valid Prometheus response", async () => {
      mockHttpService.get.mockReturnValue(of(buildSingleSeriesResponse()));

      const result = await service.getServiceErrorRate("svc", "ns", "5m");

      expect(result.timeseries).toHaveLength(1);
      expect(result.query).toContain('classification="failure"');
    });

    it("returns empty timeseries on Prometheus error", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("timeout")),
      );

      const result = await service.getServiceErrorRate("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getServiceLatency
  // ---------------------------------------------------------------------------

  describe("getServiceLatency", () => {
    it("returns p50/p95/p99 timeseries results", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      const result = await service.getServiceLatency("svc", "ns", "5m");

      expect(result).toHaveProperty("p50");
      expect(result).toHaveProperty("p95");
      expect(result).toHaveProperty("p99");
      expect(result.p50.timeseries).toEqual([]);
      expect(result.p95.timeseries).toEqual([]);
      expect(result.p99.timeseries).toEqual([]);
    });

    it("queries histogram_quantile with response_latency_ms_bucket", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceLatency("svc", "ns", "5m");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.query).toContain("histogram_quantile");
      expect(callArgs[1].params.query).toContain("response_latency_ms_bucket");
    });

    it("returns empty p50 when Prometheus fails", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("prometheus down")),
      );

      const result = await service.getServiceLatency("svc", "ns", "5m");
      expect(result.p50.timeseries).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // buildTopology
  // ---------------------------------------------------------------------------

  describe("buildTopology", () => {
    it("returns directed edges from Prometheus topology data", async () => {
      mockHttpService.get.mockReturnValue(of(buildTopologyResponse()));

      const edges = await service.buildTopology("5m");

      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe("frontend");
      expect(edges[0].destination).toBe("backend");
      expect(edges[0].namespace).toBe("default");
    });

    it("filters out series missing source or destination labels", async () => {
      const response = buildPrometheusResponse([
        {
          metric: { deployment: "frontend" }, // missing dst_deployment
          values: [[1700000000, "1.0"]],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(0);
    });

    it("deduplicates edges with the same source/destination/namespace", async () => {
      const response = buildPrometheusResponse([
        {
          metric: {
            deployment: "a",
            dst_deployment: "b",
            namespace: "default",
          },
          values: [
            [1700000000, "1.0"],
            [1700000060, "2.0"],
          ],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(1);
    });

    it("produces undefined rps when values array is empty", async () => {
      const response = buildPrometheusResponse([
        {
          metric: {
            deployment: "a",
            dst_deployment: "b",
            namespace: "default",
          },
          values: [],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(1);
      expect(edges[0].rps).toBeUndefined();
    });

    it("defaults namespace to 'default' when label is absent", async () => {
      const response = buildPrometheusResponse([
        {
          metric: { deployment: "svc-a", dst_deployment: "svc-b" },
          values: [[1700000000, "1.0"]],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(1);
      expect(edges[0].namespace).toBe("default");
    });

    it("uses empty string source when deployment label is absent", async () => {
      const response = buildPrometheusResponse([
        {
          metric: { dst_deployment: "svc-b", namespace: "default" },
          values: [[1700000000, "1.0"]],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(0);
    });

    it("deduplicates two series with identical source/destination/namespace", async () => {
      const response = buildPrometheusResponse([
        {
          metric: {
            deployment: "a",
            dst_deployment: "b",
            namespace: "ns",
          },
          values: [[1700000000, "1.0"]],
        },
        {
          metric: {
            deployment: "a",
            dst_deployment: "b",
            namespace: "ns",
          },
          values: [[1700000060, "2.0"]],
        },
      ]);
      mockHttpService.get.mockReturnValue(of(response));

      const edges = await service.buildTopology("5m");
      expect(edges).toHaveLength(1);
    });

    it("returns empty array when Prometheus is unreachable", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("ECONNREFUSED")),
      );

      const edges = await service.buildTopology("5m");
      expect(edges).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Duration / step parsing (via indirect coverage through public methods)
  // ---------------------------------------------------------------------------

  describe("range duration and step resolution", () => {
    it("resolves a 15s step for a 5m range", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "5m");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.step).toBe("15s");
    });

    it("resolves a 60s step for a 1h range", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "1h");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.step).toBe("60s");
    });

    it("resolves a 300s step for a 1d range", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "1d");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.step).toBe("300s");
    });

    it("falls back to 300s duration for unrecognised format", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "bad-format");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      // 300s duration -> step = "15s"
      expect(callArgs[1].params.step).toBe("15s");
    });

    it("resolves a 900s step for a range beyond 1 day", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "7d");

      const callArgs = mockHttpService.get.mock.calls[0] as [
        string,
        { params: Record<string, string> },
      ];
      expect(callArgs[1].params.step).toBe("900s");
    });
  });

  // ---------------------------------------------------------------------------
  // Non-success Prometheus status
  // ---------------------------------------------------------------------------

  describe("non-success Prometheus status", () => {
    it("returns empty timeseries when status is 'error'", async () => {
      const errorResponse: AxiosResponse<PrometheusApiResponse> = {
        data: { status: "error", error: "execution error" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as AxiosResponse["config"],
      };
      mockHttpService.get.mockReturnValue(of(errorResponse));

      const result = await service.getServiceRps("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("returns empty timeseries when status is 'success' but data.data is null", async () => {
      const response: AxiosResponse<PrometheusApiResponse> = {
        data: { status: "success", data: null as never },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as AxiosResponse["config"],
      };
      mockHttpService.get.mockReturnValue(of(response));

      const result = await service.getServiceRps("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });
  });
});
