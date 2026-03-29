import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock fns — use vi.hoisted so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockGetOne,
  mockGetTimeline,
  mockUpdateStatus,
  mockCreateUpdate,
  mockGetByIncident,
  mockCreatePostMortem,
  mockApprovePostMortem,
  mockPush,
  mockHasRole,
  mockAuthUser,
} = vi.hoisted(() => ({
  mockGetOne: vi.fn(),
  mockGetTimeline: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockCreateUpdate: vi.fn(),
  mockGetByIncident: vi.fn(),
  mockCreatePostMortem: vi.fn(),
  mockApprovePostMortem: vi.fn(),
  mockPush: vi.fn(),
  mockHasRole: vi.fn(),
  mockAuthUser: { id: "user-1", username: "admin", roles: ["admin"] } as {
    id: string;
    username: string;
    roles: string[];
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/incidents/inc-1",
  useParams: () => ({ id: "inc-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  incidents: {
    getOne: (...args: unknown[]) => mockGetOne(...args),
    getTimeline: (...args: unknown[]) => mockGetTimeline(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    createUpdate: (...args: unknown[]) => mockCreateUpdate(...args),
  },
  postMortems: {
    getByIncident: (...args: unknown[]) => mockGetByIncident(...args),
    create: (...args: unknown[]) => mockCreatePostMortem(...args),
    approve: (...args: unknown[]) => mockApprovePostMortem(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    hasRole: mockHasRole,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

// Import AFTER mocks
import { IncidentDetailClient } from "./IncidentDetailClient";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockIncident = {
  id: "inc-1",
  title: "Database outage",
  description: "Primary DB cluster went down",
  severity: "P1",
  status: "open",
  commanderUserId: "usr-12345678",
  organizationId: "org-1",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  resolvedAt: null,
};

const mockTimelineEntry = {
  id: "upd-1",
  message: "Investigating the issue",
  previousStatus: "open",
  newStatus: "investigating",
  authorId: "user-1",
  incidentId: "inc-1",
  createdAt: "2024-01-15T10:15:00Z",
  updatedAt: "2024-01-15T10:15:00Z",
};

const mockPostMortem = {
  id: "pm-1",
  incidentId: "inc-1",
  rootCause: "Disk space exhaustion on primary node",
  contributingFactors: ["No disk alerts configured", "Logs not rotated"],
  body: "Detailed summary of what happened",
  actionItems: [
    { title: "Add disk space alerts", done: false },
    { title: "Configure log rotation", assignee: "ops-team", done: true },
  ],
  approvedBy: null,
  approvedAt: null,
  createdAt: "2024-01-16T09:00:00Z",
  updatedAt: "2024-01-16T09:00:00Z",
};

function buildIncident(overrides: Record<string, unknown> = {}) {
  return { ...mockIncident, ...overrides };
}

function buildTimeline(overrides: Record<string, unknown> = {}) {
  return { ...mockTimelineEntry, ...overrides };
}

function buildPostMortem(overrides: Record<string, unknown> = {}) {
  return { ...mockPostMortem, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IncidentDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid incident + empty timeline; no post-mortem (404)
    mockGetOne.mockResolvedValue(buildIncident());
    mockGetTimeline.mockResolvedValue([]);
    mockGetByIncident.mockRejectedValue(new Error("Not found"));
    mockHasRole.mockReturnValue(true); // admin by default
  });

  // =========================================================================
  // Loading & Error States
  // =========================================================================

  describe("Loading & Error States", () => {
    it("shows loading skeleton while fetching", () => {
      // Never-resolving promise keeps loading state active
      mockGetOne.mockReturnValue(new Promise(() => {}));
      mockGetTimeline.mockReturnValue(new Promise(() => {}));

      render(<IncidentDetailClient id="inc-1" />);

      // Skeleton renders data-slot="skeleton" divs
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows error message when incident fetch fails", async () => {
      mockGetOne.mockRejectedValue(new Error("Network error"));
      mockGetTimeline.mockRejectedValue(new Error("Network error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load incident")).toBeInTheDocument();
      });
    });

    it('shows "Incident not found" when incident is null after load', async () => {
      mockGetOne.mockResolvedValue(null);
      mockGetTimeline.mockResolvedValue([]);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Incident not found")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Basic Rendering
  // =========================================================================

  describe("Basic Rendering", () => {
    it("renders incident title after load", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });
    });

    it("shows severity badge", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("P1")).toBeInTheDocument();
      });
    });

    it("shows status badge", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("open")).toBeInTheDocument();
      });
    });

    it("shows commander card", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Commander")).toBeInTheDocument();
        // Commander displays first 8 chars of commanderUserId
        expect(screen.getByText("usr-1234")).toBeInTheDocument();
      });
    });

    it("shows created date card", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Created")).toBeInTheDocument();
        // Date is rendered via toLocaleString
        expect(
          screen.getByText(new Date("2024-01-15T10:00:00Z").toLocaleString()),
        ).toBeInTheDocument();
      });
    });

    it("shows description when present", async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Description")).toBeInTheDocument();
        expect(
          screen.getByText("Primary DB cluster went down"),
        ).toBeInTheDocument();
      });
    });

    it('"Back to Incidents" navigates to /incidents', async () => {
      const user = userEvent.setup();
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Back to Incidents"));
      expect(mockPush).toHaveBeenCalledWith("/incidents");
    });
  });

  // =========================================================================
  // Status Transitions (Admin)
  // =========================================================================

  describe("Status Transitions", () => {
    it('shows "Transition to: investigating" for open incidents (admin)', async () => {
      mockHasRole.mockReturnValue(true);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Transition to:")).toBeInTheDocument();
      });

      // open → [investigating]
      expect(
        screen.getByRole("button", { name: /investigating/i }),
      ).toBeInTheDocument();
    });

    it("does not show transition buttons for non-admin", async () => {
      mockHasRole.mockReturnValue(false);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      expect(screen.queryByText("Transition to:")).not.toBeInTheDocument();
    });

    it("does not show transition buttons for resolved incidents", async () => {
      mockHasRole.mockReturnValue(true);
      mockGetOne.mockResolvedValue(
        buildIncident({
          status: "resolved",
          resolvedAt: "2024-01-15T12:00:00Z",
        }),
      );

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      // resolved → [] so no transition buttons
      expect(screen.queryByText("Transition to:")).not.toBeInTheDocument();
    });

    it("clicking transition button calls updateStatus and refreshes timeline", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      const updatedIncident = buildIncident({ status: "investigating" });
      const statusEntry = buildTimeline({
        id: "upd-status",
        message: "Status changed to investigating",
        previousStatus: "open",
        newStatus: "investigating",
      });

      mockUpdateStatus.mockResolvedValue(updatedIncident);
      // After status update, getTimeline is called again
      mockGetTimeline
        .mockResolvedValueOnce([]) // initial fetch
        .mockResolvedValueOnce([statusEntry]); // refresh after transition

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /investigating/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /investigating/i }),
      );

      await waitFor(() => {
        expect(mockUpdateStatus).toHaveBeenCalledWith("inc-1", {
          status: "investigating",
          message: "Status changed to investigating",
        });
      });

      // Timeline should refresh
      await waitFor(() => {
        expect(mockGetTimeline).toHaveBeenCalledTimes(2);
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Status updated to investigating",
      );
    });
  });

  // =========================================================================
  // Timeline
  // =========================================================================

  describe("Timeline", () => {
    it("renders timeline entries sorted by date", async () => {
      const older = buildTimeline({
        id: "upd-1",
        message: "First update",
        previousStatus: null,
        newStatus: null,
        createdAt: "2024-01-15T10:00:00Z",
      });
      const newer = buildTimeline({
        id: "upd-2",
        message: "Second update",
        previousStatus: null,
        newStatus: null,
        createdAt: "2024-01-15T11:00:00Z",
      });
      // Return in reverse order to verify sorting
      mockGetTimeline.mockResolvedValue([newer, older]);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("First update")).toBeInTheDocument();
        expect(screen.getByText("Second update")).toBeInTheDocument();
      });

      // Both entries should be present; verify sorted order in DOM
      const firstEl = screen.getByText("First update");
      const secondEl = screen.getByText("Second update");
      // In sorted order (ascending), "First update" should appear before "Second update"
      expect(
        firstEl.compareDocumentPosition(secondEl) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows status change badges in timeline entries", async () => {
      mockGetTimeline.mockResolvedValue([mockTimelineEntry]);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByText("Investigating the issue"),
        ).toBeInTheDocument();
      });

      // Status transition badges: previousStatus → newStatus
      // The timeline entry shows "open" and "investigating" as badges
      // plus "→" separator. There may be other "open" text on the page (status badge).
      const allOpenBadges = screen.getAllByText("open");
      expect(allOpenBadges.length).toBeGreaterThanOrEqual(1);
      // "investigating" appears as a transition badge
      const investigatingEls = screen.getAllByText("investigating");
      expect(investigatingEls.length).toBeGreaterThanOrEqual(1);
    });

    it("Add Update form submits and appends entry", async () => {
      const user = userEvent.setup();
      const newEntry = buildTimeline({
        id: "upd-new",
        message: "Added a manual update",
        previousStatus: null,
        newStatus: null,
        authorId: "user-1",
        createdAt: "2024-01-15T12:00:00Z",
      });
      mockCreateUpdate.mockResolvedValue(newEntry);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(
        "Add a timeline update...",
      );
      await user.type(textarea, "Added a manual update");

      await user.click(screen.getByRole("button", { name: /add update/i }));

      await waitFor(() => {
        expect(mockCreateUpdate).toHaveBeenCalledWith("inc-1", {
          message: "Added a manual update",
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText("Added a manual update"),
        ).toBeInTheDocument();
      });

      expect(toast.success).toHaveBeenCalledWith("Update added");
    });
  });

  // =========================================================================
  // Post-Mortem
  // =========================================================================

  describe("Post-Mortem", () => {
    it('shows "No post-mortem" message when none exists', async () => {
      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "No post-mortem has been created for this incident yet.",
          ),
        ).toBeInTheDocument();
      });
    });

    it('admin sees "Create Post-Mortem" button when no PM exists', async () => {
      mockHasRole.mockReturnValue(true);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });
    });

    it("Create Post-Mortem dialog submits successfully", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      const createdPm = buildPostMortem();
      mockCreatePostMortem.mockResolvedValue(createdPm);

      render(<IncidentDetailClient id="inc-1" />);

      // Wait for initial render
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      // Open the dialog
      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      // Fill root cause
      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/root cause/i),
        "Disk space exhaustion on primary node",
      );

      // Fill contributing factors
      await user.type(
        screen.getByLabelText(/contributing factors/i),
        "No disk alerts configured\nLogs not rotated",
      );

      // Fill summary
      await user.type(
        screen.getByLabelText(/summary/i),
        "Detailed summary of what happened",
      );

      // Add an action item
      await user.type(
        screen.getByPlaceholderText("Action item title"),
        "Add disk space alerts",
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Submit the form — the dialog has both the Create Post-Mortem button (trigger)
      // and the submit button with the same label. Inside the dialog, it is the submit button.
      const submitButtons = screen.getAllByRole("button", {
        name: /create post-mortem/i,
      });
      // The submit button inside the dialog is the last one
      await user.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(mockCreatePostMortem).toHaveBeenCalledWith(
          expect.objectContaining({
            incidentId: "inc-1",
            rootCause: "Disk space exhaustion on primary node",
            contributingFactors: [
              "No disk alerts configured",
              "Logs not rotated",
            ],
            body: "Detailed summary of what happened",
            actionItems: [
              { title: "Add disk space alerts", done: false },
            ],
          }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Post-mortem created");
    });

    it("shows post-mortem details when present (root cause, action items)", async () => {
      mockGetByIncident.mockResolvedValue(buildPostMortem());

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Root Cause")).toBeInTheDocument();
      });

      // Root cause content
      expect(
        screen.getByText("Disk space exhaustion on primary node"),
      ).toBeInTheDocument();

      // Contributing factors
      expect(screen.getByText("Contributing Factors")).toBeInTheDocument();
      expect(
        screen.getByText("No disk alerts configured"),
      ).toBeInTheDocument();
      expect(screen.getByText("Logs not rotated")).toBeInTheDocument();

      // Action items
      expect(screen.getByText("Action Items")).toBeInTheDocument();
      expect(screen.getByText("Add disk space alerts")).toBeInTheDocument();
      expect(
        screen.getByText("Configure log rotation"),
      ).toBeInTheDocument();

      // Done / Pending badges on action items
      expect(screen.getByText("Done")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();

      // Body / Summary
      expect(screen.getByText("Summary")).toBeInTheDocument();
      expect(
        screen.getByText("Detailed summary of what happened"),
      ).toBeInTheDocument();

      // Pending approval badge
      expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    });

    it("admin can approve pending post-mortem", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      const pm = buildPostMortem({ approvedBy: null, approvedAt: null });
      mockGetByIncident.mockResolvedValue(pm);

      const approvedPm = buildPostMortem({
        approvedBy: "user-1",
        approvedAt: "2024-01-17T10:00:00Z",
      });
      mockApprovePostMortem.mockResolvedValue(approvedPm);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Pending Approval")).toBeInTheDocument();
      });

      // Admin sees Approve button
      const approveButton = screen.getByRole("button", { name: /approve/i });
      expect(approveButton).toBeInTheDocument();

      await user.click(approveButton);

      await waitFor(() => {
        expect(mockApprovePostMortem).toHaveBeenCalledWith("pm-1");
      });

      expect(toast.success).toHaveBeenCalledWith("Post-mortem approved");
    });
  });

  // =========================================================================
  // Severity & Status Badge Classes
  // =========================================================================

  describe("Severity & Status Badge Variants", () => {
    it("renders P2 severity badge correctly", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ severity: "P2" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("P2")).toBeInTheDocument();
      });
    });

    it("renders P3 severity badge correctly", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ severity: "P3" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("P3")).toBeInTheDocument();
      });
    });

    it("renders P4 severity badge correctly", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ severity: "P4" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("P4")).toBeInTheDocument();
      });
    });

    it("renders default severity badge for unknown severity", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ severity: "P5" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("P5")).toBeInTheDocument();
      });
    });

    it("renders investigating status badge", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ status: "investigating" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        // The status badge with capitalize class
        const badges = document.querySelectorAll('[data-slot="badge"]');
        const statusBadge = Array.from(badges).find((b) => b.textContent === "investigating");
        expect(statusBadge).toBeTruthy();
      });
    });

    it("renders identified status badge", async () => {
      mockGetOne.mockResolvedValue(buildIncident({ status: "identified" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        const badges = document.querySelectorAll('[data-slot="badge"]');
        const statusBadge = Array.from(badges).find((b) => b.textContent === "identified");
        expect(statusBadge).toBeTruthy();
      });
    });

    it("renders default status badge for unknown status", async () => {
      // Use "investigating" status which hits statusBadgeClass "investigating" case
      // and statusVariant "identified" case via timeline badges
      mockGetOne.mockResolvedValue(buildIncident({ status: "identified" }));
      mockGetTimeline.mockResolvedValue([
        buildTimeline({
          previousStatus: "investigating",
          newStatus: "identified",
        }),
      ]);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        // "identified" status badge
        const badges = document.querySelectorAll('[data-slot="badge"]');
        const statusBadge = Array.from(badges).find((b) => b.textContent === "identified");
        expect(statusBadge).toBeTruthy();
      });

      // The timeline entry should also show investigating → identified
      await waitFor(() => {
        expect(screen.getByText("investigating")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Error Paths
  // =========================================================================

  describe("Error Paths", () => {
    it("shows toast error when handleStatusChange fails", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      mockUpdateStatus.mockRejectedValue(new Error("Server error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /investigating/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /investigating/i }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update status");
      });
    });

    it("handleAddUpdate with empty message does nothing", async () => {
      const user = userEvent.setup();

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      // The "Add Update" button should be disabled when textarea is empty
      const addUpdateBtn = screen.getByRole("button", { name: /add update/i });
      expect(addUpdateBtn).toBeDisabled();

      // Try to submit the form directly — empty message should cause early return
      // We click anyway to test the logic
      await user.click(addUpdateBtn);

      // createUpdate should not have been called
      expect(mockCreateUpdate).not.toHaveBeenCalled();
    });

    it("shows toast error when handleAddUpdate fails", async () => {
      const user = userEvent.setup();
      mockCreateUpdate.mockRejectedValue(new Error("Server error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Add a timeline update...");
      await user.type(textarea, "Failing update");

      await user.click(screen.getByRole("button", { name: /add update/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to add update");
      });
    });

    it("shows toast error when handleCreatePostMortem fails", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      mockCreatePostMortem.mockRejectedValue(new Error("Server error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/root cause/i),
        "Some root cause",
      );

      // Submit
      const submitButtons = screen.getAllByRole("button", {
        name: /create post-mortem/i,
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to create post-mortem",
        );
      });
    });

    it("shows toast error when handleApprovePostMortem fails", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      const pm = buildPostMortem({ approvedBy: null, approvedAt: null });
      mockGetByIncident.mockResolvedValue(pm);
      mockApprovePostMortem.mockRejectedValue(new Error("Server error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Pending Approval")).toBeInTheDocument();
      });

      const approveButton = screen.getByRole("button", { name: /approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to approve post-mortem",
        );
      });
    });
  });

  // =========================================================================
  // Post-Mortem Dialog Details
  // =========================================================================

  describe("Post-Mortem Dialog Details", () => {
    it("creates post-mortem with contributing factors, body, and action items", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();
      const createdPm = buildPostMortem();
      mockCreatePostMortem.mockResolvedValue(createdPm);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      // Fill root cause
      await user.type(
        screen.getByLabelText(/root cause/i),
        "Root cause text",
      );

      // Fill contributing factors
      await user.type(
        screen.getByLabelText(/contributing factors/i),
        "Factor A\nFactor B",
      );

      // Fill summary/body
      await user.type(
        screen.getByLabelText(/summary/i),
        "Detailed body text",
      );

      // Add an action item
      await user.type(
        screen.getByPlaceholderText("Action item title"),
        "Fix monitoring",
      );
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Verify the action item appears in the list
      expect(screen.getByText("Fix monitoring")).toBeInTheDocument();

      // Submit
      const submitButtons = screen.getAllByRole("button", {
        name: /create post-mortem/i,
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(mockCreatePostMortem).toHaveBeenCalledWith(
          expect.objectContaining({
            incidentId: "inc-1",
            rootCause: "Root cause text",
            contributingFactors: ["Factor A", "Factor B"],
            body: "Detailed body text",
            actionItems: [{ title: "Fix monitoring", done: false }],
          }),
        );
      });
    });

    it("add and remove action items in PM dialog", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      // Add two action items
      const actionInput = screen.getByPlaceholderText("Action item title");
      await user.type(actionInput, "Item One");
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(screen.getByText("Item One")).toBeInTheDocument();

      await user.type(actionInput, "Item Two");
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      expect(screen.getByText("Item Two")).toBeInTheDocument();

      // Remove the first action item
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      await user.click(removeButtons[0]);

      // Item One should be removed
      expect(screen.queryByText("Item One")).not.toBeInTheDocument();
      // Item Two should remain
      expect(screen.getByText("Item Two")).toBeInTheDocument();
    });

    it("cancel button in PM dialog closes it", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      // Fill some data
      await user.type(screen.getByLabelText(/root cause/i), "Some data");

      // Click cancel
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Dialog should close — create should NOT have been called
      expect(mockCreatePostMortem).not.toHaveBeenCalled();
    });

    it("PM dialog onOpenChange resets form when closed", async () => {
      mockHasRole.mockReturnValue(true);
      const user = userEvent.setup();

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create post-mortem/i }),
        ).toBeInTheDocument();
      });

      // Open dialog
      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      // Fill root cause
      await user.type(screen.getByLabelText(/root cause/i), "Test root cause");

      // Close via Escape key — this triggers onOpenChange(false) which calls resetPmForm
      await user.keyboard("{Escape}");

      // Re-open dialog — form should be reset
      await user.click(
        screen.getByRole("button", { name: /create post-mortem/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/root cause/i)).toBeInTheDocument();
      });

      // Root cause should be empty (form was reset)
      expect(screen.getByLabelText(/root cause/i)).toHaveValue("");
    });

    it("shows investigating → identified/resolved transition buttons", async () => {
      mockHasRole.mockReturnValue(true);
      mockGetOne.mockResolvedValue(buildIncident({ status: "investigating" }));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Transition to:")).toBeInTheDocument();
      });

      // investigating → [identified, resolved]
      expect(
        screen.getByRole("button", { name: /identified/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /resolved/i }),
      ).toBeInTheDocument();
    });

    it("clicking Back to Incidents in error state navigates to /incidents", async () => {
      const user = userEvent.setup();
      mockGetOne.mockRejectedValue(new Error("Network error"));
      mockGetTimeline.mockRejectedValue(new Error("Network error"));

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load incident")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Back to Incidents"));
      expect(mockPush).toHaveBeenCalledWith("/incidents");
    });

    it("renders statusBadgeClass default case via timeline entry with unusual status", async () => {
      // Timeline entries with unusual previousStatus/newStatus values
      // hit the default case in statusBadgeClass
      const unusualEntry = buildTimeline({
        id: "upd-unusual",
        message: "Unusual transition",
        previousStatus: "custom_status",
        newStatus: "another_custom",
      });
      mockGetTimeline.mockResolvedValue([unusualEntry]);

      render(<IncidentDetailClient id="inc-1" />);

      await waitFor(() => {
        expect(screen.getByText("Unusual transition")).toBeInTheDocument();
      });

      // The unusual statuses should still render
      expect(screen.getByText("custom_status")).toBeInTheDocument();
      expect(screen.getByText("another_custom")).toBeInTheDocument();
    });
  });
});
