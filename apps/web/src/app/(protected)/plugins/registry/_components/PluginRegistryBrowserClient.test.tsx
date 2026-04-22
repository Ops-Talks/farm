import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

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

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSearch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pluginRegistry: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PluginRegistryBrowserClient } from "@/app/(protected)/plugins/registry/_components/PluginRegistryBrowserClient";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "uuid-1",
  pluginId: "plugin-one",
  name: "Plugin One",
  latestVersion: "1.0.0",
  description: "The first plugin",
  author: "Alice",
  category: "monitoring",
  manifest: {},
  installCount: 100,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PluginRegistryBrowserClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header", async () => {
    mockSearch.mockResolvedValue([]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin Registry")).toBeInTheDocument();
    });
  });

  it("shows skeleton cards while loading", () => {
    mockSearch.mockReturnValue(new Promise(() => {}));
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows empty state when no results are returned", async () => {
    mockSearch.mockResolvedValue([]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No plugins found")).toBeInTheDocument();
    });
  });

  it("renders a card for each entry with name, version, and description", async () => {
    mockSearch.mockResolvedValue([
      makeEntry({ name: "Plugin One", latestVersion: "1.0.0", description: "The first plugin" }),
      makeEntry({ pluginId: "plugin-two", name: "Plugin Two", latestVersion: "2.0.0", description: "The second plugin" }),
    ]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin One")).toBeInTheDocument();
    });
    expect(screen.getByText("Plugin Two")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
    expect(screen.getByText("The first plugin")).toBeInTheDocument();
    expect(screen.getByText("The second plugin")).toBeInTheDocument();
  });

  it("renders the author and install count on each card", async () => {
    mockSearch.mockResolvedValue([makeEntry({ author: "Alice", installCount: 42 })]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("by Alice")).toBeInTheDocument();
    });
    expect(screen.getByText(/42 installs/)).toBeInTheDocument();
  });

  it("renders the category badge when the entry has a category", async () => {
    mockSearch.mockResolvedValue([makeEntry({ category: "security" })]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("security")).toBeInTheDocument();
    });
  });

  it("omits the author line when author is null", async () => {
    mockSearch.mockResolvedValue([makeEntry({ author: null })]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin One")).toBeInTheDocument();
    });
    expect(screen.queryByText(/by /)).not.toBeInTheDocument();
  });

  it("omits the category badge when category is null", async () => {
    mockSearch.mockResolvedValue([makeEntry({ category: null })]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin One")).toBeInTheDocument();
    });
    expect(screen.queryByText("monitoring")).not.toBeInTheDocument();
  });

  it("each card links to /plugins/registry/:pluginId", async () => {
    mockSearch.mockResolvedValue([makeEntry({ pluginId: "my-plugin" })]);
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("link")).toHaveAttribute("href", "/plugins/registry/my-plugin");
    });
  });

  it("re-queries when the search input changes", async () => {
    mockSearch.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No plugins found")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search plugins...");
    await user.type(searchInput, "auth");

    await waitFor(() => {
      // search was called with the typed value
      expect(mockSearch).toHaveBeenCalledWith("auth", undefined);
    });
  });

  it("re-queries when the category input changes", async () => {
    mockSearch.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<PluginRegistryBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No plugins found")).toBeInTheDocument();
    });

    const categoryInput = screen.getByPlaceholderText("Filter by category...");
    await user.type(categoryInput, "sec");

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(undefined, "sec");
    });
  });
});
