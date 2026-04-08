import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragonflyMetricsPanel } from "./dragonfly-metrics-panel";
import type { DragonflyTaskMetrics, DragonflyTask, DragonflyPeer } from "@/types/api";

const emptyMetrics: DragonflyTaskMetrics = {
  totalTasks: 0,
  succeededTasks: 0,
  failedTasks: 0,
  activeTasks: 0,
  totalPeers: 0,
};

const metricsWithData: DragonflyTaskMetrics = {
  totalTasks: 100,
  succeededTasks: 90,
  failedTasks: 10,
  activeTasks: 5,
  totalPeers: 12,
};

const sampleTasks: DragonflyTask[] = [
  {
    image: "docker.io/library/nginx:latest",
    peerCount: 4,
    bytesTransferred: 52428800,
    accelerationRatio: 0.75,
    durationSeconds: 3.5,
    status: "succeeded",
  },
  {
    image: "docker.io/library/redis:7",
    peerCount: 2,
    bytesTransferred: 10485760,
    accelerationRatio: 0.3,
    durationSeconds: 1.2,
    status: "running",
  },
];

const samplePeers: DragonflyPeer[] = [
  {
    peerId: "peer-abc-123",
    ip: "10.0.0.1",
    status: "active",
    taskCount: 3,
  },
  {
    peerId: "peer-def-456",
    ip: "10.0.0.2",
    status: "idle",
    taskCount: 0,
  },
];

describe("DragonflyMetricsPanel", () => {
  it("renders 'No P2P tasks recorded.' when tasks is empty", () => {
    render(
      <DragonflyMetricsPanel metrics={emptyMetrics} tasks={[]} peers={[]} />,
    );
    expect(screen.getByText("No P2P tasks recorded.")).toBeInTheDocument();
  });

  it("shows total tasks count", () => {
    render(
      <DragonflyMetricsPanel
        metrics={metricsWithData}
        tasks={[]}
        peers={[]}
      />,
    );
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows 'N/A' for success rate when totalTasks === 0", () => {
    render(
      <DragonflyMetricsPanel metrics={emptyMetrics} tasks={[]} peers={[]} />,
    );
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows success rate percentage when totalTasks > 0", () => {
    render(
      <DragonflyMetricsPanel
        metrics={metricsWithData}
        tasks={[]}
        peers={[]}
      />,
    );
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("renders task rows with image, peer count, status badge", () => {
    render(
      <DragonflyMetricsPanel
        metrics={metricsWithData}
        tasks={sampleTasks}
        peers={[]}
      />,
    );
    expect(screen.getByText("docker.io/library/nginx:latest")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("succeeded")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("shows 'No active peers.' when peers is empty", () => {
    render(
      <DragonflyMetricsPanel
        metrics={emptyMetrics}
        tasks={[]}
        peers={[]}
      />,
    );
    expect(screen.getByText("No active peers.")).toBeInTheDocument();
  });

  it("renders peer list when peers present", () => {
    render(
      <DragonflyMetricsPanel
        metrics={metricsWithData}
        tasks={[]}
        peers={samplePeers}
      />,
    );
    expect(screen.getByText("peer-abc-123")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    expect(screen.getByText("peer-def-456")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.2")).toBeInTheDocument();
  });
});
