import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./_components/GitOpsClient", () => ({
  GitOpsClient: () => <div data-testid="gitops-client-stub">GitOps</div>,
}));

vi.mock("@/components/shared/feature-gate-page", () => ({
  FeatureGatePage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import GitOpsPage from "@/app/(protected)/gitops/page";

describe("GitOpsPage", () => {
  it("renders GitOpsClient inside FeatureGatePage", () => {
    render(<GitOpsPage />);
    expect(screen.getByTestId("gitops-client-stub")).toBeInTheDocument();
  });
});
