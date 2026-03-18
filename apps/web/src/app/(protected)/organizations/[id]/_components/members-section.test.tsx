/**
 * Tests for MembersSection — FARM-S87
 *
 * Covers:
 *  1. Member list renders when data is loaded
 *  2. "Add Member" form is gated by canManage prop
 *  3. organizations.members.add() is called on form submit
 *  4. organizations.members.remove() is called after removal is confirmed
 *  5. Role change select is absent for owner-role entries (role is immutable)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock: @base-ui/react/dialog
// The dialog primitive relies on browser portal / focus management APIs that
// are not available in jsdom.  We replace it with simple pass-through
// components so ConfirmDialog renders synchronously in tests.
// ---------------------------------------------------------------------------
vi.mock("@base-ui/react/dialog", async () => {
  const React = await import("react");

  return {
    Dialog: {
      Root: ({
        children,
        open,
      }: {
        children: React.ReactNode;
        open: boolean;
      }) => (open ? <>{children}</> : null),
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Backdrop: () => null,
      Popup: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
      Title: ({ children }: { children: React.ReactNode }) => (
        <h2>{children}</h2>
      ),
      Description: ({ children }: { children: React.ReactNode }) => (
        <p>{children}</p>
      ),
      Close: ({
        children,
        render: renderProp,
      }: {
        children: React.ReactNode;
        render?: React.ReactElement;
      }) => {
        if (renderProp && React.isValidElement(renderProp)) {
          return React.cloneElement(
            renderProp as React.ReactElement<{ children: React.ReactNode }>,
            { children },
          );
        }
        return <button type="button">{children}</button>;
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Mock: api-client — members namespace only
// ---------------------------------------------------------------------------
const mockMembersList = vi.fn();
const mockMembersAdd = vi.fn();
const mockMembersUpdateRole = vi.fn();
const mockMembersRemove = vi.fn();

vi.mock("@/lib/api-client", () => ({
  organizations: {
    members: {
      list: (...args: unknown[]) => mockMembersList(...args),
      add: (...args: unknown[]) => mockMembersAdd(...args),
      updateRole: (...args: unknown[]) => mockMembersUpdateRole(...args),
      remove: (...args: unknown[]) => mockMembersRemove(...args),
    },
  },
  // ApiError is referenced via instanceof in the component's catch block.
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
// Import component under test (must come after vi.mock declarations)
// ---------------------------------------------------------------------------
import { MembersSection } from "@/app/(protected)/organizations/[id]/_components/members-section";
import type { MemberResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = "org-1";
const OWNER_USER_ID = "user-owner";
const ADMIN_USER_ID = "user-admin";
const MEMBER_USER_ID = "user-member";
/** A user that exists in the auth session but is NOT in the org member list. */
const VIEWER_USER_ID = "user-viewer";

const MOCK_MEMBERS: MemberResponse[] = [
  {
    userId: OWNER_USER_ID,
    username: "alice",
    email: "alice@example.com",
    role: "owner",
    joinedAt: "2025-01-01T00:00:00Z",
  },
  {
    userId: ADMIN_USER_ID,
    username: "bob",
    email: "bob@example.com",
    role: "admin",
    joinedAt: "2025-01-02T00:00:00Z",
  },
  {
    userId: MEMBER_USER_ID,
    username: "charlie",
    email: "charlie@example.com",
    role: "member",
    joinedAt: "2025-01-03T00:00:00Z",
  },
];

function paginatedOf<T>(data: T[]) {
  return { data, total: data.length, skip: 0, take: 20 };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("MembersSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMembersList.mockResolvedValue(paginatedOf(MOCK_MEMBERS));
    mockMembersAdd.mockResolvedValue(MOCK_MEMBERS[1]);
    mockMembersUpdateRole.mockResolvedValue(MOCK_MEMBERS[2]);
    mockMembersRemove.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // 1. Renders member list when loaded
  // -----------------------------------------------------------------------
  it("renders the member list after data loads", async () => {
    render(
      <MembersSection
        orgId={ORG_ID}
        currentUserId={VIEWER_USER_ID}
        canManage={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("charlie")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("charlie@example.com")).toBeInTheDocument();

    // Column headers present
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();

    // API called with the correct org id
    expect(mockMembersList).toHaveBeenCalledWith(ORG_ID);
  });

  // -----------------------------------------------------------------------
  // 2. Add Member form visibility is gated by canManage
  // -----------------------------------------------------------------------
  it("shows the Add Member form when canManage is true", async () => {
    render(
      <MembersSection
        orgId={ORG_ID}
        currentUserId={VIEWER_USER_ID}
        canManage={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("add-member-form")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Add Member" }),
    ).toBeInTheDocument();
  });

  it("hides the Add Member form when canManage is false and user is not admin", async () => {
    // VIEWER_USER_ID is not present in the member list, so effectiveCanManage
    // remains false after the member list is loaded.
    render(
      <MembersSection
        orgId={ORG_ID}
        currentUserId={VIEWER_USER_ID}
        canManage={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("add-member-form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Member" }),
    ).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 3. Calls organizations.members.add() on form submit
  // -----------------------------------------------------------------------
  it("calls members.add() with correct arguments on form submit", async () => {
    const user = userEvent.setup();

    render(
      <MembersSection
        orgId={ORG_ID}
        currentUserId={VIEWER_USER_ID}
        canManage={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("add-member-form")).toBeInTheDocument();
    });

    const usernameInput = screen.getByRole("textbox", { name: "Username" });
    const roleSelect = screen.getByRole("combobox", { name: "New member role" });
    const addButton = screen.getByRole("button", { name: "Add Member" });

    await user.type(usernameInput, "diana");
    await user.selectOptions(roleSelect, "admin");
    await user.click(addButton);

    await waitFor(() => {
      expect(mockMembersAdd).toHaveBeenCalledTimes(1);
    });

    expect(mockMembersAdd).toHaveBeenCalledWith(ORG_ID, {
      username: "diana",
      role: "admin",
    });
  });

  // -----------------------------------------------------------------------
  // 4. Calls organizations.members.remove() on confirm delete
  // -----------------------------------------------------------------------
  it("calls members.remove() with the correct userId after confirm", async () => {
    render(
      <MembersSection
        orgId={ORG_ID}
        // bob (admin) is the current user — charlie's row should have a remove button
        currentUserId={ADMIN_USER_ID}
        canManage={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("charlie")).toBeInTheDocument();
    });

    // Open the confirmation dialog for charlie
    fireEvent.click(screen.getByRole("button", { name: "Remove charlie" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to remove charlie/i),
      ).toBeInTheDocument();
    });

    // Confirm the removal
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(mockMembersRemove).toHaveBeenCalledTimes(1);
    });

    expect(mockMembersRemove).toHaveBeenCalledWith(ORG_ID, MEMBER_USER_ID);
  });

  // -----------------------------------------------------------------------
  // 5. Role change select is absent for owner-role entries
  // -----------------------------------------------------------------------
  it("does not render an editable role select for owner-role entries", async () => {
    render(
      <MembersSection
        orgId={ORG_ID}
        // Logged in as bob (admin) — can manage charlie but not alice (owner)
        currentUserId={ADMIN_USER_ID}
        canManage={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    // alice is the owner — role must be read-only (no select rendered)
    expect(
      screen.queryByRole("combobox", { name: "Role for alice" }),
    ).not.toBeInTheDocument();

    // charlie is a regular member who is not the current user — select present
    expect(
      screen.getByRole("combobox", { name: "Role for charlie" }),
    ).toBeInTheDocument();
  });
});
