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

import React from "react";
import { AppShell } from "@/components/layout/app-shell";

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

    // Use getAllByText because links appear in both sidebar and mobile nav
    expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Catalog/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Deployments/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Docs/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Teams/i)[0]).toBeInTheDocument();
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

});
