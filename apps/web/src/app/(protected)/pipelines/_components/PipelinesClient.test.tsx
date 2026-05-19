import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue(true),
}));

import { PipelinesClient } from "./PipelinesClient";
import { toast } from "sonner";

// ── Wrapper ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePipeline(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "deploy-production",
    description: "Deploys to production",
    stages: [
      { id: "s1", name: "Build", type: "script", order: 0, config: {} },
      { id: "s2", name: "Test", type: "script", order: 1, config: {} },
    ],
    createdBy: "alice",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-16T12:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PipelinesClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders heading and Create Pipeline link", async () => {
    mockList.mockResolvedValue([]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Pipelines")).toBeInTheDocument();
    });
    const createLinks = screen.getAllByText("Create Pipeline");
    expect(createLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("shows pipeline names in the table", async () => {
    mockList.mockResolvedValue([
      makePipeline({ id: "p1", name: "deploy-production" }),
      makePipeline({ id: "p2", name: "build-staging" }),
    ]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });
    expect(screen.getByText("build-staging")).toBeInTheDocument();
  });

  it("shows empty state when no pipelines exist", async () => {
    mockList.mockResolvedValue([]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    });
  });

  it("shows stage count badge", async () => {
    mockList.mockResolvedValue([makePipeline()]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 stages")).toBeInTheDocument();
    });
  });

  it("shows pipeline count in the description", async () => {
    mockList.mockResolvedValue([makePipeline(), makePipeline({ id: "p2", name: "p2" })]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 pipelines configured")).toBeInTheDocument();
    });
  });

  it("calls trigger API and shows success toast via useMutation", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([makePipeline()]);
    mockTrigger.mockResolvedValue({
      id: "run-abc123",
      pipelineId: "p1",
      status: "queued",
      triggeredBy: "alice",
      createdAt: "2025-01-16T12:00:00Z",
      updatedAt: "2025-01-16T12:00:00Z",
    });

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /trigger pipeline deploy-production/i }),
    );

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith("p1");
    });
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("run-abc1"),
    );
  });

  it("shows error toast when trigger API fails", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api-client");
    mockList.mockResolvedValue([makePipeline()]);
    mockTrigger.mockRejectedValue(
      new ApiError(500, {
        message: "Internal server error",
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: "/v1/pipelines/p1/trigger",
      }),
    );

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /trigger pipeline deploy-production/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Internal server error");
    });
  });

  it("handles API list errors gracefully and shows empty state", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    });
  });

  it("shows View link for each pipeline", async () => {
    mockList.mockResolvedValue([makePipeline()]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    // The pipeline name link and the View button should both exist
    expect(screen.getAllByRole("link", { name: "deploy-production" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("shows createdBy column", async () => {
    mockList.mockResolvedValue([makePipeline({ createdBy: "bob" })]);

    render(<PipelinesClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });
  });
});
