import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CostBudgetExceededBanner } from "@/components/finops/CostBudgetExceededBanner";

describe("CostBudgetExceededBanner", () => {
  it("renders with the formatted delta amount", () => {
    render(
      <CostBudgetExceededBanner
        delta={25.75}
        currency="USD"
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText(/\$25\.75/)).toBeInTheDocument();
    expect(screen.getByText(/exceeds monthly budget/i)).toBeInTheDocument();
  });

  it("renders the alert role", () => {
    render(
      <CostBudgetExceededBanner
        delta={10}
        currency="USD"
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <CostBudgetExceededBanner
        delta={10}
        currency="USD"
        onDismiss={onDismiss}
      />,
    );

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("formats large delta values correctly", () => {
    render(
      <CostBudgetExceededBanner
        delta={1234.56}
        currency="USD"
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
  });
});
