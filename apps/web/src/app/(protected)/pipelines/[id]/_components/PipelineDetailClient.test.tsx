import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { Pipeline } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGet = vi.fn();
const mockTrigger = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pipelines/pipe-1",
  useParams: () => ({ id: "pipe-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    get: (...args: unknown[]) => mockGet(...args),
    trigger: (...args: unknown[]) => mockTrigger(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listRuns: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getRun: vi.fn().mockReturnValue(new Promise(() => {})),
    getRunStats: vi.fn().mockReturnValue(new Promise(() => {})),
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

vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: string, fn: () => unknown) => fn()),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

// Stage builder, run list, run stats, run comparison, and run detail are
// individually tested in their own suites. Mock them here to keep this suite
// focused on PipelineDetailClient orchestration logic.
vi.mock(
  "@/app/(protected)/pipelines/_components/stage-builder",
  () => ({
    StageBuilder: ({ readOnly }: { readOnly?: boolean }) => (
      <div data-testid={readOnly ? "stage-builder-readonly" : "stage-builder"} />
    ),
  }),
);

vi.mock("./run-list", () => ({
  RunList: () => <div data-testid="run-list" />,
}));

vi.mock("./run-detail", () => ({
  RunDetail: () => <div data-testid="run-detail" />,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    // Return a simple stub component for any dynamically loaded component
    return function DynamicStub() {
      return <div data-testid="dynamic-stub" />;
    };
  },
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { PipelineDetailClient } from "@/app/(protected)/pipelines/[id]/_components/PipelineDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: "pipe-1",
    name: "deploy-production",
    description: "Deploys to production",
    stages: [
      { id: "s1", name: "Build", type: "build", order: 1, config: {} },
    ],
    createdBy: "alice",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PipelineDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Loading state
  it("renders skeleton elements while the pipeline is loading", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<PipelineDetailClient />);
    // No pipeline name visible yet
    expect(screen.queryByText("deploy-production")).not.toBeInTheDocument();
  });

  // 2. Error / not found
  it("shows 'Pipeline Not Found' when the fetch rejects", async () => {
    mockGet.mockRejectedValue(new Error("404"));
    render(<PipelineDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("Pipeline Not Found")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /back to pipelines/i }),
    ).toBeInTheDocument();
  });

  // 3. Renders pipeline name
  it("renders the pipeline name as the page heading", async () => {
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("deploy-production")).toBeInTheDocument();
    });
  });

  // 4. Renders pipeline description
  it("renders the pipeline description", async () => {
    mockGet.mockResolvedValue(makePipeline({ description: "Deploys to production" }));
    render(<PipelineDetailClient />);
    await waitFor(() => {
      // Description appears in both the PageHeader and the CardDescription;
      // assert at least one instance is present.
      expect(screen.getAllByText("Deploys to production").length).toBeGreaterThanOrEqual(1);
    });
  });

  // 5. Renders Trigger Run, Edit, Delete, and Back buttons
  it("renders action buttons after the pipeline loads", async () => {
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);
    await waitFor(() => {
      // Button text is "Trigger Run"; aria-label is "Trigger pipeline run"
      expect(
        screen.getByRole("button", { name: /trigger pipeline run/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  // 6. Opens the delete confirmation dialog
  it("opens the delete confirm dialog when Delete is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/delete pipeline/i)).toBeInTheDocument();
    });
  });

  // 7. Delete navigates to /pipelines on success
  it("navigates to /pipelines after successful delete", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline({ name: "to-delete" }));
    mockRemove.mockResolvedValue(undefined);
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^delete$/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("pipe-1");
      expect(mockPush).toHaveBeenCalledWith("/pipelines");
    });
  });

  // 8. Enters edit mode when Edit is clicked
  it("shows the edit form when Edit is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Pipeline")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  // 9. Cancel edit restores read-only view
  it("exits edit mode when Cancel is clicked inside the edit form", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Pipeline")).toBeInTheDocument();
    });

    // Click the Cancel button inside the edit form
    const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Pipeline Definition")).toBeInTheDocument();
    });
  });

  // 10. Save changes delegates to pipelines.update
  it("calls pipelines.update with edited values when Save Changes is clicked", async () => {
    const user = userEvent.setup();
    const updated = makePipeline({ name: "updated-pipeline" });
    mockGet.mockResolvedValue(makePipeline());
    mockUpdate.mockResolvedValue(updated);
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "updated-pipeline");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "pipe-1",
        expect.objectContaining({ name: "updated-pipeline" }),
      );
    });
  });

  // 11. Trigger Run calls pipelines.trigger
  it("calls pipelines.trigger when Trigger Run is clicked", async () => {
    const user = userEvent.setup();
    const run = { id: "run-1234567890", pipelineId: "pipe-1" };
    mockGet.mockResolvedValue(makePipeline());
    mockTrigger.mockResolvedValue(run);
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /trigger pipeline run/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /trigger pipeline run/i }));

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith("pipe-1");
    });
  });

  // 12. Switching to Runs tab shows RunList
  it("shows RunList when the Runs tab is selected", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^runs$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^runs$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("run-list")).toBeInTheDocument();
    });
  });

  // 13. Back button navigates to /pipelines
  it("navigates to /pipelines when the Back button is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(mockPush).toHaveBeenCalledWith("/pipelines");
  });

  // 14. Renders "Pipeline Definition" card heading in the Definition tab
  it("renders 'Pipeline Definition' card heading in the default Definition tab", async () => {
    mockGet.mockResolvedValue(makePipeline());
    render(<PipelineDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("Pipeline Definition")).toBeInTheDocument();
    });
  });

  // 15. Renders createdBy metadata
  it("renders the createdBy metadata in the definition view", async () => {
    mockGet.mockResolvedValue(makePipeline({ createdBy: "bob" }));
    render(<PipelineDetailClient />);
    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });
  });
});
