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

// FeatureGatePage reads from the feature availability context.
// Return cost=true + isLoading=false so children always render in tests.
vi.mock("@/contexts/feature-availability-context", () => ({
  useFeatureAvailability: () => ({
    kubernetes: true,
    cost: true,
    registry: true,
    helm: true,
    istio: true,
    allConfigured: true,
    isLoading: false,
  }),
}));

// next/link is used by FeatureUnavailablePage; mock to avoid Next.js bootstrap.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
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
