import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock fns (declared before vi.mock calls)
// ---------------------------------------------------------------------------

const mockGetStackRuns = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iac: {
    getStackRuns: (...args: unknown[]) => mockGetStackRuns(...args),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "stack-uuid-1" }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/iac/stacks/stack-uuid-1/runs",
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacStackRunsClient } from "./IacStackRunsClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockRuns = [
  {
    id: "run-uuid-1",
    stackId: "stack-uuid-1",
    type: "apply" as const,
    status: "succeeded" as const,
    triggeredBy: "github-actions",
    pipelineUrl: "https://github.com/org/repo/actions/runs/123",
    durationMs: 65000,
    resourceChanges: { add: 2, change: 1, destroy: 0 },
    startedAt: "2024-01-01T10:00:00Z",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:01:05Z",
  },
  {
    id: "run-uuid-2",
    stackId: "stack-uuid-1",
    type: "plan" as const,
    status: "failed" as const,
    triggeredBy: null,
    pipelineUrl: null,
    durationMs: null,
    resourceChanges: null,
    startedAt: null,
    createdAt: "2024-01-02T08:00:00Z",
    updatedAt: "2024-01-02T08:00:30Z",
  },
];

const defaultResponse = { data: mockRuns, total: 2, page: 1, pageSize: 20 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacStackRunsClient", () => {
  beforeEach(() => {
    mockGetStackRuns.mockResolvedValue(defaultResponse);
  });

  afterEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it("shows loading skeletons while fetching runs", () => {
    // Keep the promise pending so the component stays in the loading state.
    mockGetStackRuns.mockReturnValue(new Promise(() => {}));
    render(<IacStackRunsClient />);

    // Run card content should not yet be present while loading.
    expect(screen.queryByText("apply")).toBeNull();
    expect(screen.queryByText("plan")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Successful load
  // -------------------------------------------------------------------------

  it("shows run cards after loading", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("apply")).toBeDefined();
      expect(screen.getByText("plan")).toBeDefined();
    });
  });

  it("shows run duration for runs that have durationMs", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // 65000 ms -> 1m 5s
      expect(screen.getByText("1m 5s")).toBeDefined();
    });
  });

  it("shows em dash duration for runs with null durationMs", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // run-uuid-2 has null durationMs -> em dash character
      expect(screen.getByText("\u2014")).toBeDefined();
    });
  });

  it("shows triggeredBy for runs that have it", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("by github-actions")).toBeDefined();
    });
  });

  it("renders fine when triggeredBy is null", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // run-uuid-2 has triggeredBy: null — component should not crash
      expect(screen.getByText("plan")).toBeDefined();
    });
  });

  it("shows the pipeline link for runs that have pipelineUrl", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("pipeline")).toBeDefined();
    });
  });

  it("renders fine when pipelineUrl is null", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // run-uuid-2 has pipelineUrl: null — no pipeline link for that run
      expect(screen.getByText("plan")).toBeDefined();
    });
  });

  it("renders fine when startedAt is null", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // run-uuid-2 has startedAt: null — no date shown, no crash
      expect(screen.getByText("plan")).toBeDefined();
    });
  });

  it("shows resource chips for runs that have resourceChanges", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      // run-uuid-1: add:2 change:1 destroy:0
      expect(screen.getByText("+2")).toBeDefined();
      expect(screen.getByText("~1")).toBeDefined();
    });
  });

  it("does not show destroy chip when destroy count is zero", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("+2")).toBeDefined();
    });

    // destroy is 0 for run-uuid-1, so "-0" should not appear
    expect(screen.queryByText("-0")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Resource chips: destroy branch
  // -------------------------------------------------------------------------

  it("shows destroy chip when destroy count is greater than zero", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-destroy",
          stackId: "stack-uuid-1",
          type: "apply" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: 500,
          resourceChanges: { add: 0, change: 0, destroy: 3 },
          startedAt: "2024-01-04T00:00:00Z",
          createdAt: "2024-01-04T00:00:00Z",
          updatedAt: "2024-01-04T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("-3")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Status icons
  // -------------------------------------------------------------------------

  it("shows succeeded status icon via aria-label", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByLabelText("Succeeded")).toBeDefined();
    });
  });

  it("shows failed status icon via aria-label", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByLabelText("Failed")).toBeDefined();
    });
  });

  it("shows cancelled status icon for runs with a non-succeeded/failed status", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-uuid-3",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "cancelled" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: 0,
          resourceChanges: null,
          startedAt: null,
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-03T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByLabelText("Cancelled")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it("shows error state when the request fails", async () => {
    mockGetStackRuns.mockRejectedValue(new Error("network error"));
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it("shows empty state when no runs are returned", async () => {
    mockGetStackRuns.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("No runs found")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Page header
  // -------------------------------------------------------------------------

  it("renders the page header with stack run history title", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("Stack Run History")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  it("does not render pagination when total is less than or equal to PAGE_SIZE", async () => {
    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("apply")).toBeDefined();
    });

    // total is 2 which is <= 20, so pagination should not be shown
    expect(screen.queryByRole("button", { name: /prev/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("shows pagination controls when total exceeds PAGE_SIZE", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: mockRuns,
      total: 25,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeDefined();
    });

    expect(screen.getByRole("button", { name: /prev/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
  });

  it("disables the Prev button on page 1", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: mockRuns,
      total: 25,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /prev/i })).toBeDefined();
    });

    const prevButton = screen.getByRole("button", { name: /prev/i });
    expect(prevButton.hasAttribute("disabled")).toBe(true);
  });

  it("navigates to the next page when clicking Next", async () => {
    const user = userEvent.setup();

    mockGetStackRuns.mockResolvedValue({
      data: mockRuns,
      total: 25,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: /next/i }));

    // After clicking Next, getStackRuns should be called again with page 2
    await waitFor(() => {
      expect(mockGetStackRuns).toHaveBeenCalledWith("stack-uuid-1", 2);
    });
  });

  it("navigates back to the previous page when clicking Prev", async () => {
    const user = userEvent.setup();

    mockGetStackRuns.mockResolvedValue({
      data: mockRuns,
      total: 25,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
    });

    // Go to page 2
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(mockGetStackRuns).toHaveBeenCalledWith("stack-uuid-1", 2);
    });

    // Go back to page 1
    await user.click(screen.getByRole("button", { name: /prev/i }));

    await waitFor(() => {
      expect(mockGetStackRuns).toHaveBeenCalledWith("stack-uuid-1", 1);
    });
  });

  it("disables the Next button on the last page", async () => {
    const user = userEvent.setup();

    // total=25 means page 2 is the last page (ceil(25/20)=2)
    mockGetStackRuns.mockResolvedValue({
      data: mockRuns,
      total: 25,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
    });

    // Advance to page 2 (last page)
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton.hasAttribute("disabled")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Duration formatting edge cases
  // -------------------------------------------------------------------------

  it("shows ms duration for runs under 1 second", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-fast",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: 500,
          resourceChanges: null,
          startedAt: null,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("500ms")).toBeDefined();
    });
  });

  it("shows seconds duration for runs between 1s and 60s", async () => {
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-secs",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: 45000,
          resourceChanges: null,
          startedAt: null,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      expect(screen.getByText("45s")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // timeAgo branches: seconds / minutes / hours (lines 32-36)
  // -------------------------------------------------------------------------

  it("shows 'Xs ago' format when startedAt is less than 60 seconds ago", async () => {
    const startedAt = new Date(Date.now() - 30 * 1000).toISOString();
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-seconds",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: null,
          resourceChanges: null,
          startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      const elements = screen.getAllByText(/\d+s ago/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("shows 'Xm ago' format when startedAt is a few minutes ago", async () => {
    const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-minutes",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: null,
          resourceChanges: null,
          startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      const elements = screen.getAllByText(/\d+m ago/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("shows 'Xh ago' format when startedAt is a few hours ago", async () => {
    const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    mockGetStackRuns.mockResolvedValue({
      data: [
        {
          id: "run-hours",
          stackId: "stack-uuid-1",
          type: "plan" as const,
          status: "succeeded" as const,
          triggeredBy: null,
          pipelineUrl: null,
          durationMs: null,
          resourceChanges: null,
          startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<IacStackRunsClient />);

    await waitFor(() => {
      const elements = screen.getAllByText(/\d+h ago/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
