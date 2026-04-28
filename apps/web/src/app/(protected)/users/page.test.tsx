import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/users",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const mockListUsers = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateRole = vi.fn();
const mockSuspend = vi.fn();
const mockReset = vi.fn();
const mockRemove = vi.fn();
const mockAudit = vi.fn();
vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, body: { message: string }) {
      super(body.message);
      this.status = status;
    }
  },
  userManagement: {
    list: (...a: unknown[]) => mockListUsers(...a),
    get: (...a: unknown[]) => mockGetUser(...a),
    updateRole: (...a: unknown[]) => mockUpdateRole(...a),
    suspend: (...a: unknown[]) => mockSuspend(...a),
    resetPassword: (...a: unknown[]) => mockReset(...a),
    remove: (...a: unknown[]) => mockRemove(...a),
    auditTrail: (...a: unknown[]) => mockAudit(...a),
  },
}));

let mockHasRole = (r: string) => r === "admin";
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u_1", username: "alice", roles: ["admin"] },
    hasRole: (r: string) => mockHasRole(r),
  }),
}));

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => ({
    organizations: [{ id: "org_1", name: "Acme", slug: "acme" }],
  }),
}));

import { UsersClient } from "@/app/(protected)/users/_components/UsersClient";

function renderClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <UsersClient />
    </QueryClientProvider>,
  );
}

const baseUser = {
  id: "u_2",
  username: "bob",
  email: "bob@example.com",
  displayName: "Bob",
  status: "active" as const,
  platformRoles: [],
  organizations: undefined as unknown,
  orgMemberships: [
    { orgId: "org_1", orgName: "Acme", orgSlug: "acme", role: "member" },
  ],
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
};

// Correct shape matching ManagedUser interface (suspended + lastLogin)
const managedUser = {
  id: "u_2",
  username: "bob",
  email: "bob@example.com",
  displayName: "Bob",
  roles: [],
  suspended: false,
  lastLogin: null,
  createdAt: new Date().toISOString(),
  orgMemberships: [
    { orgId: "org_1", orgName: "Acme", orgSlug: "acme", role: "member" as const },
  ],
};

describe("UsersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole = (r: string) => r === "admin";
  });

  it("shows 'All users' option for platform admin", async () => {
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    expect(
      screen.getByRole("option", { name: "All users" }),
    ).toBeInTheDocument();
  });

  it("hides 'All users' for non-admin and defaults to first org", async () => {
    mockHasRole = () => false;
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    expect(
      screen.queryByRole("option", { name: "All users" }),
    ).not.toBeInTheDocument();
    // Initial query should be scoped to org_1
    expect(mockListUsers).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org_1" }),
    );
  });

  it("renders empty state when no users returned", async () => {
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    expect(await screen.findByText(/No users found/i)).toBeInTheDocument();
  });

  it("renders user rows when list returns data", async () => {
    mockListUsers.mockResolvedValue({
      users: [baseUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    renderClient();
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("refetches with search param on input", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());

    const searchInput = screen.getByLabelText(/Search users/i);
    await act(async () => {
      await user.type(searchInput, "ali");
    });
    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "ali" }),
      ),
    );
  });

  it("refetches with role filter when changed", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/Role filter/i), "admin");
    });
    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "admin" }),
      ),
    );
  });

  it("refetches with status filter when 'suspended' is selected", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20 });
    renderClient();
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    await act(async () => {
      await user.selectOptions(screen.getByLabelText(/Status filter/i), "suspended");
    });
    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ status: "suspended" }),
      ),
    );
  });

  it("opens view details dialog with memberships and audit trail when clicking 'View details'", async () => {
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockAudit.mockResolvedValue([
      { id: "evt_1", action: "user.created", createdAt: new Date().toISOString(), actorUsername: "system" },
    ]);
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByRole("menuitem", { name: /View details/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Memberships/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Acme")).toBeInTheDocument();
    await waitFor(() => expect(mockAudit).toHaveBeenCalledWith("u_2"));
    expect(await screen.findByText(/Account created/i)).toBeInTheDocument();
  });

  it("opens change role dialog and calls updateRole on save", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockUpdateRole.mockResolvedValue({ orgId: "org_1", role: "admin" });
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByText(/Change role/i));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Change role for bob/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Save/i }));
    });

    await waitFor(() => expect(mockUpdateRole).toHaveBeenCalledWith("u_2", expect.objectContaining({ orgId: "org_1" })));
  });

  it("opens reset password dialog and displays tempPassword when fallback=true", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockReset.mockResolvedValue({
      tempPassword: "TmpP@ss99",
      tempPasswordExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      fallback: true,
    });
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByText(/Reset password/i));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Reset password/i }));
    });

    expect(await screen.findByText("TmpP@ss99")).toBeInTheDocument();
    expect(mockReset).toHaveBeenCalledWith("u_2");
  });

  it("opens delete user dialog and calls remove after typing DELETE", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockRemove.mockResolvedValue(undefined);
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByText(/Delete user/i));

    expect(await screen.findByText(/Delete user globally/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText("DELETE");
    await act(async () => {
      await user.type(input, "DELETE");
    });

    const deleteBtn = screen.getByRole("button", { name: /Delete user/i });
    expect(deleteBtn).not.toBeDisabled();
    await act(async () => {
      await user.click(deleteBtn);
    });

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("u_2", undefined));
  });

  it("opens suspend confirm dialog and calls suspend mutation on confirm", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockSuspend.mockResolvedValue({ id: "u_2", suspended: true });
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByRole("menuitem", { name: /Suspend/i }));

    expect(await screen.findByText(/Suspend user\?/i)).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Suspend/i }));
    });

    await waitFor(() =>
      expect(mockSuspend).toHaveBeenCalledWith("u_2", true),
    );
  });

  it("opens remove from org confirm dialog and calls remove with orgId", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue({
      users: [managedUser],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockRemove.mockResolvedValue(undefined);
    renderClient();
    await screen.findByText("Bob");

    // Use fireEvent.click to open the Base UI dropdown menu
    fireEvent.click(screen.getByLabelText(/Actions for bob/i));
    fireEvent.click(screen.getByText(/Remove from Acme/i));

    expect(await screen.findByText(/Remove user from organisation\?/i)).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Remove/i }));
    });

    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith("u_2", "org_1"),
    );
  });

  it("shows pagination controls and navigates to next page when total > 20", async () => {
    const user = userEvent.setup();
    // Generate 21 unique users to trigger pagination
    const users = Array.from({ length: 20 }, (_, i) => ({
      ...managedUser,
      id: `u_${i + 10}`,
      username: `user${i}`,
      email: `user${i}@example.com`,
      displayName: `User ${i}`,
    }));
    mockListUsers.mockResolvedValue({
      users,
      total: 41,
      page: 1,
      pageSize: 20,
    });
    renderClient();
    await screen.findByText("User 0");

    const nextBtn = await screen.findByRole("button", { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();

    mockListUsers.mockResolvedValue({ users, total: 41, page: 2, pageSize: 20 });
    await act(async () => {
      await user.click(nextBtn);
    });

    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});
