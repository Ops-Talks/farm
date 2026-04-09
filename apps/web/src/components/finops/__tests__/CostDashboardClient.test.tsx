import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock API functions before importing the component
// ---------------------------------------------------------------------------

const mockGetPlatformCostSummary = vi.fn();
const mockGetTeamCostSummary = vi.fn();
const mockTeamsList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  finops: {
    getPlatformCostSummary: (...args: unknown[]) => mockGetPlatformCostSummary(...args),
    getTeamCostSummary: (...args: unknown[]) => mockGetTeamCostSummary(...args),
  },
  teams: {
    list: (...args: unknown[]) => mockTeamsList(...args),
  },
}));

vi.mock("@/components/finops/CostBudgetBar", () => ({
  CostBudgetBar: ({ totalCost, budgetUsd }: { totalCost: number; budgetUsd: number }) => (
    <div data-testid="cost-budget-bar">
      {totalCost}/{budgetUsd}
    </div>
  ),
}));

// Import component AFTER mocks
import { CostDashboardClient } from "@/components/finops/CostDashboardClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCostItems = [
  {
    componentId: "comp-1",
    totalCost: 50.0,
    currency: "USD",
    syncedAt: "2025-05-01T00:00:00Z",
    budgetUsd: 100,
  },
  {
    componentId: "comp-2",
    totalCost: 120.0,
    currency: "USD",
    syncedAt: "2025-05-02T00:00:00Z",
    budgetUsd: null,
  },
];

const mockTeams = [
  {
    id: "team-1",
    name: "platform",
    displayName: "Platform Team",
    type: "stream_aligned",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "team-2",
    name: "backend",
    displayName: "Backend Team",
    type: "stream_aligned",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const mockTeamCost = {
  teamId: "team-1",
  totalCost: 75.0,
  currency: "USD",
  components: [{ componentId: "comp-1", totalCost: 75.0, window: "30d" }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CostDashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatformCostSummary.mockResolvedValue([]);
    mockTeamsList.mockResolvedValue({ data: [] });
    mockGetTeamCostSummary.mockResolvedValue({ teamId: "t", totalCost: 0, currency: "USD", components: [] });
  });

  it('renders "By Component" tab as the default active tab', async () => {
    mockGetPlatformCostSummary.mockResolvedValue([]);
    render(<CostDashboardClient />);

    // Tab is visible immediately
    const byComponentTab = screen.getByRole("tab", { name: "By Component" });
    expect(byComponentTab).toBeInTheDocument();
    expect(byComponentTab).toHaveAttribute("aria-selected", "true");

    // By Team tab is also visible but not selected
    const byTeamTab = screen.getByRole("tab", { name: "By Team" });
    expect(byTeamTab).toHaveAttribute("aria-selected", "false");
  });

  it('switches to "By Team" tab when clicked', async () => {
    const user = userEvent.setup();
    mockGetPlatformCostSummary.mockResolvedValue([]);
    mockTeamsList.mockResolvedValue({ data: mockTeams });
    mockGetTeamCostSummary.mockResolvedValue(mockTeamCost);

    render(<CostDashboardClient />);

    await user.click(screen.getByRole("tab", { name: "By Team" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "By Team" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  it("renders empty state when no cost data is available", async () => {
    mockGetPlatformCostSummary.mockResolvedValue([]);
    render(<CostDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("No Cost Data")).toBeInTheDocument();
    });
  });

  it("renders component rows when cost data is available", async () => {
    mockGetPlatformCostSummary.mockResolvedValue(mockCostItems);
    render(<CostDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("comp-1")).toBeInTheDocument();
      expect(screen.getByText("comp-2")).toBeInTheDocument();
    });
  });

  it("renders CostBudgetBar for components with a budget set", async () => {
    mockGetPlatformCostSummary.mockResolvedValue(mockCostItems);
    render(<CostDashboardClient />);

    await waitFor(() => {
      // comp-1 has budgetUsd: 100 — bar should render
      const bars = screen.getAllByTestId("cost-budget-bar");
      expect(bars.length).toBeGreaterThanOrEqual(1);
    });

    // comp-2 has no budget — should show "No budget set"
    expect(screen.getByText("No budget set")).toBeInTheDocument();
  });

  it("sorts component costs when the Monthly Cost column header is clicked", async () => {
    const user = userEvent.setup();
    mockGetPlatformCostSummary.mockResolvedValue(mockCostItems);
    render(<CostDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("comp-1")).toBeInTheDocument();
    });

    // Click to sort ascending
    await user.click(screen.getByRole("button", { name: /Monthly Cost/i }));

    // After sorting ascending, comp-1 ($50) should appear before comp-2 ($120)
    const cells = screen.getAllByRole("cell");
    const componentCells = cells.filter(
      (c) => c.textContent === "comp-1" || c.textContent === "comp-2",
    );
    expect(componentCells[0].textContent).toBe("comp-1");
  });

  it("renders team cards on the By Team tab", async () => {
    const user = userEvent.setup();
    mockGetPlatformCostSummary.mockResolvedValue([]);
    mockTeamsList.mockResolvedValue({ data: mockTeams });
    mockGetTeamCostSummary.mockResolvedValue(mockTeamCost);

    render(<CostDashboardClient />);

    await user.click(screen.getByRole("tab", { name: "By Team" }));

    await waitFor(() => {
      expect(screen.getByText("Platform Team")).toBeInTheDocument();
      expect(screen.getByText("Backend Team")).toBeInTheDocument();
    });
  });

  it("renders empty state on By Team tab when no teams exist", async () => {
    const user = userEvent.setup();
    mockGetPlatformCostSummary.mockResolvedValue([]);
    mockTeamsList.mockResolvedValue({ data: [] });

    render(<CostDashboardClient />);

    await user.click(screen.getByRole("tab", { name: "By Team" }));

    await waitFor(() => {
      expect(screen.getByText("No Teams Found")).toBeInTheDocument();
    });
  });

  it("renders error state when cost summary fetch fails", async () => {
    mockGetPlatformCostSummary.mockRejectedValue(new Error("Network error"));
    render(<CostDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Load Costs")).toBeInTheDocument();
    });
  });
});
