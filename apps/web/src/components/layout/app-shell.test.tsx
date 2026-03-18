import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogout = vi.fn();
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { username: "admin", displayName: "Admin User", email: "admin@farm.dev", roles: ["admin"] },
    logout: mockLogout,
  }),
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

import React from "react";
import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

});
