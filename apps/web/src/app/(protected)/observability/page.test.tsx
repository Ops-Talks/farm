import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockHealthCheck = vi.fn();
const mockSummary = vi.fn();
const mockGetTraceServices = vi.fn();
const mockGetTraces = vi.fn();
const mockGetLogs = vi.fn();
const mockGetDragonflyStatus = vi.fn();
const mockGetDragonflyMetrics = vi.fn();
const mockGetDragonflyTasks = vi.fn();
const mockGetDragonflyPeers = vi.fn();

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
  },
}));

import ObservabilityPage from "@/app/(protected)/observability/page";

// ── Accessibility (axe) ────────────────────────────────────────────────────────
import { axe } from "vitest-axe";

const fullSummary = {
  status: "healthy",
  uptime: 3600,
  version: "1.0.0",
  memory: { heapUsed: 52428800, heapTotal: 104857600, rss: 157286400 },
  tracing: { enabled: true, provider: "otlp" },
  dashboards: {
    grafanaUrl: "http://localhost:3002",
    prometheusUrl: "http://localhost:9090",
    tempoUrl: "http://localhost:3200",
  },
  totalRequests: 1000,
  requestsByStatus: { "2xx": 900, "4xx": 80, "5xx": 10, other: 10 },
  latencyPercentiles: { p50: 0.010, p90: 0.050, p95: 0.100, p99: 0.250 },
  grafanaUrl: "http://localhost:3002",
  prometheusUrl: "http://localhost:9090",
  tempoUrl: "http://localhost:3200",
};

const healthData = {
  status: "ok",
  info: {},
  error: {},
  details: {
    database: { status: "up" },
    memory: { status: "up", heapUsed: 52428800 },
  },
};

describe("ObservabilityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for tabs that auto-fetch on mount
    mockGetTraceServices.mockResolvedValue({ data: [] });
    mockGetTraces.mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0, errors: null });
    mockGetDragonflyStatus.mockResolvedValue({
      status: "healthy",
      version: "2.1.0",
      components: [],
    });
    mockGetDragonflyMetrics.mockResolvedValue({
      totalTasks: 0,
      succeededTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      totalPeers: 0,
    });
    mockGetDragonflyTasks.mockResolvedValue([]);
    mockGetDragonflyPeers.mockResolvedValue([]);
  });

  it("should render heading and tabs", async () => {
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Observability")).toBeInTheDocument();
    });
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Metrics")).toBeInTheDocument();
    expect(screen.getByText("Traces")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("should show health information by default", async () => {
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Status")).toBeInTheDocument();
    });
  });

  it("should show API Unreachable when health check fails", async () => {
    mockHealthCheck.mockRejectedValue(new Error("Connection refused"));
    mockSummary.mockRejectedValue(new Error("fail"));

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("API Unreachable")).toBeInTheDocument();
    });
  });

  it("should switch to Metrics tab and show request rate card", async () => {
    const user = userEvent.setup();
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Status")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Metrics"));
    await waitFor(() => {
      expect(screen.getByText("Request Rate")).toBeInTheDocument();
    });
  });

  it("should switch to Traces tab and show service selector", async () => {
    const user = userEvent.setup();
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Status")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Traces"));
    await waitFor(() => {
      // The TracesTab renders a "Refresh" button and "Range:" controls
      expect(screen.getByText("Range:")).toBeInTheDocument();
    });
  });

  it("should switch to Logs tab and show query input", async () => {
    const user = userEvent.setup();
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Status")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Logs"));
    await waitFor(() => {
      expect(screen.getByText("Run Query")).toBeInTheDocument();
    });
  });

  it("should switch to Dragonfly tab", async () => {
    const user = userEvent.setup();
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    render(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByText("Overall Status")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Dragonfly"));
    await waitFor(() => {
      expect(screen.getByText("Dragonfly P2P CDN")).toBeInTheDocument();
    });
  });

  it("should show loading skeletons initially", () => {
    mockHealthCheck.mockReturnValue(new Promise(() => {}));
    mockSummary.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ObservabilityPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    mockHealthCheck.mockResolvedValue(healthData);
    mockSummary.mockResolvedValue(fullSummary);

    const { container } = render(<ObservabilityPage />);

    // Wait for the Health tab content to appear before scanning
    await waitFor(() =>
      expect(screen.getByText("Overall Status")).toBeInTheDocument(),
    );

    const results = await axe(container, {
      rules: {
        // jsdom cannot compute CSS colors — disable to avoid false positives
        "color-contrast": { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  }, 10000);
});
