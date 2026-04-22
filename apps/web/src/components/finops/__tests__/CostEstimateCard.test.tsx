import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CostEstimate } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// The component uses Date.now() for relative timestamps. Fix the clock so
// tests are deterministic.
// ---------------------------------------------------------------------------
const FIXED_NOW = new Date("2025-06-01T12:00:00.000Z").getTime();

vi.setSystemTime(FIXED_NOW);

// Import after vi.setSystemTime so the module sees the mocked time.
import { CostEstimateCard } from "@/components/finops/CostEstimateCard";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEstimate(overrides: Partial<CostEstimate> = {}): CostEstimate {
  return {
    id: "est-1",
    componentId: "comp-1",
    pipelineRunId: "run-1",
    estimatedMonthlyCost: 42.5,
    diffMonthlyCost: 0,
    currency: "USD",
    breakdown: null,
    measuredAt: new Date(FIXED_NOW - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    createdAt: new Date(FIXED_NOW - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CostEstimateCard", () => {
  it("renders estimated monthly cost correctly", () => {
    render(<CostEstimateCard estimate={makeEstimate({ estimatedMonthlyCost: 42.5 })} />);
    // $42.50/mo
    expect(screen.getByText(/\$42\.50\/mo/)).toBeInTheDocument();
  });

  it("renders the 'Cost Estimate' heading", () => {
    render(<CostEstimateCard estimate={makeEstimate()} />);
    expect(screen.getByText("Cost Estimate")).toBeInTheDocument();
  });

  it("renders green diff badge for cost savings (negative diff)", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ diffMonthlyCost: -10.0 })}
      />,
    );
    const badge = screen.getByText(/-\$10\.00/);
    expect(badge).toBeInTheDocument();
    // Should have green colouring classes
    expect(badge.closest("span")).toHaveClass("bg-green-100");
  });

  it("renders red diff badge for cost increases (positive diff)", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ diffMonthlyCost: 5.0 })}
      />,
    );
    // The '+' prefix is rendered when diff is positive
    const badge = screen.getByText(/\+\$5\.00/);
    expect(badge).toBeInTheDocument();
    expect(badge.closest("span")).toHaveClass("bg-red-100");
  });

  it("does not render a diff badge when diffMonthlyCost is zero", () => {
    render(<CostEstimateCard estimate={makeEstimate({ diffMonthlyCost: 0 })} />);
    expect(screen.queryByText(/vs\. previous/)).not.toBeInTheDocument();
  });

  it("renders 'Last updated' timestamp", () => {
    render(<CostEstimateCard estimate={makeEstimate()} />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    // 2 hours ago
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it("renders 'just now' when measuredAt is very recent", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 30_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/just now/)).toBeInTheDocument();
  });

  it("renders '1 minute ago' for exactly one minute elapsed (singular)", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 1 * 60_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 minutes ago/)).not.toBeInTheDocument();
  });

  it("renders '5 minutes ago' when measuredAt was 5 minutes in the past", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 5 * 60_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });

  it("renders '1 hour ago' for exactly one hour elapsed (singular)", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 1 * 60 * 60_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 hours ago/)).not.toBeInTheDocument();
  });

  it("renders '3 days ago' when measuredAt was 3 days in the past", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 3 * 24 * 60 * 60_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/3 days ago/)).toBeInTheDocument();
  });

  it("renders '1 day ago' for exactly one day elapsed (singular)", () => {
    render(
      <CostEstimateCard
        estimate={makeEstimate({ measuredAt: new Date(FIXED_NOW - 1 * 24 * 60 * 60_000).toISOString() })}
      />,
    );
    expect(screen.getByText(/1 day ago/)).toBeInTheDocument();
    expect(screen.queryByText(/1 days ago/)).not.toBeInTheDocument();
  });

  it("renders a plain number when currency is an empty string", () => {
    // Simulates blank currency data while keeping the test aligned with the
    // current CostEstimate contract, which requires currency to be a string.
    const estimate = makeEstimate({ currency: "" });
    render(<CostEstimateCard estimate={estimate} />);
    // Should not throw and should display the formatted amount.
    expect(screen.getByText(/42\.50\/mo/)).toBeInTheDocument();
  });
});
