import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// --- Wrapper: fresh QueryClient per test so cache never leaks between tests ---
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

// --- Mock API ---
const mockList = vi.fn();
const mockTrigger = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    list: (...args: unknown[]) => mockList(...args),
    trigger: (...args: unknown[]) => mockTrigger(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public body: { message: string; statusCode: number; timestamp: string; path: string },
    ) {
      super(body.message);
    }
  },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

// Mock sonner toast (already set up in setup.ts, but also here for completeness)
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue(true),
}));

import PipelinesPage from "@/app/(protected)/pipelines/page";

// ── Accessibility (axe) ────────────────────────────────────────────────────────
import { axe } from "vitest-axe";

function mockPipeline(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "deploy-production",
    description: "Deploys to production environment",
    stages: [
      { id: "s1", name: "Build", type: "script", order: 0, config: { command: "npm run build" } },
      { id: "s2", name: "Test", type: "script", order: 1, config: { command: "npm test" } },
    ],
    createdBy: "alice",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-16T12:00:00Z",
    ...overrides,
  };
}

describe("PipelinesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render heading and Create Pipeline button", async () => {
    mockList.mockResolvedValue([]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Pipelines")).toBeInTheDocument();
    });
    // "Create Pipeline" appears in the header and in the empty state CTA
    const createButtons = screen.getAllByText("Create Pipeline");
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("should display pipeline names in the table", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "deploy-production" }),
      mockPipeline({ id: "p2", name: "build-staging", description: "Staging build" }),
    ]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });
    expect(screen.getByText("build-staging")).toBeInTheDocument();
  });

  it("should show Trigger buttons for each pipeline", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "deploy-production" }),
      mockPipeline({ id: "p2", name: "build-staging" }),
    ]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const triggerButtons = screen.getAllByRole("button", { name: /trigger/i });
    expect(triggerButtons).toHaveLength(2);
  });

  it("should show stage count badge", async () => {
    mockList.mockResolvedValue([mockPipeline()]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    expect(screen.getByText("2 stages")).toBeInTheDocument();
  });

  it("should show empty state when no pipelines exist", async () => {
    mockList.mockResolvedValue([]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    });
  });

  it("should show pipeline count", async () => {
    mockList.mockResolvedValue([mockPipeline()]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1 pipeline configured")).toBeInTheDocument();
    });
  });

  it("should show plural count for multiple pipelines", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "pipeline-one" }),
      mockPipeline({ id: "p2", name: "pipeline-two" }),
    ]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 pipelines configured")).toBeInTheDocument();
    });
  });

  it("should call trigger API and show toast on Trigger click", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([mockPipeline()]);
    mockTrigger.mockResolvedValue({
      id: "run-abc123",
      pipelineId: "p1",
      status: "queued",
      triggeredBy: "alice",
      createdAt: "2025-01-16T12:00:00Z",
      updatedAt: "2025-01-16T12:00:00Z",
    });

    const { toast } = await import("sonner");

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const triggerBtn = screen.getByRole("button", {
      name: /trigger pipeline deploy-production/i,
    });
    await user.click(triggerBtn);

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith("p1");
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("run-abc1"),
    );
  });

  it("should show View links for each pipeline", async () => {
    mockList.mockResolvedValue([mockPipeline()]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("link", { name: "deploy-production" })).toHaveLength(1);
  });

  it("should show createdBy column", async () => {
    mockList.mockResolvedValue([mockPipeline({ createdBy: "bob" })]);

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    render(<PipelinesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    mockList.mockResolvedValue([mockPipeline()]);

    const { container } = render(<PipelinesPage />, { wrapper: createWrapper() });

    // Wait for pipeline rows to render before scanning
    await waitFor(() =>
      expect(screen.getByText("deploy-production")).toBeInTheDocument(),
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
