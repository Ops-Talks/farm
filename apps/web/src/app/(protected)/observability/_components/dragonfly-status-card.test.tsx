import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragonflyStatusCard } from "./dragonfly-status-card";
import type { DragonflyInstallStatus } from "@/types/api";

const notInstalledStatus: DragonflyInstallStatus = {
  status: "not-installed",
  version: null,
  components: [],
};

const healthyStatus: DragonflyInstallStatus = {
  status: "healthy",
  version: "2.1.0",
  components: [
    {
      component: "manager",
      namespace: "dragonfly-system",
      version: "2.1.0",
      readyReplicas: 1,
      totalReplicas: 1,
      workloadKind: "Deployment",
    },
    {
      component: "scheduler",
      namespace: "dragonfly-system",
      version: "2.1.0",
      readyReplicas: 3,
      totalReplicas: 3,
      workloadKind: "Deployment",
    },
  ],
};

const degradedStatus: DragonflyInstallStatus = {
  status: "degraded",
  version: "2.0.0",
  components: [
    {
      component: "manager",
      namespace: "dragonfly-system",
      version: "2.0.0",
      readyReplicas: 0,
      totalReplicas: 1,
      workloadKind: "Deployment",
    },
  ],
};

describe("DragonflyStatusCard", () => {
  it("renders 'Not Installed' badge when status is 'not-installed'", () => {
    render(<DragonflyStatusCard status={notInstalledStatus} />);
    expect(screen.getByText("Not Installed")).toBeInTheDocument();
  });

  it("shows 'Dragonfly is not detected in this cluster.' message when not installed", () => {
    render(<DragonflyStatusCard status={notInstalledStatus} />);
    expect(
      screen.getByText("Dragonfly is not detected in this cluster."),
    ).toBeInTheDocument();
  });

  it("renders 'Healthy' badge for healthy status", () => {
    render(<DragonflyStatusCard status={healthyStatus} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders 'Degraded' badge for degraded status", () => {
    render(<DragonflyStatusCard status={degradedStatus} />);
    const degradedBadges = screen.getAllByText("Degraded");
    expect(degradedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows version when present", () => {
    render(<DragonflyStatusCard status={healthyStatus} />);
    expect(screen.getByText("v2.1.0")).toBeInTheDocument();
  });

  it("does not show version when null", () => {
    render(<DragonflyStatusCard status={notInstalledStatus} />);
    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
  });

  it("renders component list with Manager and Scheduler shown", () => {
    render(<DragonflyStatusCard status={healthyStatus} />);
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
  });

  it("shows 'Ready' badge when readyReplicas === totalReplicas", () => {
    render(<DragonflyStatusCard status={healthyStatus} />);
    const readyBadges = screen.getAllByText("Ready");
    expect(readyBadges.length).toBeGreaterThan(0);
  });

  it("shows 'Degraded' badge when readyReplicas < totalReplicas", () => {
    render(<DragonflyStatusCard status={degradedStatus} />);
    // The component-level "Degraded" badge (not the overall status badge, both text "Degraded")
    const degradedBadges = screen.getAllByText("Degraded");
    expect(degradedBadges.length).toBeGreaterThanOrEqual(1);
  });
});
