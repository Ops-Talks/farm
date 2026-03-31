import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListNodeRuntimes = vi.fn();
const mockGetCrioMetrics = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listNodeRuntimes: (...args: unknown[]) => mockListNodeRuntimes(...args),
    getCrioMetrics: (...args: unknown[]) => mockGetCrioMetrics(...args),
  },
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { RuntimeClient } from "./RuntimeClient";

// ── Wrapper ───────────────────────────────────────────────────────────────────

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

function makeNode(overrides: Record<string, unknown> = {}) {
  return {
    nodeName: "node-1",
    runtimeName: "containerd",
    runtimeVersion: "1.7.2",
    kernelVersion: "5.15.0-91-generic",
    osImage: "Ubuntu 22.04 LTS",
    architecture: "amd64",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RuntimeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  it("renders skeleton while loading", () => {
    mockListNodeRuntimes.mockReturnValue(new Promise(() => {}));

    render(<RuntimeClient />, { wrapper: createWrapper() });

    expect(
      screen.queryByText("No node runtime information available."),
    ).not.toBeInTheDocument();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  it("shows empty state when no nodes", async () => {
    mockListNodeRuntimes.mockResolvedValue([]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No node runtime information available."),
      ).toBeInTheDocument();
    });
  });

  // ── Renders nodes ───────────────────────────────────────────────────────────

  it("renders node table with runtime info", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({
        nodeName: "worker-1",
        runtimeName: "containerd",
        runtimeVersion: "1.7.2",
        kernelVersion: "5.15.0",
        architecture: "amd64",
      }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("worker-1")).toBeInTheDocument();
    });

    expect(screen.getByText("containerd")).toBeInTheDocument();
    expect(screen.getByText("1.7.2")).toBeInTheDocument();
    expect(screen.getByText("5.15.0")).toBeInTheDocument();
    expect(screen.getByText("amd64")).toBeInTheDocument();
  });

  // ── Runtime badges ──────────────────────────────────────────────────────────

  it("renders containerd badge with blue styling", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ runtimeName: "containerd" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("containerd");
      expect(badge.className).toContain("bg-blue-500/20");
    });
  });

  it("renders cri-o badge with orange styling", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ runtimeName: "cri-o" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("cri-o");
      expect(badge.className).toContain("bg-orange-500/20");
    });
  });

  it("renders docker badge with gray styling", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ runtimeName: "docker" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("docker");
      expect(badge.className).toContain("bg-gray-500/20");
    });
  });

  // ── Summary card ────────────────────────────────────────────────────────────

  it("shows runtime distribution summary", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "n1", runtimeName: "containerd" }),
      makeNode({ nodeName: "n2", runtimeName: "containerd" }),
      makeNode({ nodeName: "n3", runtimeName: "cri-o" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("2 nodes: containerd, 1 node: cri-o"),
      ).toBeInTheDocument();
    });
  });

  // ── Header count ────────────────────────────────────────────────────────────

  it("shows plural node count in header", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "n1" }),
      makeNode({ nodeName: "n2" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 nodes in cluster")).toBeInTheDocument();
    });
  });

  it("shows singular node count in header", async () => {
    mockListNodeRuntimes.mockResolvedValue([makeNode()]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1 node in cluster")).toBeInTheDocument();
    });
  });

  // ── CRI-O expand button ────────────────────────────────────────────────────

  it("shows CRI-O metrics expand button for cri-o nodes", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });
  });

  it("does not show CRI-O metrics button for containerd nodes", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "containerd-node", runtimeName: "containerd" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("containerd-node")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Show CRI-O Metrics"),
    ).not.toBeInTheDocument();
  });

  // ── Unknown runtime badge ──────────────────────────────────────────────────

  it("renders unknown runtime badge with gray fallback styling", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ runtimeName: "rkt" }),
    ]);

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("rkt");
      expect(badge.className).toContain("bg-gray-500/20");
    });
  });

  // ── CRI-O metrics: loading state ──────────────────────────────────────────

  it("shows skeleton while CRI-O metrics are loading", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);
    mockGetCrioMetrics.mockReturnValue(new Promise(() => {}));

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Show CRI-O Metrics"));

    await waitFor(() => {
      expect(screen.queryByText("Show CRI-O Metrics")).not.toBeInTheDocument();
    });
  });

  // ── CRI-O metrics: unavailable ─────────────────────────────────────────────

  it("shows unavailable message when CRI-O metrics are not available", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);
    mockGetCrioMetrics.mockResolvedValue({ available: false });

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Show CRI-O Metrics"));

    await waitFor(() => {
      expect(
        screen.getByText("CRI-O metrics unavailable"),
      ).toBeInTheDocument();
    });
  });

  // ── CRI-O metrics: all fields (KB path) ───────────────────────────────────

  it("shows all CRI-O metrics with KB storage", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);
    mockGetCrioMetrics.mockResolvedValue({
      available: true,
      imageLayers: 42,
      cacheHitRate: 0.85,
      storageUsageBytes: 2048,
    });

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Show CRI-O Metrics"));

    await waitFor(() => {
      expect(screen.getByText("Layers: 42")).toBeInTheDocument();
    });
    expect(screen.getByText("Cache hit: 85.0%")).toBeInTheDocument();
    expect(screen.getByText("Storage: 2.0 KB")).toBeInTheDocument();
  });

  // ── CRI-O metrics: partial data (MB path) ─────────────────────────────────

  it("shows only available metrics fields with MB storage", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);
    mockGetCrioMetrics.mockResolvedValue({
      available: true,
      storageUsageBytes: 5242880,
    });

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Show CRI-O Metrics"));

    await waitFor(() => {
      expect(screen.getByText("Storage: 5.0 MB")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Layers:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cache hit:/)).not.toBeInTheDocument();
  });

  // ── CRI-O metrics: GB path ────────────────────────────────────────────────

  it("formats storage in GB for large values", async () => {
    mockListNodeRuntimes.mockResolvedValue([
      makeNode({ nodeName: "crio-node", runtimeName: "cri-o" }),
    ]);
    mockGetCrioMetrics.mockResolvedValue({
      available: true,
      storageUsageBytes: 2147483648,
    });

    render(<RuntimeClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Show CRI-O Metrics")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Show CRI-O Metrics"));

    await waitFor(() => {
      expect(screen.getByText("Storage: 2.00 GB")).toBeInTheDocument();
    });
  });
});

