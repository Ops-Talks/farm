import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockListQueues = vi.fn();

vi.mock("@/lib/api-client", () => ({
  queues: { list: (...args: unknown[]) => mockListQueues(...args) },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
  FarmEvent: {},
}));

import { QueuePanel } from "@/components/dashboard/queue-panel";

const MOCK_QUEUES = [
  {
    name: "catalog-discovery",
    isPaused: false,
    jobCounts: { waiting: 3, active: 1, completed: 45, failed: 2, delayed: 0, paused: 0, prioritized: 0 },
  },
  {
    name: "notifications",
    isPaused: true,
    jobCounts: { waiting: 0, active: 0, completed: 120, failed: 0, delayed: 0, paused: 0, prioritized: 0 },
  },
];

describe("QueuePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeletons while loading", () => {
    mockListQueues.mockReturnValue(new Promise(() => {}));
    render(<QueuePanel />);
    expect(screen.getByText("Background Queues")).toBeInTheDocument();
  });

  it("renders queue names and job counts when data loads", async () => {
    mockListQueues.mockResolvedValue(MOCK_QUEUES);
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText("catalog-discovery")).toBeInTheDocument();
    });
    expect(screen.getByText("notifications")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("shows Paused badge for paused queues", async () => {
    mockListQueues.mockResolvedValue(MOCK_QUEUES);
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });
  });

  it("shows empty state when API returns no queues", async () => {
    mockListQueues.mockResolvedValue([]);
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText("No queues found.")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully and shows empty state", async () => {
    mockListQueues.mockRejectedValue(new Error("network error"));
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText("No queues found.")).toBeInTheDocument();
    });
  });

  it("shows Open Bull Board link", async () => {
    mockListQueues.mockResolvedValue([]);
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText(/Open Bull Board/)).toBeInTheDocument();
    });
  });

  it("does not update state after unmount", async () => {
    const latePromise = Promise.resolve(MOCK_QUEUES);
    mockListQueues.mockReturnValue(latePromise);
    const { unmount } = render(<QueuePanel />);
    unmount();
    expect(() => screen.getByText("catalog-discovery")).toThrow();
  });

  it("renders Updated indicator with opacity-0 on initial load", async () => {
    mockListQueues.mockResolvedValue(MOCK_QUEUES);
    render(<QueuePanel />);

    await waitFor(() => {
      expect(screen.getByText("Background Queues")).toBeInTheDocument();
    });
    const updated = screen.getByText("Updated");
    expect(updated).toBeInTheDocument();
    expect(updated.className).toContain("opacity-0");
  });

  it("shows Updated indicator during subsequent refresh (success)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    mockListQueues.mockResolvedValue(MOCK_QUEUES);
    render(<QueuePanel />);

    // First fetch completes, firstLoad becomes false, interval starts
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(mockListQueues).toHaveBeenCalledTimes(1);

    // Advance past the 30s interval to trigger second fetch
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(mockListQueues).toHaveBeenCalledTimes(2);

    // Advance 2000ms so the refresh indicator's setTimeout fires
    await act(() => vi.advanceTimersByTimeAsync(2000));

    vi.useRealTimers();
  });

  it("shows Updated indicator during subsequent refresh (error)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    mockListQueues.mockResolvedValue(MOCK_QUEUES);
    render(<QueuePanel />);

    // First fetch completes
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(mockListQueues).toHaveBeenCalledTimes(1);

    // Second fetch: make it reject
    mockListQueues.mockRejectedValue(new Error("timeout"));

    // Advance past the 30s interval to trigger second fetch
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(mockListQueues).toHaveBeenCalledTimes(2);

    // Advance 2000ms so the refresh indicator's setTimeout fires
    await act(() => vi.advanceTimersByTimeAsync(2000));

    vi.useRealTimers();
  });
});
