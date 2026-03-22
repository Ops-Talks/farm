/**
 * Tests for RunDetail — pipeline run detail component
 *
 * Covers:
 *  1.  Renders a loading skeleton while the run is being fetched
 *  2.  Renders run details (status badge + run id) after data loads
 *  3.  Shows an approval banner for waiting_approval runs
 *  4.  Calls approveRun when the Approve button is clicked
 *  5.  Calls rejectRun when the Reject button is clicked
 *  6.  Shows a Cancel button for running runs
 *  7.  Calls cancelRun when Cancel is clicked
 *  8.  Shows a Retrigger button for failed runs
 *  9.  Renders the logs section when logs are present
 *  10. Shows "Run not found" when the fetch rejects
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PipelineRunStatus } from "@/types/api";
import type { Pipeline, PipelineRun } from "@/types/api";

// ---------------------------------------------------------------------------
// Mock: @/lib/api-client
// ---------------------------------------------------------------------------
const mockGetRun = vi.fn();
const mockApproveRun = vi.fn();
const mockRejectRun = vi.fn();
const mockCancelRun = vi.fn();
const mockRetrigger = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    getRun: (...args: unknown[]) => mockGetRun(...args),
    approveRun: (...args: unknown[]) => mockApproveRun(...args),
    rejectRun: (...args: unknown[]) => mockRejectRun(...args),
    cancelRun: (...args: unknown[]) => mockCancelRun(...args),
    retrigger: (...args: unknown[]) => mockRetrigger(...args),
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

// ---------------------------------------------------------------------------
// Mock: @/lib/ws-client — returns a no-op unsubscribe function
// ---------------------------------------------------------------------------
vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

// ---------------------------------------------------------------------------
// Mock: sonner (also mocked globally in setup.ts)
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// Component import must come after vi.mock declarations.
import { RunDetail } from "@/app/(protected)/pipelines/[id]/_components/run-detail";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PIPELINE_ID = "pipeline-001";
const RUN_ID = "run-abc12345-0000-0000-0000-000000000000";

const mockPipeline: Pipeline = {
  id: PIPELINE_ID,
  name: "deploy-production",
  stages: [
    {
      id: "stage-approval-001",
      name: "Manual Approval",
      type: "approval",
      order: 1,
      config: {},
    },
  ],
  createdBy: "alice",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

function makeRun(
  overrides: Partial<PipelineRun> = {},
): PipelineRun {
  return {
    id: RUN_ID,
    pipelineId: PIPELINE_ID,
    status: PipelineRunStatus.SUCCEEDED,
    triggeredBy: "alice",
    startedAt: "2025-01-01T10:00:00Z",
    finishedAt: "2025-01-01T10:05:00Z",
    durationMs: 300000,
    logs: "",
    stageResults: [],
    createdAt: "2025-01-01T10:00:00Z",
    updatedAt: "2025-01-01T10:05:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("RunDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement scrollIntoView — mock it to prevent crashes
    // caused by the auto-scroll useEffect in the component.
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  // -------------------------------------------------------------------------
  // 1. Loading skeleton
  // -------------------------------------------------------------------------
  it("renders a loading skeleton while the run is being fetched", () => {
    // Hang forever so we stay in the loading state.
    mockGetRun.mockReturnValue(new Promise(() => {}));

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    // Skeleton elements are rendered via className; the component renders
    // three <Skeleton> elements. We verify the loading state by checking that
    // run content (status badge) is NOT yet present, and by verifying
    // the skeleton container exists.
    expect(screen.queryByRole("region", { name: /approval required/i })).not.toBeInTheDocument();
    // The loading branch renders three <Skeleton> elements (data-slot="skeleton").
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 2. Renders run details after loading
  // -------------------------------------------------------------------------
  it("renders run details (status badge and short run id) after data loads", async () => {
    const run = makeRun({ status: PipelineRunStatus.SUCCEEDED });
    mockGetRun.mockResolvedValue(run);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      // Short run id — first 8 chars of RUN_ID
      expect(screen.getByText("run-abc1")).toBeInTheDocument();
    });

    // Status badge shows the status string
    expect(screen.getByText("succeeded")).toBeInTheDocument();
    expect(mockGetRun).toHaveBeenCalledWith(PIPELINE_ID, RUN_ID);
  });

  // -------------------------------------------------------------------------
  // 3. Approval banner for waiting_approval
  // -------------------------------------------------------------------------
  it("shows the approval banner for a waiting_approval run", async () => {
    const run = makeRun({
      status: PipelineRunStatus.WAITING_APPROVAL,
      stageResults: [
        {
          stageId: "stage-approval-001",
          status: PipelineRunStatus.WAITING_APPROVAL,
        },
      ],
    });
    mockGetRun.mockResolvedValue(run);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /approval required/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/waiting for manual approval/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /approve and continue run/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reject run/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. Approve button calls approveRun
  // -------------------------------------------------------------------------
  it("calls approveRun when the Approve button is clicked", async () => {
    const user = userEvent.setup();
    const run = makeRun({ status: PipelineRunStatus.WAITING_APPROVAL });
    const approvedRun = makeRun({ status: PipelineRunStatus.RUNNING });
    mockGetRun.mockResolvedValue(run);
    mockApproveRun.mockResolvedValue(approvedRun);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /approve and continue run/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /approve and continue run/i }));

    await waitFor(() => {
      expect(mockApproveRun).toHaveBeenCalledWith(PIPELINE_ID, RUN_ID);
    });

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("approved"),
    );
  });

  // -------------------------------------------------------------------------
  // 5. Reject button calls rejectRun
  // -------------------------------------------------------------------------
  it("calls rejectRun when the Reject button is clicked", async () => {
    const user = userEvent.setup();
    const run = makeRun({ status: PipelineRunStatus.WAITING_APPROVAL });
    const rejectedRun = makeRun({ status: PipelineRunStatus.FAILED });
    mockGetRun.mockResolvedValue(run);
    mockRejectRun.mockResolvedValue(rejectedRun);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /reject run/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /reject run/i }));

    await waitFor(() => {
      expect(mockRejectRun).toHaveBeenCalledWith(PIPELINE_ID, RUN_ID);
    });

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("rejected"),
    );
  });

  // -------------------------------------------------------------------------
  // 6. Cancel button visible for running runs
  // -------------------------------------------------------------------------
  it("shows the Cancel button for a running run", async () => {
    const run = makeRun({ status: PipelineRunStatus.RUNNING });
    mockGetRun.mockResolvedValue(run);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel run/i }),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Cancel button calls cancelRun
  // -------------------------------------------------------------------------
  it("calls cancelRun when the Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const run = makeRun({ status: PipelineRunStatus.RUNNING });
    const cancelledRun = makeRun({ status: PipelineRunStatus.CANCELLED });
    mockGetRun.mockResolvedValue(run);
    mockCancelRun.mockResolvedValue(cancelledRun);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel run/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /cancel run/i }));

    await waitFor(() => {
      expect(mockCancelRun).toHaveBeenCalledWith(PIPELINE_ID, RUN_ID);
    });

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("cancelled"),
    );
  });

  // -------------------------------------------------------------------------
  // 8. Retrigger button visible for failed runs
  // -------------------------------------------------------------------------
  it("shows the Retrigger button for a failed run", async () => {
    const run = makeRun({ status: PipelineRunStatus.FAILED });
    mockGetRun.mockResolvedValue(run);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retrigger pipeline/i }),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Logs section renders with log content
  // -------------------------------------------------------------------------
  it("renders the logs section and displays log lines when logs are present", async () => {
    const run = makeRun({
      status: PipelineRunStatus.SUCCEEDED,
      logs: "Step 1: Building\nStep 2: Testing\nStep 3: Done",
    });
    mockGetRun.mockResolvedValue(run);

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    // Wait until the component finishes loading (run id becomes visible).
    await waitFor(() => {
      expect(screen.getByText("run-abc1")).toBeInTheDocument();
    });

    // The <pre> element has aria-label="Pipeline run logs" — query via
    // document.querySelector to avoid the label-association semantics of
    // getByLabelText (which requires an explicit <label> element in jsdom).
    const logsEl = document.querySelector('pre[aria-label="Pipeline run logs"]');
    expect(logsEl).not.toBeNull();
    expect(logsEl?.textContent).toContain("Step 1: Building");
    expect(logsEl?.textContent).toContain("Step 2: Testing");
    expect(logsEl?.textContent).toContain("Step 3: Done");
  });

  // -------------------------------------------------------------------------
  // 10. Error state when fetch rejects
  // -------------------------------------------------------------------------
  it("shows 'Run not found' when the fetch rejects", async () => {
    mockGetRun.mockRejectedValue(new Error("Not found"));

    render(
      <RunDetail pipelineId={PIPELINE_ID} runId={RUN_ID} pipeline={mockPipeline} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/run not found/i)).toBeInTheDocument();
    });
  });
});
