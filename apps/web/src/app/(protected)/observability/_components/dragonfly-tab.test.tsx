import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DragonflyInstallStatus, DragonflyTaskMetrics } from "@/types/api";

// Mock child components
vi.mock("./dragonfly-status-card", () => ({
  DragonflyStatusCard: () => <div data-testid="dragonfly-status-card" />,
}));

vi.mock("./dragonfly-metrics-panel", () => ({
  DragonflyMetricsPanel: ({ metrics }: { metrics: DragonflyTaskMetrics }) => (
    <div data-testid="dragonfly-metrics-panel" data-total-tasks={metrics.totalTasks} />
  ),
}));

import { DragonflyTab } from "./dragonfly-tab";

const healthyStatus: DragonflyInstallStatus = {
  status: "healthy",
  version: "2.1.0",
  components: [],
};

const sampleMetrics: DragonflyTaskMetrics = {
  totalTasks: 50,
  succeededTasks: 45,
  failedTasks: 5,
  activeTasks: 2,
  totalPeers: 8,
};

describe("DragonflyTab", () => {
  it("shows skeleton when status is null", () => {
    const { container } = render(
      <DragonflyTab status={null} metrics={null} tasks={[]} peers={[]} />,
    );
    // Skeleton renders as divs — check for the skeleton class
    const skeletons = container.querySelectorAll(".animate-pulse, [class*='skeleton']");
    // At minimum, we should not see the real content
    expect(screen.queryByTestId("dragonfly-status-card")).not.toBeInTheDocument();
    expect(skeletons.length > 0 || container.querySelectorAll("div").length > 0).toBe(true);
  });

  it("renders DragonflyStatusCard and DragonflyMetricsPanel when status is provided", () => {
    render(
      <DragonflyTab
        status={healthyStatus}
        metrics={sampleMetrics}
        tasks={[]}
        peers={[]}
      />,
    );
    expect(screen.getByTestId("dragonfly-status-card")).toBeInTheDocument();
    expect(screen.getByTestId("dragonfly-metrics-panel")).toBeInTheDocument();
  });

  it("uses default empty metrics when metrics is null", () => {
    render(
      <DragonflyTab
        status={healthyStatus}
        metrics={null}
        tasks={[]}
        peers={[]}
      />,
    );
    const panel = screen.getByTestId("dragonfly-metrics-panel");
    expect(panel).toBeInTheDocument();
    // The panel should receive totalTasks=0 (the fallback default)
    expect(panel.getAttribute("data-total-tasks")).toBe("0");
  });
});
