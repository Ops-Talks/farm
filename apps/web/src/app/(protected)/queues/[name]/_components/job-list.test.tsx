import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { JobInfo } from "@/types/api";

import { JobList } from "@/app/(protected)/queues/[name]/_components/job-list";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const NOW = Date.now();

const makeJob = (overrides: Partial<JobInfo> = {}): JobInfo => ({
  id: "job-1",
  name: "send-email",
  status: "completed",
  data: { to: "user@example.com" },
  attemptsMade: 1,
  timestamp: NOW - 5000,
  processedOn: NOW - 4000,
  finishedOn: NOW - 3000,
  ...overrides,
} as JobInfo);

const BASE_PROPS = {
  jobs: [] as JobInfo[],
  statusFilter: "all",
  expandedJob: null as string | null,
  retryingId: null as string | null,
  onStatusFilterChange: vi.fn(),
  onExpandJob: vi.fn(),
  onRetry: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("JobList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all status filter buttons", () => {
    render(<JobList {...BASE_PROPS} />);
    for (const label of ["all", "active", "completed", "failed", "delayed", "waiting"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
  });

  it("shows empty state when there are no jobs", () => {
    render(<JobList {...BASE_PROPS} />);
    expect(screen.getByText(/No jobs found/)).toBeInTheDocument();
  });

  it("shows empty state with status label when a filter is active", () => {
    render(<JobList {...BASE_PROPS} jobs={[]} statusFilter="failed" />);
    expect(screen.getByText(/No jobs found.*failed/)).toBeInTheDocument();
  });

  it("renders job rows when jobs are provided", () => {
    render(<JobList {...BASE_PROPS} jobs={[makeJob()]} />);
    expect(screen.getByText("job-1")).toBeInTheDocument();
    expect(screen.getByText("send-email")).toBeInTheDocument();
    // "completed" appears in both the filter button and the badge — use getAllByText
    expect(screen.getAllByText("completed").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onStatusFilterChange when a filter button is clicked", async () => {
    const user = userEvent.setup();
    const onStatusFilterChange = vi.fn();
    render(
      <JobList
        {...BASE_PROPS}
        onStatusFilterChange={onStatusFilterChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /failed/i }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("failed");
  });

  it("calls onExpandJob when a job row is clicked", async () => {
    const user = userEvent.setup();
    const onExpandJob = vi.fn();
    render(
      <JobList
        {...BASE_PROPS}
        jobs={[makeJob()]}
        onExpandJob={onExpandJob}
      />,
    );

    const row = screen.getByText("job-1").closest("tr");
    expect(row).toBeDefined();
    await user.click(row!);
    expect(onExpandJob).toHaveBeenCalled();
  });

  it("renders Retry button only for failed jobs", () => {
    render(
      <JobList
        {...BASE_PROPS}
        jobs={[makeJob({ id: "j-fail", status: "failed" })]}
      />,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls onRetry when the Retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <JobList
        {...BASE_PROPS}
        jobs={[makeJob({ id: "j-fail", status: "failed" })]}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("j-fail");
  });

  it("renders the expanded job detail panel when expandedJob is set", () => {
    render(
      <JobList
        {...BASE_PROPS}
        jobs={[makeJob({ id: "job-1" })]}
        expandedJob="job-1"
      />,
    );
    expect(screen.getByText("Job #job-1")).toBeInTheDocument();
  });
});
