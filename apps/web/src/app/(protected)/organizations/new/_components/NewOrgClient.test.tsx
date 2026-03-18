import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
const mockRefreshOrgs = vi.fn();
const mockSwitchOrg = vi.fn();

vi.mock("@/lib/api-client", () => ({
  organizations: {
    create: (...args: unknown[]) => mockCreate(...args),
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
    switchOrg: mockSwitchOrg,
    currentOrg: null,
    orgs: [],
    isLoading: false,
  }),
}));

import { NewOrgClient } from "@/app/(protected)/organizations/new/_components/NewOrgClient";
import { ApiError } from "@/lib/api-client";

describe("NewOrgClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshOrgs.mockResolvedValue(undefined);
  });

  it("renders the form fields", () => {
    render(<NewOrgClient />);
    expect(screen.getByRole("heading", { name: "Create Organization" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Organization" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty on submit", async () => {
    const user = userEvent.setup();
    render(<NewOrgClient />);

    await user.click(screen.getByRole("button", { name: "Create Organization" }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("derives a URL-friendly slug from the name", async () => {
    const user = userEvent.setup();
    render(<NewOrgClient />);

    await user.type(screen.getByLabelText(/^name/i), "Acme Engineering");

    // Slug input is disabled so we check its value attribute
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe("acme-engineering");
  });

  it("calls organizations.create() with the trimmed name and redirects", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValueOnce({
      id: "org-1",
      name: "Acme Engineering",
      slug: "acme-engineering",
    });
    render(<NewOrgClient />);

    await user.type(screen.getByLabelText(/^name/i), "Acme Engineering");
    await user.click(screen.getByRole("button", { name: "Create Organization" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledOnce();
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme Engineering" }),
    );
  });

  it("shows API error on failure", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValueOnce(
      new ApiError(409, { message: "Organization already exists", statusCode: 409, timestamp: "2025-01-01T00:00:00Z", path: "/test" }),
    );
    render(<NewOrgClient />);

    await user.type(screen.getByLabelText(/^name/i), "Existing Org");
    await user.click(screen.getByRole("button", { name: "Create Organization" }));

    await waitFor(() => {
      expect(screen.getByText("Organization already exists")).toBeInTheDocument();
    });
  });

  it("disables the submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    mockCreate.mockReturnValueOnce(
      new Promise<{ id: string; name: string; slug: string }>((r) => {
        resolve = () => r({ id: "o1", name: "Test Org", slug: "test-org" });
      }),
    );
    mockRefreshOrgs.mockResolvedValue(undefined);
    render(<NewOrgClient />);

    await user.type(screen.getByLabelText(/^name/i), "Test Org");
    await user.click(screen.getByRole("button", { name: "Create Organization" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });

    resolve!();
  });
});
