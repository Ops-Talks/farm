import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IntegrationHealthCard } from "./integration-health-card";

vi.mock("@/contexts/feature-availability-context", () => ({
  useFeatureAvailability: vi.fn(),
}));

import { useFeatureAvailability } from "@/contexts/feature-availability-context";

describe("IntegrationHealthCard", () => {
  it("renders all features with correct configured state", () => {
    vi.mocked(useFeatureAvailability).mockReturnValue({
      kubernetes: true,
      cost: false,
      registry: true,
      helm: false,
      istio: false,
      allConfigured: false,
      isLoading: false,
    });
    render(<IntegrationHealthCard />);
    expect(screen.getByText("Kubernetes")).toBeTruthy();
    expect(screen.getByText("OpenCost")).toBeTruthy();
    expect(screen.getByText("Container Registry")).toBeTruthy();
    expect(screen.getByText("Helm")).toBeTruthy();
    expect(screen.getByText("Istio")).toBeTruthy();
  });

  it("renders the card title", () => {
    vi.mocked(useFeatureAvailability).mockReturnValue({
      kubernetes: false,
      cost: false,
      registry: false,
      helm: false,
      istio: false,
      allConfigured: false,
      isLoading: false,
    });
    render(<IntegrationHealthCard />);
    expect(screen.getByText("Integration Health")).toBeTruthy();
  });
});
