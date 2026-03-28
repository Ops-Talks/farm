import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetOrg = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/organizations/org-1",
  useParams: () => ({ id: "org-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  organizations: {
    get: (...args: unknown[]) => mockGetOrg(...args),
    update: vi.fn().mockResolvedValue({}),
    members: {
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      add: vi.fn(),
      remove: vi.fn(),
    },
    invitations: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      cancel: vi.fn(),
    },
    delete: vi.fn(),
  },
  auth: {
    getUsers: vi.fn().mockResolvedValue([]),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string | string[] }) {
      super(typeof body.message === "string" ? body.message : body.message.join(", "));
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "admin", displayName: "Admin", roles: ["admin"] },
    hasRole: (r: string) => r === "admin",
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
}));

import { OrgDetailClient } from "@/app/(protected)/organizations/[id]/_components/OrgDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeOrg = () => ({
  id: "org-1",
  name: "Acme Corp",
  slug: "acme",
  description: "Main organization",
  ownerId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OrgDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons initially", () => {
    mockGetOrg.mockReturnValue(new Promise(() => {}));
    render(<OrgDetailClient />);
    // Loading state shows skeleton elements — no heading text yet
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders org name and slug once loaded", async () => {
    mockGetOrg.mockResolvedValue(makeOrg());
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
    });
    expect(screen.getByText(/slug: acme/)).toBeInTheDocument();
  });

  it("renders 'Organization Not Found' when org fetch fails", async () => {
    mockGetOrg.mockRejectedValue(new Error("Not Found"));
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Organization Not Found")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Back to Organizations" }),
    ).toBeInTheDocument();
  });

  it("navigates to /organizations when back button is clicked", async () => {
    const user = userEvent.setup();
    mockGetOrg.mockRejectedValue(new Error("Not Found"));
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Back to Organizations" }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Back to Organizations" }));
    expect(mockPush).toHaveBeenCalledWith("/organizations");
  });

  it("renders description when available", async () => {
    mockGetOrg.mockResolvedValue(makeOrg());
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Main organization")).toBeInTheDocument();
    });
  });

  it("renders the org settings form section", async () => {
    mockGetOrg.mockResolvedValue(makeOrg());
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("General Settings")).toBeInTheDocument();
    });
  });

  it("renders the danger zone for the org owner", async () => {
    mockGetOrg.mockResolvedValue(makeOrg()); // ownerId "u1" matches auth user
    render(<OrgDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    });
  });
});



