import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { CatalogComponent } from "@/types/api";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { ComponentsSection } from "@/app/(protected)/teams/[id]/_components/components-section";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeComponent = (overrides: Partial<CatalogComponent> = {}): CatalogComponent => ({
  id: "c1",
  name: "auth-service",
  kind: "service" as CatalogComponent["kind"],
  lifecycle: "production" as CatalogComponent["lifecycle"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
} as CatalogComponent);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ComponentsSection", () => {
  it("renders 'Owned Components' heading", () => {
    render(<ComponentsSection components={[]} />);
    expect(screen.getByText("Owned Components")).toBeInTheDocument();
  });

  it("shows empty state when no components are assigned", () => {
    render(<ComponentsSection components={[]} />);
    expect(
      screen.getByText(/This team doesn't own any components yet/),
    ).toBeInTheDocument();
  });

  it("renders component rows in the table when components exist", () => {
    render(<ComponentsSection components={[makeComponent()]} />);
    expect(screen.getByText("auth-service")).toBeInTheDocument();
    expect(screen.getByText("service")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("renders component link pointing to the catalog detail page", () => {
    render(<ComponentsSection components={[makeComponent()]} />);
    const link = screen.getByRole("link", { name: "auth-service" });
    expect(link).toHaveAttribute("href", "/catalog/c1");
  });

  it("shows correct singular count in description", () => {
    render(<ComponentsSection components={[makeComponent()]} />);
    expect(screen.getByText("1 component registered to this team.")).toBeInTheDocument();
  });

  it("shows correct plural count in description", () => {
    render(
      <ComponentsSection
        components={[
          makeComponent(),
          makeComponent({ id: "c2", name: "payment-service" }),
        ]}
      />,
    );
    expect(screen.getByText("2 components registered to this team.")).toBeInTheDocument();
  });
});
