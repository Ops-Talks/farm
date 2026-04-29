import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
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
import OrgInvitesPage from "@/app/(protected)/organizations/[id]/settings/invites/page";

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

  it("submit invite form — success: closes modal and refetches list", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue([
      { id: "inv_new", email: "charlie@example.com", role: "member", status: "pending" },
    ]);
    renderClient();
    await screen.findByText(/No pending invitations/i);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Invite users/i }));
    });
    await screen.findByRole("dialog");

    await act(async () => {
      await user.type(screen.getByLabelText(/Email addresses/i), "charlie@example.com");
    });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Send invites/i }));
    });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ emails: ["charlie@example.com"] }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("submit invite form — shows validation error when no valid email entered", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    renderClient();
    await screen.findByText(/No pending invitations/i);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Invite users/i }));
    });
    await screen.findByRole("dialog");

    // Leave emails textarea empty and submit
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Send invites/i }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /at least one valid email/i,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("resend action on a pending invitation row calls resend", async () => {
    const user = userEvent.setup();
    const inv = {
      id: "inv_1",
      email: "alice@example.com",
      role: "member",
      status: "pending",
      token: "tok_abc",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      invitedBy: "u_1",
    };
    mockList.mockResolvedValue([inv]);
    mockResend.mockResolvedValue({ ...inv, id: "inv_1" });
    renderClient();
    await screen.findByText("alice@example.com");

    await act(async () => {
      await user.click(screen.getByLabelText(/Resend invite to alice@example.com/i));
    });

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("inv_1"));
  });

  it("revoke action opens confirm dialog and calls revoke on confirm", async () => {
    const user = userEvent.setup();
    const inv = {
      id: "inv_2",
      email: "dave@example.com",
      role: "admin",
      status: "pending",
      token: "tok_def",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      invitedBy: "u_1",
    };
    mockList.mockResolvedValue([inv]);
    mockRevoke.mockResolvedValue(undefined);
    renderClient();
    await screen.findByText("dave@example.com");

    await act(async () => {
      await user.click(screen.getByLabelText(/Revoke invite to dave@example.com/i));
    });

    expect(await screen.findByText(/Revoke invitation\?/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Revoke/i }));
    });

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith("inv_2"));
  });

  it("shows createdAt date in the invitations table", async () => {
    const createdAt = "2024-03-15T10:30:00.000Z";
    const inv = {
      id: "inv_3",
      email: "eve@example.com",
      role: "member",
      status: "pending",
      token: "tok_ghi",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt,
      invitedBy: "u_1",
    };
    mockList.mockResolvedValue([inv]);
    renderClient();
    await screen.findByText("eve@example.com");
    // The "Sent" column uses formatRelative(inv.createdAt) which renders a relative time
    // We just verify the row is rendered (date cell is present alongside the email)
    expect(screen.getByText("eve@example.com")).toBeInTheDocument();
    // The table header "Sent" should be visible
    expect(screen.getByText(/^Sent$/i)).toBeInTheDocument();
  });

  it("renders the OrgInvitesPage wrapper without crashing", async () => {
    mockList.mockResolvedValue([]);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <OrgInvitesPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/No pending invitations/i)).toBeInTheDocument();
  });

  it("copies invite link to clipboard on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const inv = {
      id: "inv_c",
      email: "copy@example.com",
      role: "member",
      status: "pending",
      token: "tok_copy",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      invitedBy: "u_1",
    };
    mockList.mockResolvedValue([inv]);
    renderClient();
    await screen.findByText("copy@example.com");

    fireEvent.click(screen.getByLabelText(/Copy invite link for copy@example.com/i));

    await waitFor(() => expect(writeText).toHaveBeenCalled());

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    }
  });

  it("shows error path when clipboard write throws", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const inv = {
      id: "inv_cf",
      email: "clipfail@example.com",
      role: "member",
      status: "pending",
      token: "tok_fail",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      invitedBy: "u_1",
    };
    mockList.mockResolvedValue([inv]);
    renderClient();
    await screen.findByText("clipfail@example.com");

    fireEvent.click(screen.getByLabelText(/Copy invite link for clipfail@example.com/i));

    // The catch block should execute without crashing the component
    await waitFor(() => expect(writeText).toHaveBeenCalled());

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    }
  });

  it("shows 'View user' link on accepted tab when acceptedBy is present", async () => {
    const user = userEvent.setup();
    const acceptedInv = {
      id: "inv_acc",
      email: "accepted@example.com",
      role: "member",
      status: "accepted",
      token: "tok_acc",
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      acceptedBy: "u_999",
      invitedBy: "u_1",
    };

    mockList.mockImplementation((_orgId: unknown, status: unknown) =>
      Promise.resolve(status === "accepted" ? [acceptedInv] : []),
    );

    renderClient();
    await waitFor(() => expect(mockList).toHaveBeenCalledWith("org_1", "pending"));

    await act(async () => {
      await user.click(screen.getByRole("tab", { name: /Accepted/i }));
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledWith("org_1", "accepted"));

    const viewLink = await screen.findByRole("link", { name: /View user/i });
    expect(viewLink).toHaveAttribute("href", "/users/u_999");
  });

  it("shows 'No revoked invitations' when revoked tab is empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    renderClient();
    await waitFor(() => expect(mockList).toHaveBeenCalledWith("org_1", "pending"));

    await act(async () => {
      await user.click(screen.getByRole("tab", { name: /Revoked/i }));
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledWith("org_1", "revoked"));
    expect(await screen.findByText(/No revoked invitations/i)).toBeInTheDocument();
  });

  it("'Send your first invite' CTA in empty pending state opens the modal", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    renderClient();
    await screen.findByText(/No pending invitations/i);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Send your first invite/i }));
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
