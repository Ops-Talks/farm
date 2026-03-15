import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock api-client
const mockListComponents = vi.fn();
const mockListTeams = vi.fn();
const mockListEnvironments = vi.fn();
const mockListDeployments = vi.fn();
const mockHealthCheck = vi.fn();

vi.mock("@/lib/api-client", () => ({
  catalog: { listComponents: (...args: unknown[]) => mockListComponents(...args) },
  teams: { list: () => mockListTeams() },
  environments: { list: () => mockListEnvironments() },
  deployments: { list: (...args: unknown[]) => mockListDeployments(...args) },
  health: { check: () => mockHealthCheck() },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
  FarmEvent: {
    COMPONENT_CREATED: "component.created",
    COMPONENT_UPDATED: "component.updated",
    COMPONENT_DELETED: "component.deleted",
    DEPLOYMENT_CREATED: "deployment.created",
    DEPLOYMENT_UPDATED: "deployment.updated",
  },
}));

import { QuickStats } from "@/components/dashboard/quick-stats";
import { HealthPanel } from "@/components/dashboard/health-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QueuePanel } from "@/components/dashboard/queue-panel";

describe("QuickStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render stat cards with fetched data", async () => {
    mockListComponents.mockResolvedValue({ data: [], total: 15, skip: 0, take: 1 });
    mockListTeams.mockResolvedValue({ data: [{}, {}, {}], total: 3, skip: 0, take: 20 });
    mockListEnvironments.mockResolvedValue({ data: [{}, {}], total: 2, skip: 0, take: 20 });
    mockListDeployments.mockResolvedValue({ data: [], total: 42, skip: 0, take: 1 });

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should show skeletons while loading", () => {
    mockListComponents.mockReturnValue(new Promise(() => {}));
    mockListTeams.mockReturnValue(new Promise(() => {}));
    mockListEnvironments.mockReturnValue(new Promise(() => {}));
    mockListDeployments.mockReturnValue(new Promise(() => {}));

    render(<QuickStats />);
    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
  });

  it("should handle failed API calls gracefully", async () => {
    mockListComponents.mockRejectedValue(new Error("fail"));
    mockListTeams.mockResolvedValue({ data: [{}, {}], total: 2, skip: 0, take: 20 });
    mockListEnvironments.mockResolvedValue({ data: [{}], total: 1, skip: 0, take: 20 });
    mockListDeployments.mockRejectedValue(new Error("fail"));

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});

describe("HealthPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render health status badges", async () => {
    mockHealthCheck.mockResolvedValue({
      status: "ok",
      info: {},
      error: {},
      details: {
        database: { status: "up" },
        memory: { status: "up", heapUsed: 52428800 },
      },
    });

    render(<HealthPanel />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
    expect(screen.getAllByText("UP")).toHaveLength(2);
  });

  it("should show API Unreachable on error", async () => {
    mockHealthCheck.mockRejectedValue(new Error("Connection refused"));

    render(<HealthPanel />);

    await waitFor(() => {
      expect(screen.getByText("API Unreachable")).toBeInTheDocument();
    });
  });
});

describe("ActivityFeed", () => {
  it("should show empty state message", () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/No recent activity/)).toBeInTheDocument();
  });
});

describe("QueuePanel", () => {
  it("should render queue names and descriptions", () => {
    render(<QueuePanel />);
    expect(screen.getByText("catalog-discovery")).toBeInTheDocument();
    expect(screen.getByText("notifications")).toBeInTheDocument();
    expect(screen.getByText(/Open Bull Board/)).toBeInTheDocument();
  });
});
