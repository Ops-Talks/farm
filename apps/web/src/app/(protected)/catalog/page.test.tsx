import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// --- Wrapper: fresh QueryClient per test so cache never leaks between tests ---
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

const mockListComponents = vi.fn();
vi.mock("@/lib/api-client", () => ({
  catalog: { listComponents: (...args: unknown[]) => mockListComponents(...args) },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock("@/types/api", () => ({
  ComponentLifecycle: {
    PLANNED: "planned",
    EXPERIMENTAL: "experimental",
    PRODUCTION: "production",
    DEPRECATED: "deprecated",
    DECOMMISSIONED: "decommissioned",
  },
  ComponentKindGroup: { DEV: "dev", INFRA: "infra", DATA: "data", SECURITY: "security" },
  FarmEvent: {
    COMPONENT_CREATED: "component.created",
    COMPONENT_UPDATED: "component.updated",
    COMPONENT_DELETED: "component.deleted",
  },
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue(true),
}));

import { CatalogClient as CatalogPage } from "@/app/(protected)/catalog/_components/CatalogClient";

// ── Accessibility (axe) ────────────────────────────────────────────────────────
import { axe } from "vitest-axe";

const mockComponent = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "auth-service",
  kind: "service",
  lifecycle: "production",
  owner: "team-alpha",
  tags: ["typescript", "nestjs", "auth"],
  updatedAt: "2025-01-15T10:00:00Z",
  ...overrides,
});

describe("CatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render heading and register button", async () => {
    mockListComponents.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Software Catalog")).toBeInTheDocument();
    });
    expect(screen.getByText("Register Component")).toBeInTheDocument();
  });

  it("should display components in table", async () => {
    mockListComponents.mockResolvedValue({
      data: [mockComponent()],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });
    expect(screen.getByText("service")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("team-alpha")).toBeInTheDocument();
  });

  it("should show component count", async () => {
    mockListComponents.mockResolvedValue({
      data: [mockComponent()],
      total: 5,
      skip: 0,
      take: 20,
    });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("5 components registered")).toBeInTheDocument();
    });
  });

  it("should show empty state", async () => {
    mockListComponents.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No components found")).toBeInTheDocument();
    });
  });

  it("should filter by search text", async () => {
    const user = userEvent.setup();
    mockListComponents.mockResolvedValue({
      data: [
        mockComponent({ id: "c1", name: "auth-service" }),
        mockComponent({ id: "c2", name: "payment-api" }),
      ],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Filter by name..."), "payment");

    expect(screen.queryByText("auth-service")).not.toBeInTheDocument();
    expect(screen.getByText("payment-api")).toBeInTheDocument();
  });

  it("should render kind group filter tabs", async () => {
    mockListComponents.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("should show tags with overflow indicator", async () => {
    mockListComponents.mockResolvedValue({
      data: [mockComponent({ tags: ["t1", "t2", "t3", "t4", "t5"] })],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("t1")).toBeInTheDocument();
    });
    expect(screen.getByText("t2")).toBeInTheDocument();
    expect(screen.getByText("t3")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    mockListComponents.mockRejectedValue(new Error("Network error"));

    render(<CatalogPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No components found")).toBeInTheDocument();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    mockListComponents.mockResolvedValue({
      data: [mockComponent()],
      total: 1,
      skip: 0,
      take: 20,
    });

    const { container } = render(<CatalogPage />, { wrapper: createWrapper() });

    // Wait for the component list to fully render before scanning
    await waitFor(() =>
      expect(screen.getByText("auth-service")).toBeInTheDocument(),
    );

    const results = await axe(container, {
      rules: {
        // jsdom cannot compute CSS colors — disable to avoid false positives
        "color-contrast": { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  }, 10000);
});
