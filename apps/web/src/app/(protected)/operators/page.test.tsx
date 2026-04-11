import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./_components/OperatorsClient", () => ({
  OperatorsClient: () => <div data-testid="operators-client-stub">Operators</div>,
}));

vi.mock("@/components/shared/feature-gate-page", () => ({
  FeatureGatePage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import OperatorsPage from "@/app/(protected)/operators/page";

describe("OperatorsPage", () => {
  it("renders OperatorsClient inside FeatureGatePage", () => {
    render(<OperatorsPage />);
    expect(screen.getByTestId("operators-client-stub")).toBeInTheDocument();
  });
});
