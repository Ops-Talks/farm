import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostBudgetBar } from "@/components/finops/CostBudgetBar";

describe("CostBudgetBar", () => {
  it("renders dollar amounts correctly", () => {
    render(<CostBudgetBar totalCost={50} budgetUsd={100} currency="USD" />);

    expect(screen.getByText(/\$50\.00 of \$100\.00 monthly budget used/)).toBeInTheDocument();
  });

  it("applies green color when usage is below 75%", () => {
    render(<CostBudgetBar totalCost={50} budgetUsd={100} />);

    const bar = screen.getByRole("progressbar").querySelector("div");
    expect(bar).toHaveClass("bg-green-500");
    expect(bar).not.toHaveClass("bg-yellow-500");
    expect(bar).not.toHaveClass("bg-red-500");
  });

  it("applies yellow color at exactly 75% usage", () => {
    render(<CostBudgetBar totalCost={75} budgetUsd={100} />);

    const bar = screen.getByRole("progressbar").querySelector("div");
    expect(bar).toHaveClass("bg-yellow-500");
    expect(bar).not.toHaveClass("bg-green-500");
    expect(bar).not.toHaveClass("bg-red-500");
  });

  it("applies yellow color at 90% usage (above 75%, below 100%)", () => {
    render(<CostBudgetBar totalCost={90} budgetUsd={100} />);

    const bar = screen.getByRole("progressbar").querySelector("div");
    expect(bar).toHaveClass("bg-yellow-500");
  });

  it("applies red color when usage is >= 100%", () => {
    render(<CostBudgetBar totalCost={100} budgetUsd={100} />);

    const bar = screen.getByRole("progressbar").querySelector("div");
    expect(bar).toHaveClass("bg-red-500");
    expect(bar).not.toHaveClass("bg-yellow-500");
    expect(bar).not.toHaveClass("bg-green-500");
  });

  it("applies red color when usage exceeds budget", () => {
    render(<CostBudgetBar totalCost={150} budgetUsd={100} />);

    const bar = screen.getByRole("progressbar").querySelector("div");
    expect(bar).toHaveClass("bg-red-500");
    // Width is capped at 100%
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("renders the progressbar with correct aria attributes", () => {
    render(<CostBudgetBar totalCost={60} budgetUsd={100} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "60");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("uses USD as the default currency when none is provided", () => {
    render(<CostBudgetBar totalCost={25} budgetUsd={100} />);

    // Default currency USD should produce $ symbol
    expect(screen.getByText(/\$25\.00 of \$100\.00/)).toBeInTheDocument();
  });
});
