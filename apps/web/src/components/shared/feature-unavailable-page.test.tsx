import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FeatureUnavailablePage } from "./feature-unavailable-page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("FeatureUnavailablePage", () => {
  it("renders feature name and default config link", () => {
    render(<FeatureUnavailablePage featureName="Kubernetes" />);
    expect(screen.getByText("Kubernetes is not configured")).toBeTruthy();
    expect(screen.getByText("Integration Settings")).toBeTruthy();
  });

  it("renders custom configPath and configLabel", () => {
    render(
      <FeatureUnavailablePage
        featureName="Cost"
        configPath="/integrations/cloud"
        configLabel="Cloud Providers"
      />,
    );
    expect(screen.getByText("Cloud Providers")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Cloud Providers" });
    expect(link.getAttribute("href")).toBe("/integrations/cloud");
  });
});
