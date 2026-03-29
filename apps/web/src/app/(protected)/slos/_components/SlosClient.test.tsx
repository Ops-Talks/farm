import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock fns (declared before vi.mock calls) ──────────────────────────────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockGetBudget = vi.fn();
const mockHasRole = vi.fn();

vi.mock("@/lib/api-client", () => ({
  slos: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    getBudget: (...args: unknown[]) => mockGetBudget(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
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

import { SlosClient } from "./SlosClient";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSlo = {
  id: "slo-1",
  name: "API Availability",
  description: "Overall API uptime",
  targetPercent: 99.9,
  metricType: "availability" as const,
  window: "30d" as const,
  componentId: null,
  enabled: true,
  organizationId: "org-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockSlo2 = {
  ...mockSlo,
  id: "slo-2",
  name: "Latency P99",
  description: "P99 latency target",
  targetPercent: 95,
  metricType: "latency" as const,
  window: "7d" as const,
  enabled: false,
};

const mockSlo3 = {
  ...mockSlo,
  id: "slo-3",
  name: "Checkout Errors",
  description: "Error rate SLO",
  targetPercent: 99,
  metricType: "error_rate" as const,
  window: "90d" as const,
  enabled: true,
};

const mockBudget = {
  sloId: "slo-1",
  name: "API Availability",
  targetPercent: 99.9,
  currentPercent: 99.5,
  budgetTotal: 0.1,
  budgetConsumed: 0.04,
  budgetRemaining: 0.06,
  status: "healthy" as const,
};

const mockBudgetWarning = {
  ...mockBudget,
  sloId: "slo-2",
  status: "warning" as const,
  budgetRemaining: 0.03,
};

const mockBudgetCritical = {
  ...mockBudget,
  sloId: "slo-3",
  status: "critical" as const,
  budgetRemaining: 0.01,
};

const mockBudgetExhausted = {
  ...mockBudget,
  sloId: "slo-1",
  status: "exhausted" as const,
  budgetRemaining: 0.0,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SlosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: [], total: 0 });
    mockGetBudget.mockResolvedValue(mockBudget);
    mockHasRole.mockReturnValue(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading & Data Display
  // ═══════════════════════════════════════════════════════════════════════════

  it("shows loading skeletons while fetching", () => {
    // Never-resolving promise keeps loading=true
    mockList.mockReturnValue(new Promise(() => {}));

    render(<SlosClient />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders SLO table with data after load", async () => {
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });
    expect(screen.getByText("Latency P99")).toBeInTheDocument();

    // Column headers
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Metric Type")).toBeInTheDocument();
    expect(screen.getByText("Target %")).toBeInTheDocument();
    expect(screen.getByText("Window")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Budget Status")).toBeInTheDocument();
  });

  it("shows empty state when no SLOs", async () => {
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Create your first Service Level Objective to start tracking reliability.",
      ),
    ).toBeInTheDocument();
  });

  it("displays metric type badges (availability, latency, error_rate)", async () => {
    mockList.mockResolvedValue({
      data: [mockSlo, mockSlo2, mockSlo3],
      total: 3,
    });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Availability")).toBeInTheDocument();
    });
    expect(screen.getByText("Latency")).toBeInTheDocument();
    expect(screen.getByText("Error Rate")).toBeInTheDocument();
  });

  it("shows budget status when available (healthy)", async () => {
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    mockGetBudget.mockResolvedValue(mockBudget);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/healthy/)).toBeInTheDocument();
      expect(screen.getByText(/0\.1% remaining/)).toBeInTheDocument();
    });
  });

  it("shows budget status with warning variant", async () => {
    mockList.mockResolvedValue({ data: [mockSlo2], total: 1 });
    mockGetBudget.mockResolvedValue(mockBudgetWarning);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Latency P99")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/warning/)).toBeInTheDocument();
    });
  });

  it("shows budget status with critical variant", async () => {
    mockList.mockResolvedValue({ data: [mockSlo3], total: 1 });
    mockGetBudget.mockResolvedValue(mockBudgetCritical);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Checkout Errors")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/critical/)).toBeInTheDocument();
    });
  });

  it("shows budget status with exhausted variant", async () => {
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    mockGetBudget.mockResolvedValue(mockBudgetExhausted);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/exhausted/)).toBeInTheDocument();
      expect(screen.getByText(/0\.0% remaining/)).toBeInTheDocument();
    });
  });

  it("shows dash when budget is not loaded", async () => {
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    // getBudget rejects so budget won't be in the map
    mockGetBudget.mockRejectedValue(new Error("not available"));

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    // The component renders an em-dash when no budget data
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it('shows total count "Showing X of Y SLOs"', async () => {
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Showing 2 of 2 SLOs")).toBeInTheDocument();
    });
  });

  it("shows singular SLO label when total is 1", async () => {
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Showing 1 of 1 SLO")).toBeInTheDocument();
    });
  });

  it("displays target percent and window for each SLO", async () => {
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    expect(screen.getByText("99.9%")).toBeInTheDocument();
    expect(screen.getByText("30d")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("displays enabled/disabled status badges", async () => {
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("Enabled")).toBeInTheDocument();
    });
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Admin Actions
  // ═══════════════════════════════════════════════════════════════════════════

  it('admin sees "Create SLO" button', async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    // Create SLO button appears in PageHeader AND in EmptyState
    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('non-admin does not see "Create SLO" button', async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /create slo/i }),
    ).not.toBeInTheDocument();
  });

  it("admin sees Edit and Delete buttons per row", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);

    // Actions column header appears
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("non-admin does not see Edit/Delete buttons", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("create dialog opens, fills form, and submits successfully", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    const createdSlo = {
      ...mockSlo,
      id: "slo-new",
      name: "New SLO",
      description: "A new SLO",
    };
    mockCreate.mockResolvedValue(createdSlo);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    // Click "Create SLO" button (the one in PageHeader)
    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open — verify by checking for the form field
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    // Fill in the form
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "New SLO");

    const descInput = screen.getByLabelText("Description");
    await user.type(descInput, "A new SLO");

    const targetInput = screen.getByLabelText("Target Percent");
    await user.clear(targetInput);
    await user.type(targetInput, "99.5");

    // Select metric type
    const metricSelect = screen.getByLabelText("Metric Type");
    await user.selectOptions(metricSelect, "latency");

    // Select window
    const windowSelect = screen.getByLabelText("Window");
    await user.selectOptions(windowSelect, "7d");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New SLO",
          description: "A new SLO",
          targetPercent: 99.5,
          metricType: "latency",
          window: "7d",
          enabled: true,
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('SLO "New SLO" created');
    });
  });

  it("edit dialog opens with pre-filled values and submits update", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    const updatedSlo = {
      ...mockSlo,
      name: "Updated Availability",
    };
    mockUpdate.mockResolvedValue(updatedSlo);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    // Click Edit button
    const editBtn = screen.getByRole("button", { name: /edit/i });
    await user.click(editBtn);

    // Dialog should show "Edit SLO"
    await waitFor(() => {
      expect(screen.getByText("Edit SLO")).toBeInTheDocument();
    });

    // Form should be pre-filled
    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("API Availability");

    const descInput = screen.getByLabelText("Description");
    expect(descInput).toHaveValue("Overall API uptime");

    const targetInput = screen.getByLabelText("Target Percent");
    expect(targetInput).toHaveValue(99.9);

    const metricSelect = screen.getByLabelText("Metric Type");
    expect(metricSelect).toHaveValue("availability");

    const windowSelect = screen.getByLabelText("Window");
    expect(windowSelect).toHaveValue("30d");

    // Modify the name
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Availability");

    // Submit via "Update" button
    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "slo-1",
        expect.objectContaining({
          name: "Updated Availability",
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'SLO "Updated Availability" updated',
      );
    });
  });

  it("delete confirmation dialog opens and confirms deletion", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    mockRemove.mockResolvedValue(undefined);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    // Click Delete button
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Delete SLO")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Are you sure you want to delete "API Availability"\?/),
    ).toBeInTheDocument();

    // Click confirm button in the dialog
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("slo-1");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'SLO "API Availability" deleted',
      );
    });
  });

  it("shows toast on successful create", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    const createdSlo = { ...mockSlo, id: "slo-new", name: "Test SLO" };
    mockCreate.mockResolvedValue(createdSlo);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open — verify by checking for the form field
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Test SLO");

    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('SLO "Test SLO" created');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  it("shows error toast when fetch fails", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    render(<SlosClient />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load SLOs");
    });
  });

  it("shows error toast when create fails", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });
    mockCreate.mockRejectedValue(new Error("Server error"));

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open — verify by checking for the form field
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Failing SLO");

    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create SLO");
    });
  });

  it("shows error toast when update fails", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    mockUpdate.mockRejectedValue(new Error("Server error"));

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit SLO")).toBeInTheDocument();
    });

    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update SLO");
    });
  });

  it("shows error toast when delete fails", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });
    mockRemove.mockRejectedValue(new Error("Server error"));

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete SLO")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete SLO");
    });
  });

  it("refresh button re-fetches data", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    expect(mockList).toHaveBeenCalledTimes(1);

    // Now update mockList to return different data
    mockList.mockResolvedValue({
      data: [mockSlo, mockSlo2],
      total: 2,
    });

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshBtn);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText("Latency P99")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  it("admin sees Create SLO button in empty state", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    // There should be a Create SLO button inside the EmptyState as well
    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    // PageHeader + EmptyState
    expect(createButtons.length).toBe(2);
  });

  it("fetches budgets for each SLO after list loads", async () => {
    mockList.mockResolvedValue({
      data: [mockSlo, mockSlo2],
      total: 2,
    });
    mockGetBudget.mockImplementation((id: string) => {
      if (id === "slo-1") return Promise.resolve(mockBudget);
      if (id === "slo-2") return Promise.resolve(mockBudgetWarning);
      return Promise.reject(new Error("unknown"));
    });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockGetBudget).toHaveBeenCalledWith("slo-1");
      expect(mockGetBudget).toHaveBeenCalledWith("slo-2");
    });
  });

  it("cancel button in create dialog closes without submitting", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open — verify by checking for the form field
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    // Create should not have been called
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("SLO is removed from table after successful deletion", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo, mockSlo2], total: 2 });
    mockRemove.mockResolvedValue(undefined);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
      expect(screen.getByText("Latency P99")).toBeInTheDocument();
    });

    // Delete the first SLO — find the Delete button in its row
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete SLO")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.queryByText("API Availability"),
      ).not.toBeInTheDocument();
    });

    // The other SLO should still be visible
    expect(screen.getByText("Latency P99")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Uncovered Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  it("edit dialog for SLO with no componentId sets componentId to empty string", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    // mockSlo has componentId: null
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    const updatedSlo = { ...mockSlo, name: "Edited No Component" };
    mockUpdate.mockResolvedValue(updatedSlo);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    // Click Edit
    const editBtn = screen.getByRole("button", { name: /edit/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit SLO")).toBeInTheDocument();
    });

    // componentId should be empty (since source is null)
    const componentInput = screen.getByLabelText("Component ID");
    expect(componentInput).toHaveValue("");

    // Modify name and submit
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Edited No Component");

    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "slo-1",
        expect.objectContaining({ name: "Edited No Component" }),
      );
    });
  });

  it("edit dialog for SLO with componentId pre-fills component input", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    const sloWithComponent = {
      ...mockSlo,
      id: "slo-comp",
      name: "SLO With Component",
      componentId: "comp-abc-123",
    };
    mockList.mockResolvedValue({ data: [sloWithComponent], total: 1 });

    const updatedSlo = { ...sloWithComponent, name: "Updated Component SLO" };
    mockUpdate.mockResolvedValue(updatedSlo);

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("SLO With Component")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit SLO")).toBeInTheDocument();
    });

    // componentId should be pre-filled
    const componentInput = screen.getByLabelText("Component ID");
    expect(componentInput).toHaveValue("comp-abc-123");
  });

  it("handleSubmit edit with invalid targetPercent (NaN) does nothing", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [mockSlo], total: 1 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("API Availability")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit SLO")).toBeInTheDocument();
    });

    // Set target to invalid value
    const targetInput = screen.getByLabelText("Target Percent");
    await user.clear(targetInput);
    await user.type(targetInput, "not-a-number");

    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    // Update should NOT have been called (early return due to NaN)
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("component ID input onChange works in create dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Component ID")).toBeInTheDocument();
    });

    const componentInput = screen.getByLabelText("Component ID");
    await user.type(componentInput, "comp-xyz");
    expect(componentInput).toHaveValue("comp-xyz");
  });

  it("enabled checkbox onChange works in create dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0 });

    render(<SlosClient />);

    await waitFor(() => {
      expect(screen.getByText("No SLOs defined")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create slo/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Enabled")).toBeInTheDocument();
    });

    // Default is checked
    const enabledCheckbox = screen.getByLabelText("Enabled");
    expect(enabledCheckbox).toBeChecked();

    // Uncheck it
    await user.click(enabledCheckbox);
    expect(enabledCheckbox).not.toBeChecked();

    // Check it again
    await user.click(enabledCheckbox);
    expect(enabledCheckbox).toBeChecked();
  });
});
