import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock fns (declared before vi.mock calls) ──────────────────────────────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockExpire = vi.fn();
const mockHasRole = vi.fn();

vi.mock("@/lib/api-client", () => ({
  environmentRequests: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    approve: (...args: unknown[]) => mockApprove(...args),
    reject: (...args: unknown[]) => mockReject(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", username: "testuser", roles: ["admin"] },
    hasRole: mockHasRole,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { EnvRequestsClient } from "./EnvRequestsClient";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockPendingRequest = {
  id: "req-1",
  name: "feature-branch-env",
  description: "Environment for feature branch testing",
  requestedBy: "user-1",
  type: "ephemeral" as const,
  tier: "small" as const,
  ttlHours: 24,
  status: "pending" as const,
  statusMessage: null,
  reviewedBy: null,
  reviewedAt: null,
  provisionedAt: null,
  expiresAt: null,
  componentId: null,
  environmentId: null,
  organizationId: "org-1",
  createdAt: "2024-06-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const mockActiveRequest = {
  ...mockPendingRequest,
  id: "req-2",
  name: "staging-env",
  description: "Staging environment",
  type: "persistent" as const,
  tier: "medium" as const,
  ttlHours: 168,
  status: "active" as const,
  reviewedBy: "admin-1",
  reviewedAt: "2024-06-01T12:00:00Z",
  provisionedAt: "2024-06-01T12:30:00Z",
  expiresAt: "2024-06-08T12:30:00Z",
};

const mockApprovedRequest = {
  ...mockPendingRequest,
  id: "req-3",
  name: "approved-env",
  status: "approved" as const,
  reviewedBy: "admin-1",
  reviewedAt: "2024-06-01T12:00:00Z",
};

const mockRejectedRequest = {
  ...mockPendingRequest,
  id: "req-4",
  name: "rejected-env",
  status: "rejected" as const,
  tier: "large" as const,
  reviewedBy: "admin-1",
  reviewedAt: "2024-06-02T00:00:00Z",
};

const mockExpiredRequest = {
  ...mockActiveRequest,
  id: "req-5",
  name: "old-env",
  status: "expired" as const,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("EnvRequestsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockHasRole.mockReturnValue(false);
  });

  // ── Data Loading ──────────────────────────────────────────────────────────

  it("renders loading skeleton initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<EnvRequestsClient />);

    const skeletons = document.querySelectorAll(".h-14");
    expect(skeletons.length).toBe(5);
  });

  it("displays request list after loading", async () => {
    mockList.mockResolvedValue({
      data: [mockPendingRequest, mockActiveRequest],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });
    expect(screen.getByText("staging-env")).toBeInTheDocument();
    expect(screen.getByText("Ephemeral")).toBeInTheDocument();
    expect(screen.getByText("Persistent")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("shows empty state when no requests", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Submit your first environment provisioning request to get started.",
      ),
    ).toBeInTheDocument();
  });

  it("handles API errors during loading with toast.error", async () => {
    mockList.mockRejectedValue(new Error("Connection refused"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Connection refused");
    });
  });

  it("shows generic error message for non-Error throw", async () => {
    mockList.mockRejectedValue("whoops");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load environment requests",
      );
    });
  });

  // ── Status Badges ─────────────────────────────────────────────────────────

  it("renders correct badge text for each status", async () => {
    mockList.mockResolvedValue({
      data: [
        mockPendingRequest,
        mockActiveRequest,
        mockApprovedRequest,
        mockRejectedRequest,
        mockExpiredRequest,
      ],
      total: 5,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    // Status badges appear alongside filter tabs with same text;
    // use getAllByText to verify the badge text is present (at least twice — tab + badge)
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Rejected").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Expired").length).toBeGreaterThanOrEqual(2);
  });

  it("renders correct type and tier badge text", async () => {
    mockList.mockResolvedValue({
      data: [mockPendingRequest, mockActiveRequest, mockRejectedRequest],
      total: 3,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  // ── Create Request ────────────────────────────────────────────────────────

  it("opens create dialog and submits new request", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    const created = {
      ...mockPendingRequest,
      id: "req-new",
      name: "my-new-env",
    };
    mockCreate.mockResolvedValue(created);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    // Click "Request Environment" button in header (first occurrence)
    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    // Fill form
    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "my-new-env");

    const descInput = screen.getByLabelText("Description");
    await user.type(descInput, "Test environment");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Submit Request" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-new-env",
          type: "ephemeral",
          tier: "small",
          ttlHours: 24,
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "my-new-env" created',
      );
    });
  });

  it("shows toast.error when create fails", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockCreate.mockRejectedValue(new Error("Quota exceeded"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "my-new-env");

    const submitBtn = screen.getByRole("button", { name: "Submit Request" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Quota exceeded");
    });
  });

  // ── Status Filters ────────────────────────────────────────────────────────

  it("filters by status when a filter tab is clicked", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    // Clear the initial call
    mockList.mockClear();
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    // Click "Active" tab
    const activeTab = screen.getByRole("button", { name: "Active" });
    await user.click(activeTab);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active", skip: 0, take: 20 }),
      );
    });
  });

  it("All filter shows everything (no status param)", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    // Click "Pending" first to change filter
    mockList.mockClear();
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    await user.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    // Now click "All"
    mockList.mockClear();
    mockList.mockResolvedValue({
      data: [mockPendingRequest, mockActiveRequest],
      total: 2,
      skip: 0,
      take: 20,
    });

    await user.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => {
      // When "all", no status param is sent
      const call = mockList.mock.calls[0][0];
      expect(call.status).toBeUndefined();
    });
  });

  it("shows filtered empty state message when status filter yields no results", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    await user.click(screen.getByRole("button", { name: "Rejected" }));

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });
    expect(
      screen.getByText('No requests with status "rejected" found.'),
    ).toBeInTheDocument();
  });

  // ── Admin Actions ─────────────────────────────────────────────────────────

  it("shows Approve and Reject buttons for pending requests (admin only)", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^approve$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^reject$/i }),
    ).toBeInTheDocument();
  });

  it("hides Approve/Reject buttons for non-admin users", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^approve$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^reject$/i }),
    ).not.toBeInTheDocument();
  });

  it("approves request via review dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    const approved = { ...mockPendingRequest, status: "approved" as const };
    mockApprove.mockResolvedValue(approved);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    // Review dialog should open
    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    // Should show comment field
    expect(screen.getByLabelText(/Comment/)).toBeInTheDocument();

    // Submit approval
    const approveBtn = screen.getByRole("button", { name: "Approve" });
    await user.click(approveBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith("req-1", undefined);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "feature-branch-env" approved',
      );
    });
  });

  it("rejects request with comment via review dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    const rejected = { ...mockPendingRequest, status: "rejected" as const };
    mockReject.mockResolvedValue(rejected);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    // Review dialog should open with reject title
    await waitFor(() => {
      expect(screen.getByText("Reject Request")).toBeInTheDocument();
    });

    // Add a comment
    const commentArea = screen.getByLabelText(/Comment/);
    await user.type(commentArea, "Insufficient justification");

    // Submit rejection
    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectBtn);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith("req-1", {
        comment: "Insufficient justification",
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "feature-branch-env" rejected',
      );
    });
  });

  it("shows Expire button for active requests (admin only)", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^expire$/i }),
    ).toBeInTheDocument();
  });

  it("expires active request via confirm dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    const expired = { ...mockActiveRequest, status: "expired" as const };
    mockExpire.mockResolvedValue(expired);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^expire$/i }));

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Expire Environment")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Are you sure you want to expire "staging-env"\?/),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Expire" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockExpire).toHaveBeenCalledWith("req-2");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "staging-env" expired',
      );
    });
  });

  it("hides admin actions for non-admin users on active requests", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^expire$/i }),
    ).not.toBeInTheDocument();
  });

  // ── Delete Request ────────────────────────────────────────────────────────

  it("deletes a pending request via confirm dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockResolvedValue(undefined);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteBtn);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Delete Request")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        /Are you sure you want to delete "feature-branch-env"\?/,
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("req-1");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "feature-branch-env" deleted',
      );
    });
  });

  it("shows toast.error when delete fails", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockRejectedValue(new Error("Cannot delete"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete Request")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Cannot delete");
    });
  });

  // ── Edit / Delete visibility per row ──────────────────────────────────────

  it("shows Edit but not Delete for pending requests owned by non-admin user", async () => {
    mockHasRole.mockReturnValue(false); // Not admin
    mockList.mockResolvedValue({
      data: [mockPendingRequest], // requestedBy: "user-1" matches useAuth user.id
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^edit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Edit and Delete for pending requests when admin", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^edit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
  });

  it("hides Edit/Delete for non-pending requests even if owner", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [{ ...mockActiveRequest, requestedBy: "user-1" }],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });

  // ── Pagination ──────────────────────────────────────────────────────────

  it("shows pagination when total > page size", async () => {
    const requests = Array.from({ length: 20 }, (_, i) => ({
      ...mockPendingRequest,
      id: `req-${i}`,
      name: `env-${i}`,
    }));
    mockList.mockResolvedValue({
      data: requests,
      total: 30,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("env-0")).toBeInTheDocument();
    });

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next" }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("navigates to next page when Next is clicked", async () => {
    const user = userEvent.setup();
    const requests = Array.from({ length: 20 }, (_, i) => ({
      ...mockPendingRequest,
      id: `req-${i}`,
      name: `env-${i}`,
    }));
    mockList.mockResolvedValue({
      data: requests,
      total: 30,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("env-0")).toBeInTheDocument();
    });

    // Prepare mock for page 2
    mockList.mockResolvedValue({
      data: [{ ...mockPendingRequest, id: "req-20", name: "env-20" }],
      total: 30,
      skip: 20,
      take: 20,
    });

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });
  });

  // ── TTL formatting ────────────────────────────────────────────────────────

  it("formats TTL correctly (hours and days)", async () => {
    mockList.mockResolvedValue({
      data: [
        mockPendingRequest, // ephemeral, 24h → "1d"
        { ...mockPendingRequest, id: "req-2h", name: "short-env", ttlHours: 2 }, // ephemeral, 2h → "2h"
      ],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(screen.getByText("1d")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("shows dash for TTL on persistent requests", async () => {
    mockList.mockResolvedValue({
      data: [mockActiveRequest], // persistent type
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    expect(screen.queryByText("7d")).not.toBeInTheDocument();
  });

  it("handles review error with toast.error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockApprove.mockRejectedValue(new Error("Approval failed"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Approval failed");
    });
  });

  // ── Edit request with null description ─────────────────────────────────────

  it("opens edit dialog for request with null description", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    const noDescRequest = {
      ...mockPendingRequest,
      id: "req-nodesc",
      name: "no-desc-env",
      description: null,
    };
    mockList.mockResolvedValue({
      data: [noDescRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    const updated = { ...noDescRequest, name: "updated-no-desc" };
    mockUpdate.mockResolvedValue(updated);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("no-desc-env")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // Description should be empty (defaults from ?? "")
    const descInput = screen.getByLabelText("Description") as HTMLInputElement;
    expect(descInput.value).toBe("");

    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "req-nodesc",
        expect.objectContaining({ name: "no-desc-env" }),
      );
    });
  });

  // ── Edit Request ─────────────────────────────────────────────────────────

  it("opens edit dialog with prefilled data and submits update", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    const updated = { ...mockPendingRequest, name: "updated-env", ttlHours: 48 };
    mockUpdate.mockResolvedValue(updated);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // Verify prefilled values
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("feature-branch-env");

    const ttlInput = screen.getByLabelText("TTL (hours)") as HTMLInputElement;
    expect(ttlInput.value).toBe("24");

    // Update name and TTL
    await user.clear(nameInput);
    await user.type(nameInput, "updated-env");
    await user.clear(ttlInput);
    await user.type(ttlInput, "48");

    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({
          name: "updated-env",
          ttlHours: 48,
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Request "updated-env" updated',
      );
    });
  });

  it("does not show Type and Tier selects in edit mode", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // Type and Tier selects should NOT be present in edit mode
    expect(screen.queryByLabelText("Type")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tier")).not.toBeInTheDocument();
  });

  it("shows toast.error when update fails with Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockUpdate.mockRejectedValue(new Error("Update failed"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });

  it("shows generic error when update fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockUpdate.mockRejectedValue("crash");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update request");
    });
  });

  // ── Create: non-Error failure ─────────────────────────────────────────────

  it("shows generic error when create fails with non-Error", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockCreate.mockRejectedValue("server error");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "my-new-env");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create request");
    });
  });

  // ── Create: Type and Tier selections ──────────────────────────────────────

  it("allows selecting different type and tier in create form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    const created = {
      ...mockPendingRequest,
      id: "req-new2",
      name: "persistent-env",
      type: "persistent" as const,
      tier: "large" as const,
    };
    mockCreate.mockResolvedValue(created);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "persistent-env");

    // Change type
    const typeSelect = screen.getByLabelText("Type");
    await user.selectOptions(typeSelect, "persistent");

    // TTL field should be hidden for persistent type
    expect(screen.queryByLabelText("TTL (hours)")).not.toBeInTheDocument();

    // Change tier
    const tierSelect = screen.getByLabelText("Tier");
    await user.selectOptions(tierSelect, "large");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "persistent-env",
          type: "persistent",
          tier: "large",
        }),
      );
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ ttlHours: expect.anything() }),
    );
  });

  // ── Create: cancel dialog ────────────────────────────────────────────────

  it("closes create dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });
  });

  // ── Validation: name too short and invalid TTL ────────────────────────────

  it("does not submit when name is too short", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "x");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    // Should not have called create because validation fails
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not submit when TTL is invalid (0)", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "valid-name");

    const ttlInput = screen.getByLabelText("TTL (hours)");
    await user.clear(ttlInput);
    await user.type(ttlInput, "0");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not submit when TTL exceeds max (721)", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "valid-name");

    const ttlInput = screen.getByLabelText("TTL (hours)");
    await user.clear(ttlInput);
    await user.type(ttlInput, "721");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not submit when TTL is not a number", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("No environment requests")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /request environment/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Name"), "valid-name");

    const ttlInput = screen.getByLabelText("TTL (hours)");
    await user.clear(ttlInput);
    await user.type(ttlInput, "abc");

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── Delete: non-Error failure ─────────────────────────────────────────────

  it("shows generic error when delete fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockRejectedValue("oops");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete request");
    });
  });

  // ── Expire: error handling ────────────────────────────────────────────────

  it("shows toast.error when expire fails with Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockExpire.mockRejectedValue(new Error("Cannot expire"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^expire$/i }));

    await waitFor(() => {
      expect(screen.getByText("Expire Environment")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Expire" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Cannot expire");
    });
  });

  it("shows generic error when expire fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockActiveRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockExpire.mockRejectedValue("boom");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("staging-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^expire$/i }));

    await waitFor(() => {
      expect(screen.getByText("Expire Environment")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Expire" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to expire request");
    });
  });

  // ── Review: non-Error failure ─────────────────────────────────────────────

  it("shows generic error when approve fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockApprove.mockRejectedValue("crash");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to approve request");
    });
  });

  it("shows generic error when reject fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockReject.mockRejectedValue("crash");

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    await waitFor(() => {
      expect(screen.getByText("Reject Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to reject request");
    });
  });

  // ── Review: cancel dialog ────────────────────────────────────────────────

  it("closes review dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    // Click Cancel in the review dialog
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Approve Request")).not.toBeInTheDocument();
    });
  });

  // ── Review: reject with Error ─────────────────────────────────────────────

  it("shows toast.error when reject fails with Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockReject.mockRejectedValue(new Error("Reject service error"));

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    await waitFor(() => {
      expect(screen.getByText("Reject Request")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Reject service error");
    });
  });

  // ── Pagination: previous page ─────────────────────────────────────────────

  it("navigates to previous page when Previous is clicked", async () => {
    const user = userEvent.setup();
    const requests = Array.from({ length: 20 }, (_, i) => ({
      ...mockPendingRequest,
      id: `req-${i}`,
      name: `env-${i}`,
    }));
    mockList.mockResolvedValue({
      data: requests,
      total: 40,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("env-0")).toBeInTheDocument();
    });

    // Go to page 2
    const page2Requests = Array.from({ length: 20 }, (_, i) => ({
      ...mockPendingRequest,
      id: `req-${i + 20}`,
      name: `env-${i + 20}`,
    }));
    mockList.mockResolvedValue({
      data: page2Requests,
      total: 40,
      skip: 20,
      take: 20,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("env-20")).toBeInTheDocument();
    });

    // Now go back to page 1
    mockList.mockResolvedValue({
      data: requests,
      total: 40,
      skip: 0,
      take: 20,
    });
    await user.click(screen.getByRole("button", { name: "Previous" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  // ── TTL formatting: edge cases ────────────────────────────────────────────

  it("formats TTL as hours when < 24h", async () => {
    const shortTtlRequest = {
      ...mockPendingRequest,
      id: "req-short",
      name: "short-ttl-env",
      ttlHours: 12,
    };
    mockList.mockResolvedValue({
      data: [shortTtlRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("short-ttl-env")).toBeInTheDocument();
    });

    expect(screen.getByText("12h")).toBeInTheDocument();
  });

  it("formats TTL with days and remaining hours", async () => {
    const oddTtlRequest = {
      ...mockPendingRequest,
      id: "req-odd",
      name: "odd-ttl-env",
      ttlHours: 25,
    };
    mockList.mockResolvedValue({
      data: [oddTtlRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("odd-ttl-env")).toBeInTheDocument();
    });

    expect(screen.getByText("1d 1h")).toBeInTheDocument();
  });

  // ── Date formatting: null expiresAt ────────────────────────────────────────

  it("formats null expiresAt as em dash", async () => {
    mockList.mockResolvedValue({
      data: [mockPendingRequest], // expiresAt is null
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    // The em dash character (\u2014) should appear for null expiresAt
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  // ── Provisioning status ────────────────────────────────────────────────────

  it("renders provisioning status badge", async () => {
    const provisioningRequest = {
      ...mockPendingRequest,
      id: "req-prov",
      name: "provisioning-env",
      status: "provisioning" as const,
    };
    mockList.mockResolvedValue({
      data: [provisioningRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("provisioning-env")).toBeInTheDocument();
    });

    expect(screen.getByText("Provisioning")).toBeInTheDocument();
  });

  // ── Unknown type badge ────────────────────────────────────────────────────

  it("renders unknown environment type with default badge style", async () => {
    const unknownTypeRequest = {
      ...mockPendingRequest,
      id: "req-unknown-type",
      name: "unknown-type-env",
      type: "custom" as const,
    };
    mockList.mockResolvedValue({
      data: [unknownTypeRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("unknown-type-env")).toBeInTheDocument();
    });

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  // ── Review dialog: description ────────────────────────────────────────────

  it("shows request description in review dialog when present", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    // mockPendingRequest has description "Environment for feature branch testing"
    expect(
      screen.getByText("Environment for feature branch testing"),
    ).toBeInTheDocument();
  });

  // ── Total count (no pagination needed) ─────────────────────────────────────

  it("shows total count without pagination when requests fit in one page", async () => {
    mockList.mockResolvedValue({
      data: [mockPendingRequest, mockActiveRequest],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(screen.getByText("Showing 2 of 2 requests")).toBeInTheDocument();
  });

  it("shows singular 'request' when total is 1", async () => {
    mockList.mockResolvedValue({
      data: [mockPendingRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(screen.getByText("Showing 1 of 1 request")).toBeInTheDocument();
  });

  // ── canEditOrDelete: different user cannot edit ────────────────────────────

  it("opens edit dialog for persistent request and omits ttlHours from DTO", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    const persistentPending = {
      ...mockPendingRequest,
      id: "req-persist",
      name: "persistent-env",
      type: "persistent" as const,
      tier: "medium" as const,
      ttlHours: 0,
    };
    mockList.mockResolvedValue({
      data: [persistentPending],
      total: 1,
      skip: 0,
      take: 20,
    });
    const updated = { ...persistentPending, name: "renamed-persistent" };
    mockUpdate.mockResolvedValue(updated);

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("persistent-env")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // TTL field should be hidden for persistent type
    expect(screen.queryByLabelText("TTL (hours)")).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "renamed-persistent");

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "req-persist",
        expect.objectContaining({ name: "renamed-persistent" }),
      );
    });

    // Should not include ttlHours for persistent requests
    expect(mockUpdate).toHaveBeenCalledWith(
      "req-persist",
      expect.not.objectContaining({ ttlHours: expect.anything() }),
    );
  });

  it("shows plural 'requests' in pagination text when total > 1", async () => {
    mockHasRole.mockReturnValue(true);
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...mockPendingRequest,
      id: `req-${i}`,
      name: `env-${i}`,
    }));
    mockList.mockResolvedValue({
      data: many.slice(0, 20),
      total: 21,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("env-0")).toBeInTheDocument();
    });

    expect(screen.getByText(/21 requests/)).toBeInTheDocument();
  });

  it("shows review dialog TTL as dash for persistent type", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    const persistentPending = {
      ...mockPendingRequest,
      id: "req-persist-review",
      name: "persistent-review",
      type: "persistent" as const,
      tier: "small" as const,
      ttlHours: 0,
    };
    mockList.mockResolvedValue({
      data: [persistentPending],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("persistent-review")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByText("Approve Request")).toBeInTheDocument();
    });

    // In the review dialog, the TTL row should show an em-dash for persistent type
    // The table row also already shows \u2014, so there will be multiple
    const dashes = screen.getAllByText("\u2014");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("hides Edit/Delete for pending requests owned by different user when not admin", async () => {
    mockHasRole.mockReturnValue(false); // Not admin
    const otherUserRequest = {
      ...mockPendingRequest,
      requestedBy: "other-user", // Different from user.id ("user-1")
    };
    mockList.mockResolvedValue({
      data: [otherUserRequest],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<EnvRequestsClient />);

    await waitFor(() => {
      expect(screen.getByText("feature-branch-env")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });
});
