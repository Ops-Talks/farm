import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { JobInfo } from "@/types/api";

import { JobDetailPanel } from "@/app/(protected)/queues/[name]/_components/job-detail-panel";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the job id in the card title", () => {
    render(
      <JobDetailPanel job={makeJob()} onRetry={vi.fn()} retrying={false} />,
    );
    expect(screen.getByText("Job #job-1")).toBeInTheDocument();
  });

  it("renders the job status badge", () => {
    render(
      <JobDetailPanel job={makeJob()} onRetry={vi.fn()} retrying={false} />,
    );
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders the job payload as JSON", () => {
    render(
      <JobDetailPanel job={makeJob()} onRetry={vi.fn()} retrying={false} />,
    );
    expect(screen.getByText(/"to": "user@example.com"/)).toBeInTheDocument();
  });

  it("shows Retry button for failed jobs", () => {
    render(
      <JobDetailPanel
        job={makeJob({ status: "failed" })}
        onRetry={vi.fn()}
        retrying={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("does not show Retry button for non-failed jobs", () => {
    render(
      <JobDetailPanel job={makeJob({ status: "completed" })} onRetry={vi.fn()} retrying={false} />,
    );
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("calls onRetry when Retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <JobDetailPanel
        job={makeJob({ status: "failed" })}
        onRetry={onRetry}
        retrying={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("job-1");
  });

  it("shows 'Retrying...' and disables the button while retrying", () => {
    render(
      <JobDetailPanel
        job={makeJob({ status: "failed" })}
        onRetry={vi.fn()}
        retrying={true}
      />,
    );
    const retryBtn = screen.getByRole("button", { name: "Retrying..." });
    expect(retryBtn).toBeDisabled();
  });

  it("renders the failedReason when present", () => {
    render(
      <JobDetailPanel
        job={makeJob({ status: "failed", failedReason: "Connection timeout" })}
        onRetry={vi.fn()}
        retrying={false}
      />,
    );
    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
  });

  it("renders returnValue when present", () => {
    render(
      <JobDetailPanel
        job={makeJob({ returnValue: { success: true } })}
        onRetry={vi.fn()}
        retrying={false}
      />,
    );
    expect(screen.getByText(/"success": true/)).toBeInTheDocument();
  });
});
