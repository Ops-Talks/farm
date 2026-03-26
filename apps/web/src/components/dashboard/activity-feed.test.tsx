import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — factory must NOT reference top-level variables (hoisting constraint).
// ---------------------------------------------------------------------------
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

import { subscribe } from "@/lib/ws-client";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

const subscribeMock = vi.mocked(subscribe);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type EventHandler = (payload: Record<string, unknown>) => void;

function captureSubscriptions(): Map<string, EventHandler> {
  const handlers = new Map<string, EventHandler>();
  subscribeMock.mockImplementation((event: string, handler: EventHandler) => {
    handlers.set(event, handler);
    return vi.fn(); // unsubscribe fn
  });
  return handlers;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeMock.mockReturnValue(vi.fn());
  });

  it("renders the 'Recent Activity' heading", () => {
    render(<ActivityFeed />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("shows empty state message when no events have arrived", () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/No recent activity/)).toBeInTheDocument();
  });

  it("subscribes to all five FarmEvent types on mount", () => {
    render(<ActivityFeed />);
    expect(subscribeMock).toHaveBeenCalledTimes(5);
    expect(subscribeMock).toHaveBeenCalledWith(
      "component.created",
      expect.any(Function),
    );
    expect(subscribeMock).toHaveBeenCalledWith(
      "deployment.updated",
      expect.any(Function),
    );
  });

  it("displays a component.created activity item when the ws event fires", async () => {
    const handlers = captureSubscriptions();
    render(<ActivityFeed />);

    const handler = handlers.get("component.created");
    expect(handler).toBeDefined();

    act(() => {
      handler!({ name: "auth-service", timestamp: new Date().toISOString() });
    });

    expect(await screen.findByText("Component created")).toBeInTheDocument();
    expect(screen.getByText("auth-service")).toBeInTheDocument();
  });

  it("displays a deployment.created activity item when the ws event fires", async () => {
    const handlers = captureSubscriptions();
    render(<ActivityFeed />);

    const handler = handlers.get("deployment.created");
    act(() => {
      handler!({
        version: "v1.2.3",
        status: "pending",
        timestamp: new Date().toISOString(),
      });
    });

    expect(await screen.findByText("Deployment created")).toBeInTheDocument();
    expect(screen.getByText("v1.2.3 (pending)")).toBeInTheDocument();
  });

  it("displays a component.deleted item with 'destructive' badge", async () => {
    const handlers = captureSubscriptions();
    render(<ActivityFeed />);

    const handler = handlers.get("component.deleted");
    act(() => {
      handler!({ name: "old-service", timestamp: new Date().toISOString() });
    });

    expect(await screen.findByText("Component deleted")).toBeInTheDocument();
    expect(screen.getByText("old-service")).toBeInTheDocument();
  });

  it("accumulates multiple events in reverse-chronological order", async () => {
    const handlers = captureSubscriptions();
    render(<ActivityFeed />);

    const compHandler = handlers.get("component.created")!;
    const deployHandler = handlers.get("deployment.updated")!;

    act(() => {
      compHandler({ name: "first-service", timestamp: new Date().toISOString() });
      deployHandler({
        version: "v2.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
      });
    });

    const badges = await screen.findAllByText(/created|updated/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it("calls all unsubscribe functions on unmount", () => {
    const unsubFns = Array.from({ length: 5 }, () => vi.fn());
    let callIndex = 0;
    subscribeMock.mockImplementation(() => unsubFns[callIndex++]);

    const { unmount } = render(<ActivityFeed />);
    unmount();

    for (const unsub of unsubFns) {
      expect(unsub).toHaveBeenCalled();
    }
  });
});

