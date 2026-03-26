import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { Organization } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockDelete = vi.fn();
const mockRefreshOrgs = vi.fn();
const mockSwitchOrg = vi.fn();
const mockPush = vi.fn();
// Dynamic mock so individual tests can control currentOrg and organizations.
const mockUseOrganization = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/organizations/org-1",
  useParams: () => ({ id: "org-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  organizations: {
    delete: (...args: unknown[]) => mockDelete(...args),
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

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => mockUseOrganization(),
}));

import { DangerZone } from "@/app/(protected)/organizations/[id]/_components/danger-zone";
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const ORG: Organization = {
  id: "org-1",
  name: "Acme Corp",
  slug: "acme",
  ownerId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const OTHER_ORG: Organization = {
  id: "org-2",
  name: "Beta Corp",
  slug: "beta",
  ownerId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("DangerZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default context: currentOrg is null so existing tests are unaffected.
    mockUseOrganization.mockReturnValue({
      organizations: [ORG],
      currentOrg: null,
      refreshOrgs: mockRefreshOrgs,
      switchOrg: mockSwitchOrg,
    });
  });

  it("renders nothing when the current user is not the owner", () => {
    const { container } = render(<DangerZone org={ORG} isOwner={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the danger zone card when user is owner", () => {
    render(<DangerZone org={ORG} isOwner={true} />);
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByText("Delete this organization")).toBeInTheDocument();
  });

  it("opens the confirmation dialog when Delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument();
    });
  });

  it("calls organizations.delete and navigates on confirm", async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue(undefined);
    mockRefreshOrgs.mockResolvedValue(undefined);

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(ORG.id);
      expect(mockPush).toHaveBeenCalledWith("/organizations");
    });
  });

  it("closes the dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText(/Delete "Acme Corp"/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // handleDelete success — currentOrg === org branches
  // ---------------------------------------------------------------------------

  it("calls switchOrg with the next org when the deleted org was the active one and another org exists", async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue(undefined);
    mockRefreshOrgs.mockResolvedValue(undefined);
    mockUseOrganization.mockReturnValue({
      organizations: [ORG, OTHER_ORG],
      currentOrg: ORG,
      refreshOrgs: mockRefreshOrgs,
      switchOrg: mockSwitchOrg,
    });

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(mockSwitchOrg).toHaveBeenCalledWith(OTHER_ORG);
    });
  });

  it("removes the session-storage key when the deleted org was the active one and no other orgs remain", async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue(undefined);
    mockRefreshOrgs.mockResolvedValue(undefined);
    mockUseOrganization.mockReturnValue({
      organizations: [ORG],
      currentOrg: ORG,
      refreshOrgs: mockRefreshOrgs,
      switchOrg: mockSwitchOrg,
    });

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(sessionStorage.removeItem).toHaveBeenCalledWith("farm_current_org");
    });
  });

  // ---------------------------------------------------------------------------
  // handleDelete error branches
  // ---------------------------------------------------------------------------

  it("shows a toast with the string message when delete fails with ApiError", async () => {
    const user = userEvent.setup();
    mockDelete.mockRejectedValue(new ApiError(400, { message: "Org cannot be deleted." }));

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Org cannot be deleted.");
    });
  });

  it("shows a toast joining array messages when delete fails with ApiError", async () => {
    const user = userEvent.setup();
    mockDelete.mockRejectedValue(new ApiError(422, { message: ["msg1", "msg2"] }));

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("msg1, msg2");
    });
  });

  it("shows a generic toast error when delete fails with a non-ApiError", async () => {
    const user = userEvent.setup();
    mockDelete.mockRejectedValue(new Error("Network failure"));

    render(<DangerZone org={ORG} isOwner={true} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete "Acme Corp"/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Delete Organization" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete organization.");
    });
  });
});
