import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Organization } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUpdate = vi.fn();
const mockRefreshOrgs = vi.fn();

vi.mock("@/lib/api-client", () => ({
  organizations: {
    update: (...args: unknown[]) => mockUpdate(...args),
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
  useOrganization: () => ({
    refreshOrgs: mockRefreshOrgs,
    currentOrg: null,
    orgs: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue(true),
}));

import { OrgSettingsForm } from "@/app/(protected)/organizations/[id]/_components/org-settings-form";

const ORG: Organization = {
  id: "org-1",
  name: "Acme",
  slug: "acme",
  description: "Engineering org",
  ownerId: "user-1",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("OrgSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshOrgs.mockResolvedValue(undefined);
  });

  it("renders with existing org data pre-filled", () => {
    render(<OrgSettingsForm org={ORG} onUpdated={vi.fn()} />);
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Acme");
    // Save Changes is disabled since form is not dirty
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("shows validation error when name is cleared and form is submitted", async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm org={ORG} onUpdated={vi.fn()} />);

    const nameInput = screen.getByLabelText(/^name/i);
    // user.clear() is the reliable way to empty a controlled RHF input
    await user.clear(nameInput);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("enables the Save button when a field is changed (isDirty)", async () => {
    const user = userEvent.setup();
    render(<OrgSettingsForm org={ORG} onUpdated={vi.fn()} />);

    const nameInput = screen.getByLabelText(/^name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Corp");

    // Button should now be enabled
    expect(screen.getByRole("button", { name: "Save Changes" })).not.toBeDisabled();
  });

  it("calls organizations.update() with updated values on valid submit", async () => {
    const user = userEvent.setup();
    const updatedOrg = { ...ORG, name: "Acme Corp" };
    mockUpdate.mockResolvedValueOnce(updatedOrg);
    const mockOnUpdated = vi.fn();
    render(<OrgSettingsForm org={ORG} onUpdated={mockOnUpdated} />);

    const nameInput = screen.getByLabelText(/^name/i);
    // Clear the current value, then type the replacement
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Corp");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledOnce();
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ name: "Acme Corp" }),
    );
    expect(mockOnUpdated).toHaveBeenCalledWith(updatedOrg);
  });
});
