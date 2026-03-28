import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ApiHealthCheck, GatewayRoute } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the import under test
// ---------------------------------------------------------------------------

const mockListRoutes = vi.fn();
const mockListHealth = vi.fn();
const mockTriggerSync = vi.fn();
const mockTriggerHealthCheck = vi.fn();

vi.mock("@/lib/api-client", () => ({
  gateway: {
    listRoutes: (...args: unknown[]) => mockListRoutes(...args),
    listHealth: (...args: unknown[]) => mockListHealth(...args),
    triggerSync: (...args: unknown[]) => mockTriggerSync(...args),
    triggerHealthCheck: (...args: unknown[]) => mockTriggerHealthCheck(...args),
    getRoute: vi.fn(),
  },
}));

import { GatewayRoutesTab } from "./GatewayRoutesTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoute(overrides: Partial<GatewayRoute> = {}): GatewayRoute {
  return {
    id: "route-1",
    externalId: "ext-1",
    name: "payments-api",
    paths: ["/api/payments"],
    methods: ["GET", "POST"],
    tags: ["billing", "v2"],
    gatewayType: "kong",
    componentId: "comp-1",
    syncedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeHealthCheck(overrides: Partial<ApiHealthCheck> = {}): ApiHealthCheck {
  return {
    id: "hc-1",
    url: "/api/payments",
    status: "up",
    latencyMs: 42,
    apiSpecId: null,
    checkedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.clearAllMocks();
});

describe("GatewayRoutesTab", () => {
  // 1. Loading skeleton
  it("renders loading skeleton initially", () => {
    // Never resolves — simulates a pending request
    mockListRoutes.mockReturnValue(new Promise(() => {}));
    mockListHealth.mockReturnValue(new Promise(() => {}));

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    expect(screen.getByTestId("gateway-routes-skeleton")).toBeInTheDocument();
  });

  // 2. Empty state
  it("renders empty state when no routes", async () => {
    mockListRoutes.mockResolvedValue([]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText("No gateway routes")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/no routes have been synced/i),
    ).toBeInTheDocument();
  });

  // 3. Renders routes table with route data
  it("renders routes table with route data", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText("payments-api")).toBeInTheDocument();
    });
    // Paths rendered as code tags
    expect(screen.getByText("/api/payments")).toBeInTheDocument();
    // Methods rendered as code tags
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
  });

  // 4. Health badge: up
  it("renders health badge: up", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([makeHealthCheck({ status: "up" })]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("health-badge-up")).toBeInTheDocument();
    });
    expect(screen.getByTestId("health-badge-up")).toHaveTextContent("Up");
  });

  // 5. Health badge: degraded
  it("renders health badge: degraded", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([makeHealthCheck({ status: "degraded" })]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("health-badge-degraded")).toBeInTheDocument();
    });
    expect(screen.getByTestId("health-badge-degraded")).toHaveTextContent("Degraded");
  });

  // 6. Health badge: down
  it("renders health badge: down", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([makeHealthCheck({ status: "down" })]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("health-badge-down")).toBeInTheDocument();
    });
    expect(screen.getByTestId("health-badge-down")).toHaveTextContent("Down");
  });

  // 7. Gateway badge: kong
  it("renders gateway badge: kong", async () => {
    mockListRoutes.mockResolvedValue([makeRoute({ gatewayType: "kong" })]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("gateway-badge-kong")).toBeInTheDocument();
    });
    expect(screen.getByTestId("gateway-badge-kong")).toHaveTextContent("Kong");
  });

  // 8. Gateway badge: aws
  it("renders gateway badge: aws", async () => {
    mockListRoutes.mockResolvedValue([makeRoute({ gatewayType: "aws", id: "route-2" })]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("gateway-badge-aws")).toBeInTheDocument();
    });
    expect(screen.getByTestId("gateway-badge-aws")).toHaveTextContent("AWS");
  });

  // 9. Shows Sync Routes button for admin
  it("shows Sync Routes button for admin", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByTestId("sync-routes-button")).toBeInTheDocument();
    });
    expect(screen.getByTestId("run-health-check-button")).toBeInTheDocument();
  });

  // 10. Hides Sync Routes button for non-admin
  it("hides Sync Routes button for non-admin", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText("payments-api")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("sync-routes-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("run-health-check-button")).not.toBeInTheDocument();
  });

  // 11. Calls triggerSync on button click
  it("calls triggerSync on Sync Routes button click", async () => {
    mockListRoutes.mockResolvedValue([makeRoute()]);
    mockListHealth.mockResolvedValue([]);
    mockTriggerSync.mockResolvedValue({ message: "ok" });

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByTestId("sync-routes-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("sync-routes-button"));

    await waitFor(() => {
      expect(mockTriggerSync).toHaveBeenCalledTimes(1);
    });
  });

  // 12. Shows error state on fetch failure
  it("shows error state on fetch failure", async () => {
    mockListRoutes.mockRejectedValue(new Error("Network error"));
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("gateway-routes-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/failed to load gateway routes/i)).toBeInTheDocument();
  });

  // 13. Renders tags
  it("renders tags as badges", async () => {
    mockListRoutes.mockResolvedValue([makeRoute({ tags: ["billing", "v2"] })]);
    mockListHealth.mockResolvedValue([]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText("billing")).toBeInTheDocument();
    });
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  // Extra: Health badge unknown when no health check matches
  it("renders health badge: unknown when no matching health check", async () => {
    mockListRoutes.mockResolvedValue([makeRoute({ paths: ["/api/payments"] })]);
    // Health check for a completely different URL — should not match
    mockListHealth.mockResolvedValue([makeHealthCheck({ url: "/api/unrelated" })]);

    render(<GatewayRoutesTab componentId="comp-1" isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("health-badge-unknown")).toBeInTheDocument();
    });
  });
});
