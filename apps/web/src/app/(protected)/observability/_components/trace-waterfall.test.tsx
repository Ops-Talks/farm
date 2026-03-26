import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetTrace = vi.fn();

vi.mock("@/lib/api-client", () => ({
  observability: {
    getTrace: (...args: unknown[]) => mockGetTrace(...args),
  },
}));

import { TraceWaterfall } from "@/app/(protected)/observability/_components/trace-waterfall";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeSpan(id: string, parentId?: string) {
  return {
    traceID: "trace-1",
    spanID: id,
    operationName: `op-${id}`,
    startTime: 1000000,
    duration: 5000,
    references: parentId
      ? [{ refType: "CHILD_OF", traceID: "trace-1", spanID: parentId }]
      : [],
    tags: [],
    logs: [],
    processID: "p1",
    warnings: [],
  };
}

function makeTrace() {
  return {
    traceID: "trace-abc123",
    spans: [makeSpan("span-1"), makeSpan("span-2", "span-1")],
    processes: {
      p1: { serviceName: "auth-service", tags: [] },
    },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TraceWaterfall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    mockGetTrace.mockReturnValue(new Promise(() => {}));
    render(<TraceWaterfall traceId="trace-abc123" />);
    // Loading shows 6 skeleton rows — check that no error/data is shown
    expect(screen.queryByText("Jaeger not available")).not.toBeInTheDocument();
  });

  it("shows 'Jaeger not available' on API error", async () => {
    mockGetTrace.mockRejectedValue(new globalThis.Error("Service unavailable"));
    render(<TraceWaterfall traceId="trace-abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jaeger not available")).toBeInTheDocument();
    });
  });

  it("shows 'Trace not found.' when API returns empty data array", async () => {
    mockGetTrace.mockResolvedValue({ data: [] });
    render(<TraceWaterfall traceId="trace-abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Trace not found.")).toBeInTheDocument();
    });
  });

  it("shows 'No spans in this trace.' when trace has zero spans", async () => {
    mockGetTrace.mockResolvedValue({
      data: [{ traceID: "trace-abc123", spans: [], processes: {}, warnings: [] }],
    });
    render(<TraceWaterfall traceId="trace-abc123" />);

    await waitFor(() => {
      expect(screen.getByText("No spans in this trace.")).toBeInTheDocument();
    });
  });

  it("renders span rows when trace data is loaded", async () => {
    mockGetTrace.mockResolvedValue({ data: [makeTrace()] });
    render(<TraceWaterfall traceId="trace-abc123" />);

    await waitFor(() => {
      // Should show the operation names of both spans
      expect(screen.getByText("op-span-1")).toBeInTheDocument();
    });
    expect(screen.getByText("op-span-2")).toBeInTheDocument();
  });

  it("renders the span count and trace id fragment in the header", async () => {
    mockGetTrace.mockResolvedValue({ data: [makeTrace()] });
    render(<TraceWaterfall traceId="trace-abc123def456789" />);

    await waitFor(() => {
      expect(screen.getByText("2 spans · 5.00ms")).toBeInTheDocument();
    });
    // Component renders traceId.slice(0, 16) + '…' = "trace-abc123def4…"
    expect(screen.getByText(/trace-abc123def4/)).toBeInTheDocument();
  });

  it("renders service name for each span", async () => {
    mockGetTrace.mockResolvedValue({ data: [makeTrace()] });
    render(<TraceWaterfall traceId="trace-abc123" />);

    await waitFor(() => {
      const serviceLabels = screen.getAllByText("auth-service");
      expect(serviceLabels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
