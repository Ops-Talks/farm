import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { CatalogComponent, IacStack } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockListStacks = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iac: {
    listStacks: (...args: unknown[]) => mockListStacks(...args),
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacStacksTab } from "./IacStacksTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function buildComponent(overrides: Partial<CatalogComponent> = {}): CatalogComponent {
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

function buildStack(overrides: Partial<IacStack> = {}): IacStack {
  return {
    id: "stack-1",
    name: "core-networking",
    environment: "production",
    provider: "terraform",
    repositoryUrl: "https://github.com/acme/infra",
    basePath: "stacks/networking",
    externalToolUrl: "https://app.terraform.io/app/acme/workspaces/core-networking",
    componentId: "comp-1",
    autoImported: false,
    lastRun: {
      id: "run-1",
      status: "succeeded",
      type: "apply",
      startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacStacksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockListStacks.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <IacStacksTab component={buildComponent()} />,
      { wrapper: createWrapper() },
    );
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  // FARM-ST402
  it("shows empty state when the API returns an empty array", async () => {
    mockListStacks.mockResolvedValue([]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(
        screen.getByText(/no iac stacks are linked/i),
      ).toBeInTheDocument();
    });
  });

  it("renders a table row for each stack", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", name: "core-networking" }),
      buildStack({ id: "s2", name: "core-database" }),
    ]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
      expect(screen.getByText("core-database")).toBeInTheDocument();
    });
  });

  it("passes componentId to the API as a filter", async () => {
    mockListStacks.mockResolvedValue([]);
    render(<IacStacksTab component={buildComponent({ id: "comp-xyz" })} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(mockListStacks).toHaveBeenCalledWith({ componentId: "comp-xyz" });
    });
  });

  it("renders environment badge for each stack", async () => {
    mockListStacks.mockResolvedValue([buildStack({ environment: "staging" })]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("staging")).toBeInTheDocument();
    });
  });

  it("renders succeeded run status badge", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ lastRun: { id: "r1", status: "succeeded", type: "apply", startedAt: new Date().toISOString() } }),
    ]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("Succeeded")).toBeInTheDocument();
    });
  });

  it("renders failed run status badge", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ lastRun: { id: "r1", status: "failed", type: "plan", startedAt: new Date().toISOString() } }),
    ]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  it("renders 'No run' status when lastRun is null", async () => {
    mockListStacks.mockResolvedValue([buildStack({ lastRun: null })]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("No run")).toBeInTheDocument();
    });
  });

  // FARM-ST403
  it("does not render the 'Open' link-out button when externalToolUrl is null", async () => {
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: null })]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.queryByText("Open")).not.toBeInTheDocument();
    });
  });

  it("renders the 'Open' link-out button pointing to externalToolUrl when present", async () => {
    const externalUrl = "https://app.terraform.io/app/acme/workspaces/core-networking";
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: externalUrl })]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /open core-networking in external tool/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", externalUrl);
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("renders the stack name as a link to the stack detail page", async () => {
    mockListStacks.mockResolvedValue([buildStack({ id: "stack-abc", name: "my-stack" })]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "my-stack" });
      expect(link).toHaveAttribute("href", "/iac/stacks/stack-abc");
    });
  });

  it("renders 'Linked IaC Stacks' heading when stacks are present", async () => {
    mockListStacks.mockResolvedValue([buildStack()]);
    render(<IacStacksTab component={buildComponent()} />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText(/linked iac stacks/i)).toBeInTheDocument();
    });
  });

  it("renders lastRun time as hours when started more than 1 hour ago", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({
        lastRun: {
          id: "r1",
          status: "succeeded",
          type: "apply",
          startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      }),
    ]);
    render(<IacStacksTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("renders lastRun time as days when started more than 24 hours ago", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({
        lastRun: {
          id: "r1",
          status: "succeeded",
          type: "apply",
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    ]);
    render(<IacStacksTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(screen.getByText("2d ago")).toBeInTheDocument();
  });

  it("renders sky environment badge for non-production non-staging environments", async () => {
    mockListStacks.mockResolvedValue([buildStack({ environment: "dev" })]);
    render(<IacStacksTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(screen.getAllByText("dev").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render external link when externalToolUrl is null after row renders", async () => {
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: null })]);
    render(<IacStacksTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("link", { name: /open core-networking in external tool/i }),
    ).not.toBeInTheDocument();
  });
});
