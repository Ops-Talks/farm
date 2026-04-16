import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock(
  "./_components/IacModuleDetailClient",
  () => ({
    IacModuleDetailClient: () => (
      <div data-testid="iac-module-detail">IacModuleDetailClient</div>
    ),
  }),
);

import IacModuleDetailPage from "./page";

describe("IacModuleDetailPage", () => {
  it("renders IacModuleDetailClient", () => {
    render(<IacModuleDetailPage />);
    expect(screen.getByTestId("iac-module-detail")).toBeInTheDocument();
  });
});
