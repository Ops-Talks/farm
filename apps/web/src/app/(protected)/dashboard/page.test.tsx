import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

vi.mock("@/components/dashboard/health-panel", () => ({
  HealthPanel: () => <div data-testid="health-panel" />,
}));

vi.mock("@/components/dashboard/quick-stats", () => ({
  QuickStats: () => <div data-testid="quick-stats" />,
}));

vi.mock("@/components/dashboard/activity-feed", () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

vi.mock("@/components/dashboard/queue-panel", () => ({
  QueuePanel: () => <div data-testid="queue-panel" />,
}));

vi.mock("./_components/recent-pipelines-widget", () => ({
  RecentPipelinesWidget: () => <div data-testid="pipelines-widget" />,
}));

vi.mock("@/components/dashboard/setup-checklist-card", () => ({
  SetupChecklistCard: () => <div data-testid="setup-checklist" />,
}));

vi.mock("@/components/dashboard/integration-health-card", () => ({
  IntegrationHealthCard: () => <div data-testid="integration-health" />,
}));

describe("DashboardPage", () => {
  it("renders the page title and subtitle", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("System overview and health status")).toBeInTheDocument();
  });

  it("renders all section headings", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Live Activity")).toBeInTheDocument();
    expect(screen.getByText("Queues")).toBeInTheDocument();
    expect(screen.getByText("Pipelines")).toBeInTheDocument();
  });

  it("renders all child components", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("setup-checklist")).toBeInTheDocument();
    expect(screen.getByTestId("quick-stats")).toBeInTheDocument();
    expect(screen.getByTestId("health-panel")).toBeInTheDocument();
    expect(screen.getByTestId("integration-health")).toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    expect(screen.getByTestId("queue-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pipelines-widget")).toBeInTheDocument();
  });

  it("renders section headings with the correct styling classes", () => {
    const { container } = render(<DashboardPage />);
    const headings = container.querySelectorAll("h2");
    expect(headings.length).toBe(6);
    headings.forEach((h) => {
      expect(h.className).toContain("font-semibold");
      expect(h.className).toContain("text-foreground");
      expect(h.className).not.toContain("uppercase");
    });
  });

  it("renders the correct grid layout for health section", () => {
    const { container } = render(<DashboardPage />);
    const grids = container.querySelectorAll(".lg\\:grid-cols-2");
    expect(grids.length).toBe(2);
  });
});
