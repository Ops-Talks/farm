import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Empty" description="Create one to get started." />);
    expect(screen.getByText("Create one to get started.")).toBeInTheDocument();
  });

  it("does not render description element when omitted", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText("Create one to get started.")).not.toBeInTheDocument();
  });

  it("renders a default folder-search icon when no icon is provided", () => {
    const { container } = render(<EmptyState title="Empty" />);
    // The icon renders as an SVG inside the icon wrapper
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a custom icon when provided", () => {
    render(
      <EmptyState title="Empty" icon={<span data-testid="custom-icon" />} />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders children below the description", () => {
    render(
      <EmptyState title="Empty" description="No items.">
        <button>Create Item</button>
      </EmptyState>,
    );
    expect(screen.getByRole("button", { name: "Create Item" })).toBeInTheDocument();
  });
});
