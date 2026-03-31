import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { CatalogComponent } from "@/types/api";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListOperators = vi.fn();
const mockListBindingsByComponent = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listOperators: (...args: unknown[]) => mockListOperators(...args),
    listBindingsByComponent: (...args: unknown[]) =>
      mockListBindingsByComponent(...args),
  },
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { OperatorsTab } from "./OperatorsTab";

// ── Wrapper ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function buildComponent(
  overrides: Partial<CatalogComponent> = {},
): CatalogComponent {
  return {
    id: "comp-1",
    name: "My Service",
    kind: "Service" as never,
    owner: "team-a",
    lifecycle: "production" as never,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OperatorsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while operators are being fetched", () => {
    mockListOperators.mockReturnValue(new Promise(() => {}));
    mockListBindingsByComponent.mockReturnValue(new Promise(() => {}));

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    // Should not show empty state while loading
    expect(
      screen.queryByText("No operators are bound to this component."),
    ).not.toBeInTheDocument();
  });

  it("shows empty state when no operators are bound", async () => {
    mockListOperators.mockResolvedValue([]);
    mockListBindingsByComponent.mockResolvedValue([]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText("No operators are bound to this component."),
      ).toBeInTheDocument();
    });
  });

  it("renders bound operator with phase badge and link", async () => {
    const operator = {
      name: "prometheus-operator",
      displayName: "Prometheus Operator",
      version: "0.65.1",
      namespace: "operators",
      phase: "Succeeded",
      description: "Monitoring",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    mockListBindingsByComponent.mockResolvedValue([
      { id: "b1", operatorName: "prometheus-operator", componentId: "comp-1" },
    ]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Prometheus Operator")).toBeInTheDocument();
    });

    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByText("v0.65.1")).toBeInTheDocument();

    const link = screen.getByText("Prometheus Operator").closest("a");
    expect(link).toHaveAttribute("href", "/operators/prometheus-operator");
  });

  it("renders operator with Failed phase badge", async () => {
    const operator = {
      name: "failing-operator",
      displayName: "Failing Operator",
      version: "1.0.0",
      namespace: "operators",
      phase: "Failed",
      description: "Broken",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    mockListBindingsByComponent.mockResolvedValue([
      { id: "b1", operatorName: "failing-operator", componentId: "comp-1" },
    ]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Failing Operator")).toBeInTheDocument();
    });

    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("bg-red-500/20");
  });

  it("renders operator with Pending phase badge", async () => {
    const operator = {
      name: "pending-operator",
      displayName: "Pending Operator",
      version: "1.0.0",
      namespace: "operators",
      phase: "Pending",
      description: "Waiting",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    mockListBindingsByComponent.mockResolvedValue([
      { id: "b1", operatorName: "pending-operator", componentId: "comp-1" },
    ]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Pending Operator")).toBeInTheDocument();
    });

    const badge = screen.getByText("Pending");
    expect(badge.className).toContain("bg-yellow-500/20");
  });

  it("renders operator with Installing phase badge", async () => {
    const operator = {
      name: "installing-operator",
      displayName: "Installing Operator",
      version: "2.0.0",
      namespace: "operators",
      phase: "Installing",
      description: "In progress",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    mockListBindingsByComponent.mockResolvedValue([
      { id: "b1", operatorName: "installing-operator", componentId: "comp-1" },
    ]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Installing Operator")).toBeInTheDocument();
    });

    const badge = screen.getByText("Installing");
    expect(badge.className).toContain("bg-yellow-500/20");
  });

  it("renders operator with unknown phase badge", async () => {
    const operator = {
      name: "unknown-operator",
      displayName: "Unknown Operator",
      version: "1.0.0",
      namespace: "operators",
      phase: "SomeUnknown",
      description: "Mystery",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    mockListBindingsByComponent.mockResolvedValue([
      { id: "b1", operatorName: "unknown-operator", componentId: "comp-1" },
    ]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Unknown Operator")).toBeInTheDocument();
    });

    const badge = screen.getByText("SomeUnknown");
    expect(badge.className).toContain("bg-gray-500/20");
  });

  it("does not show operators not bound to the component", async () => {
    const operator = {
      name: "prometheus-operator",
      displayName: "Prometheus Operator",
      version: "0.65.1",
      namespace: "operators",
      phase: "Succeeded",
      description: "Monitoring",
      createdAt: "2025-01-01T00:00:00Z",
      customResourceDefinitions: [],
    };

    mockListOperators.mockResolvedValue([operator]);
    // No bindings for this component
    mockListBindingsByComponent.mockResolvedValue([]);

    render(<OperatorsTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText("No operators are bound to this component."),
      ).toBeInTheDocument();
    });
  });
});
