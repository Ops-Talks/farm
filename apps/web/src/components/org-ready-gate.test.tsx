import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { OrgReadyGate } from "./org-ready-gate";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockReplace = vi.fn();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: vi.fn(),
}));

vi.mock("@/components/shared/app-loading-fallback", () => ({
  AppLoadingFallback: () => <div data-testid="loading-fallback" />,
}));

import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/contexts/organization-context";

const mockOrg = { id: "org-1", name: "Acme", slug: "acme" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OrgReadyGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/dashboard";
  });

  it("renders loading fallback when auth is still loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: false,
      organizations: [],
      currentOrg: null,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>page</div></OrgReadyGate>);
    expect(screen.getByTestId("loading-fallback")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("renders loading fallback when org is still loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: true,
      organizations: [],
      currentOrg: null,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>page</div></OrgReadyGate>);
    expect(screen.getByTestId("loading-fallback")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("renders children when both auth and org are ready and org is selected", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: false,
      organizations: [mockOrg],
      currentOrg: mockOrg,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>page content</div></OrgReadyGate>);
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-fallback")).not.toBeInTheDocument();
  });

  it("shows loading fallback and redirects when authenticated user has zero orgs on a non-org route", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: false,
      organizations: [],
      currentOrg: null,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>page</div></OrgReadyGate>);
    expect(screen.getByTestId("loading-fallback")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/organizations/new");
  });

  it("renders children on /organizations/* routes even when org list is empty", () => {
    mockPathname = "/organizations/new";
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: false,
      organizations: [],
      currentOrg: null,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>create org form</div></OrgReadyGate>);
    expect(screen.getByText("create org form")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders children for unauthenticated user without redirecting", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
    vi.mocked(useOrganization).mockReturnValue({
      isLoading: false,
      organizations: [],
      currentOrg: null,
      switchOrg: vi.fn(),
      refreshOrgs: vi.fn(),
    });

    render(<OrgReadyGate><div>public content</div></OrgReadyGate>);
    expect(screen.getByText("public content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
