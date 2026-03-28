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
});
