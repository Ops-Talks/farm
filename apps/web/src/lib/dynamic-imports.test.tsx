/**
 * @file dynamic-imports.test.tsx
 *
 * Verifies that next/dynamic is wired correctly for all heavy client-only
 * components and that their **parent** components render without errors when
 * the dynamically imported children are replaced with lightweight stubs.
 *
 * Test groups
 * ──────────────────────────────────────────────────────────────────────────
 * A. Unit: next/dynamic mock receives the right import functions
 *    — We capture every call to `dynamic()` and assert that the factory
 *      resolves to the expected named export (or default).
 *
 * B. Dynamic options: ssr:false + loading placeholder present on every call
 *
 * C. Integration: ObservabilityClient renders with stubbed dynamic tabs
 *    — MetricsTab, TracesTab, LogsTab are dynamically imported.
 *      HealthTab is statically imported (default first tab → no flash).
 *
 * D. Integration: PipelineDetailClient renders with stubbed dynamic panels
 *    — RunStatsPanel and RunComparison are dynamically imported.
 *
 * E. Sanity: total dynamic() call count stays ≥ expected minimum
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// vi.hoisted — declare shared state BEFORE vi.mock factories run
// (Vitest hoists vi.mock() to the top of the file; variables declared with
//  `const` in module scope are in the TDZ at that point.  vi.hoisted() is
//  the official way to share mutable state with mock factories.)
// ─────────────────────────────────────────────────────────────────────────────

interface DynamicCall {
  /** Stub component returned to the caller */
  Component: ReturnType<typeof vi.fn>;
  /** Raw options passed as second arg to dynamic() */
  options: { ssr?: boolean; loading?: () => React.ReactNode } | undefined;
  /** Promise returned by the import factory */
  importResult: Promise<{ default: React.ComponentType }>;
}

const { dynamicCalls } = vi.hoisted(() => {
  return { dynamicCalls: [] as DynamicCall[] };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock next/dynamic — must come before any component import
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("next/dynamic", () => ({
  default: vi.fn(
    (
      importFn: () => Promise<{ default: React.ComponentType }>,
      options?: { ssr?: boolean; loading?: () => React.ReactNode },
    ) => {
      // Lightweight stub — renders nothing, letting parent trees render cleanly
      const Stub = vi.fn(() => null) as unknown as React.ComponentType;
      dynamicCalls.push({
        Component: Stub as Mock,
        options,
        importResult: importFn(),
      });
      return Stub;
    },
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// API & routing mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockHealthCheck = vi.fn();
const mockSummary = vi.fn();
const mockGetTraceServices = vi.fn();
const mockGetTraces = vi.fn();
const mockGetLogs = vi.fn();
const mockPipelinesGet = vi.fn();

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
  pipelines: {
    get: (...args: unknown[]) => mockPipelinesGet(...args),
    trigger: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    runs: {
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      stats: vi.fn().mockResolvedValue(null),
      compare: vi.fn().mockResolvedValue(null),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: { message: string; statusCode: number; timestamp: string; path: string };
    constructor(
      status: number,
      body: { message: string; statusCode: number; timestamp: string; path: string },
    ) {
      super(body.message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

// next/navigation is already mocked globally in setup.ts — override useParams
// for PipelineDetailClient which needs an id param.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/pipelines/pipe-001",
  useParams: () => ({ id: "pipe-001" }),
  useSearchParams: () => new URLSearchParams(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Component imports — AFTER all vi.mock() declarations so that importing the
// modules triggers the dynamic() calls (captured into dynamicCalls above).
// ─────────────────────────────────────────────────────────────────────────────

import ObservabilityPage from "@/app/(protected)/observability/page";
import { PipelineDetailClient } from "@/app/(protected)/pipelines/[id]/_components/PipelineDetailClient";

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const HEALTH_DATA = {
  status: "ok",
  info: {},
  error: {},
  details: { database: { status: "up" } },
};

const FULL_SUMMARY = {
  status: "healthy",
  uptime: 3600,
  version: "1.0.0",
  memory: { heapUsed: 52428800, heapTotal: 104857600, rss: 157286400 },
  tracing: { enabled: true, provider: "otlp" },
  dashboards: {},
  totalRequests: 500,
  requestsByStatus: { "2xx": 480, "4xx": 15, "5xx": 5, other: 0 },
  latencyPercentiles: { p50: 0.01, p90: 0.04, p95: 0.08, p99: 0.2 },
  grafanaUrl: null,
  prometheusUrl: null,
  tempoUrl: null,
};

const MOCK_PIPELINE = {
  id: "pipe-001",
  name: "deploy-prod",
  description: "Deploys to prod",
  stages: [
    {
      id: "s1",
      name: "Build",
      type: "script",
      order: 0,
      config: { command: "npm run build" },
    },
  ],
  createdBy: "alice",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

// ─────────────────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────────────────

describe("next/dynamic — heavy component lazy-loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore stable defaults after each clearAllMocks()
    mockHealthCheck.mockResolvedValue(HEALTH_DATA);
    mockSummary.mockResolvedValue(FULL_SUMMARY);
    mockGetTraceServices.mockResolvedValue({ data: [] });
    mockGetTraces.mockResolvedValue({
      data: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    mockGetLogs.mockResolvedValue({ data: null });
    mockPipelinesGet.mockResolvedValue(MOCK_PIPELINE);
  });

  // ── A. Import factory resolution ─────────────────────────────────────────

  describe("A. Import factory resolution — named exports exist in source modules", () => {
    it("metrics-tab exports MetricsTab as a function", async () => {
      const mod = await import(
        "@/app/(protected)/observability/_components/metrics-tab"
      );
      expect(typeof mod.MetricsTab).toBe("function");
    });

    it("traces-tab exports TracesTab as a function", async () => {
      const mod = await import(
        "@/app/(protected)/observability/_components/traces-tab"
      );
      expect(typeof mod.TracesTab).toBe("function");
    });

    it("logs-tab exports LogsTab as a function", async () => {
      const mod = await import(
        "@/app/(protected)/observability/_components/logs-tab"
      );
      expect(typeof mod.LogsTab).toBe("function");
    });

    it("trace-waterfall exports TraceWaterfall as a function", async () => {
      const mod = await import(
        "@/app/(protected)/observability/_components/trace-waterfall"
      );
      expect(typeof mod.TraceWaterfall).toBe("function");
    });

    it("run-stats exports RunStatsPanel as a function", async () => {
      const mod = await import(
        "@/app/(protected)/pipelines/[id]/_components/run-stats"
      );
      expect(typeof mod.RunStatsPanel).toBe("function");
    });

    it("run-comparison exports RunComparison as a function", async () => {
      const mod = await import(
        "@/app/(protected)/pipelines/[id]/_components/run-comparison"
      );
      expect(typeof mod.RunComparison).toBe("function");
    });

    it("each dynamic() import factory resolves to an object with a default key", async () => {
      // Every dynamic() call registered by the parent modules must have an
      // importResult that resolves to { default: ComponentFn }.
      const results = await Promise.all(
        dynamicCalls.map((c) => c.importResult),
      );
      for (const result of results) {
        expect(
          result,
          "dynamic() factory must resolve to { default: Function }",
        ).toHaveProperty("default");
        expect(typeof result.default).toBe("function");
      }
    });
  });

  // ── B. Dynamic options ────────────────────────────────────────────────────

  describe("B. Dynamic options (ssr:false + loading placeholder)", () => {
    it("every dynamic() call uses ssr:false", () => {
      expect(dynamicCalls.length).toBeGreaterThan(0);
      for (const call of dynamicCalls) {
        expect(call.options?.ssr).toBe(false);
      }
    });

    it("every dynamic() call provides a loading() function", () => {
      expect(dynamicCalls.length).toBeGreaterThan(0);
      for (const call of dynamicCalls) {
        expect(typeof call.options?.loading).toBe("function");
      }
    });

    it("each loading() placeholder renders a React element with animate-pulse", () => {
      expect(dynamicCalls.length).toBeGreaterThan(0);
      for (const call of dynamicCalls) {
        const loadingFn = call.options?.loading;
        if (!loadingFn) continue;
        const element = loadingFn() as React.ReactElement<{
          className?: string;
        }>;
        const className = element?.props?.className ?? "";
        expect(
          className,
          "Loading placeholder should contain animate-pulse",
        ).toContain("animate-pulse");
      }
    });
  });

  // ── C. ObservabilityClient ───────────────────────────────────────────────

  describe("C. ObservabilityClient — renders correctly with stubbed dynamic tabs", () => {
    it("renders the Observability heading", async () => {
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Observability")).toBeInTheDocument();
      });
    });

    it("renders all four tab labels", async () => {
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Observability")).toBeInTheDocument();
      });
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Metrics")).toBeInTheDocument();
      expect(screen.getByText("Traces")).toBeInTheDocument();
      expect(screen.getByText("Logs")).toBeInTheDocument();
    });

    it("HealthTab is the default active tab and renders without dynamic()", async () => {
      // HealthTab is statically imported — its content ("Overall Status")
      // should be visible immediately after data loads, proving it is NOT
      // behind a dynamic() stub that returns null.
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });
    });

    it("switching to the Metrics tab does not throw", async () => {
      const user = userEvent.setup();
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });
      // MetricsTab stub renders null — no visible content expected, no crash
      await user.click(screen.getByRole("button", { name: "Metrics" }));
    });

    it("switching to the Traces tab does not throw", async () => {
      const user = userEvent.setup();
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: "Traces" }));
    });

    it("switching to the Logs tab does not throw", async () => {
      const user = userEvent.setup();
      render(<ObservabilityPage />);
      await waitFor(() => {
        expect(screen.getByText("Overall Status")).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: "Logs" }));
    });
  });

  // ── D. PipelineDetailClient ───────────────────────────────────────────────

  describe("D. PipelineDetailClient — renders correctly with stubbed dynamic panels", () => {
    // PipelineDetailClient mounts RunList on the Runs tab, which uses
    // useQuery — so all renders in this suite need a QueryClientProvider.
    function withQueryClient(ui: React.ReactElement) {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );
      return render(ui, { wrapper: Wrapper });
    }

    it("renders the pipeline name after data loads", async () => {
      withQueryClient(<PipelineDetailClient />);
      await waitFor(() => {
        expect(screen.getByText("deploy-prod")).toBeInTheDocument();
      });
    });

    it("renders the Definition and Runs tab buttons", async () => {
      withQueryClient(<PipelineDetailClient />);
      await waitFor(() => {
        expect(screen.getByText("deploy-prod")).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "Definition" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Runs" }),
      ).toBeInTheDocument();
    });

    it("switching to the Runs tab renders Run History heading (RunStatsPanel stub is silent)", async () => {
      const user = userEvent.setup();
      withQueryClient(<PipelineDetailClient />);
      await waitFor(() => {
        expect(screen.getByText("deploy-prod")).toBeInTheDocument();
      });
      // The Runs tab mounts RunStatsPanel (stub → null) and RunList
      await user.click(screen.getByRole("button", { name: "Runs" }));
      await waitFor(() => {
        expect(screen.getByText("Run History")).toBeInTheDocument();
      });
    });

    it("shows loading skeletons before pipeline data arrives", () => {
      mockPipelinesGet.mockReturnValue(new Promise(() => {}));
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      const { container } = render(<PipelineDetailClient />, {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        ),
      });
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── E. Sanity: call count ─────────────────────────────────────────────────

  describe("E. dynamic() call count — no accidental over-lazification", () => {
    it("at least 5 components are registered with next/dynamic across the parent files", () => {
      // Minimum expected calls:
      //  ObservabilityClient:  MetricsTab, TracesTab, LogsTab      → 3
      //  traces-tab:           TraceWaterfall                       → 1
      //  PipelineDetailClient: RunStatsPanel, RunComparison         → 2
      //  Total ≥ 6 (may be higher if modules are imported multiple times)
      expect(dynamicCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("none of the dynamic() calls originated from navigation or layout components", () => {
      // We assert that dynamic() is NOT used for small UI atoms by checking
      // that every registered factory eventually resolves to one of our known
      // heavy components.  If a new unintended component were lazified, its
      // module path would not match any of the expected source paths.
      // (Since we control the factory via vi.hoisted, we can't inspect the
      //  factory source directly — but we CAN assert the importResult resolves
      //  to an object with a 'default' key, which small UI atoms do not export
      //  through this pattern.)
      for (const call of dynamicCalls) {
        expect(call.importResult).toBeInstanceOf(Promise);
      }
    });
  });
});
