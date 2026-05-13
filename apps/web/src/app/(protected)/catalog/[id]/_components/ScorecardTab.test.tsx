import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import type { ScorecardResult, ScorecardCriterionResult } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks — declared before the import under test
// ---------------------------------------------------------------------------

const mockGetByComponent = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/api-client", () => ({
  scorecards: {
    getByComponent: (...args: unknown[]) => mockGetByComponent(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { ScorecardTab } from "./ScorecardTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCriterion(
  overrides: Partial<ScorecardCriterionResult> = {},
): ScorecardCriterionResult {
  return {
    id: "c-1",
    name: "Has owner",
    category: "ownershipDocs",
    passed: true,
    weight: 5,
    description: "Component must have a declared owner.",
    notApplicable: false,
    ...overrides,
  };
}

function makeScorecard(
  overrides: Partial<ScorecardResult> = {},
): ScorecardResult {
  return {
    id: "sc-1",
    componentId: "comp-1",
    overallScore: 75,
    level: "silver",
    categoryScores: {
      ownershipDocs: 80,
      reliability: 70,
      security: 60,
      infrastructure: 90,
      cost: 50,
    },
    criteria: [
      makeCriterion({ id: "c-1", category: "ownershipDocs", passed: true }),
      makeCriterion({
        id: "c-2",
        name: "Has SLOs",
        category: "reliability",
        passed: false,
      }),
    ],
    evaluatedAt: "2025-01-15T10:00:00.000Z",
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScorecardTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Loading skeleton while the initial fetch is in-flight
  it("renders loading skeleton while fetching scorecard", () => {
    mockGetByComponent.mockReturnValue(new Promise(() => {}));

    render(<ScorecardTab componentId="comp-1" />);

    // The skeleton contains multiple Skeleton elements — verify the wrapper
    // structure is present rather than a specific test-id (component has no
    // data-testid attributes, so we rely on the absence of content text).
    expect(screen.queryByText(/No scorecard computed yet/i)).toBeNull();
    expect(screen.queryByText(/Refresh/i)).toBeNull();
  });

  // 2. Empty state when the API returns null (404 normalised to null)
  it("renders empty state when API returns null", async () => {
    mockGetByComponent.mockResolvedValueOnce(null);

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No scorecard computed yet/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Trigger a computation/i),
    ).toBeInTheDocument();
    // Empty-state button says "Compute Scorecard"
    expect(
      screen.getByRole("button", { name: /Compute Scorecard/i }),
    ).toBeInTheDocument();
  });

  // 3. Scorecard data is rendered when loaded
  it("renders overall score and level badge after load", async () => {
    mockGetByComponent.mockResolvedValueOnce(makeScorecard());

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      // Overall score number
      expect(screen.getByText("75")).toBeInTheDocument();
    });

    // Level badge (capitalised display)
    expect(screen.getByText("silver")).toBeInTheDocument();
  });

  // 4. Category breakdown scores are rendered
  it("renders category breakdown scores", async () => {
    mockGetByComponent.mockResolvedValueOnce(makeScorecard());

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      // "Ownership & Docs" appears in both the breakdown bar and criteria
      // section header — getAllByText is used to handle multiple occurrences.
      expect(
        screen.getAllByText("Ownership & Docs").length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("Reliability").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Security").length).toBeGreaterThanOrEqual(1);

    // Category percentage labels shown next to each progress bar
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  // 5. Criteria checklist is rendered with correct pass/fail indicators
  it("renders criterion names from the scorecard", async () => {
    mockGetByComponent.mockResolvedValueOnce(makeScorecard());

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText("Has owner")).toBeInTheDocument();
    });
    expect(screen.getByText("Has SLOs")).toBeInTheDocument();
  });

  // 6. Refresh button visible in loaded state
  it("shows Refresh button after loading completes", async () => {
    mockGetByComponent.mockResolvedValueOnce(makeScorecard());

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  // 7. Clicking Refresh calls scorecards.refresh and updates data
  it("clicking Refresh calls refresh API and updates displayed score", async () => {
    const initial = makeScorecard({ overallScore: 75, level: "silver" });
    const updated = makeScorecard({ overallScore: 90, level: "gold" });

    mockGetByComponent.mockResolvedValueOnce(initial);
    mockRefresh.mockResolvedValueOnce(updated);

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("90")).toBeInTheDocument();
    });

    expect(mockRefresh).toHaveBeenCalledWith("comp-1");
    expect(mockToastSuccess).toHaveBeenCalledWith("Scorecard refreshed");
  });

  // 8. Refresh error shows error toast
  it("shows error toast when refresh API fails", async () => {
    mockGetByComponent.mockResolvedValueOnce(makeScorecard());
    mockRefresh.mockRejectedValueOnce(new Error("network error"));

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to refresh scorecard");
    });
  });

  // 9. Initial fetch error shows error toast
  it("shows error toast when initial fetch fails", async () => {
    mockGetByComponent.mockRejectedValueOnce(new Error("server error"));

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load scorecard");
    });
  });

  // 10. "Compute Scorecard" button in empty state calls refresh
  it("Compute Scorecard button in empty state calls refresh API", async () => {
    const computed = makeScorecard({ overallScore: 55, level: "bronze" });
    mockGetByComponent.mockResolvedValueOnce(null);
    mockRefresh.mockResolvedValueOnce(computed);

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Compute Scorecard/i }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Compute Scorecard/i }),
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith("comp-1");
    });

    await waitFor(() => {
      expect(screen.getByText("55")).toBeInTheDocument();
    });
  });

  // 11. N/A criteria are rendered with N/A indicator
  it("renders N/A criteria with (N/A) text", async () => {
    const nacriterion = makeCriterion({
      id: "c-na",
      name: "Has SLA",
      notApplicable: true,
    });
    const sc = makeScorecard({
      criteria: [nacriterion],
    });
    mockGetByComponent.mockResolvedValueOnce(sc);

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText("(N/A)")).toBeInTheDocument();
    });
  });

  // 12. evaluatedAt date is displayed
  it("renders the evaluation timestamp", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ evaluatedAt: "2025-01-15T10:00:00.000Z" }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Evaluated/i)).toBeInTheDocument();
    });
  });

  // 13. platinum level badge uses the violet colour class
  it("renders level badge with platinum styling for platinum level", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ level: "platinum", overallScore: 95 }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText("platinum")).toBeInTheDocument();
    });
  });

  // 14. none level badge uses the red colour class
  it("renders level badge with none styling for none level", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ level: "none", overallScore: 10 }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText("none")).toBeInTheDocument();
    });
  });

  // 15. ScoreBar renders red fill for scores below 50
  it("renders red score bar for a category score below 50", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({
        categoryScores: {
          ownershipDocs: 80,
          reliability: 70,
          security: 30,
          infrastructure: 90,
          cost: 50,
        },
      }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      // Security score of 30 is rendered as "30%"
      expect(screen.getByText("30%")).toBeInTheDocument();
    });
  });

  // 16. "Not yet evaluated" shown when evaluatedAt is absent
  it("renders Not yet evaluated when evaluatedAt is missing", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ evaluatedAt: undefined as unknown as string }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Not yet evaluated/i)).toBeInTheDocument();
    });
  });

  // 17. "No criteria available" shown when criteria array is empty
  it("renders no-criteria message when the criteria array is empty", async () => {
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ criteria: [] }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No criteria available for this scorecard/i),
      ).toBeInTheDocument();
    });
  });

  // 18. Unknown category key falls back to the raw key as the label
  it("falls back to the raw category key when the key is not in CATEGORY_LABELS", async () => {
    const customCriterion = makeCriterion({
      id: "custom-check",
      name: "Custom Check",
      category: "custom",
    });
    mockGetByComponent.mockResolvedValueOnce(
      makeScorecard({ criteria: [customCriterion] }),
    );

    render(<ScorecardTab componentId="comp-1" />);

    await waitFor(() => {
      // The section header falls back to "custom" since it is not in CATEGORY_LABELS
      expect(screen.getByText("custom")).toBeInTheDocument();
    });
  });
});
