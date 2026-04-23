import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any component import so Vitest hoists them.
// ---------------------------------------------------------------------------

const mockHealthCheck = vi.fn();
const mockSummary = vi.fn();
const mockGetTraceServices = vi.fn();
const mockGetTraces = vi.fn();
const mockGetLogs = vi.fn();
const mockGetDragonflyStatus = vi.fn();
const mockGetDragonflyMetrics = vi.fn();
const mockGetDragonflyTasks = vi.fn();
const mockGetDragonflyPeers = vi.fn();
const mockGetKedaStatus = vi.fn();
const mockListKedaScaledObjects = vi.fn();
const mockListKedaScaledJobs = vi.fn();
const mockGetElasticStack = vi.fn();

vi.mock("@/lib/api-client", () => ({
  health: { check: () => mockHealthCheck() },
  observability: {
    summary: () => mockSummary(),
    getTraceServices: () => mockGetTraceServices(),
    getTraces: () => mockGetTraces(),
    getLogs: () => mockGetLogs(),
    queryRange: vi.fn(),
    queryInstant: vi.fn(),
  },
  kubernetes: {
    getDragonflyStatus: () => mockGetDragonflyStatus(),
    getDragonflyMetrics: () => mockGetDragonflyMetrics(),
    getDragonflyTasks: () => mockGetDragonflyTasks(),
    getDragonflyPeers: () => mockGetDragonflyPeers(),
    getKedaStatus: () => mockGetKedaStatus(),
    listKedaScaledObjects: () => mockListKedaScaledObjects(),
    listKedaScaledJobs: () => mockListKedaScaledJobs(),
    getElasticStack: (...args: unknown[]) => mockGetElasticStack(...args),
  },
}));

import { ObservabilityClient } from "@/app/(protected)/observability/_components/ObservabilityClient";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const healthData = {
  status: "ok",
  info: {},
  error: {},
  details: {
    database: { status: "up" },
    memory: { status: "up", heapUsed: 52428800 },
  },
};

const emptySummary = {
  status: "healthy",
  uptime: 0,
  version: "1.0.0",
  memory: { heapUsed: 0, heapTotal: 0, rss: 0 },
  tracing: { enabled: false, provider: "otlp" },
  dashboards: {
    grafanaUrl: "",
    prometheusUrl: "",
    tempoUrl: "",
  },
  totalRequests: 0,
  requestsByStatus: {},
  latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
  grafanaUrl: "",
  prometheusUrl: "",
  tempoUrl: "",
};

const emptyElasticStack = {
  eck: { elasticsearch: [], kibana: [], logstash: [], beats: [] },
  inCluster: { fluentBit: [], fluentd: [], logstash: [] },
  external: { reachable: false },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ObservabilityClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Core APIs that fire on initial mount
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(emptySummary);
    mockGetTraceServices.mockResolvedValue({ data: [] });
    mockGetTraces.mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0, errors: null });

    // Elastic Stack not called on mount (only when tab is active)
    mockGetElasticStack.mockResolvedValue(emptyElasticStack);

    // Dragonfly / KEDA (not called on initial health tab)
    mockGetDragonflyStatus.mockResolvedValue({ status: "healthy", version: "2.1.0", components: [] });
    mockGetDragonflyMetrics.mockResolvedValue({
      totalTasks: 0, succeededTasks: 0, failedTasks: 0, activeTasks: 0, totalPeers: 0,
    });
    mockGetDragonflyTasks.mockResolvedValue([]);
    mockGetDragonflyPeers.mockResolvedValue([]);
    mockGetKedaStatus.mockResolvedValue({ installed: true, version: "2.14.0" });
    mockListKedaScaledObjects.mockResolvedValue([]);
    mockListKedaScaledJobs.mockResolvedValue([]);
  });

  it("renders the Observability heading and the Elastic Stack tab trigger", async () => {
    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    expect(screen.getByText("Elastic Stack")).toBeInTheDocument();
  });

  it("does NOT call getElasticStack on initial render (health tab is active)", async () => {
    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    expect(mockGetElasticStack).not.toHaveBeenCalled();
  });

  it("calls getElasticStack when the Elastic Stack tab is clicked", async () => {
    const user = userEvent.setup();

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Elastic Stack"));

    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalled();
    });
  });

  it("renders without crash when getElasticStack rejects", async () => {
    const user = userEvent.setup();
    mockGetElasticStack.mockRejectedValue(new Error("Elastic Stack unavailable"));

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Elastic Stack"));

    // The component preserves the previous (null) state — it must not crash
    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalled();
    });

    expect(screen.getByText("Observability")).toBeInTheDocument();
  });

  it("renders without crash when getElasticStack resolves with data", async () => {
    const user = userEvent.setup();
    mockGetElasticStack.mockResolvedValue({
      eck: {
        elasticsearch: [
          { name: "my-es", namespace: "elastic", health: "green", version: "8.12.0", nodeCount: 3, source: "eck" },
        ],
        kibana: [],
        logstash: [],
        beats: [],
      },
      inCluster: { fluentBit: [], fluentd: [], logstash: [] },
      external: { reachable: false },
    });

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Elastic Stack"));

    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalled();
    });

    // The component should still be visible — no crash
    expect(screen.getByText("Elastic Stack")).toBeInTheDocument();
  });

  it("calls getElasticStack again when the Refresh button is clicked while on the Elastic Stack tab", async () => {
    const user = userEvent.setup();

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Elastic Stack"));

    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalledTimes(2);
    });
  });

  it("calls KEDA APIs when the KEDA tab is clicked", async () => {
    const user = userEvent.setup();

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("KEDA"));

    await waitFor(() => {
      expect(mockGetKedaStatus).toHaveBeenCalled();
      expect(mockListKedaScaledObjects).toHaveBeenCalled();
      expect(mockListKedaScaledJobs).toHaveBeenCalled();
    });
  });

  it("renders without crash when KEDA APIs reject", async () => {
    const user = userEvent.setup();
    mockGetKedaStatus.mockRejectedValue(new Error("KEDA unavailable"));
    mockListKedaScaledObjects.mockRejectedValue(new Error("unavailable"));
    mockListKedaScaledJobs.mockRejectedValue(new Error("unavailable"));

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("KEDA"));

    await waitFor(() => {
      expect(mockGetKedaStatus).toHaveBeenCalled();
    });

    expect(screen.getByText("Observability")).toBeInTheDocument();
  });

  it("calls Dragonfly APIs when the Dragonfly tab is clicked", async () => {
    const user = userEvent.setup();

    render(<ObservabilityClient />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Dragonfly"));

    await waitFor(() => {
      expect(mockGetDragonflyStatus).toHaveBeenCalled();
    });
  });
});
