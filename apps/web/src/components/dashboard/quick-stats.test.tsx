import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockListComponents = vi.fn();
const mockTeamsList = vi.fn();
const mockEnvironmentsList = vi.fn();
const mockDeploymentsList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  catalog: {
    listComponents: (...args: unknown[]) => mockListComponents(...args),
  },
  teams: {
    list: (...args: unknown[]) => mockTeamsList(...args),
  },
  environments: {
    list: (...args: unknown[]) => mockEnvironmentsList(...args),
  },
  deployments: {
    list: (...args: unknown[]) => mockDeploymentsList(...args),
  },
}));

import { QuickStats } from "@/components/dashboard/quick-stats";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve all four APIs with deterministic values. */
function mockAllResolved(
  components = 12,
  teams = 5,
  environments = 3,
  deploymentsCount = 20,
) {
  mockListComponents.mockResolvedValue({ total: components });
  mockTeamsList.mockResolvedValue({ total: teams });
  mockEnvironmentsList.mockResolvedValue({ total: environments });
  mockDeploymentsList.mockResolvedValue({ total: deploymentsCount });
}

/** Leave all four APIs permanently pending (simulates initial loading state). */
function mockAllPending() {
  const pending = new Promise(() => {});
  mockListComponents.mockReturnValue(pending);
  mockTeamsList.mockReturnValue(pending);
  mockEnvironmentsList.mockReturnValue(pending);
  mockDeploymentsList.mockReturnValue(pending);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuickStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Initial state — all four stats render a Skeleton while requests are in flight.
  it("renders a Skeleton for each stat before the API calls resolve", () => {
    mockAllPending();
    render(<QuickStats />);

    // Labels are always visible.
    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Environments")).toBeInTheDocument();
    expect(screen.getByText("Deployments")).toBeInTheDocument();

    // No numeric values should be present while still loading.
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  // 2. All fetches succeed — numeric values rendered.
  it("displays numeric values for all four stats after successful fetches", async () => {
    mockAllResolved(12, 5, 3, 20);
    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  // 3. catalog.listComponents rejects — Components shows 0.
  it("shows 0 for Components when catalog.listComponents rejects", async () => {
    mockListComponents.mockRejectedValue(new Error("network error"));
    // Keep the rest pending so the only resolved stat is the error-fallback one.
    const pending = new Promise(() => {});
    mockTeamsList.mockReturnValue(pending);
    mockEnvironmentsList.mockReturnValue(pending);
    mockDeploymentsList.mockReturnValue(pending);

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // 4. teams.list rejects — Teams shows 0.
  it("shows 0 for Teams when teams.list rejects", async () => {
    const pending = new Promise(() => {});
    mockListComponents.mockReturnValue(pending);
    mockTeamsList.mockRejectedValue(new Error("network error"));
    mockEnvironmentsList.mockReturnValue(pending);
    mockDeploymentsList.mockReturnValue(pending);

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // 5. environments.list rejects — Environments shows 0.
  it("shows 0 for Environments when environments.list rejects", async () => {
    const pending = new Promise(() => {});
    mockListComponents.mockReturnValue(pending);
    mockTeamsList.mockReturnValue(pending);
    mockEnvironmentsList.mockRejectedValue(new Error("network error"));
    mockDeploymentsList.mockReturnValue(pending);

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // 6. deployments.list rejects — Deployments shows 0.
  it("shows 0 for Deployments when deployments.list rejects", async () => {
    const pending = new Promise(() => {});
    mockListComponents.mockReturnValue(pending);
    mockTeamsList.mockReturnValue(pending);
    mockEnvironmentsList.mockReturnValue(pending);
    mockDeploymentsList.mockRejectedValue(new Error("network error"));

    render(<QuickStats />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // 7. r.total ?? 0 — null/undefined total falls back to 0.
  it("shows 0 for every stat when the API response has a null or undefined total", async () => {
    mockListComponents.mockResolvedValue({ total: null });
    mockTeamsList.mockResolvedValue({ total: undefined });
    mockEnvironmentsList.mockResolvedValue({ total: null });
    mockDeploymentsList.mockResolvedValue({ total: undefined });

    render(<QuickStats />);

    await waitFor(() => {
      // All four values should have resolved to 0.
      const zeros = screen.getAllByText("0");
      expect(zeros).toHaveLength(4);
    });
  });

  // 8. Polling interval — setInterval is registered with 60 000 ms.
  it("registers a polling interval of 60 seconds", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    mockAllResolved();

    await act(async () => {
      render(<QuickStats />);
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    vi.useRealTimers();
  });
});
