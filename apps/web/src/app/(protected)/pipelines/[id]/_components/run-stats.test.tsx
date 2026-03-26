import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  // ── formatDuration uncovered branches ─────────────────────────────────────

  it("formats sub-second durations as milliseconds (e.g. 500ms)", async () => {
    mockStats.mockResolvedValue(makeStats({ avgDurationMs: 500 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("500ms")).toBeInTheDocument();
    });
  });

  it("formats durations >= 60 s as minutes and seconds (e.g. 65 000 ms -> 1m 5s)", async () => {
    mockStats.mockResolvedValue(makeStats({ avgDurationMs: 65_000 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1m 5s")).toBeInTheDocument();
    });
  });

  // ── formatRelativeTime uncovered branches ──────────────────────────────────
  // Each test freezes only the Date constructor/Date.now so that
  // waitFor's internal setTimeout still works normally.

  describe("formatRelativeTime branches", () => {
    // A fixed reference instant used by vi.setSystemTime so that relative
    // timestamps computed at render time are deterministic.
    const BASE = new Date("2024-06-01T12:00:00.000Z").getTime();

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(BASE);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows plural seconds for a time 30 seconds ago", async () => {
      mockStats.mockResolvedValue(
        makeStats({ lastRunAt: new Date(BASE - 30_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("30 seconds ago")).toBeInTheDocument();
      });
    });

    it("shows singular second for a time exactly 1 second ago", async () => {
      mockStats.mockResolvedValue(
        makeStats({ lastRunAt: new Date(BASE - 1_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("1 second ago")).toBeInTheDocument();
      });
    });

    it("shows plural minutes for a time 5 minutes ago", async () => {
      mockStats.mockResolvedValue(
        makeStats({ lastRunAt: new Date(BASE - 5 * 60_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("5 minutes ago")).toBeInTheDocument();
      });
    });

    it("shows singular minute for a time exactly 1 minute ago", async () => {
      mockStats.mockResolvedValue(
        // 90 seconds back gives diffMins = 1, avoiding a boundary race.
        makeStats({ lastRunAt: new Date(BASE - 90_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("1 minute ago")).toBeInTheDocument();
      });
    });

    it("shows plural hours for a time 3 hours ago", async () => {
      mockStats.mockResolvedValue(
        makeStats({ lastRunAt: new Date(BASE - 3 * 3_600_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("3 hours ago")).toBeInTheDocument();
      });
    });

    it("shows singular hour for a time 90 minutes ago", async () => {
      mockStats.mockResolvedValue(
        // 90 minutes back gives diffHours = 1, avoiding a boundary race.
        makeStats({ lastRunAt: new Date(BASE - 90 * 60_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("1 hour ago")).toBeInTheDocument();
      });
    });

    it("shows plural days for a time 3 days ago", async () => {
      mockStats.mockResolvedValue(
        makeStats({ lastRunAt: new Date(BASE - 3 * 86_400_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("3 days ago")).toBeInTheDocument();
      });
    });

    it("shows singular day for a time 36 hours ago", async () => {
      mockStats.mockResolvedValue(
        // 36 hours back gives diffDays = 1, avoiding a boundary race.
        makeStats({ lastRunAt: new Date(BASE - 36 * 3_600_000).toISOString() }),
      );

      render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("1 day ago")).toBeInTheDocument();
      });
    });
  });

  // ── successRateColor uncovered branches ────────────────────────────────────

  it("applies green color class when success rate is >= 80", async () => {
    mockStats.mockResolvedValue(makeStats({ successRate: 85 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const el = screen.getByText("85.0%");
      expect(el.className).toContain("text-green-600");
    });
  });

  it("applies amber color class when success rate is >= 50 and < 80", async () => {
    mockStats.mockResolvedValue(makeStats({ successRate: 60 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const el = screen.getByText("60.0%");
      expect(el.className).toContain("text-amber-600");
    });
  });

  it("applies destructive color class when success rate is < 50", async () => {
    mockStats.mockResolvedValue(makeStats({ successRate: 30 }));

    render(<RunStatsPanel pipelineId="pipe-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const el = screen.getByText("30.0%");
      expect(el.className).toContain("text-destructive");
    });
  });
});
