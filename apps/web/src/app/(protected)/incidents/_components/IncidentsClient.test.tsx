import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock fns (declared before vi.mock so hoisted references work) ──────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();
const mockPush = vi.fn();
const mockHasRole = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/incidents",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  incidents: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

// Import component AFTER mocks
import { IncidentsClient } from "./IncidentsClient";
import { toast } from "sonner";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockIncident = {
  id: "inc-1",
  title: "Database outage",
  description: "Primary DB cluster went down",
  severity: "P1" as const,
  status: "open" as const,
  commanderUserId: "usr-12345678-abcd",
  organizationId: "org-1",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
};

function buildIncident(overrides: Record<string, unknown> = {}) {
  return { ...mockIncident, ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("IncidentsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: [], total: 0 });
    mockHasRole.mockReturnValue(false);
  });

  // ─── Loading & Data Display ────────────────────────────────────────────────

  describe("Loading & Data Display", () => {
    it("shows loading skeleton table while fetching", () => {
      // Never-resolving promise keeps loading state active
      mockList.mockReturnValue(new Promise(() => {}));

      render(<IncidentsClient />);

      // Skeleton renders data-slot="skeleton" divs
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders incident table with data after load", async () => {
      mockList.mockResolvedValue({
        data: [
          buildIncident({ id: "inc-1", title: "Database outage" }),
          buildIncident({ id: "inc-2", title: "API latency spike" }),
        ],
        total: 2,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });
      expect(screen.getByText("API latency spike")).toBeInTheDocument();
    });

    it("shows empty state when no incidents", async () => {
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("No incidents")).toBeInTheDocument();
      });
      expect(
        screen.getByText("No incidents match the current filters."),
      ).toBeInTheDocument();
    });

    it("displays severity badges with correct text (P1, P2, P3, P4)", async () => {
      mockList.mockResolvedValue({
        data: [
          buildIncident({ id: "inc-1", severity: "P1", title: "Critical" }),
          buildIncident({ id: "inc-2", severity: "P2", title: "High" }),
          buildIncident({ id: "inc-3", severity: "P3", title: "Medium" }),
          buildIncident({ id: "inc-4", severity: "P4", title: "Low" }),
        ],
        total: 4,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Critical")).toBeInTheDocument();
      });

      // Severity badges are rendered as inline <span> elements in table cells.
      // The filter dropdown also contains P1-P4 as <option> text, so we look
      // for the badge spans specifically.
      const badges = document.querySelectorAll("span.inline-flex");
      const badgeTexts = Array.from(badges).map((b) => b.textContent);
      expect(badgeTexts).toContain("P1");
      expect(badgeTexts).toContain("P2");
      expect(badgeTexts).toContain("P3");
      expect(badgeTexts).toContain("P4");
    });

    it("displays status badges with correct text (open, investigating, identified, resolved)", async () => {
      mockList.mockResolvedValue({
        data: [
          buildIncident({ id: "inc-1", status: "open", title: "A" }),
          buildIncident({ id: "inc-2", status: "investigating", title: "B" }),
          buildIncident({ id: "inc-3", status: "identified", title: "C" }),
          buildIncident({ id: "inc-4", status: "resolved", title: "D" }),
        ],
        total: 4,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("A")).toBeInTheDocument();
      });

      expect(screen.getByText("open")).toBeInTheDocument();
      expect(screen.getByText("investigating")).toBeInTheDocument();
      expect(screen.getByText("identified")).toBeInTheDocument();
      expect(screen.getByText("resolved")).toBeInTheDocument();
    });

    it("shows commander ID truncated to 8 chars", async () => {
      mockList.mockResolvedValue({
        data: [buildIncident({ commanderUserId: "usr-12345678-abcd" })],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("usr-1234")).toBeInTheDocument();
      });

      // Full ID should NOT appear
      expect(screen.queryByText("usr-12345678-abcd")).not.toBeInTheDocument();
    });

    it("shows dash for missing commander", async () => {
      mockList.mockResolvedValue({
        data: [buildIncident({ commanderUserId: null })],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("\u2014")).toBeInTheDocument();
      });
    });
  });

  // ─── Navigation & Filtering ────────────────────────────────────────────────

  describe("Navigation & Filtering", () => {
    it("clicking a row navigates to incident detail page", async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValue({
        data: [buildIncident({ id: "inc-42", title: "Click me" })],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Click me")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Click me"));

      expect(mockPush).toHaveBeenCalledWith("/incidents/inc-42");
    });

    it("status filter changes trigger re-fetch with correct params", async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(1);
      });

      // Initial call – no status filter
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined }),
      );

      // Select "Investigating"
      const statusSelect = screen.getByLabelText("Status");
      await user.selectOptions(statusSelect, "investigating");

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "investigating",
            skip: 0,
          }),
        );
      });
    });

    it("severity filter changes trigger re-fetch with correct params", async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(1);
      });

      // Initial call – no severity filter
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ severity: undefined }),
      );

      // Select "P1"
      const severitySelect = screen.getByLabelText("Severity");
      await user.selectOptions(severitySelect, "P1");

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: "P1",
            skip: 0,
          }),
        );
      });
    });

    it("pagination: Next/Previous buttons navigate correctly", async () => {
      const user = userEvent.setup();
      // 25 total with PAGE_SIZE=20 -> 2 pages
      mockList.mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) =>
          buildIncident({ id: `inc-${i}`, title: `Incident ${i}` }),
        ),
        total: 25,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      });

      // Previous should be disabled on first page
      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).toBeDisabled();

      // Click Next
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 20, take: 20 }),
        );
      });
    });
  });

  // ─── Admin Actions ─────────────────────────────────────────────────────────

  describe("Admin Actions", () => {
    it('admin sees "Create Incident" button', async () => {
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });
    });

    it('non-admin does not see "Create Incident" button', async () => {
      mockHasRole.mockReturnValue(false);
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("No incidents")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /create incident/i }),
      ).not.toBeInTheDocument();
    });

    it("non-admin does not see Delete buttons on rows", async () => {
      mockHasRole.mockReturnValue(false);
      mockList.mockResolvedValue({
        data: [buildIncident()],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Database outage")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /delete/i }),
      ).not.toBeInTheDocument();
    });

    it("admin sees Delete button per row", async () => {
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({
        data: [
          buildIncident({ id: "inc-1", title: "Outage A" }),
          buildIncident({ id: "inc-2", title: "Outage B" }),
        ],
        total: 2,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Outage A")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it("create dialog opens, fills form, submits successfully", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });
      mockCreate.mockResolvedValue(buildIncident({ id: "inc-new" }));

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });

      // Open the dialog
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Fill in the form using explicit label text to avoid ambiguity
      await user.type(screen.getByLabelText("Title"), "Network connectivity loss");
      await user.type(
        screen.getByLabelText("Description"),
        "All east-coast servers lost connectivity",
      );

      // Change severity to P1 — use the dialog's severity select (id="incident-severity")
      const severitySelect = document.getElementById("incident-severity") as HTMLSelectElement;
      await user.selectOptions(severitySelect, "P1");

      await user.type(
        screen.getByLabelText("Commander User ID"),
        "usr-commander-1",
      );

      // Submit - the submit button text is "Create Incident" inside the dialog.
      // There may be two buttons with that name (page header + dialog); pick the last.
      const submitButtons = screen.getAllByRole("button", {
        name: /create incident/i,
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Network connectivity loss",
            description: "All east-coast servers lost connectivity",
            severity: "P1",
            commanderUserId: "usr-commander-1",
          }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Incident created");
    });

    it("delete confirmation opens, confirms deletion", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({
        data: [buildIncident({ id: "inc-del", title: "Stale incident" })],
        total: 1,
      });
      mockRemove.mockResolvedValue(undefined);

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Stale incident")).toBeInTheDocument();
      });

      // Click the Delete button on the row
      await user.click(screen.getByRole("button", { name: /delete/i }));

      // ConfirmDialog should appear with the incident title
      await waitFor(() => {
        expect(screen.getByText(/delete incident/i)).toBeInTheDocument();
        expect(
          screen.getByText(/are you sure you want to delete "Stale incident"/i),
        ).toBeInTheDocument();
      });

      // Confirm deletion - the ConfirmDialog renders a "Delete" confirm button
      const confirmButton = screen.getByRole("button", { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith("inc-del");
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Incident "Stale incident" deleted',
      );
    });

    it("delete button click does not navigate to detail page (stopPropagation)", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({
        data: [buildIncident({ id: "inc-nav", title: "Don't navigate" })],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Don't navigate")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /delete/i }));

      // Should NOT have navigated
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────

  describe("Error Handling", () => {
    it("shows error toast when fetch fails", async () => {
      mockList.mockRejectedValue(new Error("Network error"));

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load incidents");
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });
      mockCreate.mockRejectedValue(new Error("Server error"));

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });

      // Open dialog
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Fill required field
      await user.type(screen.getByLabelText("Title"), "Failing incident");

      // Submit
      const submitButtons = screen.getAllByRole("button", {
        name: /create incident/i,
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Failed to create incident");
      });
    });

    it("shows error toast when delete fails", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({
        data: [buildIncident({ id: "inc-fail", title: "Fail to delete" })],
        total: 1,
      });
      mockRemove.mockRejectedValue(new Error("Server error"));

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Fail to delete")).toBeInTheDocument();
      });

      // Click Delete button on the row
      await user.click(screen.getByRole("button", { name: /delete/i }));

      // Wait for confirm dialog
      await waitFor(() => {
        expect(screen.getByText(/delete incident/i)).toBeInTheDocument();
      });

      // Confirm
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith("inc-fail");
        expect(toast.error).toHaveBeenCalledWith("Failed to delete incident");
      });
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("changing filter resets page to 0 and re-fetches", async () => {
      const user = userEvent.setup();

      // First load: 25 total -> page 1 of 2
      mockList.mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) =>
          buildIncident({ id: `inc-${i}`, title: `Incident ${i}` }),
        ),
        total: 25,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      });

      // Navigate to page 2
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 20 }),
        );
      });

      // Now change the status filter - should reset to page 0
      mockList.mockResolvedValue({ data: [], total: 0 });
      const statusSelect = screen.getByLabelText("Status");
      await user.selectOptions(statusSelect, "resolved");

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "resolved",
            skip: 0,
          }),
        );
      });
    });

    it("shows description in page header with correct singular form", async () => {
      mockList.mockResolvedValue({
        data: [buildIncident()],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("1 incident tracked")).toBeInTheDocument();
      });
    });

    it("shows plural incidents count in header", async () => {
      mockList.mockResolvedValue({
        data: [
          buildIncident({ id: "inc-1" }),
          buildIncident({ id: "inc-2" }),
        ],
        total: 2,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("2 incidents tracked")).toBeInTheDocument();
      });
    });

    it("formats created date as locale string", async () => {
      mockList.mockResolvedValue({
        data: [
          buildIncident({
            createdAt: "2024-01-15T10:00:00Z",
          }),
        ],
        total: 1,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        const dateText = new Date("2024-01-15T10:00:00Z").toLocaleDateString();
        expect(screen.getByText(dateText)).toBeInTheDocument();
      });
    });

    it("handleCreate with empty title does nothing", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });

      // Open the dialog
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Leave title empty (or clear it) — just click submit without filling
      // The title field is required, but we test the handleCreate guard
      // Type whitespace only
      await user.type(screen.getByLabelText("Title"), "   ");
      await user.clear(screen.getByLabelText("Title"));

      // Submit — the submit button inside the dialog
      const submitButtons = screen.getAllByRole("button", {
        name: /create incident/i,
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      // Create should NOT have been called
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("previous page button navigates back", async () => {
      const user = userEvent.setup();
      // 25 total with PAGE_SIZE=20 -> 2 pages
      mockList.mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) =>
          buildIncident({ id: `inc-${i}`, title: `Incident ${i}` }),
        ),
        total: 25,
      });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      });

      // Go to page 2
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 20 }),
        );
      });

      // Now Previous should be enabled — click it
      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).not.toBeDisabled();
      await user.click(prevButton);

      await waitFor(() => {
        expect(mockList).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0 }),
        );
      });
    });

    it("closing create dialog resets form fields", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });

      // Open dialog
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Fill in some data
      await user.type(screen.getByLabelText("Title"), "Temp Title");

      // Close dialog via Escape key — triggers onOpenChange(false) which resets form
      await user.keyboard("{Escape}");

      // Re-open dialog — form should be reset
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Title should be empty (form was reset via onOpenChange)
      expect(screen.getByLabelText("Title")).toHaveValue("");
    });

    it("cancel button in create dialog closes without creating", async () => {
      const user = userEvent.setup();
      mockHasRole.mockReturnValue(true);
      mockList.mockResolvedValue({ data: [], total: 0 });

      render(<IncidentsClient />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /create incident/i }),
        ).toBeInTheDocument();
      });

      // Open dialog
      await user.click(
        screen.getByRole("button", { name: /create incident/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
      });

      // Click cancel
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Create should NOT have been called
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
