import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock(
  "./_components/IacModulesBrowserClient",
  () => ({
    IacModulesBrowserClient: () => (
      <div data-testid="iac-modules-browser">IacModulesBrowserClient</div>
    ),
  }),
);

import IacModulesPage from "./page";

describe("IacModulesPage", () => {
  it("renders IacModulesBrowserClient", () => {
    render(<IacModulesPage />);
    expect(screen.getByTestId("iac-modules-browser")).toBeInTheDocument();
  });
});
