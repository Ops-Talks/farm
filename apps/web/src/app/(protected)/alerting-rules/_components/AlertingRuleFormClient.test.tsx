import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/alerting-rules/new",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  alertingRules: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { AlertingRuleFormClient } from "@/app/(protected)/alerting-rules/_components/AlertingRuleFormClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeRule = () => ({
  id: "rule-1",
  name: "HighCPU",
  description: "CPU over 90%",
  query: "cpu_usage > 0.9",
  duration: "5m",
  severity: "warning" as const,
  enabled: true,
  componentId: "",
  environmentId: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("AlertingRuleFormClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Create Alerting Rule' heading in create mode", () => {
    render(<AlertingRuleFormClient />);
    expect(screen.getByText("Create Alerting Rule")).toBeInTheDocument();
  });

  it("renders 'Edit Alerting Rule' heading in edit mode", () => {
    render(<AlertingRuleFormClient rule={makeRule()} />);
    expect(screen.getByText("Edit Alerting Rule")).toBeInTheDocument();
  });

  it("pre-fills form fields when a rule is provided", () => {
    render(<AlertingRuleFormClient rule={makeRule()} />);
    expect(screen.getByDisplayValue("HighCPU")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cpu_usage > 0.9")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CPU over 90%")).toBeInTheDocument();
  });

  it("renders duration selection buttons", () => {
    render(<AlertingRuleFormClient />);
    for (const d of ["1m", "5m", "10m"]) {
      expect(screen.getByRole("button", { name: d })).toBeInTheDocument();
    }
  });

  it("renders severity selector with options", () => {
    render(<AlertingRuleFormClient />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Warning" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Critical" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Info" })).toBeInTheDocument();
  });

  it("shows validation toast when name is filled but query is whitespace-only", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    render(<AlertingRuleFormClient />);

    // Fill in a valid name but leave query as spaces only
    await user.type(screen.getByPlaceholderText("HighMemoryUsage"), "MyAlert");
    await user.type(
      screen.getByPlaceholderText("process_resident_memory_bytes > 500000000"),
      "   ",
    );
    await user.click(screen.getByRole("button", { name: "Create Rule" }));
    expect(toast.error).toHaveBeenCalledWith("Name and Query are required");
  });

  it("calls alertingRules.create with correct payload on form submission", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({ id: "rule-new" });
    render(<AlertingRuleFormClient />);

    await user.type(screen.getByPlaceholderText("HighMemoryUsage"), "MemoryAlert");
    await user.type(
      screen.getByPlaceholderText("process_resident_memory_bytes > 500000000"),
      "memory_usage > 0.8",
    );
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MemoryAlert",
          query: "memory_usage > 0.8",
        }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith("/alerting-rules");
  });

  it("calls alertingRules.update with correct payload in edit mode", async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue(makeRule());
    render(<AlertingRuleFormClient rule={makeRule()} />);

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "rule-1",
        expect.objectContaining({ name: "HighCPU" }),
      );
    });
  });

  it("navigates to /alerting-rules when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<AlertingRuleFormClient />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockPush).toHaveBeenCalledWith("/alerting-rules");
  });

  it("toggles the enabled state when the toggle button is clicked", async () => {
    const user = userEvent.setup();
    render(<AlertingRuleFormClient />);

    // Default is enabled
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Disable rule" }));
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });
});
