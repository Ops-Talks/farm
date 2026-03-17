import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// -- Mock API --
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

// sonner is mocked globally in setup.ts; re-declare here for type inference
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

import { RecentPipelinesWidget } from "@/app/(protected)/dashboard/_components/recent-pipelines-widget";

function mockPipeline(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "deploy-production",
    description: "Deploys to production environment",
    stages: [],
    createdBy: "alice",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-16T12:00:00Z",
    ...overrides,
  };
}

describe("RecentPipelinesWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pipeline names after fetch", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "deploy-production" }),
      mockPipeline({ id: "p2", name: "build-staging" }),
    ]);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });
    expect(screen.getByText("build-staging")).toBeInTheDocument();
  });

  it("shows empty state message when no pipelines exist", async () => {
    mockList.mockResolvedValue([]);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("No pipelines configured")).toBeInTheDocument();
    });
  });

  it("shows empty state when the API call rejects", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("No pipelines configured")).toBeInTheDocument();
    });
  });

  it("renders a Trigger button for each pipeline", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "deploy-production" }),
      mockPipeline({ id: "p2", name: "build-staging" }),
    ]);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const triggerButtons = screen.getAllByRole("button", { name: /trigger/i });
    expect(triggerButtons).toHaveLength(2);
  });

  it("renders a View all link pointing to /pipelines", async () => {
    mockList.mockResolvedValue([mockPipeline()]);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /view all/i });
    expect(link).toHaveAttribute("href", "/pipelines");
  });

  it("calls trigger API and shows success toast on Trigger click", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([
      mockPipeline({ id: "p1", name: "deploy-production" }),
    ]);
    mockTrigger.mockResolvedValue({
      id: "run-abc123def456",
      pipelineId: "p1",
      status: "queued",
      triggeredBy: "alice",
      createdAt: "2025-01-16T12:00:00Z",
      updatedAt: "2025-01-16T12:00:00Z",
    });

    const { toast } = await import("sonner");

    render(<RecentPipelinesWidget />);

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

  it("shows error toast when trigger API call fails", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([mockPipeline({ id: "p1", name: "deploy-production" })]);
    mockTrigger.mockRejectedValue(new Error("Server error"));

    const { toast } = await import("sonner");

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const triggerBtn = screen.getByRole("button", {
      name: /trigger pipeline deploy-production/i,
    });
    await user.click(triggerBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to trigger pipeline");
    });
  });

  it("limits displayed pipelines to 5 even when more are returned", async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      mockPipeline({ id: `p${i}`, name: `pipeline-${i}` }),
    );
    mockList.mockResolvedValue(many);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("pipeline-0")).toBeInTheDocument();
    });

    // Pipelines at index 0-4 should appear
    expect(screen.getByText("pipeline-4")).toBeInTheDocument();

    // Pipelines at index 5-7 should NOT appear
    expect(screen.queryByText("pipeline-5")).not.toBeInTheDocument();
    expect(screen.queryByText("pipeline-6")).not.toBeInTheDocument();
    expect(screen.queryByText("pipeline-7")).not.toBeInTheDocument();
  });

  it("renders pipeline links pointing to /pipelines/:id", async () => {
    mockList.mockResolvedValue([
      mockPipeline({ id: "pipeline-abc", name: "deploy-production" }),
    ]);

    render(<RecentPipelinesWidget />);

    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });

    const nameLink = screen.getByRole("link", { name: "deploy-production" });
    expect(nameLink).toHaveAttribute("href", "/pipelines/pipeline-abc");
  });
});
