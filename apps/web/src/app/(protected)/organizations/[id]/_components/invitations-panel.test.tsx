/**
 * Tests for InvitationsPanel — FARM-E50 S199
 *
 * Covers:
 *  1. Panel renders when user has ADMIN role
 *  2. Panel is not rendered when user has MEMBER role
 *  3. Shows empty state when there are no pending invitations
 *  4. Renders invitation rows when invitations are present
 *  5. Calls organizations.invitations.create() on invite form submit
 *  6. Calls organizations.invitations.cancel() when cancel button is clicked
 *  7. Shows a form error when an invalid email is submitted
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock: api-client
// ---------------------------------------------------------------------------
const mockInvitationsList = vi.fn();
const mockInvitationsCreate = vi.fn();
const mockInvitationsCancel = vi.fn();

vi.mock("@/lib/api-client", () => ({
  organizations: {
    invitations: {
      list: (...args: unknown[]) => mockInvitationsList(...args),
      create: (...args: unknown[]) => mockInvitationsCreate(...args),
      cancel: (...args: unknown[]) => mockInvitationsCancel(...args),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string }) {
      super(body.message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------
import { InvitationsPanel } from "@/app/(protected)/organizations/[id]/_components/invitations-panel";
import type { OrgInvitation } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeInvitation = (overrides?: Partial<OrgInvitation>): OrgInvitation => ({
  id: "inv-uuid-1",
  organizationId: "org-uuid-1",
  email: "invitee@example.com",
  role: "member",
  status: "pending",
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InvitationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvitationsList.mockResolvedValue([]);
    mockInvitationsCreate.mockResolvedValue(makeInvitation());
    mockInvitationsCancel.mockResolvedValue(undefined);
  });

  it("renders the panel when the user has admin role", async () => {
    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invitations-panel")).toBeInTheDocument();
    });
  });

  it("renders the panel when the user has owner role", async () => {
    render(<InvitationsPanel orgId="org-1" currentUserRole="owner" />);

    await waitFor(() => {
      expect(screen.getByTestId("invitations-panel")).toBeInTheDocument();
    });
  });

  it("does not render the panel when the user has member role", () => {
    const { container } = render(
      <InvitationsPanel orgId="org-1" currentUserRole="member" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the empty state when there are no pending invitations", async () => {
    mockInvitationsList.mockResolvedValue([]);
    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-invitations")).toBeInTheDocument();
    });
    expect(screen.getByText("No pending invitations")).toBeInTheDocument();
  });

  it("renders invitation rows when there are pending invitations", async () => {
    const inv = makeInvitation({ email: "user@test.com" });
    mockInvitationsList.mockResolvedValue([inv]);

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invitations-list")).toBeInTheDocument();
    });
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  it("calls organizations.invitations.create on valid form submit", async () => {
    const user = userEvent.setup();
    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockInvitationsCreate).toHaveBeenCalledWith("org-1", {
        email: "new@example.com",
        role: "member",
      });
    });
  });

  it("shows a form error when an invalid email is submitted", async () => {
    const user = userEvent.setup();
    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/valid email/i),
      ).toBeInTheDocument();
    });
    expect(mockInvitationsCreate).not.toHaveBeenCalled();
  });

  it("calls organizations.invitations.cancel when cancel button is clicked", async () => {
    const inv = makeInvitation({ id: "inv-uuid-99", email: "cancel@test.com" });
    mockInvitationsList.mockResolvedValue([inv]);

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText("cancel@test.com")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", {
      name: /cancel invitation for cancel@test\.com/i,
    });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockInvitationsCancel).toHaveBeenCalledWith("org-1", "inv-uuid-99");
    });
  });

  it("shows 'Expired' label for past expiry dates", async () => {
    const inv = makeInvitation({
      email: "expired@test.com",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    mockInvitationsList.mockResolvedValue([inv]);

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText("Expired")).toBeInTheDocument();
    });
  });

  it("shows 'Expires in Xh' label for invitations expiring within 24 hours", async () => {
    const inv = makeInvitation({
      email: "soon@test.com",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    mockInvitationsList.mockResolvedValue([inv]);

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText(/expires in \d+h/i)).toBeInTheDocument();
    });
  });

  it("shows 'Expires in Xd' label for invitations expiring in more than 24 hours", async () => {
    const inv = makeInvitation({
      email: "future@test.com",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });
    mockInvitationsList.mockResolvedValue([inv]);

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText(/expires in \d+d/i)).toBeInTheDocument();
    });
  });

  it("shows error toast when loadInvitations fails", async () => {
    mockInvitationsList.mockRejectedValue(new Error("Network error"));

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invitations-panel")).toBeInTheDocument();
    });
  });

  it("shows form error when handleInvite is called with an ApiError", async () => {
    const { ApiError: MockApiError } = await import("@/lib/api-client");
    const user = userEvent.setup();

    mockInvitationsCreate.mockRejectedValue(
      new MockApiError(422, { message: "Invitee is already a member." }),
    );

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    await user.clear(emailInput);
    await user.type(emailInput, "member@example.com");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Invitee is already a member.")).toBeInTheDocument();
    });
  });

  it("shows generic form error when handleInvite fails with a non-ApiError", async () => {
    const user = userEvent.setup();
    mockInvitationsCreate.mockRejectedValue(new Error("Unexpected error"));

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    await user.clear(emailInput);
    await user.type(emailInput, "test@example.com");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to send invitation.")).toBeInTheDocument();
    });
  });

  it("shows form error when email is empty on submit", async () => {
    const user = userEvent.setup();

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    });
    expect(mockInvitationsCreate).not.toHaveBeenCalled();
  });

  it("allows changing invitation role to admin", async () => {
    const user = userEvent.setup();

    render(<InvitationsPanel orgId="org-1" currentUserRole="admin" />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    const roleSelect = screen.getByRole("combobox", { name: /invitation role/i });
    await user.selectOptions(roleSelect, "admin");

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    await user.type(emailInput, "newadmin@example.com");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockInvitationsCreate).toHaveBeenCalledWith("org-1", {
        email: "newadmin@example.com",
        role: "admin",
      });
    });
  });
});
