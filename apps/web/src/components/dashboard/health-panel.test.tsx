import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { HealthStatus } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHealthCheck = vi.fn();

vi.mock("@/lib/api-client", () => ({
  health: {
    check: (...args: unknown[]) => mockHealthCheck(...args),
  },
}));

import { HealthPanel } from "./health-panel";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Builds a minimal HealthStatus fixture. */
function makeHealthStatus(
  overrides: Partial<HealthStatus> & { status?: string } = {},
): HealthStatus {
  return {
    status: "ok",
    info: {},
    error: {},
    details: {},
    ...overrides,
  } as HealthStatus;
}

// ── HealthPanel tests ─────────────────────────────────────────────────────────

describe("HealthPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  describe("loading state", () => {
    it("renders 4 skeleton cards (8 skeleton elements) before data arrives", async () => {
      // Use a promise that never resolves to hold the loading state open.
      mockHealthCheck.mockReturnValue(new Promise<never>(() => {}));

      const { container } = render(<HealthPanel />);

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
        // Each card has 2 skeleton elements (header + content) × 4 cards = 8.
        expect(skeletons.length).toBe(8);
      });

      // The success-state landmark must not be visible yet.
      expect(screen.queryByText("Overall Status")).not.toBeInTheDocument();
    });
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  describe("error state", () => {
    it("shows 'API Unreachable' when health.check() rejects", async () => {
      mockHealthCheck.mockRejectedValue(new Error("Network error"));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("API Unreachable")).toBeInTheDocument();
      });
    });

    it("shows the retry explanation text alongside the unreachable badge", async () => {
      mockHealthCheck.mockRejectedValue(new Error("timeout"));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/Retrying every 30 seconds/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Success state — overall status card ────────────────────────────────────

  describe("overall status card", () => {
    it("shows the 'Overall Status' title after a successful fetch", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "ok" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });
    });

    it("statusLabel: 'ok' → 'Healthy'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "ok" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Healthy")).toBeInTheDocument();
      });
    });

    it("statusLabel: 'up' → 'Healthy'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "up" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Healthy")).toBeInTheDocument();
      });
    });

    it("statusLabel: 'error' → 'Down'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "error" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Down")).toBeInTheDocument();
      });
    });

    it("statusLabel: 'down' → 'Down'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "down" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Down")).toBeInTheDocument();
      });
    });

    it("statusLabel: any other value → returns the status string as-is", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({ status: "degraded" }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("degraded")).toBeInTheDocument();
      });
    });
  });

  // ── statusVariant coverage via rendered CSS classes ─────────────────────────
  //
  // The badge CSS variant is determined by statusVariant(). We verify coverage
  // by rendering every branch and confirming the component renders without
  // errors while producing the expected label text.

  describe("statusVariant", () => {
    it("applies the default (primary) variant for status 'ok'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "ok" }));
      render(<HealthPanel />);

      await waitFor(() => {
        // 'Healthy' badge rendered with the default variant (bg-primary class).
        const badge = screen.getByText("Healthy");
        expect(badge.className).toMatch(/bg-primary/);
      });
    });

    it("applies the default (primary) variant for status 'up'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "up" }));
      render(<HealthPanel />);

      await waitFor(() => {
        const badge = screen.getByText("Healthy");
        expect(badge.className).toMatch(/bg-primary/);
      });
    });

    it("applies the destructive variant for status 'error'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "error" }));
      render(<HealthPanel />);

      await waitFor(() => {
        const badge = screen.getByText("Down");
        expect(badge.className).toMatch(/bg-destructive/);
      });
    });

    it("applies the destructive variant for status 'down'", async () => {
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "down" }));
      render(<HealthPanel />);

      await waitFor(() => {
        const badge = screen.getByText("Down");
        expect(badge.className).toMatch(/bg-destructive/);
      });
    });

    it("applies the secondary variant for any other status", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({ status: "degraded" }),
      );
      render(<HealthPanel />);

      await waitFor(() => {
        const badge = screen.getByText("degraded");
        expect(badge.className).toMatch(/bg-secondary/);
      });
    });
  });

  // ── formatBytes coverage via detail values ──────────────────────────────────

  describe("formatBytes", () => {
    it("formats values below 1024 as 'X B'", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            memory: { status: "up", heapUsed: 512 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/512 B/)).toBeInTheDocument();
      });
    });

    it("formats values in the KB range", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            memory: { status: "up", heapUsed: 2048 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
      });
    });

    it("formats values in the MB range", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            memory: { status: "up", heapUsed: 1024 * 1024 * 5 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
      });
    });

    it("formats values in the GB range", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            memory: { status: "up", heapUsed: 1024 * 1024 * 1024 * 2 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/2\.0 GB/)).toBeInTheDocument();
      });
    });
  });

  // ── formatDetailValue coverage ──────────────────────────────────────────────

  describe("formatDetailValue", () => {
    it("applies formatBytes for a key containing 'heap' with a numeric value", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            process: { status: "up", heapTotal: 4096 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        // 4096 bytes = 4.0 KB
        expect(screen.getByText(/4\.0 KB/)).toBeInTheDocument();
      });
    });

    it("applies formatBytes for a key containing 'rss' with a numeric value", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            process: { status: "up", rss: 1024 * 1024 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
      });
    });

    it("applies formatBytes for a key containing 'available' with a numeric value", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            storage: { status: "up", diskAvailable: 1024 * 1024 * 512 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/512\.0 MB/)).toBeInTheDocument();
      });
    });

    it("applies formatBytes for a key containing 'max' with a numeric value", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            process: { status: "up", maxOldSpaceSize: 1024 * 1024 * 100 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/100\.0 MB/)).toBeInTheDocument();
      });
    });

    it("renders a numeric value as a plain string for unrecognised keys", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            database: { status: "up", connections: 42 },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/42/)).toBeInTheDocument();
      });

      // Should not have been formatted as bytes.
      expect(screen.queryByText(/42 B/)).not.toBeInTheDocument();
    });

    it("renders non-numeric values using String()", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            app: { status: "up", version: "3.2.1" },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText(/3\.2\.1/)).toBeInTheDocument();
      });
    });
  });

  // ── Detail entries rendering ────────────────────────────────────────────────

  describe("detail entries", () => {
    it("renders a card for each detail entry", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            database: { status: "up" },
            redis: { status: "up" },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("database")).toBeInTheDocument();
        expect(screen.getByText("redis")).toBeInTheDocument();
      });
    });

    it("replaces underscores in detail keys with spaces for display", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            message_queue: { status: "up" },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("message queue")).toBeInTheDocument();
      });
    });

    it("shows 'UP' badge for a detail entry with status 'up'", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            database: { status: "up" },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("UP")).toBeInTheDocument();
      });
    });

    it("shows 'DOWN' badge for a detail entry with a non-'up' status", async () => {
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            database: { status: "down" },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("DOWN")).toBeInTheDocument();
      });
    });

    it("renders extra detail fields below the status badge", async () => {
      // Use an underscore-separated key so that replace(/_/g, " ") renders
      // "response time:" in the DOM (exercising that code path too).
      mockHealthCheck.mockResolvedValue(
        makeHealthStatus({
          status: "ok",
          details: {
            database: {
              status: "up",
              response_time: "12ms",
            },
          },
        }),
      );

      render(<HealthPanel />);

      await waitFor(() => {
        // The <span> renders the key with underscores replaced by spaces.
        expect(screen.getByText("response time:")).toBeInTheDocument();
        // The value text node is inside the same <p>.
        expect(screen.getByText(/12ms/)).toBeInTheDocument();
      });
    });
  });

  // ── Polling interval ────────────────────────────────────────────────────────

  describe("polling", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("sets up a polling interval of 30 000 ms on mount", async () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "ok" }));

      render(<HealthPanel />);

      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });

      // Verify setInterval was called with 30 seconds.
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30_000,
      );
    });

    it("polls the API again after the interval fires", async () => {
      // Capture the polling callback via a setInterval spy so we can trigger
      // it manually without advancing fake timers (which causes infinite loops
      // in React's internal scheduler).
      const capturedIntervals: Array<{ fn: () => void; delay: number }> = [];
      const setIntervalSpy = vi
        .spyOn(globalThis, "setInterval")
        .mockImplementation((fn, delay) => {
          capturedIntervals.push({ fn: fn as () => void, delay });
          return 0 as unknown as ReturnType<typeof setInterval>;
        });

      mockHealthCheck.mockResolvedValue(makeHealthStatus({ status: "ok" }));

      render(<HealthPanel />);

      // Wait for the initial fetch to complete.
      await waitFor(() =>
        expect(mockHealthCheck).toHaveBeenCalledTimes(1),
      );

      // Locate and fire the 30-second polling interval callback directly.
      const pollingInterval = capturedIntervals.find(
        (entry) => entry.delay === 30_000,
      );
      expect(pollingInterval).toBeDefined();

      pollingInterval!.fn();

      await waitFor(() =>
        expect(mockHealthCheck).toHaveBeenCalledTimes(2),
      );

      setIntervalSpy.mockRestore();
    });
  });
});
