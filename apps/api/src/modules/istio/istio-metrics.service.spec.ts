import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { IstioMetricsService } from "./istio-metrics.service";
import type { AxiosResponse } from "axios";
import type { PrometheusApiResponse } from "./interfaces/istio.interfaces";

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
      metric: { destination_service_name: "checkout" },
      values: [
        [1700000000, "0.5"],
        [1700000060, "0.8"],
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("IstioMetricsService", () => {
  let service: IstioMetricsService;
  let mockHttpService: { get: jest.Mock };

  beforeEach(async () => {
    mockHttpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IstioMetricsService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<IstioMetricsService>(IstioMetricsService);
  });

  // ---------------------------------------------------------------------------
  // getServiceRps
  // ---------------------------------------------------------------------------

  describe("getServiceRps", () => {
    it("returns parsed timeseries for a valid Prometheus response", async () => {
      mockHttpService.get.mockReturnValue(of(buildSingleSeriesResponse()));

      const result = await service.getServiceRps("checkout", "default", "5m");

      expect(result.timeseries).toHaveLength(1);
      expect(result.timeseries[0].metric.destination_service_name).toBe(
        "checkout",
      );
      expect(result.timeseries[0].values).toHaveLength(2);
      expect(result.query).toContain("istio_requests_total");
      expect(result.query).toContain("checkout");
    });

    it("returns empty timeseries when Prometheus returns no data", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      const result = await service.getServiceRps("checkout", "default", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("returns empty timeseries when Prometheus is unreachable", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("connect ECONNREFUSED")),
      );

      const result = await service.getServiceRps("checkout", "default", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("encodes namespace label in the PromQL query", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      const result = await service.getServiceRps("svc", "production", "1h");
      expect(result.query).toContain(
        'destination_service_namespace="production"',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getServiceErrorRate
  // ---------------------------------------------------------------------------

  describe("getServiceErrorRate", () => {
    it("returns error rate timeseries", async () => {
      mockHttpService.get.mockReturnValue(of(buildSingleSeriesResponse()));

      const result = await service.getServiceErrorRate("svc", "ns", "5m");
      expect(result.query).toContain("5..");
      expect(result.timeseries).toHaveLength(1);
    });

    it("returns empty timeseries on HTTP error", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("timeout")),
      );

      const result = await service.getServiceErrorRate("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });

    it("handles non-success Prometheus status gracefully", async () => {
      const errResponse: AxiosResponse<PrometheusApiResponse> = {
        data: { status: "error", error: "bad_data" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: {} } as AxiosResponse["config"],
      };
      mockHttpService.get.mockReturnValue(of(errResponse));

      const result = await service.getServiceErrorRate("svc", "ns", "5m");
      expect(result.timeseries).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getServiceLatency
  // ---------------------------------------------------------------------------

  describe("getServiceLatency", () => {
    it("returns p50, p95, and p99 results", async () => {
      mockHttpService.get.mockReturnValue(of(buildSingleSeriesResponse()));

      const result = await service.getServiceLatency("svc", "ns", "5m");

      expect(result.p50).toBeDefined();
      expect(result.p95).toBeDefined();
      expect(result.p99).toBeDefined();
      expect(result.p50.query).toContain("0.50");
      expect(result.p95.query).toContain("0.95");
      expect(result.p99.query).toContain("0.99");
    });

    it("includes histogram bucket metric in query strings", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      const result = await service.getServiceLatency("svc", "ns", "5m");
      expect(result.p50.query).toContain(
        "istio_request_duration_milliseconds_bucket",
      );
    });

    it("returns empty timeseries for all percentiles when Prometheus is down", async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("network error")),
      );

      const result = await service.getServiceLatency("svc", "ns", "5m");
      expect(result.p50.timeseries).toEqual([]);
      expect(result.p95.timeseries).toEqual([]);
      expect(result.p99.timeseries).toEqual([]);
    });

    it("makes exactly three Prometheus queries (one per percentile)", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceLatency("svc", "ns", "5m");
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Duration parsing (step resolution via side effects)
  // ---------------------------------------------------------------------------

  describe("query time range calculation", () => {
    it("uses a fine-grained step for short ranges (<=5m)", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "5m");

      const [, opts] = (
        mockHttpService.get.mock.calls as Array<
          [string, { params: { step: string } }]
        >
      )[0];
      expect(opts.params.step).toBe("15s");
    });

    it("uses a medium step for 1h ranges", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "1h");

      const [, opts] = (
        mockHttpService.get.mock.calls as Array<
          [string, { params: { step: string } }]
        >
      )[0];
      expect(opts.params.step).toBe("60s");
    });

    it("uses a coarse step for 1d ranges", async () => {
      mockHttpService.get.mockReturnValue(of(buildEmptyPrometheusResponse()));

      await service.getServiceRps("svc", "ns", "1d");

      const [, opts] = (
        mockHttpService.get.mock.calls as Array<
          [string, { params: { step: string } }]
        >
      )[0];
      expect(opts.params.step).toBe("300s");
    });
  });
});
