import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetTraceServices = vi.fn();
const mockGetTraces = vi.fn();

vi.mock("@/lib/api-client", () => ({
  observability: {
    getTraceServices: () => mockGetTraceServices(),
    getTraces: (...args: unknown[]) => mockGetTraces(...args),
  },
}));

// TraceWaterfall uses dynamic import — stub it for unit tests
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="trace-waterfall-stub" />,
}));

import { TracesTab } from "@/app/(protected)/observability/_components/traces-tab";

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

function makeTrace(overrides: {
  traceID?: string;
  spans?: object[];
  processes?: Record<string, object>;
} = {}) {
  return {
    traceID: "abcdef0123456789",
    spans: [
      {
        spanID: "span-0001",
        startTime: 1_000_000,
        duration: 5_000,
        operationName: "GET /health",
        processID: "p1",
        references: [],
        tags: [],
        logs: [],
        warnings: [],
      },
    ],
    processes: { p1: { serviceName: "test-svc", tags: [] } },
    warnings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TracesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTraceServices.mockResolvedValue({ data: ["auth-service", "payment-service"] });
    mockGetTraces.mockResolvedValue({ data: [] });
  });

  it("renders the time range buttons", async () => {
    render(<TracesTab />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "15m" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "1h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "24h" })).toBeInTheDocument();
  });

  it("renders the Refresh button", async () => {
    render(<TracesTab />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });
  });

  it("renders service selector with options from API", async () => {
    render(<TracesTab />);
    await waitFor(() => {
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "auth-service" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "payment-service" })).toBeInTheDocument();
  });

  it("shows unavailable message when tracing backend is unreachable", async () => {
    mockGetTraceServices.mockRejectedValue(new globalThis.Error("Connection refused"));
    mockGetTraces.mockRejectedValue(new globalThis.Error("Connection refused"));
    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("Tracing backend not available")).toBeInTheDocument();
    });
  });

  it("shows empty state when no traces are returned", async () => {
    render(<TracesTab />);
    await waitFor(() => {
      expect(screen.getByText(/No traces found/)).toBeInTheDocument();
    });
  });

  it("renders trace rows when traces are returned", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        {
          traceID: "trace-1",
          spans: [
            {
              spanID: "span-1",
              startTime: Date.now() * 1000,
              duration: 5000,
              operationName: "GET /api/health",
              processID: "p1",
              references: [],
              tags: [],
              logs: [],
              warnings: [],
            },
          ],
          processes: { p1: { serviceName: "auth-service", tags: [] } },
          warnings: [],
        },
      ],
    });
    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("GET /api/health")).toBeInTheDocument();
    });
    // "auth-service" appears in both the select option and the trace row
    expect(screen.getAllByText("auth-service").length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // formatDuration branches
  // -------------------------------------------------------------------------

  it("formatDuration: shows seconds (X.XXs) when trace duration is >= 1,000,000 µs", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        makeTrace({
          spans: [
            {
              spanID: "s1",
              startTime: 0,
              duration: 2_500_000,
              operationName: "slow-op",
              processID: "p1",
              references: [],
              tags: [],
              logs: [],
              warnings: [],
            },
          ],
        }),
      ],
    });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("2.50s")).toBeInTheDocument();
    });
  });

  it("formatDuration: shows milliseconds (X.XXms) when trace duration is >= 1,000 µs and < 1,000,000 µs", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        makeTrace({
          spans: [
            {
              spanID: "s1",
              startTime: 0,
              duration: 7_500,
              operationName: "medium-op",
              processID: "p1",
              references: [],
              tags: [],
              logs: [],
              warnings: [],
            },
          ],
        }),
      ],
    });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("7.50ms")).toBeInTheDocument();
    });
  });

  it("formatDuration: shows microseconds (Xµs) when trace duration is < 1,000 µs", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        makeTrace({
          spans: [
            {
              spanID: "s1",
              startTime: 0,
              duration: 500,
              operationName: "fast-op",
              processID: "p1",
              references: [],
              tags: [],
              logs: [],
              warnings: [],
            },
          ],
        }),
      ],
    });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("500µs")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // getTraceService branches
  // -------------------------------------------------------------------------

  it("getTraceService: shows '—' in service column when the trace has no spans", async () => {
    mockGetTraces.mockResolvedValue({
      data: [makeTrace({ spans: [], processes: {} })],
    });

    render(<TracesTab />);

    await waitFor(() => {
      // With no spans getTraceService and getTraceOperation both return "—"
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("getTraceService: shows '—' in service column when process has no serviceName", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        makeTrace({
          spans: [
            {
              spanID: "s1",
              startTime: 0,
              duration: 1_000,
              operationName: "named-op",
              processID: "p1",
              references: [],
              tags: [],
              logs: [],
              warnings: [],
            },
          ],
          // Process exists but has no serviceName — triggers the ?? "—" fallback
          processes: { p1: { tags: [] } },
        }),
      ],
    });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("named-op")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // getTraceOperation branch — no spans
  // -------------------------------------------------------------------------

  it("getTraceOperation: shows '—' in operation column and '0µs' in duration column when trace has no spans", async () => {
    mockGetTraces.mockResolvedValue({
      data: [makeTrace({ spans: [], processes: {} })],
    });

    render(<TracesTab />);

    await waitFor(() => {
      // Duration cell shows formatDuration(0) = "0µs"
      expect(screen.getByText("0µs")).toBeInTheDocument();
    });
    // Operation and service columns both show "—"
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // Singular vs plural trace count header
  // -------------------------------------------------------------------------

  it("shows '1 trace' (singular) when exactly one trace is returned", async () => {
    mockGetTraces.mockResolvedValue({ data: [makeTrace()] });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("1 trace")).toBeInTheDocument();
    });
  });

  it("shows 'N traces' (plural) when more than one trace is returned", async () => {
    mockGetTraces.mockResolvedValue({
      data: [
        makeTrace({ traceID: "aaaa000100000001" }),
        makeTrace({ traceID: "bbbb000200000002" }),
      ],
    });

    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByText("2 traces")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Expand / collapse TraceWaterfall
  // -------------------------------------------------------------------------

  it("clicking a trace row expands the TraceWaterfall stub, clicking again collapses it", async () => {
    const user = userEvent.setup();
    mockGetTraces.mockResolvedValue({ data: [makeTrace()] });

    render(<TracesTab />);

    // Wait until the trace row is rendered — first 8 chars of the traceID
    await waitFor(() => {
      expect(screen.getByText("abcdef01")).toBeInTheDocument();
    });

    // Waterfall is not visible before any click
    expect(
      screen.queryByTestId("trace-waterfall-stub"),
    ).not.toBeInTheDocument();

    // Click the row to expand
    await user.click(screen.getByText("abcdef01").closest("tr")!);

    expect(screen.getByTestId("trace-waterfall-stub")).toBeInTheDocument();

    // Click the same row again to collapse
    await user.click(screen.getByText("abcdef01").closest("tr")!);

    expect(
      screen.queryByTestId("trace-waterfall-stub"),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Service filter — select changes trigger a re-fetch
  // -------------------------------------------------------------------------

  it("selecting a specific service re-fetches traces filtered by that service", async () => {
    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "auth-service" },
    });

    await waitFor(() => {
      expect(mockGetTraces).toHaveBeenCalledWith(
        expect.objectContaining({ service: "auth-service" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Time range button — changes active lookback and re-fetches
  // -------------------------------------------------------------------------

  it("clicking a time range button re-fetches traces with the updated lookback", async () => {
    const user = userEvent.setup();
    render(<TracesTab />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "15m" })).toBeInTheDocument();
    });

    mockGetTraces.mockClear();

    await user.click(screen.getByRole("button", { name: "15m" }));

    await waitFor(() => {
      expect(mockGetTraces).toHaveBeenCalledWith(
        expect.objectContaining({ lookback: "1000s" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Refresh button — triggers an additional fetch
  // -------------------------------------------------------------------------

  it("clicking the Refresh button triggers an additional getTraces call", async () => {
    const user = userEvent.setup();
    render(<TracesTab />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Refresh" }),
      ).toBeInTheDocument();
    });

    const callsBefore = mockGetTraces.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(mockGetTraces.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
