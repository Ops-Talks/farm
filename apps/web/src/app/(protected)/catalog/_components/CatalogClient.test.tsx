import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListComponents = vi.fn();

vi.mock("@/lib/api-client", () => ({
  catalog: {
    listComponents: (...args: unknown[]) => mockListComponents(...args),
  },
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
  ComponentKindGroup: {
    DEV: "dev",
    INFRA: "infra",
    DATA: "data",
    SECURITY: "security",
  },
  FarmEvent: {
    COMPONENT_CREATED: "component.created",
    COMPONENT_UPDATED: "component.updated",
    COMPONENT_DELETED: "component.deleted",
  },
}));

// Mock OTel span helpers so tests are not coupled to the OTel SDK.
const mockRecordSpan = vi.fn((_name: unknown, fn: () => unknown) => fn());
vi.mock("@/lib/otel-spans", () => ({
  recordSpan: (...args: Parameters<typeof mockRecordSpan>) =>
    mockRecordSpan(...args),
  startSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
}));

import { CatalogClient } from "./CatalogClient";

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

function mockComponent(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    name: "auth-service",
    kind: "service",
    lifecycle: "production",
    owner: "team-alpha",
    tags: ["typescript", "nestjs"],
    updatedAt: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

function paginated<T>(data: T[], total?: number) {
  return { data, total: total ?? data.length, skip: 0, take: 20 };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CatalogClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the page title and Register Component button", async () => {
    mockListComponents.mockResolvedValue(paginated([]));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Software Catalog")).toBeInTheDocument();
    });
    expect(screen.getByText("Register Component")).toBeInTheDocument();
  });

  it("shows the correct component count from the API total", async () => {
    mockListComponents.mockResolvedValue(paginated([mockComponent()], 7));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("7 components registered")).toBeInTheDocument();
    });
  });

  it("renders component rows with name, kind, lifecycle and owner", async () => {
    mockListComponents.mockResolvedValue(
      paginated([mockComponent({ name: "payment-api", kind: "api", lifecycle: "experimental", owner: "team-beta" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("payment-api")).toBeInTheDocument();
    });
    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getByText("experimental")).toBeInTheDocument();
    expect(screen.getByText("team-beta")).toBeInTheDocument();
  });

  it("shows empty state when no components are found", async () => {
    mockListComponents.mockResolvedValue(paginated([]));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No components found. Register your first component."),
      ).toBeInTheDocument();
    });
  });

  it("filters components by name using the search input (client-side)", async () => {
    const user = userEvent.setup();
    mockListComponents.mockResolvedValue(
      paginated([
        mockComponent({ id: "c1", name: "auth-service" }),
        mockComponent({ id: "c2", name: "payment-api" }),
      ]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("auth-service")).toBeInTheDocument(),
    );

    await user.type(screen.getByPlaceholderText("Filter by name..."), "payment");

    expect(screen.queryByText("auth-service")).not.toBeInTheDocument();
    expect(screen.getByText("payment-api")).toBeInTheDocument();
  });

  it("shows tag overflow indicator when a component has more than 3 tags", async () => {
    mockListComponents.mockResolvedValue(
      paginated([mockComponent({ tags: ["t1", "t2", "t3", "t4", "t5"] })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("t1")).toBeInTheDocument(),
    );
    expect(screen.getByText("t2")).toBeInTheDocument();
    expect(screen.getByText("t3")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    // t4 and t5 should be hidden
    expect(screen.queryByText("t4")).not.toBeInTheDocument();
  });

  it("renders kind group filter tabs", async () => {
    mockListComponents.mockResolvedValue(paginated([]));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("All")).toBeInTheDocument(),
    );
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("shows filter-specific empty state when search yields no matches", async () => {
    const user = userEvent.setup();
    mockListComponents.mockResolvedValue(
      paginated([mockComponent()]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("auth-service")).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText("Filter by name..."),
      "nonexistent-xyz",
    );

    expect(
      screen.getByText("No components match the search filter."),
    ).toBeInTheDocument();
  });

  it("renders gracefully when the API call fails", async () => {
    mockListComponents.mockRejectedValue(new Error("Network error"));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No components found. Register your first component."),
      ).toBeInTheDocument();
    });
  });

  it("passes pagination params to the API", async () => {
    mockListComponents.mockResolvedValue(paginated([]));

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockListComponents).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  it("records a catalog.search span with query and result count when the user searches", async () => {
    const user = userEvent.setup();
    mockListComponents.mockResolvedValue(
      paginated([
        mockComponent({ id: "c1", name: "auth-service" }),
        mockComponent({ id: "c2", name: "payment-api" }),
      ]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    // Wait for data to load.
    await waitFor(() => expect(screen.getByText("auth-service")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Filter by name..."), "auth");

    await waitFor(() => {
      expect(mockRecordSpan).toHaveBeenCalledWith(
        "catalog.search",
        expect.any(Function),
        expect.objectContaining({
          "search.query": expect.stringContaining("auth"),
          "search.results_count": expect.any(Number),
        }),
      );
    });
  });
});
