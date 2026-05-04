import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ScorecardResultDto } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks — declared before the import under test
// ---------------------------------------------------------------------------

const mockListAll = vi.fn();
const mockGetOverview = vi.fn();

vi.mock("@/lib/api-client", () => ({
  scorecards: {
    listAll: (...args: unknown[]) => mockListAll(...args),
    getOverview: (...args: unknown[]) => mockGetOverview(...args),
  },
}));

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ErrorBoundary is a real component that would swallow render errors in tests;
// replace it with a transparent passthrough.
vi.mock("@/components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { ScorecardsClient } from "./ScorecardsClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function makeRow(overrides: Partial<ScorecardResultDto> = {}): ScorecardResultDto {
  return {
    id: "sc-1",
    componentId: "comp-1",
    componentName: "my-service",
    componentKind: "service",
    componentLifecycle: "production",
    teamId: "team-alpha",
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
      {
        id: "c-1",
        name: "Has owner",
        category: "ownershipDocs",
        passed: true,
        weight: 5,
        description: "Component must have a declared owner.",
      },
    ],
    evaluatedAt: "2025-01-15T10:00:00.000Z",
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeOverview(overrides: Partial<{ totalComponents: number; averageScore: number; levelDistribution: Record<string, number>; byTeam: unknown[] }> = {}) {
  return {
    totalComponents: 0,
    averageScore: 0,
    levelDistribution: { none: 0, bronze: 0, silver: 0, gold: 0, platinum: 0 },
    byTeam: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScorecardsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a default empty overview so tests that don't care about summary
    // cards don't need to mock it explicitly.
    mockGetOverview.mockResolvedValue(makeOverview());
  });

  // 1. Loading skeleton is shown initially while query is in-flight
  it("renders loading skeleton rows while query is loading", () => {
    mockListAll.mockReturnValue(new Promise(() => {}));
    mockGetOverview.mockReturnValue(new Promise(() => {}));

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    // The table body shows skeleton rows (Skeleton elements inside TableCell)
    // We verify that no component name data is visible yet
    expect(screen.queryByText("my-service")).toBeNull();
    // The table itself should be present
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // 2. Summary cards render correct values after data loads
  it("renders summary cards with correct totals after data loads", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", overallScore: 80, level: "gold" }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "auth-service", overallScore: 60, level: "bronze" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);
    mockGetOverview.mockResolvedValueOnce(
      makeOverview({ totalComponents: 2, averageScore: 70, levelDistribution: { none: 0, bronze: 1, silver: 0, gold: 1, platinum: 0 } }),
    );

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-service")).toBeInTheDocument();
    });

    // Total Components card
    expect(screen.getByText("Total Components")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Average Score card — 70% from overview
    expect(screen.getByText("Average Score")).toBeInTheDocument();
    // 70% appears in the average score card but also in category columns;
    // verify at least one element shows it
    expect(screen.getAllByText("70%").length).toBeGreaterThanOrEqual(1);
  });

  // 3. Component rows are rendered in the table
  it("renders a row for each scorecard in the table", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", componentName: "svc-a" }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "svc-b" }),
      makeRow({ id: "sc-3", componentId: "comp-3", componentName: "svc-c" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("svc-a")).toBeInTheDocument();
    });
    expect(screen.getByText("svc-b")).toBeInTheDocument();
    expect(screen.getByText("svc-c")).toBeInTheDocument();
  });

  // 4. Level filter hides rows that don't match the selected level
  it("filters rows by level", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", componentName: "gold-svc", level: "gold" }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "bronze-svc", level: "bronze" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("gold-svc")).toBeInTheDocument();
    });

    // Select "Gold" in the level filter dropdown
    const levelSelect = screen.getByRole("combobox", { name: /Filter by level/i });
    fireEvent.change(levelSelect, { target: { value: "gold" } });

    await waitFor(() => {
      expect(screen.getByText("gold-svc")).toBeInTheDocument();
      expect(screen.queryByText("bronze-svc")).toBeNull();
    });
  });

  // 5. Search filter hides rows whose name doesn't match the query
  it("filters rows by component name search", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", componentName: "payment-api" }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "auth-service" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("payment-api")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filter by component name/i);
    fireEvent.change(searchInput, { target: { value: "payment" } });

    await waitFor(() => {
      expect(screen.getByText("payment-api")).toBeInTheDocument();
      expect(screen.queryByText("auth-service")).toBeNull();
    });
  });

  // 6. Sorting by Score column changes sort direction
  it("toggles sort direction when Score column header is clicked twice", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", componentName: "low-score", overallScore: 20 }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "high-score", overallScore: 90 }),
    ];
    mockListAll.mockResolvedValueOnce(rows);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("low-score")).toBeInTheDocument();
    });

    const scoreButton = screen.getByRole("button", { name: /Score/i });

    // Default sort is score desc — high-score should appear first
    const allCells = screen.getAllByRole("cell");
    const firstNameCell = allCells.find((c) => c.textContent?.includes("high-score") || c.textContent?.includes("low-score"));
    expect(firstNameCell?.textContent).toContain("high-score");

    // Click once — same field, toggle to asc
    fireEvent.click(scoreButton);

    await waitFor(() => {
      const cells = screen.getAllByRole("cell");
      const first = cells.find((c) => c.textContent?.includes("high-score") || c.textContent?.includes("low-score"));
      expect(first?.textContent).toContain("low-score");
    });
  });

  // 7. Empty state when no scorecards exist
  it("renders empty state when API returns an empty array", async () => {
    mockListAll.mockResolvedValueOnce([]);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/No scorecards computed yet/i),
      ).toBeInTheDocument();
    });
  });

  // 8. "No components match" message when filters exclude all rows
  it("shows no-match message when filters exclude all rows", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", componentName: "svc-x", level: "gold" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("svc-x")).toBeInTheDocument();
    });

    const levelSelect = screen.getByRole("combobox", { name: /Filter by level/i });
    fireEvent.change(levelSelect, { target: { value: "platinum" } });

    await waitFor(() => {
      expect(
        screen.getByText(/No components match the current filters/i),
      ).toBeInTheDocument();
    });
  });

  // 9. Level distribution row is shown when data loads
  it("renders level distribution row after data loads", async () => {
    const rows = [
      makeRow({ id: "sc-1", componentId: "comp-1", level: "gold" }),
      makeRow({ id: "sc-2", componentId: "comp-2", componentName: "svc-b", level: "bronze" }),
    ];
    mockListAll.mockResolvedValueOnce(rows);
    mockGetOverview.mockResolvedValueOnce(
      makeOverview({ totalComponents: 2, levelDistribution: { none: 0, bronze: 1, silver: 0, gold: 1, platinum: 0 } }),
    );

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Level distribution:/i)).toBeInTheDocument();
    });
  });

  // 10. Page header renders correct title
  it("renders the Scorecards page header", async () => {
    mockListAll.mockResolvedValueOnce([]);

    render(<ScorecardsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Scorecards")).toBeInTheDocument();
    });
  });
});
