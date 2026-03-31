import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetOperator = vi.fn();
const mockListCustomResources = vi.fn();
const mockListBindings = vi.fn();
const mockListComponents = vi.fn();
const mockHasRole = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/operators/my-operator",
  useParams: () => ({ name: "my-operator" }),
  useSearchParams: () => new URLSearchParams(),
}));

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
    getOperator: (...args: unknown[]) => mockGetOperator(...args),
    listOperatorCustomResources: (...args: unknown[]) =>
      mockListCustomResources(...args),
    listOperatorBindings: (...args: unknown[]) => mockListBindings(...args),
    createOperatorBinding: vi.fn(),
    removeOperatorBinding: vi.fn(),
  },
  catalog: {
    listComponents: (...args: unknown[]) => mockListComponents(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { OperatorDetailClient } from "./OperatorDetailClient";

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
    name: "my-operator",
    displayName: "My Operator",
    version: "1.0.0",
    namespace: "operators",
    phase: "Succeeded",
    description: "A test operator",
    provider: "TestCo",
    createdAt: "2025-01-01T00:00:00Z",
    customResourceDefinitions: [
      {
        name: "widgets.example.com",
        version: "v1",
        kind: "Widget",
        description: "A Widget resource",
      },
    ],
    ...overrides,
  };
}

function makeCustomResource(overrides: Record<string, unknown> = {}) {
  return {
    name: "my-widget",
    namespace: "default",
    kind: "Widget",
    apiVersion: "example.com/v1",
    conditions: [
      {
        type: "Ready",
        status: "True",
        reason: "Available",
        message: "Widget is ready",
      },
    ],
    createdAt: "2025-01-15T00:00:00Z",
    ...overrides,
  };
}

function makeBinding(overrides: Record<string, unknown> = {}) {
  return {
    id: "binding-1",
    operatorName: "my-operator",
    operatorNamespace: "operators",
    componentId: "comp-1",
    component: { id: "comp-1", name: "auth-service" },
    addedAt: "2025-01-10T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OperatorDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
    mockListCustomResources.mockResolvedValue([]);
    mockListBindings.mockResolvedValue([]);
    mockListComponents.mockResolvedValue({ data: [] });
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  it("renders skeleton while loading", () => {
    mockGetOperator.mockReturnValue(new Promise(() => {}));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    expect(screen.queryByText("My Operator")).not.toBeInTheDocument();
  });

  // ── Not found ───────────────────────────────────────────────────────────────

  it("shows not found state when operator is null", async () => {
    mockGetOperator.mockResolvedValue(null);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Operator Not Found")).toBeInTheDocument();
    });
  });

  // ── Renders operator info ───────────────────────────────────────────────────

  it("renders operator display name, phase, version, and provider", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("TestCo")).toBeInTheDocument();
  });

  // ── CRDs tab ────────────────────────────────────────────────────────────────

  it("displays owned CRDs from the operator info", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    // Click the CRDs tab to reveal its content
    await userEvent.click(screen.getByRole("tab", { name: "CRDs" }));

    await waitFor(() => {
      expect(screen.getByText("Widget")).toBeInTheDocument();
      expect(screen.getByText("widgets.example.com")).toBeInTheDocument();
    });
  });

  // ── Custom Resources tab ────────────────────────────────────────────────────

  it("displays custom resource instances", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListCustomResources.mockResolvedValue([makeCustomResource()]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-widget")).toBeInTheDocument();
    });
  });

  it("shows empty state when no custom resources exist", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListCustomResources.mockResolvedValue([]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(
          "No custom resource instances found for this operator.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Bindings tab ────────────────────────────────────────────────────────────

  it("displays linked component bindings", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListBindings.mockResolvedValue([makeBinding()]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    // Click the Bindings tab
    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });
  });

  it("shows empty bindings message when no components linked", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListBindings.mockResolvedValue([]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    // Click the Bindings tab
    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(
        screen.getByText("No catalog components linked to this operator."),
      ).toBeInTheDocument();
    });
  });

  // ── Back link ───────────────────────────────────────────────────────────────

  it("renders a back link to the operators list", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    const backLink = screen.getByText("Back").closest("a");
    expect(backLink).toHaveAttribute("href", "/operators");
  });
});
