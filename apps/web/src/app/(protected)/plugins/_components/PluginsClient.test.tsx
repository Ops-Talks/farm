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

// -- Mock API client ----------------------------------------------------------
const mockListPlugins = vi.fn();
const mockReloadPlugins = vi.fn();

vi.mock("@/lib/api-client", () => ({
  plugins: {
    list: () => mockListPlugins(),
    reload: () => mockReloadPlugins(),
  },
}));

// -- Mock auth context ---------------------------------------------------------
let mockIsAdmin = false;

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    hasRole: (role: string) => role === "admin" && mockIsAdmin,
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// -- Mock sonner toast --------------------------------------------------------
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PluginsClient } from "@/app/(protected)/plugins/_components/PluginsClient";
import { toast } from "sonner";

// -- Fixtures -----------------------------------------------------------------
const mockPlugin = (overrides: Partial<{
  name: string;
  version: string;
  description: string;
  menuItems: { label: string; path: string }[];
  routes: { path: string; module: string }[];
}> = {}) => ({
  name: "example-plugin",
  version: "1.0.0",
  description: "An example Farm plugin",
  menuItems: [],
  routes: [],
  ...overrides,
});

// -- Tests --------------------------------------------------------------------
describe("PluginsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = false;
  });

  it("should render the page title", async () => {
    mockListPlugins.mockResolvedValue([]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin Marketplace")).toBeInTheDocument();
    });
  });

  it("should show empty state when no plugins are installed", async () => {
    mockListPlugins.mockResolvedValue([]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No plugins installed")).toBeInTheDocument();
    });
    expect(screen.getByText(/Drop a plugin\.json/)).toBeInTheDocument();
  });

  it("should display plugin cards with name, version, and description", async () => {
    mockListPlugins.mockResolvedValue([
      mockPlugin({
        name: "auth-plugin",
        version: "2.1.0",
        description: "Adds OAuth2 support",
      }),
    ]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("auth-plugin")).toBeInTheDocument();
    });
    expect(screen.getByText("v2.1.0")).toBeInTheDocument();
    expect(screen.getByText("Adds OAuth2 support")).toBeInTheDocument();
  });

  it("should show badge counts for menu items and routes", async () => {
    mockListPlugins.mockResolvedValue([
      mockPlugin({
        menuItems: [
          { label: "My Feature", path: "/my-feature" },
          { label: "Settings", path: "/settings" },
        ],
        routes: [{ path: "/my-feature", module: "my-feature/index" }],
      }),
    ]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("2 menu items")).toBeInTheDocument();
    });
    expect(screen.getByText("1 route")).toBeInTheDocument();
  });

  it("should show menu item labels when present", async () => {
    mockListPlugins.mockResolvedValue([
      mockPlugin({
        menuItems: [{ label: "Custom Page", path: "/custom" }],
      }),
    ]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Custom Page")).toBeInTheDocument();
    });
  });

  it("should NOT show Reload Plugins button for non-admin users", async () => {
    mockIsAdmin = false;
    mockListPlugins.mockResolvedValue([]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin Marketplace")).toBeInTheDocument();
    });
    expect(screen.queryByText("Reload Plugins")).not.toBeInTheDocument();
  });

  it("should show Reload Plugins button for admin users", async () => {
    mockIsAdmin = true;
    mockListPlugins.mockResolvedValue([]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Reload Plugins")).toBeInTheDocument();
    });
  });

  it("should open confirmation dialog when Reload Plugins is clicked", async () => {
    mockIsAdmin = true;
    mockListPlugins.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Reload Plugins")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Reload Plugins"));
    expect(screen.getByText("Reload plugins?")).toBeInTheDocument();
  });

  it("should call reload API and show success toast on confirmation", async () => {
    mockIsAdmin = true;
    mockListPlugins.mockResolvedValue([]);
    mockReloadPlugins.mockResolvedValue({ scanned: 3 });
    const user = userEvent.setup();
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Reload Plugins")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Reload Plugins"));
    await user.click(screen.getByText("Reload"));
    await waitFor(() => {
      expect(mockReloadPlugins).toHaveBeenCalledOnce();
    });
    expect(toast.success).toHaveBeenCalledWith("Plugin scan complete — 3 plugins found");
  });

  it("should show error toast when reload fails", async () => {
    mockIsAdmin = true;
    mockListPlugins.mockResolvedValue([]);
    mockReloadPlugins.mockRejectedValue(new Error("Server error"));
    const user = userEvent.setup();
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Reload Plugins")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Reload Plugins"));
    await user.click(screen.getByText("Reload"));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to reload plugins. Check server logs.");
    });
  });

  it("should handle API errors gracefully and show empty state", async () => {
    mockListPlugins.mockRejectedValue(new Error("Network error"));
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No plugins installed")).toBeInTheDocument();
    });
  });

  it("should render an Installed badge on each plugin card", async () => {
    mockListPlugins.mockResolvedValue([mockPlugin(), mockPlugin({ name: "second-plugin" })]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      const badges = screen.getAllByText("Installed");
      expect(badges).toHaveLength(2);
    });
  });

  it("should show Grid view and List view toggle buttons", async () => {
    mockListPlugins.mockResolvedValue([]);
    render(<PluginsClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Grid view" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "List view" })).toBeInTheDocument();
  });

  it("should switch to list view when List view button is clicked", async () => {
    const user = userEvent.setup();
    mockListPlugins.mockResolvedValue([
      mockPlugin({ name: "list-plugin", description: "A plugin in list view" }),
    ]);
    render(<PluginsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("list-plugin")).toBeInTheDocument();
    });

    // Switch to list view
    await user.click(screen.getByRole("button", { name: "List view" }));

    // Plugin should still be visible in list format
    expect(screen.getByText("list-plugin")).toBeInTheDocument();
  });

  it("should toggle back to grid view after switching to list", async () => {
    const user = userEvent.setup();
    mockListPlugins.mockResolvedValue([mockPlugin()]);
    render(<PluginsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("example-plugin")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "List view" }));
    await user.click(screen.getByRole("button", { name: "Grid view" }));

    // Plugin still visible
    expect(screen.getByText("example-plugin")).toBeInTheDocument();
  });
});
