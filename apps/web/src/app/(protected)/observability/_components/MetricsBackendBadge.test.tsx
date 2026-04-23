import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MetricsBackendType } from "@/types/api";

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import { MetricsBackendBadge } from "./MetricsBackendBadge";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MetricsBackendBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when backendType is undefined", () => {
    const { container } = render(<MetricsBackendBadge backendType={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when backendType is 'unknown'", () => {
    const { container } = render(
      <MetricsBackendBadge backendType={"unknown" as MetricsBackendType} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Prometheus' label when backendType is prometheus", () => {
    render(<MetricsBackendBadge backendType="prometheus" />);
    expect(screen.getByText("Prometheus")).toBeInTheDocument();
  });

  it("renders 'Thanos' label when backendType is thanos", () => {
    render(<MetricsBackendBadge backendType="thanos" />);
    expect(screen.getByText("Thanos")).toBeInTheDocument();
  });

  it("renders 'Grafana Mimir' label when backendType is mimir", () => {
    render(<MetricsBackendBadge backendType="mimir" />);
    expect(screen.getByText("Grafana Mimir")).toBeInTheDocument();
  });

  it("renders 'Cortex' label when backendType is cortex", () => {
    render(<MetricsBackendBadge backendType="cortex" />);
    expect(screen.getByText("Cortex")).toBeInTheDocument();
  });

  it("applies orange color class for prometheus badge", () => {
    const { container } = render(<MetricsBackendBadge backendType="prometheus" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge?.className).toContain("text-orange-700");
  });

  it("applies blue color class for thanos badge", () => {
    const { container } = render(<MetricsBackendBadge backendType="thanos" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge?.className).toContain("text-blue-700");
  });

  it("applies purple color class for mimir badge", () => {
    const { container } = render(<MetricsBackendBadge backendType="mimir" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge?.className).toContain("text-purple-700");
  });

  it("applies indigo color class for cortex badge", () => {
    const { container } = render(<MetricsBackendBadge backendType="cortex" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge?.className).toContain("text-indigo-700");
  });
});
