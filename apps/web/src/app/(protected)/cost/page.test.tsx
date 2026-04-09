import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Stub CostDashboardClient so the page test stays lightweight.
// ---------------------------------------------------------------------------

vi.mock("@/components/finops/CostDashboardClient", () => ({
  CostDashboardClient: () => (
    <div data-testid="cost-dashboard-client-stub">Cost Dashboard</div>
  ),
}));

import CostPage from "@/app/(protected)/cost/page";

describe("CostPage", () => {
  it("renders the page with CostDashboardClient", () => {
    render(<CostPage />);
    expect(screen.getByTestId("cost-dashboard-client-stub")).toBeInTheDocument();
  });

  it("renders Cost Dashboard text from the stub", () => {
    render(<CostPage />);
    expect(screen.getByText("Cost Dashboard")).toBeInTheDocument();
  });
});
