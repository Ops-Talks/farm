import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { User } from "@/types/api";

import { MembersSection } from "@/app/(protected)/teams/[id]/_components/members-section";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "u1",
  username: "alice",
  displayName: "Alice Smith",
  email: "alice@farm.dev",
  roles: ["developer"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const BASE_PROPS = {
  members: [] as User[],
  allUsers: [] as User[],
  isAdmin: false,
  showAddMember: false,
  memberSearch: "",
  onToggleAddMember: vi.fn(),
  onMemberSearchChange: vi.fn(),
  onAddMember: vi.fn(),
  onRemoveMember: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("MembersSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Members heading", () => {
    render(<MembersSection {...BASE_PROPS} />);
    expect(screen.getByText("Members")).toBeInTheDocument();
  });

  it("shows empty state message when there are no members", () => {
    render(<MembersSection {...BASE_PROPS} />);
    expect(
      screen.getByText(/No members assigned/),
    ).toBeInTheDocument();
  });

  it("renders member rows when members exist", () => {
    render(
      <MembersSection
        {...BASE_PROPS}
        members={[makeUser()]}
      />,
    );
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("developer")).toBeInTheDocument();
  });

  it("shows the 'Add Member' button for admin users", () => {
    render(<MembersSection {...BASE_PROPS} isAdmin={true} />);
    expect(
      screen.getByRole("button", { name: "Add Member" }),
    ).toBeInTheDocument();
  });

  it("does not show 'Add Member' button for non-admin users", () => {
    render(<MembersSection {...BASE_PROPS} isAdmin={false} />);
    expect(
      screen.queryByRole("button", { name: "Add Member" }),
    ).not.toBeInTheDocument();
  });

  it("calls onToggleAddMember when Add Member is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <MembersSection
        {...BASE_PROPS}
        isAdmin={true}
        onToggleAddMember={onToggle}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add Member" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders user search panel when showAddMember is true", () => {
    render(
      <MembersSection
        {...BASE_PROPS}
        isAdmin={true}
        showAddMember={true}
        allUsers={[makeUser({ id: "u2", username: "bob", displayName: "Bob Jones", email: "bob@farm.dev" })]}
      />,
    );
    expect(
      screen.getByPlaceholderText(/Search users by name/),
    ).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("calls onRemoveMember immediately when admin clicks Remove on a member row", async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();
    render(
      <MembersSection
        {...BASE_PROPS}
        isAdmin={true}
        members={[makeUser()]}
        onRemoveMember={onRemoveMember}
      />,
    );

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    await user.click(removeBtn);

    // useUndoableDelete fires deleteFn immediately — no confirm dialog required
    expect(onRemoveMember).toHaveBeenCalledWith("u1", "alice");
  });

  it("calls onAddMember when an available user is clicked", async () => {
    const user = userEvent.setup();
    const onAddMember = vi.fn();
    const availableUser = makeUser({ id: "u99", username: "carol", displayName: "Carol D", email: "carol@farm.dev" });

    render(
      <MembersSection
        {...BASE_PROPS}
        isAdmin={true}
        showAddMember={true}
        allUsers={[availableUser]}
        onAddMember={onAddMember}
      />,
    );

    await user.click(screen.getByText("Carol D"));
    expect(onAddMember).toHaveBeenCalledWith("u99");
  });
});
