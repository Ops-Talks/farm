import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListOperators = vi.fn();
const mockHasRole = vi.fn();

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
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { OperatorsClient } from "./OperatorsClient";

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

function makeOperator(overrides: Record<string, unknown> = {}) {
  return {
    name: "prometheus-operator",
    displayName: "Prometheus Operator",
    version: "0.65.1",
    namespace: "operators",
    phase: "Succeeded",
    description: "Manages Prometheus monitoring instances",
    provider: "CoreOS",
    createdAt: "2025-01-01T00:00:00Z",
    customResourceDefinitions: [
      {
        name: "prometheuses.monitoring.coreos.com",
        version: "v1",
        kind: "Prometheus",
        description: "Prometheus instance",
      },
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OperatorsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  it("renders loading skeleton cards while the query is in flight", () => {
    mockListOperators.mockReturnValue(new Promise(() => {}));

    render(<OperatorsClient />, { wrapper: createWrapper() });

    expect(
      screen.queryByText("No operators discovered. Ensure OLM is installed in your cluster."),
    ).not.toBeInTheDocument();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  it("shows the empty state message when no operators exist", async () => {
    mockListOperators.mockResolvedValue([]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(
          "No operators discovered. Ensure OLM is installed in your cluster.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Header count ────────────────────────────────────────────────────────────

  it("shows plural count in header when multiple operators", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ name: "op1" }),
      makeOperator({ name: "op2" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 operators discovered")).toBeInTheDocument();
    });
  });

  it("shows singular count in header when exactly one operator", async () => {
    mockListOperators.mockResolvedValue([makeOperator()]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1 operator discovered")).toBeInTheDocument();
    });
  });

  // ── Renders operator cards ──────────────────────────────────────────────────

  it("renders operator cards with display name, version, and provider", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({
        displayName: "Prometheus Operator",
        version: "0.65.1",
        provider: "CoreOS",
        description: "Manages Prometheus monitoring instances",
      }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Prometheus Operator")).toBeInTheDocument();
    });

    expect(screen.getByText("Manages Prometheus monitoring instances")).toBeInTheDocument();
    expect(screen.getByText("v0.65.1")).toBeInTheDocument();
    expect(screen.getByText("CoreOS")).toBeInTheDocument();
    expect(screen.getByText("1 CRD")).toBeInTheDocument();
  });

  // ── Phase badges ────────────────────────────────────────────────────────────

  it("renders Succeeded phase badge with green styling", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ phase: "Succeeded" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badges = screen.getAllByText("Succeeded");
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toBeDefined();
      expect(badge!.className).toContain("bg-green-500/20");
    });
  });

  it("renders Failed phase badge with red styling", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ phase: "Failed" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badges = screen.getAllByText("Failed");
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toBeDefined();
      expect(badge!.className).toContain("bg-red-500/20");
    });
  });

  it("renders Pending phase badge with yellow styling", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ phase: "Pending" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badges = screen.getAllByText("Pending");
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toBeDefined();
      expect(badge!.className).toContain("bg-yellow-500/20");
    });
  });

  it("renders unknown phase badge with gray styling", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ phase: "Unknown" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("Unknown");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-gray-500/20");
    });
  });

  // ── Search filtering ────────────────────────────────────────────────────────

  it("filters operators by display name when searching", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ name: "op1", displayName: "Prometheus Operator", description: "Monitoring tool" }),
      makeOperator({ name: "op2", displayName: "Cert Manager", description: "Certificate management" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Prometheus Operator")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search operators..."),
      "Prometheus",
    );

    await waitFor(() => {
      expect(screen.getByText("Prometheus Operator")).toBeInTheDocument();
      expect(screen.queryByText("Cert Manager")).not.toBeInTheDocument();
    });
  });

  it("filters operators by description when searching", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({
        name: "op1",
        displayName: "Operator A",
        description: "Handles monitoring",
      }),
      makeOperator({
        name: "op2",
        displayName: "Operator B",
        description: "Handles certificates",
      }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Operator A")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search operators..."),
      "certificates",
    );

    await waitFor(() => {
      expect(screen.getByText("Operator B")).toBeInTheDocument();
      expect(screen.queryByText("Operator A")).not.toBeInTheDocument();
    });
  });

  it("shows filtered empty state when search matches nothing", async () => {
    mockListOperators.mockResolvedValue([makeOperator()]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Prometheus Operator")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search operators..."),
      "zzz-no-match",
    );

    await waitFor(() => {
      expect(
        screen.getByText("No operators match your filters."),
      ).toBeInTheDocument();
    });
  });

  // ── Tab filtering ───────────────────────────────────────────────────────────

  it("filters to only Succeeded operators when that tab is clicked", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({
        name: "op1",
        displayName: "Good Operator",
        phase: "Succeeded",
      }),
      makeOperator({
        name: "op2",
        displayName: "Bad Operator",
        phase: "Failed",
      }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Good Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Succeeded" }));

    await waitFor(() => {
      expect(screen.getByText("Good Operator")).toBeInTheDocument();
      expect(screen.queryByText("Bad Operator")).not.toBeInTheDocument();
    });
  });

  it("filters to only Failed operators when that tab is clicked", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({
        name: "op1",
        displayName: "Good Operator",
        phase: "Succeeded",
      }),
      makeOperator({
        name: "op2",
        displayName: "Bad Operator",
        phase: "Failed",
      }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Bad Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Failed" }));

    await waitFor(() => {
      expect(screen.getByText("Bad Operator")).toBeInTheDocument();
      expect(screen.queryByText("Good Operator")).not.toBeInTheDocument();
    });
  });

  // ── Card links ──────────────────────────────────────────────────────────────

  it("wraps each operator card in a link to the detail page", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({ name: "my-operator", displayName: "My Operator" }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    const card = screen.getByText("My Operator").closest("a");
    expect(card).toHaveAttribute("href", "/operators/my-operator");
  });

  // ── CRD count ───────────────────────────────────────────────────────────────

  it("shows plural CRDs count when operator has multiple CRDs", async () => {
    mockListOperators.mockResolvedValue([
      makeOperator({
        customResourceDefinitions: [
          { name: "a.example.com", version: "v1", kind: "A", description: "" },
          { name: "b.example.com", version: "v1", kind: "B", description: "" },
        ],
      }),
    ]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 CRDs")).toBeInTheDocument();
    });
  });

  // ── API integration ─────────────────────────────────────────────────────────

  it("calls kubernetes.listOperators() to populate the component", async () => {
    mockListOperators.mockResolvedValue([]);

    render(<OperatorsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockListOperators).toHaveBeenCalledOnce();
    });
  });
});
