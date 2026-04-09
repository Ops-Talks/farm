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
});
