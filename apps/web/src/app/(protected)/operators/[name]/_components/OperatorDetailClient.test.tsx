import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
import { kubernetes } from "@/lib/api-client";

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

  // ── Phase badge branches ─────────────────────────────────────────────────

  it("renders red badge for failed phase", async () => {
    mockGetOperator.mockResolvedValue(makeOperator({ phase: "Failed" }));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("bg-red-500/20");
  });

  it("renders yellow badge for pending phase", async () => {
    mockGetOperator.mockResolvedValue(makeOperator({ phase: "Pending" }));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    const badge = screen.getByText("Pending");
    expect(badge.className).toContain("bg-yellow-500/20");
  });

  it("renders gray badge for unknown phase", async () => {
    mockGetOperator.mockResolvedValue(makeOperator({ phase: "Unknown" }));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    const badge = screen.getByText("Unknown");
    expect(badge.className).toContain("bg-gray-500/20");
  });

  // ── Condition badge branches ─────────────────────────────────────────────

  it("renders red condition badge for False status", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListCustomResources.mockResolvedValue([
      makeCustomResource({
        conditions: [
          { type: "Ready", status: "False", reason: "Error", message: "err" },
        ],
      }),
    ]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("False")).toBeInTheDocument();
    });

    const condBadge = screen.getByText("False");
    expect(condBadge.className).toContain("bg-red-100");
  });

  it("renders gray condition badge for unknown status", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListCustomResources.mockResolvedValue([
      makeCustomResource({
        conditions: [
          {
            type: "Ready",
            status: "Unknown",
            reason: "Degraded",
            message: "degraded",
          },
        ],
      }),
    ]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Unknown", { selector: "span" })).toBeInTheDocument();
    });

    const condBadge = screen.getByText("Unknown", { selector: "span" });
    expect(condBadge.className).toContain("bg-gray-100");
  });

  it("shows dash when custom resource has no conditions", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListCustomResources.mockResolvedValue([
      makeCustomResource({ conditions: undefined }),
    ]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-widget")).toBeInTheDocument();
    });

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // ── CRDs empty state ────────────────────────────────────────────────────

  it("shows empty CRDs message when operator has no CRDs", async () => {
    mockGetOperator.mockResolvedValue(
      makeOperator({ customResourceDefinitions: [] }),
    );

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "CRDs" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "No custom resource definitions owned by this operator.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Admin binding form ──────────────────────────────────────────────────

  it("shows binding creation form for admin users", async () => {
    mockHasRole.mockReturnValue(true);
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListComponents.mockResolvedValue({
      data: [{ id: "c1", name: "my-svc" }],
    });

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Select component...")).toBeInTheDocument();
    });

    expect(screen.getByText("Link")).toBeInTheDocument();
    expect(screen.getByText("my-svc")).toBeInTheDocument();
  });

  it("allows admin to create a binding via the form", async () => {
    mockHasRole.mockReturnValue(true);
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListComponents.mockResolvedValue({
      data: [{ id: "c1", name: "my-svc" }],
    });
    (kubernetes.createOperatorBinding as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Select component...")).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue("Select component...");
    fireEvent.change(select, { target: { value: "c1" } });

    await userEvent.click(screen.getByText("Link"));

    await waitFor(() => {
      expect(kubernetes.createOperatorBinding).toHaveBeenCalledWith(
        "my-operator",
        { operatorNamespace: "operators", componentId: "c1" },
      );
    });
  });

  it("does not show binding form for non-admin users", async () => {
    mockHasRole.mockReturnValue(false);
    mockGetOperator.mockResolvedValue(makeOperator());

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(
        screen.getByText("No catalog components linked to this operator."),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByDisplayValue("Select component..."),
    ).not.toBeInTheDocument();
  });

  // ── Not-found back button ───────────────────────────────────────────────

  it("navigates back when clicking button in not-found state", async () => {
    mockGetOperator.mockResolvedValue(null);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Operator Not Found")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Back to Operators"));

    expect(mockPush).toHaveBeenCalledWith("/operators");
  });

  // ── Description / provider edge cases ───────────────────────────────────

  it("shows fallback text when operator has no description", async () => {
    mockGetOperator.mockResolvedValue(makeOperator({ description: "" }));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No description provided.")).toBeInTheDocument();
    });
  });

  it("does not render provider badge when provider is empty", async () => {
    mockGetOperator.mockResolvedValue(makeOperator({ provider: "" }));

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    expect(screen.queryByText("TestCo")).not.toBeInTheDocument();
  });

  // ── Remove binding (Unlink) ─────────────────────────────────────────────

  it("allows admin to remove a binding via the Unlink button", async () => {
    mockHasRole.mockReturnValue(true);
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListBindings.mockResolvedValue([makeBinding()]);
    (
      kubernetes.removeOperatorBinding as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Unlink"));

    await waitFor(() => {
      expect(kubernetes.removeOperatorBinding).toHaveBeenCalledWith(
        "my-operator",
        { operatorNamespace: "operators", componentId: "comp-1" },
      );
    });
  });

  it("shows binding namespace next to component name", async () => {
    mockGetOperator.mockResolvedValue(makeOperator());
    mockListBindings.mockResolvedValue([makeBinding()]);

    render(<OperatorDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("My Operator")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Bindings" }));

    await waitFor(() => {
      expect(screen.getByText("operators")).toBeInTheDocument();
    });
  });
});
