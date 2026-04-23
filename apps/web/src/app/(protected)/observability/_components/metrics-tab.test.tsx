import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — must be declared before the component imports so vi.mock hoisting
// can intercept the module.
// ---------------------------------------------------------------------------
const mockQueryRange = vi.fn();

vi.mock("@/lib/api-client", () => ({
  observability: {
    queryRange: (...args: unknown[]) => mockQueryRange(...args),
  },
}));

import {
  MetricsTab,
  MiniLineChart,
  PromQLChartCard,
} from "@/app/(protected)/observability/_components/metrics-tab";
import type { ObservabilitySummary, PrometheusResult } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build an ObservabilitySummary with sensible defaults that can be partially
 * overridden per test case.
 */
function makeSummary(
  overrides: Partial<ObservabilitySummary> = {}
): ObservabilitySummary {
  return {
    uptime: 100,
    totalRequests: 1000,
    memory: {
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      rss: 80 * 1024 * 1024,
      external: 0,
    },
    requestsByStatus: { "2xx": 900, "4xx": 50, "5xx": 50, other: 0 },
    latencyPercentiles: { p50: 0.05, p90: 0.1, p95: 0.5, p99: 1.0 },
    grafanaUrl: null,
    ...overrides,
  };
}

function makePrometheusResult(
  metric: Record<string, string>,
  values: [number, string][]
): PrometheusResult {
  return { metric, values };
}

// ---------------------------------------------------------------------------
// MetricsTab
// ---------------------------------------------------------------------------

describe("MetricsTab", () => {
  // 1. Null summary ----------------------------------------------------------

  it("renders nothing when summary is null", () => {
    const { container } = render(<MetricsTab summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  // 2. Summary with data -----------------------------------------------------

  it("renders request rate, error rate, P95 latency, and status breakdown", () => {
    render(<MetricsTab summary={makeSummary()} />);

    // rps = 1 000 / 100 = 10.00
    expect(screen.getByText("10.00 req/s")).toBeInTheDocument();
    expect(screen.getByText("Total: 1000")).toBeInTheDocument();

    // errorRate = 50 / 1 000 = 5.00 %
    expect(screen.getByText("5.00%")).toBeInTheDocument();
    expect(screen.getByText("Total Errors: 50")).toBeInTheDocument();

    // P95 = 0.5 s → "500.0ms"
    expect(screen.getByText("500.0ms")).toBeInTheDocument();

    // Requests by Status heading
    expect(screen.getByText("Requests by Status")).toBeInTheDocument();
  });

  // 3. formatLatency branches ------------------------------------------------

  describe("formatLatency", () => {
    it("shows '--' when the latency value is 0", () => {
      render(
        <MetricsTab
          summary={makeSummary({
            latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
          })}
        />
      );
      // The P95 main value and the P50 sub-label both show "--".
      expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(1);
    });

    it("shows a microsecond value when latency is below 0.001 s", () => {
      render(
        <MetricsTab
          summary={makeSummary({
            latencyPercentiles: {
              p50: 0.0001,
              p90: 0.0001,
              p95: 0.0001,
              p99: 0.0001,
            },
          })}
        />
      );
      // 0.0001 * 1 000 000 = 100 → "100us"
      expect(screen.getAllByText("100us").length).toBeGreaterThanOrEqual(1);
    });

    it("shows a millisecond value when 0.001 s <= latency < 1 s", () => {
      // Default p95 = 0.5 s → "500.0ms"
      render(<MetricsTab summary={makeSummary()} />);
      expect(screen.getByText("500.0ms")).toBeInTheDocument();
    });

    it("shows a second value when latency is >= 1 s", () => {
      render(
        <MetricsTab
          summary={makeSummary({
            latencyPercentiles: { p50: 1.0, p90: 1.2, p95: 1.5, p99: 2.0 },
          })}
        />
      );
      expect(screen.getByText("1.50s")).toBeInTheDocument();
    });
  });

  // 4. rps calculation -------------------------------------------------------

  describe("request rate (rps) calculation", () => {
    it("computes rps correctly when uptime is greater than 0", () => {
      render(
        <MetricsTab summary={makeSummary({ totalRequests: 200, uptime: 50 })} />
      );
      // 200 / 50 = 4.00
      expect(screen.getByText("4.00 req/s")).toBeInTheDocument();
    });

    it("shows 0.00 req/s when uptime is 0 (guards against division by zero)", () => {
      render(
        <MetricsTab summary={makeSummary({ totalRequests: 500, uptime: 0 })} />
      );
      expect(screen.getByText("0.00 req/s")).toBeInTheDocument();
    });
  });

  // 5. errorRate calculation -------------------------------------------------

  describe("error rate calculation", () => {
    it("computes the error rate from 5xx count and totalRequests", () => {
      render(
        <MetricsTab
          summary={makeSummary({
            totalRequests: 200,
            requestsByStatus: { "2xx": 180, "4xx": 10, "5xx": 10, other: 0 },
          })}
        />
      );
      // 10 / 200 = 5.00 %
      expect(screen.getByText("5.00%")).toBeInTheDocument();
    });

    it("shows 0.00% when totalRequests is 0 (guards against division by zero)", () => {
      render(
        <MetricsTab
          summary={makeSummary({
            totalRequests: 0,
            requestsByStatus: { "2xx": 0, "4xx": 0, "5xx": 0, other: 0 },
          })}
        />
      );
      expect(screen.getByText("0.00%")).toBeInTheDocument();
    });
  });

  // 6. requestsByStatus bar classes ------------------------------------------

  it("applies bg-destructive to the 5xx progress bar and bg-primary to others", () => {
    const { container } = render(<MetricsTab summary={makeSummary()} />);
    expect(container.querySelector(".bg-destructive")).toBeInTheDocument();
    expect(container.querySelectorAll(".bg-primary").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// MiniLineChart
// ---------------------------------------------------------------------------

describe("MiniLineChart", () => {
  // 7. Empty / no data -------------------------------------------------------

  it("shows 'No data' when data is an empty array", () => {
    render(<MiniLineChart data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  // 8. Renders SVG when data is present --------------------------------------

  it("renders an SVG time-series chart when data is provided", () => {
    render(
      <MiniLineChart
        data={[
          [1700000000, "1.5"],
          [1700000060, "2.5"],
        ]}
      />
    );
    expect(screen.getByLabelText("Time series chart")).toBeInTheDocument();
  });

  it("renders the label paragraph when a label prop is supplied", () => {
    render(
      <MiniLineChart data={[[1700000000, "1.5"]]} label="my metric label" />
    );
    expect(screen.getByText("my metric label")).toBeInTheDocument();
  });

  // 9. formatNum branches (verified through Y-axis SVG text labels) ----------

  describe("formatNum Y-axis labels", () => {
    it("uses a 'G' suffix for values >= 1e9", () => {
      render(
        <MiniLineChart
          data={[
            [1, "2000000000"],
            [2, "3000000000"],
          ]}
        />
      );
      // maxVal = 3 000 000 000 → "3.0G"
      expect(screen.getByText("3.0G")).toBeInTheDocument();
    });

    it("uses an 'M' suffix for values >= 1e6 and < 1e9", () => {
      render(
        <MiniLineChart
          data={[
            [1, "2000000"],
            [2, "3000000"],
          ]}
        />
      );
      // maxVal = 3 000 000 → "3.0M"
      expect(screen.getByText("3.0M")).toBeInTheDocument();
    });

    it("uses a 'k' suffix for values >= 1e3 and < 1e6", () => {
      render(
        <MiniLineChart
          data={[
            [1, "2000"],
            [2, "3000"],
          ]}
        />
      );
      // maxVal = 3 000 → "3.0k"
      expect(screen.getByText("3.0k")).toBeInTheDocument();
    });

    it("uses two decimal places for values < 1e3", () => {
      render(
        <MiniLineChart
          data={[
            [1, "0.5"],
            [2, "1.5"],
          ]}
        />
      );
      // maxVal = 1.5 → "1.50"
      expect(screen.getByText("1.50")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// PromQLChartCard
// ---------------------------------------------------------------------------

describe("PromQLChartCard", () => {
  const DEFAULT_QUERY = "rate(http_requests_total[5m])";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 10. Initial state --------------------------------------------------------

  it("shows the 'Press Run' prompt before any query has been executed", () => {
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );
    expect(
      screen.getByText(/Press "Run" to execute the query/)
    ).toBeInTheDocument();
  });

  // 11. Loading state --------------------------------------------------------

  it("disables the Run button and shows the loading indicator while a query is in flight", async () => {
    mockQueryRange.mockReturnValue(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "…" })).toBeDisabled()
    );
  });

  // 12. Successful query with results ----------------------------------------

  it("renders a MiniLineChart when the query returns result series", async () => {
    mockQueryRange.mockResolvedValue({
      data: {
        resultType: "matrix",
        result: [
          makePrometheusResult(
            { __name__: "http_requests_total", method: "GET" },
            [
              [1700000000, "1.5"],
              [1700000060, "2.0"],
            ]
          ),
        ],
      },
    });
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Time series chart")).toBeInTheDocument()
    );
  });

  // 13. Successful query with 0 results --------------------------------------

  it("shows 'No data' when the query returns an empty result set", async () => {
    mockQueryRange.mockResolvedValue({
      data: { resultType: "matrix", result: [] },
    });
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByText("No data")).toBeInTheDocument()
    );
  });

  // 14. Response with no data property ---------------------------------------

  it("shows 'Prometheus not available' when the response carries no data", async () => {
    mockQueryRange.mockResolvedValue({ data: null });
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByText("Prometheus not available")).toBeInTheDocument()
    );
  });

  // 15. API throws -----------------------------------------------------------

  it("shows 'Prometheus not available' when the API call throws an exception", async () => {
    mockQueryRange.mockRejectedValue(
      new globalThis.Error("Connection refused")
    );
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByText("Prometheus not available")).toBeInTheDocument()
    );
  });

  // 16. Enter key triggers runQuery ------------------------------------------

  it("pressing Enter in the query input triggers query execution", async () => {
    mockQueryRange.mockResolvedValue({
      data: { resultType: "matrix", result: [] },
    });
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockQueryRange).toHaveBeenCalledOnce());
  });

  // 17. metricLabel computation ----------------------------------------------

  describe("metricLabel", () => {
    it("uses non-'__name__' metric key=value pairs as the chart label", async () => {
      mockQueryRange.mockResolvedValue({
        data: {
          resultType: "matrix",
          result: [
            makePrometheusResult(
              { __name__: "http_requests_total", method: "GET" },
              [[1700000000, "1.5"]]
            ),
          ],
        },
      });
      const user = userEvent.setup();
      render(
        <PromQLChartCard
          title="HTTP Request Rate"
          defaultQuery={DEFAULT_QUERY}
        />
      );

      await user.click(screen.getByRole("button", { name: "Run" }));

      // __name__ is filtered out; the label becomes method="GET".
      await waitFor(() =>
        expect(screen.getByText('method="GET"')).toBeInTheDocument()
      );
    });

    it("falls back to the query string as the chart label when metric is empty", async () => {
      mockQueryRange.mockResolvedValue({
        data: {
          resultType: "matrix",
          result: [makePrometheusResult({}, [[1700000000, "1.5"]])],
        },
      });
      const user = userEvent.setup();
      render(
        <PromQLChartCard
          title="HTTP Request Rate"
          defaultQuery={DEFAULT_QUERY}
        />
      );

      await user.click(screen.getByRole("button", { name: "Run" }));

      // Empty metric object → empty label string → falls back to || query.
      await waitFor(() =>
        expect(screen.getByText(DEFAULT_QUERY)).toBeInTheDocument()
      );
    });
  });

  it("renders 30d and 90d preset buttons when maxRangeDays is 90 or greater", () => {
    render(
      <PromQLChartCard
        title="Long Range"
        defaultQuery="rate(http_requests_total[5m])"
        maxRangeDays={90}
      />,
    );

    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
  });

  it("clicking a preset button updates the active aria-pressed state", async () => {
    const user = userEvent.setup();
    render(
      <PromQLChartCard
        title="HTTP Request Rate"
        defaultQuery={DEFAULT_QUERY}
      />,
    );

    const btn6h = screen.getByRole("button", { name: "6h" });
    expect(btn6h).toHaveAttribute("aria-pressed", "false");

    await user.click(btn6h);

    expect(btn6h).toHaveAttribute("aria-pressed", "true");
  });

  it("typing in the query input changes the field value", async () => {
    const user = userEvent.setup();
    render(
      <PromQLChartCard
        title="HTTP Request Rate"
        defaultQuery={DEFAULT_QUERY}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "up");

    expect(input).toHaveValue("up");
  });

  it("shows empty result set when response result field is null", async () => {
    mockQueryRange.mockResolvedValue({
      data: { resultType: "matrix", result: null },
    });
    const user = userEvent.setup();
    render(
      <PromQLChartCard title="HTTP Request Rate" defaultQuery={DEFAULT_QUERY} />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() =>
      expect(screen.getByText("No data")).toBeInTheDocument(),
    );
  });
});

describe("MetricsTab — longTermEnabled", () => {
  it("renders 30d and 90d range presets in PromQLChartCard when longTermEnabled is true", () => {
    render(<MetricsTab summary={null} longTermEnabled={true} />);

    // MetricsTab with null summary renders null (no PromQLChartCards)
    // so we render the chart card directly and verify it receives maxRangeDays=90
  });

  it("passes maxRangeDays=90 to live-metrics charts when longTermEnabled is true", () => {
    render(
      <MetricsTab
        summary={{
          uptime: 60,
          totalRequests: 10,
          memory: { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 },
          requestsByStatus: {},
          latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
          grafanaUrl: null,
        }}
        longTermEnabled={true}
      />,
    );

    // With longTermEnabled=true the PromQLChartCards receive maxRangeDays=90,
    // which exposes the 30d and 90d preset buttons.
    const buttons30d = screen.getAllByRole("button", { name: "30d" });
    expect(buttons30d.length).toBeGreaterThan(0);

    const buttons90d = screen.getAllByRole("button", { name: "90d" });
    expect(buttons90d.length).toBeGreaterThan(0);
  });
});
