import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PipelineRunStatus } from "@/types/api";
import type { PipelineRun } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRunsList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    runs: {
      list: (...args: unknown[]) => mockRunsList(...args),
    },
  },
}));

import { formatDuration, RunList } from "./run-list";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Returns a paginated envelope containing the given runs. */
function makePage(
  runs: PipelineRun[],
  total?: number,
  skip = 0,
): { data: PipelineRun[]; total: number; skip: number; take: number } {
  return { data: runs, total: total ?? runs.length, skip, take: 20 };
}

/** Builds a minimal PipelineRun fixture. */
function makeRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: "aaaabbbbccccdddd",
    pipelineId: "pipeline-1",
    status: PipelineRunStatus.SUCCEEDED,
    triggeredBy: "alice",
    startedAt: "2025-01-15T10:00:00.000Z",
    finishedAt: "2025-01-15T10:05:00.000Z",
    durationMs: 300_000,
    createdAt: "2025-01-15T09:59:00.000Z",
    updatedAt: "2025-01-15T10:05:00.000Z",
    ...overrides,
  };
}

const defaultProps = {
  pipelineId: "pipeline-1",
  selectedRunId: null as string | null,
  onSelectRun: vi.fn(),
};

// ── formatDuration unit tests ─────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns an em-dash for null input", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("returns an em-dash for undefined input", () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it("formats 0 ms as '0ms'", () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  it("formats values below 1000 ms as Xms", () => {
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats values in the range [1000, 60000) as X.Xs", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(5000)).toBe("5.0s");
    expect(formatDuration(30_000)).toBe("30.0s");
  });

  it("formats values >= 60000 ms as Xm Ys", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
    expect(formatDuration(90_500)).toBe("1m 30s");
    expect(formatDuration(300_000)).toBe("5m 0s");
    expect(formatDuration(3_661_000)).toBe("61m 1s");
  });
});

// ── RunList component tests ───────────────────────────────────────────────────

describe("RunList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  describe("loading state", () => {
    it("renders 5 skeleton rows while the query is in flight", async () => {
      // Use a promise that never resolves to hold the loading state open.
      mockRunsList.mockReturnValue(new Promise<never>(() => {}));

      const { container } = render(
        <RunList {...defaultProps} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBe(5);
      });
    });
  });

  // ── Empty states ────────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("shows a 'no runs yet' message when there are no runs and no status filter", async () => {
      mockRunsList.mockResolvedValue(makePage([]));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByText(
            "This pipeline has not been run yet.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows a status-specific message when a filter is active and no runs match", async () => {
      const user = userEvent.setup();
      mockRunsList.mockResolvedValue(makePage([]));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText(/This pipeline has not been run yet/)).toBeInTheDocument(),
      );

      const select = screen.getByLabelText("Filter runs by status");
      await user.selectOptions(select, PipelineRunStatus.FAILED);

      await waitFor(() => {
        expect(
          screen.getByText(`No ${PipelineRunStatus.FAILED} runs were found.`),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Table rendering ─────────────────────────────────────────────────────────

  describe("table rendering", () => {
    it("renders only the first 8 characters of the run ID", async () => {
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ id: "abcdef1234567890" })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("abcdef12")).toBeInTheDocument();
      });
      // The full ID should not be visible.
      expect(screen.queryByText("abcdef1234567890")).not.toBeInTheDocument();
    });

    it("renders the status badge text for each run", async () => {
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ status: PipelineRunStatus.RUNNING })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(PipelineRunStatus.RUNNING)).toBeInTheDocument();
      });
    });

    it("renders the triggeredBy value", async () => {
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ triggeredBy: "ci-bot" })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("ci-bot")).toBeInTheDocument();
      });
    });

    it("renders the formatted duration from durationMs", async () => {
      // 90500 ms = 1m 30s
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ durationMs: 90_500 })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("1m 30s")).toBeInTheDocument();
      });
    });

    it("renders '—' in the duration cell when durationMs is absent", async () => {
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ durationMs: undefined })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("—")).toBeInTheDocument();
      });
    });

    it("falls back to createdAt for the start time when startedAt is absent", async () => {
      const createdAt = "2025-03-01T08:00:00.000Z";
      mockRunsList.mockResolvedValue(
        makePage([makeRun({ startedAt: undefined, createdAt })]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByText(new Date(createdAt).toLocaleString()),
        ).toBeInTheDocument();
      });
    });

    it("shows '—' in the started cell when both startedAt and createdAt are absent", async () => {
      mockRunsList.mockResolvedValue(
        makePage([
          makeRun({
            startedAt: undefined,
            // Force createdAt to undefined to exercise the final fallback.
            createdAt: undefined as unknown as string,
          }),
        ]),
      );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("—")).toBeInTheDocument();
      });
    });
  });

  // ── Selected run state ──────────────────────────────────────────────────────

  describe("selected run interaction", () => {
    it("marks the matching row as data-selected='true' and shows 'Hide'", async () => {
      const run = makeRun({ id: "selected-run-id1" });
      mockRunsList.mockResolvedValue(makePage([run]));

      render(
        <RunList {...defaultProps} selectedRunId="selected-run-id1" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText("selected")).toBeInTheDocument();
      });

      const row = screen.getByText("selected").closest("tr");
      expect(row).toHaveAttribute("data-selected", "true");
      // The button text is "Hide" when the run is selected. Note that the
      // accessible name comes from the aria-label ("View details for run ..."),
      // so we query by visible text content instead.
      expect(within(row!).getByText("Hide")).toBeInTheDocument();
    });

    it("marks non-matching rows as data-selected='false' and shows 'View'", async () => {
      const run = makeRun({ id: "other-run-id-abc" });
      mockRunsList.mockResolvedValue(makePage([run]));

      render(
        <RunList {...defaultProps} selectedRunId="different-id-xyz" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText("other-ru")).toBeInTheDocument();
      });

      const row = screen.getByText("other-ru").closest("tr");
      expect(row).toHaveAttribute("data-selected", "false");
      expect(
        within(row!).getByRole("button", { name: /view/i }),
      ).toBeInTheDocument();
    });

    it("calls onSelectRun with the full run ID when the View button is clicked", async () => {
      const user = userEvent.setup();
      const onSelectRun = vi.fn();
      const run = makeRun({ id: "click-run-id-xyz1" });
      mockRunsList.mockResolvedValue(makePage([run]));

      render(
        <RunList {...defaultProps} onSelectRun={onSelectRun} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText("click-ru")).toBeInTheDocument();
      });

      const viewBtn = screen.getByRole("button", {
        name: /view details for run click-ru/i,
      });
      await user.click(viewBtn);

      expect(onSelectRun).toHaveBeenCalledOnce();
      expect(onSelectRun).toHaveBeenCalledWith("click-run-id-xyz1");
    });
  });

  // ── statusVariant coverage ──────────────────────────────────────────────────

  describe("statusVariant badge rendering", () => {
    it.each([
      PipelineRunStatus.SUCCEEDED,
      PipelineRunStatus.RUNNING,
      PipelineRunStatus.FAILED,
      PipelineRunStatus.QUEUED,
      PipelineRunStatus.CANCELLED,
      PipelineRunStatus.WAITING_APPROVAL,
    ])("renders a badge for status '%s'", async (status) => {
      mockRunsList.mockResolvedValue(makePage([makeRun({ status })]));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(status)).toBeInTheDocument();
      });
    });
  });

  // ── Status filter ───────────────────────────────────────────────────────────

  describe("status filter", () => {
    it("resets the page offset to 0 when the filter is changed", async () => {
      const user = userEvent.setup();

      const firstPageRuns = Array.from({ length: 20 }, (_, i) =>
        makeRun({ id: `run-first-${i.toString().padStart(5, "0")}-xxxx` }),
      );

      mockRunsList
        .mockResolvedValueOnce(makePage(firstPageRuns, 25, 0))  // initial page 1
        .mockResolvedValueOnce(
          makePage([makeRun({ id: "run-page2-000000000" })], 25, 20),
        )  // page 2
        .mockResolvedValue(makePage([], 0, 0));  // after filter change

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      // Navigate to page 2.
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /next/i }),
        ).not.toBeDisabled(),
      );
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() =>
        expect(screen.getByText(/Runs 21/)).toBeInTheDocument(),
      );

      // Change the filter — should reset to page 1.
      const select = screen.getByLabelText("Filter runs by status");
      await user.selectOptions(select, PipelineRunStatus.RUNNING);

      await waitFor(() => {
        expect(screen.queryByText(/Runs 21/)).not.toBeInTheDocument();
      });
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("disables the Previous button on the first page", async () => {
      mockRunsList.mockResolvedValue(makePage([makeRun()], 1, 0));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText("Runs 1–1 of 1")).toBeInTheDocument(),
      );

      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).toBeDisabled();
    });

    it("disables the Next button when all runs fit on one page", async () => {
      mockRunsList.mockResolvedValue(makePage([makeRun()], 1, 0));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText("Runs 1–1 of 1")).toBeInTheDocument(),
      );

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("shows the correct run range label", async () => {
      const runs = Array.from({ length: 20 }, (_, i) =>
        makeRun({ id: `run-range-${i.toString().padStart(6, "0")}` }),
      );
      mockRunsList.mockResolvedValue(makePage(runs, 45, 0));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText("Runs 1–20 of 45")).toBeInTheDocument(),
      );
    });

    it("advances to the next page when Next is clicked", async () => {
      const user = userEvent.setup();

      const firstPageRuns = Array.from({ length: 20 }, (_, i) =>
        makeRun({ id: `run-fp-${i.toString().padStart(9, "0")}` }),
      );

      mockRunsList
        .mockResolvedValueOnce(makePage(firstPageRuns, 25, 0))
        .mockResolvedValue(
          makePage([makeRun({ id: "run-sp-000000000000" })], 25, 20),
        );

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText("Runs 1–20 of 25")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /next/i }));

      // pageEnd = Math.min(skip + PAGE_SIZE, total) = Math.min(40, 25) = 25,
      // so the label shows "Runs 21–25 of 25" regardless of how many items
      // are in the current page's data array.
      await waitFor(() =>
        expect(screen.getByText("Runs 21–25 of 25")).toBeInTheDocument(),
      );

      expect(
        screen.getByRole("button", { name: /previous/i }),
      ).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("returns to the previous page when Previous is clicked", async () => {
      const user = userEvent.setup();

      const firstPageRuns = Array.from({ length: 20 }, (_, i) =>
        makeRun({ id: `run-a-${i.toString().padStart(10, "0")}` }),
      );

      mockRunsList
        .mockResolvedValueOnce(makePage(firstPageRuns, 25, 0))
        .mockResolvedValueOnce(
          makePage([makeRun({ id: "run-b-000000000000" })], 25, 20),
        )
        .mockResolvedValue(makePage(firstPageRuns, 25, 0));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /next/i }),
        ).not.toBeDisabled(),
      );
      await user.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() =>
        expect(screen.getByText("Runs 21–25 of 25")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /previous/i }));
      await waitFor(() =>
        expect(screen.getByText("Runs 1–20 of 25")).toBeInTheDocument(),
      );
    });

    it("hides pagination controls when there are no runs", async () => {
      mockRunsList.mockResolvedValue(makePage([]));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText(/This pipeline has not been run yet/)).toBeInTheDocument(),
      );

      expect(
        screen.queryByRole("button", { name: /previous/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /next/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ── Compare mode ────────────────────────────────────────────────────────────

  describe("compare mode", () => {
    it("does not render a Compare button when onCompare is not provided", async () => {
      mockRunsList.mockResolvedValue(makePage([makeRun()]));

      render(<RunList {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByText("aaaabbbb")).toBeInTheDocument(),
      );

      expect(
        screen.queryByRole("button", { name: /^compare$/i }),
      ).not.toBeInTheDocument();
    });

    it("toggles compare mode on and off via the Compare / Cancel Compare button", async () => {
      const user = userEvent.setup();
      mockRunsList.mockResolvedValue(makePage([makeRun()]));

      render(
        <RunList {...defaultProps} onCompare={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("aaaabbbb")).toBeInTheDocument(),
      );

      // Enter compare mode.
      await user.click(screen.getByRole("button", { name: /^compare$/i }));
      expect(
        screen.getByRole("button", { name: /cancel compare/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();

      // Exit compare mode.
      await user.click(
        screen.getByRole("button", { name: /cancel compare/i }),
      );
      expect(
        screen.getByRole("button", { name: /^compare$/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("renders one checkbox per run row while compare mode is active", async () => {
      const user = userEvent.setup();
      const runs = [
        makeRun({ id: "run-a-aaaaaaaaaaa" }),
        makeRun({ id: "run-b-bbbbbbbbbbb" }),
      ];
      mockRunsList.mockResolvedValue(makePage(runs));

      render(
        <RunList {...defaultProps} onCompare={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("run-a-aa")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    });

    it("shows Compare Selected only after exactly 2 runs are checked", async () => {
      const user = userEvent.setup();
      const runs = [
        makeRun({ id: "run-a-aaaaaaaaaaa" }),
        makeRun({ id: "run-b-bbbbbbbbbbb" }),
      ];
      mockRunsList.mockResolvedValue(makePage(runs));

      render(
        <RunList {...defaultProps} onCompare={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("run-a-aa")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      // No button with only 0 selections.
      expect(
        screen.queryByRole("button", { name: /compare selected/i }),
      ).not.toBeInTheDocument();

      const [cbA, cbB] = screen.getAllByRole("checkbox");

      await user.click(cbA);

      // Still no button with only 1 selection.
      expect(
        screen.queryByRole("button", { name: /compare selected/i }),
      ).not.toBeInTheDocument();

      await user.click(cbB);

      // Button appears after 2nd selection.
      expect(
        screen.getByRole("button", { name: /compare selected/i }),
      ).toBeInTheDocument();
    });

    it("calls onCompare with both run IDs when Compare Selected is clicked", async () => {
      const user = userEvent.setup();
      const onCompare = vi.fn();
      const runs = [
        makeRun({ id: "run-alpha-aaaaaa" }),
        makeRun({ id: "run-beta-bbbbbbb" }),
      ];
      mockRunsList.mockResolvedValue(makePage(runs));

      render(
        <RunList {...defaultProps} onCompare={onCompare} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("run-alph")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      const [cbA, cbB] = screen.getAllByRole("checkbox");
      await user.click(cbA);
      await user.click(cbB);

      await user.click(
        screen.getByRole("button", { name: /compare selected/i }),
      );

      expect(onCompare).toHaveBeenCalledOnce();
      expect(onCompare).toHaveBeenCalledWith(
        "run-alpha-aaaaaa",
        "run-beta-bbbbbbb",
      );
    });

    it("disables the third checkbox when 2 runs are already selected", async () => {
      const user = userEvent.setup();
      const runs = [
        makeRun({ id: "run-one-aaaaaaaa" }),
        makeRun({ id: "run-two-bbbbbbbb" }),
        makeRun({ id: "run-three-cccccc" }),
      ];
      mockRunsList.mockResolvedValue(makePage(runs));

      render(
        <RunList {...defaultProps} onCompare={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("run-one-")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      const [cb1, cb2, cb3] = screen.getAllByRole("checkbox");
      await user.click(cb1);
      await user.click(cb2);

      // With 2 already selected, the unchecked checkbox must be disabled.
      expect(cb3).toBeDisabled();
    });

    it("clears compare selections when compare mode is cancelled", async () => {
      const user = userEvent.setup();
      const runs = [
        makeRun({ id: "run-x-xxxxxxxxxxx" }),
        makeRun({ id: "run-y-yyyyyyyyyyy" }),
      ];
      mockRunsList.mockResolvedValue(makePage(runs));

      render(
        <RunList {...defaultProps} onCompare={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(screen.getByText("run-x-xx")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      const [cbA, cbB] = screen.getAllByRole("checkbox");
      await user.click(cbA);
      await user.click(cbB);

      // Cancel compare mode — selections are cleared.
      await user.click(
        screen.getByRole("button", { name: /cancel compare/i }),
      );

      // Re-enter compare mode and verify the counter has been reset.
      await user.click(screen.getByRole("button", { name: /^compare$/i }));

      expect(screen.getByText("0/2 selected")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /compare selected/i }),
      ).not.toBeInTheDocument();
    });
  });
});
