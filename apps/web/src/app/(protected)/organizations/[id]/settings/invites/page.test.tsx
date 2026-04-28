import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/organizations/org_1/settings/invites",
  useParams: () => ({ id: "org_1" }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockResend = vi.fn();
const mockRevoke = vi.fn();
vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, body: { message: string }) {
      super(body.message);
      this.status = status;
    }
  },
  invitations: {
    list: (...a: unknown[]) => mockList(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    resend: (...a: unknown[]) => mockResend(...a),
    revoke: (...a: unknown[]) => mockRevoke(...a),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u_1", username: "alice", roles: ["admin"] } }),
}));

import {
  parseEmails,
  OrgInvitesClient,
} from "@/app/(protected)/organizations/[id]/settings/invites/_components/OrgInvitesClient";

function renderClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <OrgInvitesClient />
    </QueryClientProvider>,
  );
}

describe("parseEmails", () => {
  it("splits on commas, semicolons, and newlines", () => {
    const r = parseEmails("a@x.com, b@x.com\nc@x.com;d@x.com");
    expect(r.valid).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
    expect(r.invalid).toEqual([]);
  });

  it("lowercases and dedupes", () => {
    const r = parseEmails("Alice@X.com, ALICE@x.com");
    expect(r.valid).toEqual(["alice@x.com"]);
  });

  it("collects invalid entries", () => {
    const r = parseEmails("good@x.com, not-an-email, also@bad");
    expect(r.valid).toEqual(["good@x.com"]);
    expect(r.invalid).toEqual(["not-an-email", "also@bad"]);
  });

  it("ignores empty whitespace tokens", () => {
    const r = parseEmails("  ,a@x.com,,, ");
    expect(r.valid).toEqual(["a@x.com"]);
    expect(r.invalid).toEqual([]);
  });
});

describe("OrgInvitesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no invitations exist", async () => {
    mockList.mockResolvedValueOnce([]);
    renderClient();
    expect(await screen.findByText(/No pending invitations/i)).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith("org_1", "pending");
  });

  it("renders the invitations table when list returns data", async () => {
    mockList.mockResolvedValue([
      {
        id: "inv_1",
        email: "alice@example.com",
        role: "member",
        status: "pending",
        token: "tok_abc",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        invitedBy: "u_1",
      },
    ]);
    renderClient();
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
  });

  it("switches tabs and refetches with new status", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    renderClient();
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith("org_1", "pending"),
    );
    await act(async () => {
      await user.click(screen.getByRole("tab", { name: /Accepted/i }));
    });
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith("org_1", "accepted"),
    );
  });

  it("opens the invite modal when clicking 'Invite users'", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    renderClient();
    await screen.findByText(/No pending invitations/i);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Invite users/i }));
    });
    expect(
      await screen.findByRole("dialog"),
    ).toBeInTheDocument();
  });
});
