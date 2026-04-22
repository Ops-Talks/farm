import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── Wrapper: fresh QueryClient per test so cache never leaks ──────────────────

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

const mockRouterBack = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plugin-abc" }),
  useRouter: () => ({ back: mockRouterBack }),
}));

const mockGetOne = vi.fn();
const mockGetVersions = vi.fn();
const mockInstall = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pluginRegistry: {
    getOne: () => mockGetOne(),
    getVersions: () => mockGetVersions(),
  },
  pluginInstances: {
    install: () => mockInstall(),
  },
}));

let mockIsAdmin = false;

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    hasRole: (role: string) => role === "admin" && mockIsAdmin,
  }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PluginRegistryDetailClient } from "@/app/(protected)/plugins/registry/[id]/_components/PluginRegistryDetailClient";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "uuid-1",
  pluginId: "plugin-abc",
  name: "Awesome Plugin",
  latestVersion: "1.2.3",
  description: "Does awesome things",
  author: "Jane Doe",
  category: "analytics",
  manifest: {},
  installCount: 42,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PluginRegistryDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = false;
    mockGetVersions.mockResolvedValue([]);
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it("shows skeleton placeholders while the entry is loading", () => {
    mockGetOne.mockReturnValue(new Promise(() => {}));
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it("shows 'Plugin not found' when the query resolves with null", async () => {
    mockGetOne.mockResolvedValue(null);
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin not found")).toBeInTheDocument();
    });
    expect(screen.getByText(/does not exist in the registry/)).toBeInTheDocument();
  });

  it("calls router.back() when the back button on the not-found page is clicked", async () => {
    mockGetOne.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Plugin not found")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Back to registry/i }));
    expect(mockRouterBack).toHaveBeenCalledOnce();
  });

  // ── Detail page: core fields ──────────────────────────────────────────────

  it("renders the entry name, description, pluginId, latestVersion, and installCount", async () => {
    mockGetOne.mockResolvedValue(makeEntry());
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Awesome Plugin")).toBeInTheDocument();
    });
    expect(screen.getByText("Does awesome things")).toBeInTheDocument();
    expect(screen.getByText("plugin-abc")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders optional author and category sections when they are present", async () => {
    mockGetOne.mockResolvedValue(makeEntry({ author: "Jane Doe", category: "analytics" }));
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("analytics")).toBeInTheDocument();
  });

  it("hides author and category sections when both are null", async () => {
    mockGetOne.mockResolvedValue(makeEntry({ author: null, category: null }));
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Awesome Plugin")).toBeInTheDocument();
    });
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("analytics")).not.toBeInTheDocument();
  });

  it("calls router.back() when the back button on the detail page is clicked", async () => {
    mockGetOne.mockResolvedValue(makeEntry());
    const user = userEvent.setup();
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Awesome Plugin")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Back to registry/i }));
    expect(mockRouterBack).toHaveBeenCalledOnce();
  });

  // ── Install button visibility ─────────────────────────────────────────────

  it("does not show the Install button for non-admin users", async () => {
    mockIsAdmin = false;
    mockGetOne.mockResolvedValue(makeEntry());
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Awesome Plugin")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Install/i })).not.toBeInTheDocument();
  });

  it("shows the Install button for admin users", async () => {
    mockIsAdmin = true;
    mockGetOne.mockResolvedValue(makeEntry());
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Install/i })).toBeInTheDocument();
    });
  });

  // ── Install mutation ──────────────────────────────────────────────────────

  it("shows a success toast with the plugin name when install succeeds", async () => {
    mockIsAdmin = true;
    mockGetOne.mockResolvedValue(makeEntry());
    mockInstall.mockResolvedValue({ id: "inst-1" });
    const user = userEvent.setup();
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Install/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Install/i }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Plugin "Awesome Plugin" installed successfully',
      );
    });
  });

  it("shows an error toast when install fails", async () => {
    mockIsAdmin = true;
    mockGetOne.mockResolvedValue(makeEntry());
    mockInstall.mockRejectedValue(new Error("Server error"));
    const user = userEvent.setup();
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Install/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Install/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to install plugin. Check server logs.",
      );
    });
  });

  it("shows 'Installing...' on the button while the mutation is pending", async () => {
    mockIsAdmin = true;
    mockGetOne.mockResolvedValue(makeEntry());
    mockInstall.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Install/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Install/i }));
    await waitFor(() => {
      expect(screen.getByText("Installing...")).toBeInTheDocument();
    });
  });

  // ── VersionHistory ────────────────────────────────────────────────────────

  it("shows version skeletons while version history is loading", async () => {
    mockGetOne.mockResolvedValue(makeEntry());
    mockGetVersions.mockReturnValue(new Promise(() => {}));
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Awesome Plugin")).toBeInTheDocument();
    });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows 'No versions recorded.' when the versions array is empty", async () => {
    mockGetOne.mockResolvedValue(makeEntry());
    mockGetVersions.mockResolvedValue([]);
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("No versions recorded.")).toBeInTheDocument();
    });
  });

  it("renders a badge for each version in the version history", async () => {
    mockGetOne.mockResolvedValue(makeEntry());
    mockGetVersions.mockResolvedValue(["0.9.0", "1.0.0", "1.1.0"]);
    render(<PluginRegistryDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("0.9.0")).toBeInTheDocument();
    });
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("1.1.0")).toBeInTheDocument();
  });
});
