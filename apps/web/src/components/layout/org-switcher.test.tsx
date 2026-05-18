import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPush = vi.fn();
const mockSwitchOrg = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const mockOrganizations = [
  { id: "org-1", name: "Acme Corp", slug: "acme" },
  { id: "org-2", name: "Beta Inc", slug: "beta" },
];

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: vi.fn(),
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "alice", displayName: "Alice" },
  }),
}));

vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
}));

vi.mock("@/lib/otel-context", () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  getUserContext: vi.fn(() => null),
}));

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

import { useOrganization } from "@/contexts/organization-context";
import { OrgSwitcher } from "@/components/layout/org-switcher";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OrgSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading is true", () => {
    vi.mocked(useOrganization).mockReturnValue({
      organizations: [],
      currentOrg: null,
      isLoading: true,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    // Skeleton renders instead of the trigger button
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders 'Personal' label when no current org", () => {
    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: null,
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("renders current org name in trigger", () => {
    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: mockOrganizations[0] as Parameters<typeof useOrganization>[0] extends undefined ? never : ReturnType<typeof useOrganization>["currentOrg"],
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("opens dropdown and lists all organizations", async () => {
    const user = userEvent.setup();

    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: mockOrganizations[0] as ReturnType<typeof useOrganization>["currentOrg"],
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("filters orgs by search input", async () => {
    const user = userEvent.setup();

    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: mockOrganizations[0] as ReturnType<typeof useOrganization>["currentOrg"],
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search organizations/)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/Search organizations/), "beta");

    // "Beta Inc" should still be visible in the dropdown list
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    // "Acme Corp" should NOT appear as a menu item — only the trigger shows the current org
    // Use queryAllByText to check no dropdown item contains "Acme Corp"
    const acmeItems = screen
      .queryAllByText("Acme Corp")
      .filter((el) => el.closest('[data-slot="dropdown-menu-item"]'));
    expect(acmeItems).toHaveLength(0);
  });

  it("shows no-results message when search matches nothing", async () => {
    const user = userEvent.setup();

    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: null,
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search organizations/)).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/Search organizations/),
      "xyznonexistent",
    );

    await waitFor(() => {
      expect(screen.getByText("No organizations found.")).toBeInTheDocument();
    });
  });

  it("calls switchOrg when a non-active org item is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(useOrganization).mockReturnValue({
      organizations: mockOrganizations,
      currentOrg: mockOrganizations[0] as ReturnType<typeof useOrganization>["currentOrg"],
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Beta Inc"));
    expect(mockSwitchOrg).toHaveBeenCalledWith(mockOrganizations[1]);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("navigates to /organizations/new when 'Create organization' is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(useOrganization).mockReturnValue({
      organizations: [],
      currentOrg: null,
      isLoading: false,
      switchOrg: mockSwitchOrg,
      refreshOrgs: vi.fn(),
    });

    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Create organization")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Create organization"));
    expect(mockPush).toHaveBeenCalledWith("/organizations/new");
  });
});
