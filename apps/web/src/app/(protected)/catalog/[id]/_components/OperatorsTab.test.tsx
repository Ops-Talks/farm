import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { CatalogComponent } from "@/types/api";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListOperators = vi.fn();
const mockListOperatorBindings = vi.fn();

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
    listOperatorBindings: (...args: unknown[]) =>
      mockListOperatorBindings(...args),
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
    mockListOperatorBindings.mockResolvedValue([
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
    // Binding is for a different component
    mockListOperatorBindings.mockResolvedValue([
      {
        id: "b1",
        operatorName: "prometheus-operator",
        componentId: "other-comp",
      },
    ]);

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
