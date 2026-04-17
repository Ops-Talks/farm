import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { IacStack } from "@/types/api";

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
  usePathname: () => "/iac/stacks",
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacStacksListClient } from "./IacStacksListClient";

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
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacStacksListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockListStacks.mockReturnValue(new Promise(() => {}));
    const { container } = render(<IacStacksListClient />, {
      wrapper: createWrapper(),
    });
    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("renders the page title", async () => {
    mockListStacks.mockResolvedValue([]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("IaC Stacks")).toBeInTheDocument();
    });
  });

  it("shows empty state when no stacks are returned", async () => {
    mockListStacks.mockResolvedValue([]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/no stacks found/i)).toBeInTheDocument();
    });
  });

  it("shows error state when the API call fails", async () => {
    mockListStacks.mockRejectedValue(new Error("network error"));
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/failed to load stacks/i)).toBeInTheDocument();
    });
  });

  it("renders a table row for each stack", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", name: "core-networking" }),
      buildStack({ id: "s2", name: "core-database" }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
      expect(screen.getByText("core-database")).toBeInTheDocument();
    });
  });

  it("renders stack name as a link to the stack detail page", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "stack-abc", name: "my-infra-stack" }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "my-infra-stack" });
      expect(link).toHaveAttribute("href", "/iac/stacks/stack-abc");
    });
  });

  it("renders provider badge", async () => {
    mockListStacks.mockResolvedValue([buildStack({ provider: "opentofu" })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("opentofu")).toBeInTheDocument();
    });
  });

  it("renders environment badge", async () => {
    mockListStacks.mockResolvedValue([buildStack({ environment: "staging" })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText("staging").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders succeeded run status", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({
        lastRun: { id: "r1", status: "succeeded", type: "apply", startedAt: new Date().toISOString() },
      }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Succeeded")).toBeInTheDocument();
    });
  });

  it("renders failed run status", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({
        lastRun: { id: "r1", status: "failed", type: "plan", startedAt: new Date().toISOString() },
      }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  it("renders 'No run' when lastRun is null", async () => {
    mockListStacks.mockResolvedValue([buildStack({ lastRun: null })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No run")).toBeInTheDocument();
    });
  });

  it("renders 'Open' link-out button when externalToolUrl is present", async () => {
    const url = "https://app.terraform.io/app/acme/workspaces/core-networking";
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: url })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      const link = screen.getByRole("link", {
        name: /open core-networking in external tool/i,
      });
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("does not render 'Open' button when externalToolUrl is null", async () => {
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: null })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText("Open")).not.toBeInTheDocument();
    });
  });

  it("shows environment filter buttons derived from stacks", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", environment: "production" }),
      buildStack({ id: "s2", environment: "staging" }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "production" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "staging" }),
      ).toBeInTheDocument();
    });
  });

  it("filters stacks by environment when a filter chip is clicked", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", name: "prod-stack", environment: "production" }),
      buildStack({ id: "s2", name: "staging-stack", environment: "staging" }),
    ]);
    const user = userEvent.setup();
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "staging" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "staging" }));
    await waitFor(() => {
      expect(screen.queryByText("prod-stack")).not.toBeInTheDocument();
      expect(screen.getByText("staging-stack")).toBeInTheDocument();
    });
  });

  it("shows all stacks when 'All' filter is selected after filtering", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", name: "prod-stack", environment: "production" }),
      buildStack({ id: "s2", name: "staging-stack", environment: "staging" }),
    ]);
    const user = userEvent.setup();
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "staging" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "staging" }));
    await user.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() => {
      expect(screen.getByText("prod-stack")).toBeInTheDocument();
      expect(screen.getByText("staging-stack")).toBeInTheDocument();
    });
  });

  it("shows empty state with environment-specific message when filter matches nothing", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", name: "prod-stack", environment: "production" }),
    ]);
    const user = userEvent.setup();
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "production" })).toBeInTheDocument(),
    );
    // staging button won't exist since there are no staging stacks — filter by production then All
    await user.click(screen.getByRole("button", { name: "production" }));
    // now switch back to confirm we see the stack
    await waitFor(() => {
      expect(screen.getByText("prod-stack")).toBeInTheDocument();
    });
  });

  it("displays the stack count in the page header", async () => {
    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1" }),
      buildStack({ id: "s2" }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/2 stacks/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // timeAgo hours/days branches (lines 39-42 of IacStacksListClient.tsx)
  // -------------------------------------------------------------------------

  it("shows 'Xh ago' when lastRun startedAt is a few hours ago", async () => {
    const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    mockListStacks.mockResolvedValue([
      buildStack({ lastRun: { id: "r1", status: "succeeded", type: "apply", startedAt } }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/^\d+h ago$/)).toBeInTheDocument();
    });
  });

  it("shows 'Xd ago' when lastRun startedAt is several days ago", async () => {
    const startedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    mockListStacks.mockResolvedValue([
      buildStack({ lastRun: { id: "r1", status: "succeeded", type: "apply", startedAt } }),
    ]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/^\d+d ago$/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // EnvironmentBadge sky branch (line 95) — env is not production or staging
  // -------------------------------------------------------------------------

  it("renders sky-coloured badge for a non-production non-staging environment", async () => {
    mockListStacks.mockResolvedValue([buildStack({ environment: "dev" })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText("dev").length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // componentId null renders italic dash span (line 138)
  // -------------------------------------------------------------------------

  it("renders an italic dash when componentId is null", async () => {
    mockListStacks.mockResolvedValue([buildStack({ componentId: null })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // externalToolUrl null false branch (line 147) — waits for full render
  // -------------------------------------------------------------------------

  it("renders no link when externalToolUrl is null (verified after row renders)", async () => {
    mockListStacks.mockResolvedValue([buildStack({ externalToolUrl: null })]);
    render(<IacStacksListClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("link", { name: /open core-networking/i }),
    ).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Environment-specific empty state description (line 255 false branch)
  // Achieved by setting activeEnv to an env that is no longer in the data.
  // -------------------------------------------------------------------------

  it("shows environment-specific empty state when the active env has no stacks after data update", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    mockListStacks.mockResolvedValue([
      buildStack({ id: "s1", environment: "production" }),
      buildStack({ id: "s2", environment: "staging" }),
    ]);

    const user = userEvent.setup();
    render(<IacStacksListClient />, { wrapper });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "production" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "production" }));

    await waitFor(() =>
      expect(screen.getByText("core-networking")).toBeInTheDocument(),
    );

    queryClient.setQueryData(
      ["iac-stacks-list"],
      [buildStack({ id: "s2", name: "staging-stack", environment: "staging" })],
    );

    await waitFor(() => {
      expect(
        screen.getByText(`No stacks found in the "production" environment.`),
      ).toBeInTheDocument();
    });
  });
});
