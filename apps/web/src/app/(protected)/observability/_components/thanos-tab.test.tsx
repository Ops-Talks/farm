import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ThanosResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import { ThanosTab } from "./thanos-tab";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeThanosResponse(overrides?: Partial<ThanosResponse>): ThanosResponse {
  return {
    operator: [],
    inCluster: [],
    backendType: "unknown",
    longTermEnabled: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ThanosTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Skeleton when data is null
  // -------------------------------------------------------------------------

  it("renders skeleton placeholders when data is null", () => {
    const { container } = render(<ThanosTab data={null} />);

    // Real content must NOT be in the document.
    expect(screen.queryByText("Operator-managed")).not.toBeInTheDocument();
    expect(screen.queryByText("Helm / YAML")).not.toBeInTheDocument();

    // Skeleton elements should exist.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 2. Empty state when no components are detected
  // -------------------------------------------------------------------------

  it("shows the empty-state message when operator and inCluster arrays are both empty", () => {
    render(<ThanosTab data={makeThanosResponse()} />);

    expect(
      screen.getByText(/No Thanos components detected/),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Operator section renders correctly
  // -------------------------------------------------------------------------

  it("renders an operator-managed Querier component with a Ready badge", () => {
    const data = makeThanosResponse({
      operator: [
        {
          name: "thanos-query",
          namespace: "monitoring",
          type: "querier",
          ready: true,
          source: "operator",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("thanos-query")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText(/monitoring.*Querier/i)).toBeInTheDocument();
  });

  it("renders an operator-managed component with a Degraded badge when ready is false", () => {
    const data = makeThanosResponse({
      operator: [
        {
          name: "thanos-query",
          namespace: "monitoring",
          type: "querier",
          ready: false,
          source: "operator",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("Degraded")).toBeInTheDocument();
  });

  it("renders the 'Operator-managed' card title when operator array is non-empty", () => {
    const data = makeThanosResponse({
      operator: [
        {
          name: "thanos-compact",
          namespace: "monitoring",
          type: "compactor",
          ready: true,
          source: "operator",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("Operator-managed")).toBeInTheDocument();
  });

  it("displays 'No operator-managed Thanos components detected' when operator array is empty but inCluster is not", () => {
    const data = makeThanosResponse({
      operator: [],
      inCluster: [
        {
          name: "thanos-query",
          namespace: "monitoring",
          type: "querier",
          readyReplicas: 1,
          desiredReplicas: 1,
          source: "helm",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(
      screen.getByText("No operator-managed Thanos components detected."),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. Helm / YAML section renders correctly
  // -------------------------------------------------------------------------

  it("renders a Helm-deployed Store Gateway component with a replica badge", () => {
    const data = makeThanosResponse({
      inCluster: [
        {
          name: "thanos-storegateway",
          namespace: "monitoring",
          type: "store-gateway",
          readyReplicas: 3,
          desiredReplicas: 3,
          source: "helm",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("thanos-storegateway")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText(/Store Gateway/)).toBeInTheDocument();
  });

  it("renders a yellow replica badge when some replicas are not ready", () => {
    const data = makeThanosResponse({
      inCluster: [
        {
          name: "thanos-ruler",
          namespace: "monitoring",
          type: "ruler",
          readyReplicas: 1,
          desiredReplicas: 2,
          source: "helm",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("renders the 'Helm / YAML' card title when inCluster array is non-empty", () => {
    const data = makeThanosResponse({
      inCluster: [
        {
          name: "thanos-receive",
          namespace: "monitoring",
          type: "receiver",
          readyReplicas: 2,
          desiredReplicas: 2,
          source: "helm",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("Helm / YAML")).toBeInTheDocument();
  });

  it("renders both operator and Helm sections when both arrays are non-empty", () => {
    const data = makeThanosResponse({
      operator: [
        {
          name: "thanos-query-op",
          namespace: "monitoring",
          type: "querier",
          ready: true,
          source: "operator",
        },
      ],
      inCluster: [
        {
          name: "thanos-query-helm",
          namespace: "thanos",
          type: "querier",
          readyReplicas: 1,
          desiredReplicas: 1,
          source: "helm",
        },
      ],
    });

    render(<ThanosTab data={data} />);

    expect(screen.getByText("thanos-query-op")).toBeInTheDocument();
    expect(screen.getByText("thanos-query-helm")).toBeInTheDocument();
  });
});
