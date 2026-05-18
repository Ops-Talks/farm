import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted configurable mock state — available inside vi.mock() factories.
// ---------------------------------------------------------------------------
const mockPathnameReturn = vi.hoisted(() => vi.fn(() => "/dashboard"));
const mockRouterPush = vi.hoisted(() => vi.fn());
const mockTheme = vi.hoisted(() => ({ current: "light" as string }));
const mockSetTheme = vi.hoisted(() => vi.fn());
const mockAuthUser = vi.hoisted(() => ({
  current: {
    id: "u1",
    username: "admin",
    displayName: "Admin User" as string | null | undefined,
    email: "admin@farm.dev",
    roles: ["admin"],
  } as {
    id: string;
    username: string;
    displayName: string | null | undefined;
    email: string;
    roles: string[];
  } | null,
}));

const mockLogout = vi.fn();
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser.current,
    logout: mockLogout,
    isAuthenticated: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathnameReturn(),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    setTheme: mockSetTheme,
    resolvedTheme: mockTheme.current,
    themes: ["light", "dark", "system"],
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => ({
    organizations: [],
    currentOrg: null,
    isLoading: false,
    switchOrg: vi.fn(),
    refreshOrgs: vi.fn(),
  }),
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// FeatureAvailabilityProvider uses useQuery — mock the entire context module
// so no QueryClient is needed in AppShell tests.
vi.mock("@/contexts/feature-availability-context", () => ({
  FeatureAvailabilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFeatureAvailability: () => ({
    kubernetes: false, cost: false, registry: false, helm: false, istio: false,
    allConfigured: false, isLoading: false,
  }),
}));

// SearchModal uses useQuery — mock it as a simple stub.
vi.mock("@/components/search/search-modal", () => ({
  SearchModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="search-modal-stub" /> : null,
}));

// AdvancedSearchModal replaced SearchModal in app-shell — stub it with the same testid.
vi.mock("@/components/search/advanced-search-modal", () => ({
  AdvancedSearchModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="search-modal-stub" /> : null,
}));

// Mock OTel helpers — org-switcher now imports these.
vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
  startSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
}));
vi.mock("@/lib/otel-context", () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  getUserContext: vi.fn(() => null),
}));

// OrgSwitcher now calls useQueryClient() — stub it so no QueryClientProvider
// wrapper is needed in AppShell tests.
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { fireEvent } from "@testing-library/react";

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset configurable mock state to the default happy-path values.
    mockAuthUser.current = {
      id: "u1",
      username: "admin",
      displayName: "Admin User",
      email: "admin@farm.dev",
      roles: ["admin"],
    };
    mockPathnameReturn.mockReturnValue("/dashboard");
    mockTheme.current = "light";
  });

  it("should render sidebar navigation links", () => {
    render(<AppShell>Main Content</AppShell>);

    // Use getAllByText because links appear in both sidebar and mobile nav.
    // All of these are in the Operations section which is open for /dashboard.
    expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Catalog/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Deployments/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Pipelines/i)[0]).toBeInTheDocument();
    // Note: Teams is in the Organization section which is collapsed by default
    // at /dashboard — it is intentionally not checked here.
  });

  it("should render sidebar section labels", () => {
    render(<AppShell>Main Content</AppShell>);
    expect(screen.getAllByText(/Operations/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Observability/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Infrastructure/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Self-Service/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Organization/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Settings/i)[0]).toBeInTheDocument();
  });

  it("should keep the desktop sidebar constrained to the viewport", () => {
    render(<AppShell>Main Content</AppShell>);

    const sidebar = screen.getByLabelText("Sidebar");
    expect(sidebar).toHaveClass("sticky", "top-0", "h-screen", "min-h-0");

    const desktopNav = screen.getByRole("navigation", { name: /Main navigation/i });
    expect(desktopNav).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
  });

  it("should mark the active nav item with aria-current=page", () => {
    // setup.ts mocks usePathname to return "/dashboard"
    render(<AppShell>Content</AppShell>);

    // NavItem now renders a <Link> (anchor), not a <button>
    const dashboardLinks = screen.getAllByRole("link", { name: /Dashboard/i });
    // At least one (sidebar) should be marked as current page
    const activeLinks = dashboardLinks.filter(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(activeLinks.length).toBeGreaterThan(0);
  });

  it("should render children content", () => {
    render(<AppShell><div data-testid="test-content">Main Content</div></AppShell>);
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
  });

  it("should display user initials and display name", () => {
    render(<AppShell>Content</AppShell>);
    // Initials for "Admin User" should be "AU"
    expect(screen.getByText("AU")).toBeInTheDocument();
    expect(screen.getAllByText(/Admin User/i).length).toBeGreaterThan(0);
  });

  it("should open user menu and show details", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    // Wait for dropdown content to appear (it might be in a Portal)
    await waitFor(() => {
      expect(screen.getByText(/admin@farm\.dev/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Roles: admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign out/i)).toBeInTheDocument();
  });

  it("should call logout when sign out is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    await waitFor(() => {
      expect(screen.getByText(/Sign out/i)).toBeInTheDocument();
    });
    
    await user.click(screen.getByText(/Sign out/i));

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should cycle theme when theme item is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    await waitFor(() => {
      expect(screen.getByText(/Theme:/i)).toBeInTheDocument();
    });

    const themeItem = screen.getByText(/Theme:/i);
    await user.click(themeItem);

    // setTheme should be called (from next-themes mock in setup.ts)
  });

  it("should show 'Dark' as theme label and cycle to system when theme is dark", async () => {
    mockTheme.current = "dark";
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    await waitFor(() => {
      expect(screen.getByText("Theme: Dark")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Theme: Dark"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("should show 'System' as theme label and cycle to light when theme is system", async () => {
    mockTheme.current = "system";
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    await waitFor(() => {
      expect(screen.getByText("Theme: System")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Theme: System"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("should use username for initials when displayName is absent", () => {
    mockAuthUser.current = {
      id: "u2",
      username: "john.doe",
      displayName: undefined,
      email: "john@example.com",
      roles: ["viewer"],
    };
    render(<AppShell>Content</AppShell>);
    // getInitials("john.doe") splits on [._-] → ["john", "doe"] → "JD"
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should show '?' initials when user is null", () => {
    mockAuthUser.current = null;
    render(<AppShell>Content</AppShell>);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("should render breadcrumbs for a multi-segment pathname", () => {
    mockPathnameReturn.mockReturnValue("/catalog/my-service");
    render(<AppShell>Content</AppShell>);

    // First crumb (non-last) renders as a link; second (last) as a span.
    const catalogLinks = screen.getAllByRole("link", { name: /Catalog/i });
    expect(catalogLinks.length).toBeGreaterThan(0);
    expect(screen.getByText("My service")).toBeInTheDocument();
  });

  it("should mark /compliance/policies active via longest-prefix matching", () => {
    mockPathnameReturn.mockReturnValue("/compliance/policies");
    render(<AppShell>Content</AppShell>);

    // /compliance/policies (length 22) wins over /compliance (length 11).
    const tagPolicyLinks = screen.getAllByRole("link", { name: /Tag Policies/i });
    const activeLinks = tagPolicyLinks.filter(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(activeLinks.length).toBeGreaterThan(0);

    // /compliance itself must NOT be marked active.
    const complianceLinks = screen.getAllByRole("link", { name: /^Compliance$/i });
    complianceLinks.forEach((link) => {
      expect(link.getAttribute("aria-current")).not.toBe("page");
    });
  });

  it("should open the mobile navigation sheet when the hamburger button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const hamburger = screen.getByRole("button", { name: /Open navigation menu/i });
    await user.click(hamburger);

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /Mobile navigation/i })).toBeInTheDocument();
    });
  });

  it("should make the mobile navigation scrollable", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    await user.click(screen.getByRole("button", { name: /Open navigation menu/i }));

    const mobileNav = await screen.findByRole("navigation", { name: /Mobile navigation/i });
    expect(mobileNav).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
  });

  it("should use the startsWith rule when pathname extends a nav href", () => {
    mockPathnameReturn.mockReturnValue("/catalog/some-id");
    render(<AppShell>Content</AppShell>);

    // /catalog should be active because /catalog/some-id starts with /catalog/
    const catalogLinks = screen.getAllByRole("link", { name: /^Catalog$/i });
    const activeLinks = catalogLinks.filter(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(activeLinks.length).toBeGreaterThan(0);
  });

  it("should navigate to /profile when Profile menu item is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const userTrigger = screen.getByRole("button", { name: /Admin User/i });
    await user.click(userTrigger);

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Profile"));

    expect(mockRouterPush).toHaveBeenCalledWith("/profile");
  });

  it("should open SearchModal when Cmd+K is pressed", () => {
    render(<AppShell>Content</AppShell>);
    // SearchModal stub is not rendered initially (searchOpen = false)
    expect(screen.queryByTestId("search-modal-stub")).toBeNull();

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(screen.getByTestId("search-modal-stub")).toBeInTheDocument();
  });

  it("should open SearchModal when Search button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const searchBtn = screen.getByRole("button", { name: /Quick search/i });
    await user.click(searchBtn);

    expect(screen.getByTestId("search-modal-stub")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // T316 / T317 — Collapsible accordion sections (ST349–ST353)
  // -------------------------------------------------------------------------

  it("should collapse all sections except the active one by default", () => {
    // mockPathnameReturn returns "/dashboard" which is in Operations
    render(<AppShell>Content</AppShell>);

    // Operations section toggle button should have aria-expanded="true"
    const opsButtons = screen.getAllByRole("button", { name: /Operations/i });
    expect(opsButtons[0]).toHaveAttribute("aria-expanded", "true");

    // Observability section toggle should be collapsed
    const obsButtons = screen.getAllByRole("button", { name: /Observability/i });
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "false");
  });

  it("should expand a collapsed section when its header button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    // Observability is collapsed initially (not the active section for /dashboard)
    const obsButtons = screen.getAllByRole("button", { name: /Observability/i });
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "false");

    await user.click(obsButtons[0]);

    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "true");
  });

  it("should collapse an open section when its header button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    // Observability is collapsed initially (not the active section for /dashboard).
    // Expand it first, then collapse it again.
    const obsButtons = screen.getAllByRole("button", { name: /Observability/i });
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "false");

    await user.click(obsButtons[0]);
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "true");

    await user.click(obsButtons[0]);
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "false");
  });

  it("should not render items of a collapsed section", () => {
    // /dashboard → Operations is open. Observability is collapsed.
    render(<AppShell>Content</AppShell>);

    // Dashboard is in Operations (open); should be in DOM
    const dashLinks = screen.getAllByRole("link", { name: /^Dashboard$/i });
    expect(dashLinks.length).toBeGreaterThan(0);

    // SLOs is in Observability (collapsed); should not be in DOM
    expect(screen.queryByRole("link", { name: /^SLOs$/i })).toBeNull();
  });

  // -------------------------------------------------------------------------
  // getInitialCollapsed: unknown pathname → all sections open (empty Set)
  // -------------------------------------------------------------------------

  it("should open all sections when the pathname matches no nav section", () => {
    mockPathnameReturn.mockReturnValue("/unknown-page");
    render(<AppShell>Content</AppShell>);

    // With an empty initial collapsed set, every section toggle is expanded.
    const opsButtons = screen.getAllByRole("button", { name: /Operations/i });
    expect(opsButtons[0]).toHaveAttribute("aria-expanded", "true");

    const obsButtons = screen.getAllByRole("button", { name: /Observability/i });
    expect(obsButtons[0]).toHaveAttribute("aria-expanded", "true");
  });

  // -------------------------------------------------------------------------
  // effectiveCollapsed: force-expand the active section even if user collapsed it
  // -------------------------------------------------------------------------

  it("should keep the active desktop section expanded when the user tries to collapse it", async () => {
    // /dashboard → Operations is the active section.
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    const opsButtons = screen.getAllByRole("button", { name: /Operations/i });
    // Initially expanded (active section).
    expect(opsButtons[0]).toHaveAttribute("aria-expanded", "true");

    // Click to "collapse" the active section — effectiveCollapsed must re-expand it.
    await user.click(opsButtons[0]);

    // The active section must remain expanded.
    expect(opsButtons[0]).toHaveAttribute("aria-expanded", "true");
  });

  it("should keep the active mobile section expanded when the user tries to collapse it", async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    // Open the mobile drawer.
    await user.click(screen.getByRole("button", { name: /Open navigation menu/i }));
    const mobileNav = await screen.findByRole("navigation", { name: /Mobile navigation/i });

    // Operations is the active section; find its toggle inside the mobile nav.
    const mobileOpsButtons = Array.from(
      mobileNav.querySelectorAll("button"),
    ).filter((b) => b.textContent?.includes("Operations"));
    expect(mobileOpsButtons[0]).toBeTruthy();
    expect(mobileOpsButtons[0]).toHaveAttribute("aria-expanded", "true");

    // Try to collapse it.
    await user.click(mobileOpsButtons[0]!);

    // effectiveMobileCollapsed must re-expand the active section.
    expect(mobileOpsButtons[0]).toHaveAttribute("aria-expanded", "true");
  });
});
