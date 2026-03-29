import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock fns (declared before vi.mock so hoisted references work) ──────────

const mockDashboardList = vi.fn();
const mockDashboardCreate = vi.fn();
const mockDashboardUpdate = vi.fn();
const mockDashboardRemove = vi.fn();
const mockDashboardGetOne = vi.fn();
const mockCreateWidget = vi.fn();
const mockRemoveWidget = vi.fn();

vi.mock("@/lib/api-client", () => ({
  dashboards: {
    list: (...args: unknown[]) => mockDashboardList(...args),
    create: (...args: unknown[]) => mockDashboardCreate(...args),
    update: (...args: unknown[]) => mockDashboardUpdate(...args),
    remove: (...args: unknown[]) => mockDashboardRemove(...args),
    getOne: (...args: unknown[]) => mockDashboardGetOne(...args),
    createWidget: (...args: unknown[]) => mockCreateWidget(...args),
    removeWidget: (...args: unknown[]) => mockRemoveWidget(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", username: "testuser", roles: ["admin"] },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { DashboardsClient } from "./DashboardsClient";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockDashboard = {
  id: "dash-1",
  name: "Production Overview",
  description: "Main production dashboard",
  visibility: "workspace" as const,
  ownerId: "user-12345678",
  organizationId: "org-1",
  widgets: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockDashboard2 = {
  ...mockDashboard,
  id: "dash-2",
  name: "Staging Monitor",
  description: "Staging environment dashboard",
  visibility: "private" as const,
  ownerId: "user-87654321",
  widgets: [],
};

const mockWidget = {
  id: "widget-1",
  dashboardId: "dash-1",
  type: "metric_graph" as const,
  title: "CPU Usage",
  gridX: 0,
  gridY: 0,
  gridW: 4,
  gridH: 3,
  config: { metric: "cpu_usage" },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockWidget2 = {
  ...mockWidget,
  id: "widget-2",
  type: "alert_summary" as const,
  title: "Active Alerts",
  gridX: 4,
  gridY: 0,
  gridW: 6,
  gridH: 2,
  config: {},
};

const mockDashboardWithWidgets = {
  ...mockDashboard,
  widgets: [mockWidget, mockWidget2],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardList.mockResolvedValue({ data: [], total: 0 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading & Data Display (List View)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Loading & Data Display", () => {
    it("shows loading skeletons while fetching", () => {
      // Never-resolving promise keeps loading=true
      mockDashboardList.mockReturnValue(new Promise(() => {}));

      render(<DashboardsClient />);

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(6);
    });

    it("renders dashboard cards after load", async () => {
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard, mockDashboard2],
        total: 2,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });
      expect(screen.getByText("Staging Monitor")).toBeInTheDocument();
    });

    it("shows empty state when no dashboards", async () => {
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          "Create your first custom dashboard to start monitoring your services.",
        ),
      ).toBeInTheDocument();
    });

    it("shows dashboard name on card", async () => {
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });
    });

    it("shows visibility badge (private/workspace)", async () => {
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard, mockDashboard2],
        total: 2,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // workspace visibility badge for mockDashboard
      expect(screen.getByText("workspace")).toBeInTheDocument();
      // private visibility badge for mockDashboard2
      expect(screen.getByText("private")).toBeInTheDocument();
    });

    it("shows widget count badge", async () => {
      mockDashboardList.mockResolvedValue({
        data: [mockDashboardWithWidgets],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Dashboard has 2 widgets → "2 widgets"
      expect(screen.getByText("2 widgets")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard CRUD (List View)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Dashboard CRUD", () => {
    it("Create dashboard dialog opens via 'Create Dashboard' button", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Click the first "Create Dashboard" button (multiple exist in empty state)
      const createButtons = screen.getAllByRole("button", {
        name: /create dashboard/i,
      });
      await user.click(createButtons[0]);

      // Dialog should open — verify by the dialog description text
      await waitFor(() => {
        expect(
          screen.getByText("Create a new custom dashboard."),
        ).toBeInTheDocument();
      });
    });

    it("Create dashboard submits form successfully", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      const createdDashboard = {
        ...mockDashboard,
        id: "dash-new",
        name: "My New Dashboard",
        description: "A fresh dashboard",
        visibility: "workspace",
      };
      mockDashboardCreate.mockResolvedValue(createdDashboard);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Open create dialog
      const createButtons = screen.getAllByRole("button", {
        name: /create dashboard/i,
      });
      await user.click(createButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText("Create a new custom dashboard."),
        ).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText("Name");
      await user.type(nameInput, "My New Dashboard");

      const descInput = screen.getByLabelText("Description");
      await user.type(descInput, "A fresh dashboard");

      const visibilitySelect = screen.getByLabelText("Visibility");
      await user.selectOptions(visibilitySelect, "workspace");

      // Submit
      const submitBtn = screen.getByRole("button", { name: "Create" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockDashboardCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "My New Dashboard",
            description: "A fresh dashboard",
            visibility: "workspace",
          }),
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dashboard "My New Dashboard" created',
        );
      });
    });

    it("Edit dashboard dialog opens via pencil icon button", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // The pencil/edit button is icon-only — find all buttons inside the card
      // and click the one that is not destructive (edit comes before delete)
      const allButtons = screen.getAllByRole("button");
      // Find buttons that are inside a card action area — the edit button is the first
      // icon-only button after the card title. We look for all data-slot="button" elements
      // that are NOT the "Create Dashboard" button.
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      // First card button is the edit (pencil), second is the delete (trash)
      expect(cardButtons.length).toBeGreaterThanOrEqual(2);
      await user.click(cardButtons[0]);

      // Dialog should open with "Edit Dashboard" title and pre-filled values
      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText("Name");
      expect(nameInput).toHaveValue("Production Overview");

      const descInput = screen.getByLabelText("Description");
      expect(descInput).toHaveValue("Main production dashboard");

      const visibilitySelect = screen.getByLabelText("Visibility");
      expect(visibilitySelect).toHaveValue("workspace");
    });

    it("Edit dashboard submits successfully", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      const updatedDashboard = {
        ...mockDashboard,
        name: "Updated Dashboard",
      };
      mockDashboardUpdate.mockResolvedValue(updatedDashboard);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click edit button (first card action button)
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      await user.click(cardButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      // Modify name
      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Dashboard");

      // Submit via "Save Changes" button
      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockDashboardUpdate).toHaveBeenCalledWith(
          "dash-1",
          expect.objectContaining({
            name: "Updated Dashboard",
          }),
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dashboard "Updated Dashboard" updated',
        );
      });
    });

    it("Delete dashboard confirmation opens via trash icon button", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click delete button (second card action button)
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      // Delete is the second icon button in the card
      await user.click(cardButtons[1]);

      // ConfirmDialog should appear
      await waitFor(() => {
        expect(screen.getByText("Delete dashboard")).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          /Are you sure you want to delete "Production Overview"\?/,
        ),
      ).toBeInTheDocument();
    });

    it("Delete dashboard confirms and removes from list", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardRemove.mockResolvedValue(undefined);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click delete button
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      await user.click(cardButtons[1]);

      // ConfirmDialog appears
      await waitFor(() => {
        expect(screen.getByText("Delete dashboard")).toBeInTheDocument();
      });

      // Click "Delete" confirm button
      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockDashboardRemove).toHaveBeenCalledWith("dash-1");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dashboard "Production Overview" deleted',
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Builder Mode
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Builder Mode", () => {
    it("clicking a dashboard card enters builder mode", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click the card itself (not an action button)
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      expect(card).toBeTruthy();
      await user.click(card!);

      // Builder mode: heading with dashboard name + Back button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Dashboard name shown as heading in builder
      expect(
        screen.getByRole("heading", { name: "Production Overview" }),
      ).toBeInTheDocument();

      // Description shown
      expect(
        screen.getByText("Main production dashboard"),
      ).toBeInTheDocument();
    });

    it("Back button returns to list view", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Click Back
      const backBtn = screen.getByRole("button", { name: /back/i });
      await user.click(backBtn);

      // Should return to list view — "Custom Dashboards" page header visible again
      await waitFor(() => {
        expect(screen.getByText("Custom Dashboards")).toBeInTheDocument();
      });

      // The card should be visible again
      expect(screen.getByText("Production Overview")).toBeInTheDocument();
    });

    it('shows "No widgets yet" empty state for dashboard with no widgets', async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard], // mockDashboard has widgets: []
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByText("No widgets yet")).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          "Add your first widget to start building this dashboard.",
        ),
      ).toBeInTheDocument();
    });

    it("shows widget cards with type badge, title, and position info", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboardWithWidgets],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      // Wait for builder to render widgets
      await waitFor(() => {
        expect(screen.getByText("CPU Usage")).toBeInTheDocument();
      });
      expect(screen.getByText("Active Alerts")).toBeInTheDocument();

      // Type badges
      expect(screen.getByText("Metric Graph")).toBeInTheDocument();
      expect(screen.getByText("Alert Summary")).toBeInTheDocument();

      // Position info
      expect(screen.getByText(/pos\(0,0\) size\(4×3\)/)).toBeInTheDocument();
      expect(screen.getByText(/pos\(4,0\) size\(6×2\)/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Widget CRUD (Builder Mode)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Widget CRUD", () => {
    async function enterBuilderMode(
      user: ReturnType<typeof userEvent.setup>,
    ) {
      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /back/i }),
        ).toBeInTheDocument();
      });
    }

    it("Add Widget dialog opens from builder", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);
      await enterBuilderMode(user);

      // Click "Add Widget" button (multiple may exist in empty widget state)
      const addWidgetBtns = screen.getAllByRole("button", {
        name: /add widget/i,
      });
      await user.click(addWidgetBtns[0]);

      // Dialog should open
      await waitFor(() => {
        expect(
          screen.getByText("Configure a new widget for this dashboard."),
        ).toBeInTheDocument();
      });

      // Verify form fields exist
      expect(screen.getByLabelText("Type")).toBeInTheDocument();
      expect(screen.getByLabelText("Title")).toBeInTheDocument();
      expect(screen.getByLabelText("X")).toBeInTheDocument();
      expect(screen.getByLabelText("Y")).toBeInTheDocument();
      expect(screen.getByLabelText("W")).toBeInTheDocument();
      expect(screen.getByLabelText("H")).toBeInTheDocument();
      expect(screen.getByLabelText("Config (JSON)")).toBeInTheDocument();
    });

    it("Add Widget submits and refreshes dashboard", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockCreateWidget.mockResolvedValue(mockWidget);
      mockDashboardGetOne.mockResolvedValue(mockDashboardWithWidgets);

      render(<DashboardsClient />);
      await enterBuilderMode(user);

      // Open add widget dialog (multiple may exist in empty widget state)
      const addWidgetBtns = screen.getAllByRole("button", {
        name: /add widget/i,
      });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(
          screen.getByText("Configure a new widget for this dashboard."),
        ).toBeInTheDocument();
      });

      // Fill in widget form
      const titleInput = screen.getByLabelText("Title");
      await user.type(titleInput, "CPU Usage");

      const typeSelect = screen.getByLabelText("Type");
      await user.selectOptions(typeSelect, "metric_graph");

      const configTextarea = screen.getByLabelText("Config (JSON)");
      await user.type(configTextarea, '{{"metric": "cpu_usage"}');

      // Submit the widget — use the dialog footer "Add Widget" button
      // which is the last one in the DOM (inside the dialog)
      const allAddBtns = screen.getAllByRole("button", {
        name: /add widget/i,
      });
      await user.click(allAddBtns[allAddBtns.length - 1]);

      await waitFor(() => {
        expect(mockCreateWidget).toHaveBeenCalledWith(
          "dash-1",
          expect.objectContaining({
            type: "metric_graph",
            title: "CPU Usage",
          }),
        );
      });

      // After creating widget, it should call getOne to refresh
      await waitFor(() => {
        expect(mockDashboardGetOne).toHaveBeenCalledWith("dash-1");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Widget added");
      });
    });

    it("Add Widget validates JSON config", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);
      await enterBuilderMode(user);

      // Open add widget dialog (multiple may exist in empty widget state)
      const addWidgetBtns = screen.getAllByRole("button", {
        name: /add widget/i,
      });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(
          screen.getByText("Configure a new widget for this dashboard."),
        ).toBeInTheDocument();
      });

      // Fill title (required)
      const titleInput = screen.getByLabelText("Title");
      await user.type(titleInput, "Bad Config Widget");

      // Type invalid JSON — curly braces must be escaped for userEvent
      const configTextarea = screen.getByLabelText("Config (JSON)");
      await user.type(configTextarea, "not valid json");

      // Submit — use the dialog footer "Add Widget" button (last in DOM)
      const allAddBtns = screen.getAllByRole("button", {
        name: /add widget/i,
      });
      await user.click(allAddBtns[allAddBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Config must be valid JSON");
      });

      // Should NOT have called createWidget
      expect(mockCreateWidget).not.toHaveBeenCalled();
    });

    it("Delete widget confirmation and removal", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboardWithWidgets],
        total: 1,
      });
      mockRemoveWidget.mockResolvedValue(undefined);
      mockDashboardGetOne.mockResolvedValue({
        ...mockDashboard,
        widgets: [mockWidget2], // only widget2 remains after delete
      });

      render(<DashboardsClient />);
      await enterBuilderMode(user);

      // Verify widgets are shown
      await waitFor(() => {
        expect(screen.getByText("CPU Usage")).toBeInTheDocument();
      });

      // Find the delete button on the first widget card — widget cards each have
      // a single icon-only delete button inside them
      const widgetCards = document.querySelectorAll('[data-slot="card"]');
      expect(widgetCards.length).toBeGreaterThanOrEqual(2);

      // Click the delete button inside the first widget card
      const firstWidgetDeleteBtn = widgetCards[0].querySelector(
        '[data-slot="button"]',
      );
      expect(firstWidgetDeleteBtn).toBeTruthy();
      await user.click(firstWidgetDeleteBtn as HTMLElement);

      // ConfirmDialog should appear
      await waitFor(() => {
        expect(screen.getByText("Delete widget")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Are you sure you want to delete "CPU Usage"\?/),
      ).toBeInTheDocument();

      // Confirm deletion
      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockRemoveWidget).toHaveBeenCalledWith("dash-1", "widget-1");
      });

      // Should refresh the dashboard
      await waitFor(() => {
        expect(mockDashboardGetOne).toHaveBeenCalledWith("dash-1");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Widget deleted");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Error Handling", () => {
    it("shows error toast when dashboard list fails", async () => {
      mockDashboardList.mockRejectedValue(new Error("Network error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load dashboards");
      });
    });

    it("shows error toast when create fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });
      mockDashboardCreate.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Open create dialog (multiple "Create Dashboard" buttons in empty state)
      const createButtons = screen.getAllByRole("button", {
        name: /create dashboard/i,
      });
      await user.click(createButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText("Create a new custom dashboard."),
        ).toBeInTheDocument();
      });

      // Fill required name field
      const nameInput = screen.getByLabelText("Name");
      await user.type(nameInput, "Failing Dashboard");

      // Submit
      const submitBtn = screen.getByRole("button", { name: "Create" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to create dashboard",
        );
      });
    });

    it("shows error toast when save (edit) fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardUpdate.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click edit button (first card action button)
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      await user.click(cardButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update dashboard");
      });
    });

    it("shows error toast when dashboard delete fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardRemove.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Click delete button (second card action button)
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      await user.click(cardButtons[1]);

      await waitFor(() => {
        expect(screen.getByText("Delete dashboard")).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete dashboard");
      });
    });

    it("shows error toast when refreshSelected fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockCreateWidget.mockResolvedValue(mockWidget);
      // refreshSelected calls getOne which fails
      mockDashboardGetOne.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Configure a new widget for this dashboard.")).toBeInTheDocument();
      });

      // Fill title
      const titleInput = screen.getByLabelText("Title");
      await user.type(titleInput, "Test Widget");

      // Submit
      const allAddBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(allAddBtns[allAddBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to refresh dashboard");
      });
    });

    it("shows error toast when widget creation fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockCreateWidget.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Configure a new widget for this dashboard.")).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText("Title");
      await user.type(titleInput, "Failing Widget");

      const allAddBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(allAddBtns[allAddBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to add widget");
      });
    });

    it("shows error toast when widget delete fails", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboardWithWidgets],
        total: 1,
      });
      mockRemoveWidget.mockRejectedValue(new Error("Server error"));

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByText("CPU Usage")).toBeInTheDocument();
      });

      // Click the delete button on the first widget card
      const widgetCards = document.querySelectorAll('[data-slot="card"]');
      const firstWidgetDeleteBtn = widgetCards[0].querySelector('[data-slot="button"]');
      await user.click(firstWidgetDeleteBtn as HTMLElement);

      // ConfirmDialog should appear
      await waitFor(() => {
        expect(screen.getByText("Delete widget")).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete widget");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Widget Type Icons
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Widget Type Icons", () => {
    const widgetTypes = [
      { type: "component_health" as const, label: "Component Health" },
      { type: "deployment_feed" as const, label: "Deployment Feed" },
      { type: "queue_status" as const, label: "Queue Status" },
      { type: "slo_gauge" as const, label: "SLO Gauge" },
      { type: "team_activity" as const, label: "Team Activity" },
      { type: "uptime_chart" as const, label: "Uptime Chart" },
    ];

    for (const { type, label } of widgetTypes) {
      it(`renders widget icon for type "${type}"`, async () => {
        const user = userEvent.setup();
        const dashWithWidget = {
          ...mockDashboard,
          widgets: [
            {
              ...mockWidget,
              id: `widget-${type}`,
              type,
              title: `${label} Widget`,
            },
          ],
        };
        mockDashboardList.mockResolvedValue({
          data: [dashWithWidget],
          total: 1,
        });

        render(<DashboardsClient />);

        await waitFor(() => {
          expect(screen.getByText("Production Overview")).toBeInTheDocument();
        });

        // Enter builder mode
        const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
        await user.click(card!);

        // Verify widget renders with correct label badge
        await waitFor(() => {
          expect(screen.getByText(`${label} Widget`)).toBeInTheDocument();
        });
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation & Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Validation & Edge Cases", () => {
    it("handleSaveDashboard with empty name shows toast error", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Open create dialog
      const createButtons = screen.getAllByRole("button", {
        name: /create dashboard/i,
      });
      await user.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Create a new custom dashboard.")).toBeInTheDocument();
      });

      // Leave name empty and submit
      const submitBtn = screen.getByRole("button", { name: "Create" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Name is required");
      });

      // create should NOT have been called
      expect(mockDashboardCreate).not.toHaveBeenCalled();
    });

    it("handleSaveWidget with empty title shows toast error", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Configure a new widget for this dashboard.")).toBeInTheDocument();
      });

      // Leave title empty and submit
      const allAddBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(allAddBtns[allAddBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Widget title is required");
      });

      expect(mockCreateWidget).not.toHaveBeenCalled();
    });

    it("deleting the currently selected dashboard clears the builder", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardRemove.mockResolvedValue(undefined);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open edit dialog from builder view (to get the dashboard dialog)
      // The builder has an "Edit" button at the top
      const editBtn = screen.getByRole("button", { name: /edit/i });
      await user.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      // Close the edit dialog via Cancel
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Go back to list view
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });
      const backBtn = screen.getByRole("button", { name: /back/i });
      await user.click(backBtn);

      // Now we're in list view again, select the dashboard and delete it
      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode again
      const card2 = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card2!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Go back and delete from list
      await user.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText("Custom Dashboards")).toBeInTheDocument();
      });

      // Click delete button (second card action button)
      const allButtons = screen.getAllByRole("button");
      const cardButtons = allButtons.filter(
        (btn) =>
          !btn.textContent?.includes("Create Dashboard") &&
          btn.closest('[data-slot="card"]'),
      );
      await user.click(cardButtons[1]);

      await waitFor(() => {
        expect(screen.getByText("Delete dashboard")).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockDashboardRemove).toHaveBeenCalledWith("dash-1");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dashboard "Production Overview" deleted',
        );
      });
    });

    it("shows '0 widgets' for dashboard with no widgets", async () => {
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard], // widgets: []
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      expect(screen.getByText("0 widgets")).toBeInTheDocument();
    });

    it("shows '1 widget' (singular) for dashboard with one widget", async () => {
      const dashWithOneWidget = {
        ...mockDashboard,
        widgets: [mockWidget],
      };
      mockDashboardList.mockResolvedValue({
        data: [dashWithOneWidget],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      expect(screen.getByText("1 widget")).toBeInTheDocument();
    });

    it("widget grid inputs (X, Y, W, H) accept values", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("X")).toBeInTheDocument();
      });

      // Change grid inputs
      const xInput = screen.getByLabelText("X");
      await user.clear(xInput);
      await user.type(xInput, "2");
      expect(xInput).toHaveValue(2);

      const yInput = screen.getByLabelText("Y");
      await user.clear(yInput);
      await user.type(yInput, "3");
      expect(yInput).toHaveValue(3);

      const wInput = screen.getByLabelText("W");
      await user.clear(wInput);
      await user.type(wInput, "6");
      expect(wInput).toHaveValue(6);

      const hInput = screen.getByLabelText("H");
      await user.clear(hInput);
      await user.type(hInput, "4");
      expect(hInput).toHaveValue(4);
    });

    it("widget config textarea accepts JSON input", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("Config (JSON)")).toBeInTheDocument();
      });

      const configTextarea = screen.getByLabelText("Config (JSON)");
      await user.type(configTextarea, "test config");
      expect(configTextarea).toHaveValue("test config");
    });

    it("dashboard dialog form inputs (name, description, visibility) work", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Open create dialog
      const createButtons = screen.getAllByRole("button", { name: /create dashboard/i });
      await user.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("Name")).toBeInTheDocument();
      });

      // Test name input
      const nameInput = screen.getByLabelText("Name");
      await user.type(nameInput, "Test Dashboard");
      expect(nameInput).toHaveValue("Test Dashboard");

      // Test description input
      const descInput = screen.getByLabelText("Description");
      await user.type(descInput, "Test Description");
      expect(descInput).toHaveValue("Test Description");

      // Test visibility select
      const visibilitySelect = screen.getByLabelText("Visibility");
      await user.selectOptions(visibilitySelect, "workspace");
      expect(visibilitySelect).toHaveValue("workspace");
    });

    it("dashboard dialog cancel button closes without saving", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({ data: [], total: 0 });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("No dashboards")).toBeInTheDocument();
      });

      // Open create dialog
      const createButtons = screen.getAllByRole("button", { name: /create dashboard/i });
      await user.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Create a new custom dashboard.")).toBeInTheDocument();
      });

      // Click cancel
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Dialog should close — create should NOT have been called
      expect(mockDashboardCreate).not.toHaveBeenCalled();
    });

    it("edit dashboard in builder mode (openEditDialog from builder)", async () => {
      const user = userEvent.setup();
      const updatedDashboard = {
        ...mockDashboard,
        name: "Builder Edited",
      };
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardUpdate.mockResolvedValue(updatedDashboard);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Click "Edit" button in builder header
      const editBtn = screen.getByRole("button", { name: /edit/i });
      await user.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      // Verify pre-filled values
      expect(screen.getByLabelText("Name")).toHaveValue("Production Overview");

      // Modify name
      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Builder Edited");

      // Submit
      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockDashboardUpdate).toHaveBeenCalledWith(
          "dash-1",
          expect.objectContaining({ name: "Builder Edited" }),
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dashboard "Builder Edited" updated',
        );
      });
    });

    it("widget dialog cancel button closes without adding widget", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Open add widget dialog
      const addWidgetBtns = screen.getAllByRole("button", { name: /add widget/i });
      await user.click(addWidgetBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Configure a new widget for this dashboard.")).toBeInTheDocument();
      });

      // Click Cancel in widget dialog
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Widget should NOT have been created
      expect(mockCreateWidget).not.toHaveBeenCalled();
    });

    it("builder edit dialog description and visibility inputs work", async () => {
      const user = userEvent.setup();
      const updatedDashboard = {
        ...mockDashboard,
        name: "Production Overview",
        description: "Updated desc",
        visibility: "private" as const,
      };
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });
      mockDashboardUpdate.mockResolvedValue(updatedDashboard);

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Click "Edit" button in builder header
      const editBtn = screen.getByRole("button", { name: /edit/i });
      await user.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      // Modify description
      const descInput = screen.getByLabelText("Description");
      await user.clear(descInput);
      await user.type(descInput, "Updated desc");
      expect(descInput).toHaveValue("Updated desc");

      // Modify visibility
      const visibilitySelect = screen.getByLabelText("Visibility");
      await user.selectOptions(visibilitySelect, "private");
      expect(visibilitySelect).toHaveValue("private");

      // Submit
      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockDashboardUpdate).toHaveBeenCalledWith(
          "dash-1",
          expect.objectContaining({
            description: "Updated desc",
            visibility: "private",
          }),
        );
      });
    });

    it("builder edit dialog cancel button closes without saving", async () => {
      const user = userEvent.setup();
      mockDashboardList.mockResolvedValue({
        data: [mockDashboard],
        total: 1,
      });

      render(<DashboardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Production Overview")).toBeInTheDocument();
      });

      // Enter builder mode
      const card = screen.getByText("Production Overview").closest('[data-slot="card"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Click "Edit" in builder header
      const editBtn = screen.getByRole("button", { name: /edit/i });
      await user.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText("Edit Dashboard")).toBeInTheDocument();
      });

      // Click Cancel
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Update should NOT have been called
      expect(mockDashboardUpdate).not.toHaveBeenCalled();
    });
  });
});
