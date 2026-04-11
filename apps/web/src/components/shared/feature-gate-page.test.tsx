import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FeatureGatePage } from "./feature-gate-page";

vi.mock("@/contexts/feature-availability-context", () => ({
  useFeatureAvailability: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useFeatureAvailability } from "@/contexts/feature-availability-context";

describe("FeatureGatePage", () => {
  it("renders children when feature is available", () => {
    vi.mocked(useFeatureAvailability).mockReturnValue({
      kubernetes: true, cost: true, registry: true, helm: true, istio: true,
      allConfigured: true, isLoading: false,
    });
    render(
      <FeatureGatePage feature="cost" featureName="OpenCost">
        <div>Cost content</div>
      </FeatureGatePage>,
    );
    expect(screen.getByText("Cost content")).toBeTruthy();
  });

  it("renders FeatureUnavailablePage when feature is not available", () => {
    vi.mocked(useFeatureAvailability).mockReturnValue({
      kubernetes: false, cost: false, registry: false, helm: false, istio: false,
      allConfigured: false, isLoading: false,
    });
    render(
      <FeatureGatePage feature="cost" featureName="OpenCost">
        <div>Cost content</div>
      </FeatureGatePage>,
    );
    expect(screen.getByText("OpenCost is not configured")).toBeTruthy();
    expect(screen.queryByText("Cost content")).toBeNull();
  });

  it("renders children while loading (avoids flash of unavailable state)", () => {
    vi.mocked(useFeatureAvailability).mockReturnValue({
      kubernetes: false, cost: false, registry: false, helm: false, istio: false,
      allConfigured: false, isLoading: true,
    });
    render(
      <FeatureGatePage feature="cost" featureName="OpenCost">
        <div>Cost content</div>
      </FeatureGatePage>,
    );
    expect(screen.getByText("Cost content")).toBeTruthy();
    expect(screen.queryByText("OpenCost is not configured")).toBeNull();
  });
});
