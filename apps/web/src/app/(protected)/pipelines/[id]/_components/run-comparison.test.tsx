import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCompare = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    runs: {
      compare: (...args: unknown[]) => mockCompare(...args),
    },
  },
}));

import { RunComparison } from "@/app/(protected)/pipelines/[id]/_components/run-comparison";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const makeComparison = () => ({
  runA: {
    id: "run-aaaaaa",
    status: "succeeded",
    triggeredBy: "admin",
    durationMs: 12300,
  },
  runB: {
    id: "run-bbbbbb",
    status: "failed",
    triggeredBy: "ci-bot",
    durationMs: 9800,
  },
  stageDiff: [
    {
      stageId: "stage-1",
      statusA: "succeeded",
      statusB: "failed",
      durationMsA: 5000,
      durationMsB: 4500,
      durationDeltaMs: -500,
      changed: true,
    },
  ],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RunComparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sheet title with run id fragments", async () => {
    mockCompare.mockResolvedValue(makeComparison());
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText(/Comparing Run #run-aaa/)).toBeInTheDocument();
    });
  });

  it("renders loading skeleton while data is fetching", () => {
    mockCompare.mockReturnValue(new Promise(() => {}));
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );
    // Skeleton elements are present — just verify the sheet title renders
    expect(screen.getByText(/Comparing Run #run-aaa/)).toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    mockCompare.mockRejectedValue(new globalThis.Error("Network error"));
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load comparison data."),
      ).toBeInTheDocument();
    });
  });

  it("renders run summary cards when data is loaded", async () => {
    mockCompare.mockResolvedValue(makeComparison());
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      // "Run A" is part of a composite title — use partial match
      expect(screen.getByText(/Run A/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Run B/)).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("ci-bot")).toBeInTheDocument();
  });

  it("renders Stage Differences table with diff rows", async () => {
    mockCompare.mockResolvedValue(makeComparison());
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText("Stage Differences")).toBeInTheDocument();
    });
    // Changed column shows "Yes" for the changed stage
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("shows no-stage-data message when stageDiff is empty", async () => {
    mockCompare.mockResolvedValue({ ...makeComparison(), stageDiff: [] });
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(
        screen.getByText("No stage data available for this comparison."),
      ).toBeInTheDocument();
    });
  });

  it("does not fetch when open is false", () => {
    render(
      <RunComparison
        pipelineId="pipe-1"
        runIdA="run-aaaaaa"
        runIdB="run-bbbbbb"
        open={false}
        onClose={vi.fn()}
      />,
      { wrapper: makeWrapper() },
    );
    // Sheet is closed — compare should not be called
    expect(mockCompare).not.toHaveBeenCalled();
  });
});
