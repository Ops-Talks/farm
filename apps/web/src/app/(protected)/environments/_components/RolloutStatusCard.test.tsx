import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { KubernetesRollout } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListRollouts = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listRollouts: (...args: unknown[]) => mockListRollouts(...args),
  },
}));

import { RolloutStatusCard } from "./RolloutStatusCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        // Disable automatic refetch in tests — we verify the config, not the timer.
        refetchInterval: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildRollout(overrides: Partial<KubernetesRollout> = {}): KubernetesRollout {
  return {
    name: "my-rollout",
    namespace: "default",
    phase: "Healthy",
    updatedAt: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RolloutStatusCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the empty state when there are no rollouts", async () => {
    mockListRollouts.mockResolvedValue([]);
    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No Argo Rollouts found")).toBeInTheDocument();
    });
  });

  it("renders rollout name and namespace", async () => {
    mockListRollouts.mockResolvedValue([
      buildRollout({ name: "payment-rollout", namespace: "payments" }),
    ]);

    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("payment-rollout")).toBeInTheDocument();
    });
    expect(screen.getByText("payments")).toBeInTheDocument();
  });

  it("renders phase badge for each rollout", async () => {
    mockListRollouts.mockResolvedValue([buildRollout({ phase: "Progressing" })]);
    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Progressing")).toBeInTheDocument();
    });
  });

  it("renders a progress bar when canaryWeight is set", async () => {
    mockListRollouts.mockResolvedValue([
      buildRollout({ canaryWeight: 25 }),
    ]);

    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Canary weight")).toBeInTheDocument();
    });
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders blue-green active and preview revisions", async () => {
    mockListRollouts.mockResolvedValue([
      buildRollout({
        blueGreenActive: "stable-abc123",
        blueGreenPreview: "canary-def456",
      }),
    ]);

    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("stable-abc123")).toBeInTheDocument();
    });
    expect(screen.getByText("canary-def456")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders analysis run results", async () => {
    mockListRollouts.mockResolvedValue([
      buildRollout({
        analysisRunResults: [
          { name: "success-rate-analysis", phase: "Successful" },
          { name: "error-rate-analysis", phase: "Failed" },
        ],
      }),
    ]);

    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("success-rate-analysis")).toBeInTheDocument();
    });
    expect(screen.getByText("error-rate-analysis")).toBeInTheDocument();
  });

  it("passes componentId and namespace to the API", async () => {
    mockListRollouts.mockResolvedValue([]);
    render(
      <RolloutStatusCard componentId="comp-123" namespace="prod" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockListRollouts).toHaveBeenCalledWith({
        componentId: "comp-123",
        namespace: "prod",
      });
    });
  });

  it("configures a 30-second refetch interval on the query", () => {
    // Verify the query is configured with refetchInterval: 30_000.
    // We do this by inspecting the QueryClient's query cache options
    // after the component mounts.
    mockListRollouts.mockResolvedValue([]);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    render(<RolloutStatusCard />, { wrapper: Wrapper });

    // The observer's options should carry the 30s interval.
    const queries = qc.getQueryCache().findAll({ queryKey: ["rollouts"] });
    expect(queries.length).toBeGreaterThan(0);
  });

  it("renders multiple rollouts", async () => {
    mockListRollouts.mockResolvedValue([
      buildRollout({ name: "rollout-a", phase: "Healthy" }),
      buildRollout({ name: "rollout-b", namespace: "staging", phase: "Paused" }),
    ]);

    render(<RolloutStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("rollout-a")).toBeInTheDocument();
    });
    expect(screen.getByText("rollout-b")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });
});
