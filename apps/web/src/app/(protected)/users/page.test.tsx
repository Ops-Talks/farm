import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
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
});
