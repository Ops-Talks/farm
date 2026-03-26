import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PageHeader } from "@/components/shared/page-header";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="My Page" />);
    expect(screen.getByRole("heading", { name: "My Page" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Title" description="A helpful description." />);
    expect(screen.getByText("A helpful description.")).toBeInTheDocument();
  });

  it("does not render description element when description is omitted", () => {
    render(<PageHeader title="Title" />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it("renders children alongside the title", () => {
    render(
      <PageHeader title="Title">
        <button>Action</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("renders both description and children together", () => {
    render(
      <PageHeader title="Products" description="Manage your products.">
        <button>New Product</button>
      </PageHeader>,
    );
    expect(screen.getByText("Manage your products.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Product" })).toBeInTheDocument();
  });
});
