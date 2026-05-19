import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ComponentLifecycle } from "@/types/api";

// ---------------------------------------------------------------------------
// Unit tests for the exported lifecycleBadgeClass helper (FARM-S167).
// ---------------------------------------------------------------------------

// Mock dependencies needed for the CatalogClient module to load.
vi.mock("@/lib/api-client", () => ({
  catalog: { listComponents: vi.fn().mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 }) },
}));
vi.mock("@/lib/ws-client", () => ({ subscribe: vi.fn(() => vi.fn()) }));
vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_n: unknown, fn: () => unknown) => fn()),
  startSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
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

import { lifecycleBadgeClass, CatalogClient } from "./CatalogClient";

// ---------------------------------------------------------------------------
// lifecycleBadgeClass unit tests
// ---------------------------------------------------------------------------

describe("lifecycleBadgeClass", () => {
  it("returns green classes for production lifecycle", () => {
    const cls = lifecycleBadgeClass("production" as ComponentLifecycle);
    expect(cls).toContain("bg-green-100");
    expect(cls).toContain("text-green-800");
  });

  it("returns yellow classes for experimental lifecycle", () => {
    const cls = lifecycleBadgeClass("experimental" as ComponentLifecycle);
    expect(cls).toContain("bg-yellow-100");
    expect(cls).toContain("text-yellow-800");
  });

  it("returns red classes for deprecated lifecycle", () => {
    const cls = lifecycleBadgeClass("deprecated" as ComponentLifecycle);
    expect(cls).toContain("bg-red-100");
    expect(cls).toContain("text-red-800");
  });

  it("returns red classes for decommissioned lifecycle", () => {
    const cls = lifecycleBadgeClass("decommissioned" as ComponentLifecycle);
    expect(cls).toContain("bg-red-100");
    expect(cls).toContain("text-red-800");
  });

  it("returns blue classes for planned lifecycle", () => {
    const cls = lifecycleBadgeClass("planned" as ComponentLifecycle);
    expect(cls).toContain("bg-blue-100");
    expect(cls).toContain("text-blue-800");
  });

  it("returns muted classes for unknown lifecycle values", () => {
    const cls = lifecycleBadgeClass("unknown-status" as unknown as ComponentLifecycle);
    expect(cls).toContain("bg-muted");
    expect(cls).toContain("text-muted-foreground");
  });

  it("dark mode classes are included for production", () => {
    const cls = lifecycleBadgeClass("production" as ComponentLifecycle);
    expect(cls).toContain("dark:bg-green-900/30");
    expect(cls).toContain("dark:text-green-400");
  });

  it("dark mode classes are included for experimental", () => {
    const cls = lifecycleBadgeClass("experimental" as ComponentLifecycle);
    expect(cls).toContain("dark:bg-yellow-900/30");
    expect(cls).toContain("dark:text-yellow-400");
  });

  it("dark mode classes are included for deprecated", () => {
    const cls = lifecycleBadgeClass("deprecated" as ComponentLifecycle);
    expect(cls).toContain("dark:bg-red-900/30");
    expect(cls).toContain("dark:text-red-400");
  });

  it("dark mode classes are included for planned", () => {
    const cls = lifecycleBadgeClass("planned" as ComponentLifecycle);
    expect(cls).toContain("dark:bg-blue-900/30");
    expect(cls).toContain("dark:text-blue-400");
  });
});

// ---------------------------------------------------------------------------
// Integration: verify lifecycle badges render with correct color classes
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function paginated<T>(data: T[], total?: number) {
  return { data, total: total ?? data.length, skip: 0, take: 20 };
}

function mockComponent(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    name: "test-service",
    kind: "service",
    lifecycle: "production",
    owner: "team-alpha",
    tags: [],
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("CatalogClient — lifecycle badge rendering", () => {
  it("renders production lifecycle badge with green styling", async () => {
    const { catalog } = await import("@/lib/api-client");
    vi.mocked(catalog.listComponents).mockResolvedValue(
      paginated([mockComponent({ lifecycle: "production" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("production")).toBeInTheDocument(),
    );

    const badge = screen.getByText("production");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });

  it("renders experimental lifecycle badge with yellow styling", async () => {
    const { catalog } = await import("@/lib/api-client");
    vi.mocked(catalog.listComponents).mockResolvedValue(
      paginated([mockComponent({ lifecycle: "experimental" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("experimental")).toBeInTheDocument(),
    );

    const badge = screen.getByText("experimental");
    expect(badge.className).toContain("bg-yellow-100");
  });

  it("renders deprecated lifecycle badge with red styling", async () => {
    const { catalog } = await import("@/lib/api-client");
    vi.mocked(catalog.listComponents).mockResolvedValue(
      paginated([mockComponent({ lifecycle: "deprecated" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("deprecated")).toBeInTheDocument(),
    );

    const badge = screen.getByText("deprecated");
    expect(badge.className).toContain("bg-red-100");
  });

  it("renders planned lifecycle badge with blue styling", async () => {
    const { catalog } = await import("@/lib/api-client");
    vi.mocked(catalog.listComponents).mockResolvedValue(
      paginated([mockComponent({ lifecycle: "planned" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("planned")).toBeInTheDocument(),
    );

    const badge = screen.getByText("planned");
    expect(badge.className).toContain("bg-blue-100");
  });

  it("renders kind badge as a muted pill", async () => {
    const { catalog } = await import("@/lib/api-client");
    vi.mocked(catalog.listComponents).mockResolvedValue(
      paginated([mockComponent({ kind: "service", lifecycle: "production" })]),
    );

    render(<CatalogClient />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("service")).toBeInTheDocument());

    const kindBadge = screen.getByText("service");
    expect(kindBadge.className).toContain("bg-muted");
    expect(kindBadge.className).toContain("text-muted-foreground");
  });
});
