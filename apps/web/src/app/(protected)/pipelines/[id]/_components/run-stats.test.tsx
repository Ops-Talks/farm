import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── API mock ─────────────────────────────────────────────────────────────────

const mockStats = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    runs: {
      stats: (...args: unknown[]) => mockStats(...args),
    },
  },
}));

import { RunStatsPanel } from "./run-stats";

// ── Test wrapper ──────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStats(overrides = {}) {
  return {
    total: 42,
    byStatus: { succeeded: 35, failed: 7 },
    successRate: 83.3,
    avgDurationMs: 12500,
    lastRunAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RunStatsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a loading skeleton while the query is in flight", () => {
    // Never-resolving promise keeps isLoading=true
    mockStats.mockReturnValue(new Promise(() => {}));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    // While loading, the stat card headings should NOT be visible yet
    expect(screen.queryByText("Total Runs")).not.toBeInTheDocument();
    expect(screen.queryByText("Success Rate")).not.toBeInTheDocument();
  });

  it("renders all four stat cards on success", async () => {
    mockStats.mockResolvedValue(makeStats());

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Total Runs")).toBeInTheDocument();
    });

    expect(screen.getByText("Success Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Duration")).toBeInTheDocument();
    expect(screen.getByText("Last Run")).toBeInTheDocument();
  });

  it("displays correct total run count", async () => {
    mockStats.mockResolvedValue(makeStats({ total: 99 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("99")).toBeInTheDocument();
    });
  });

  it("displays success rate with one decimal place", async () => {
    mockStats.mockResolvedValue(makeStats({ successRate: 75.5 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("75.5%")).toBeInTheDocument();
    });
  });

  it("formats millisecond avg duration correctly", async () => {
    // 12 500 ms = 12.5 s
    mockStats.mockResolvedValue(makeStats({ avgDurationMs: 12500 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("12.5s")).toBeInTheDocument();
    });
  });

  it("shows — when avgDurationMs is null", async () => {
    mockStats.mockResolvedValue(makeStats({ avgDurationMs: null }));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // The Avg Duration card value should display em-dash
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("shows 'Never' when lastRunAt is null", async () => {
    mockStats.mockResolvedValue(makeStats({ lastRunAt: null }));

    render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Never")).toBeInTheDocument();
    });
  });

  it("returns null (renders nothing) when the API call fails", async () => {
    mockStats.mockRejectedValue(new Error("Server error"));

    const { container } = render(<RunStatsPanel pipelineId="pipe-1" />, {
      wrapper: createWrapper(),
    });

    // Wait until the query error settles AND isLoading transitions to false.
    // At that point the component returns null so container.firstChild is null.
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("calls the API with the correct pipelineId", async () => {
    mockStats.mockResolvedValue(makeStats());

    render(<RunStatsPanel pipelineId="pipeline-xyz" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockStats).toHaveBeenCalledWith("pipeline-xyz");
    });
  });

  it("refetches when pipelineId changes", async () => {
    mockStats.mockResolvedValue(makeStats({ total: 10 }));

    const { rerender } = render(<RunStatsPanel pipelineId="pipe-A" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(screen.getByText("10")).toBeInTheDocument());

    mockStats.mockResolvedValue(makeStats({ total: 20 }));

    rerender(<RunStatsPanel pipelineId="pipe-B" />);

    await waitFor(() => expect(screen.getByText("20")).toBeInTheDocument());
  });
});
