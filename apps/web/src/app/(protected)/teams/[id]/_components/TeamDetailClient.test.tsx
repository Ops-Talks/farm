import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetTeam = vi.fn();
const mockGetMembers = vi.fn();
const mockGetComponents = vi.fn();
const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();
const mockGetUsers = vi.fn();
const mockAddMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockPush = vi.fn();
const mockHasRole = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/teams/team-1",
  useParams: () => ({ id: "team-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api-client", () => ({
  teams: {
    get: (...args: unknown[]) => mockGetTeam(...args),
    getMembers: (...args: unknown[]) => mockGetMembers(...args),
    getComponents: (...args: unknown[]) => mockGetComponents(...args),
    update: (...args: unknown[]) => mockUpdateTeam(...args),
    delete: (...args: unknown[]) => mockDeleteTeam(...args),
    addMember: (...args: unknown[]) => mockAddMember(...args),
    removeMember: (...args: unknown[]) => mockRemoveMember(...args),
  },
  auth: {
    getUsers: () => mockGetUsers(),
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

vi.mock("@/types/api", () => ({
  TeamType: {
    DEV: "dev",
    INFRA: "infra",
    SECURITY: "security",
    DATA: "data",
    PLATFORM: "platform",
    OTHER: "other",
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    hasRole: mockHasRole,
    user: { id: "u1", username: "admin", displayName: "Admin" },
  }),
}));

import { TeamDetailClient } from "@/app/(protected)/teams/[id]/_components/TeamDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeTeam = () => ({
  id: "team-1",
  name: "team-alpha",
  displayName: "Team Alpha",
  type: "dev",
  description: "Alpha squad",
  contactEmail: "alpha@farm.dev",
  slackChannel: "alpha",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TeamDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
    mockGetMembers.mockResolvedValue([]);
    mockGetComponents.mockResolvedValue([]);
  });

  it("renders skeleton while loading", () => {
    mockGetTeam.mockReturnValue(new Promise(() => {}));
    render(<TeamDetailClient />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders 'Team Not Found' on fetch error", async () => {
    mockGetTeam.mockRejectedValue(new Error("Not found"));
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Team Not Found")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Back to Teams" }),
    ).toBeInTheDocument();
  });

  it("renders team displayName once loaded", async () => {
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Team Alpha" })).toBeInTheDocument();
    });
  });

  it("renders contact email and slack channel", async () => {
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("alpha@farm.dev")).toBeInTheDocument();
    });
    expect(screen.getByText("#alpha")).toBeInTheDocument();
  });

  it("shows Edit/Delete buttons for admin users", async () => {
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show Edit/Delete buttons for non-admin", async () => {
    mockHasRole.mockReturnValue(false);
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("shows the edit form when Edit is clicked", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit Team Details")).toBeInTheDocument();
  });

  it("opens the delete confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Delete team")).toBeInTheDocument();
    });
  });

  it("navigates back to /teams when delete is confirmed", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    mockDeleteTeam.mockResolvedValue(undefined);
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    // Find the confirm button in the dialog (has text "Delete" too)
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith("team-1");
      expect(mockPush).toHaveBeenCalledWith("/teams");
    });
  });

  it("saves team updates when Save Changes is clicked in edit form", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    mockUpdateTeam.mockResolvedValue({ ...makeTeam(), displayName: "Team Alpha Updated" });
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit Team Details")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith(
        "team-1",
        expect.objectContaining({ displayName: "Team Alpha" }),
      );
    });
  });

  it("cancels editing when Cancel is clicked in edit form", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit Team Details")).toBeInTheDocument();

    // Multiple "Cancel" buttons may render (e.g., dialog cancel in members section)
    // — click the first one which is in the edit form
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Edit Team Details")).not.toBeInTheDocument();
    });
  });

  it("fetches user list when admin opens add-member panel", async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(true);
    mockGetTeam.mockResolvedValue(makeTeam());
    mockGetUsers.mockResolvedValue([]);
    render(<TeamDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Member" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add Member" }));

    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalled();
    });
  });
});

