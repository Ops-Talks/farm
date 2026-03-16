import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API client
const mockList = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock("@/lib/api-client", () => ({
  alertingRules: {
    list: (...args: unknown[]) => mockList(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    create: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock("@/types/api", () => ({
  FarmEvent: {
    AUDIT_LOG_CREATED: "audit-log.created",
    PIPELINE_RUN_UPDATED: "pipeline.run.updated",
  },
}));

import AlertingRulesPage from "@/app/(protected)/alerting-rules/page";

const makeRule = (overrides = {}) => ({
  id: "rule-1",
  name: "High CPU",
  description: "Fires when CPU is high",
  query: "rate(cpu_usage[5m]) > 0.8",
  duration: "5m",
  severity: "critical" as const,
  componentId: undefined,
  environmentId: undefined,
  enabled: true,
  organizationId: undefined,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("AlertingRulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading and Create Rule button", async () => {
    mockList.mockResolvedValue([]);
    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("Alerting Rules")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Create Rule").length).toBeGreaterThan(0);
  });

  it("displays rule names in the table", async () => {
    mockList.mockResolvedValue([
      makeRule({ id: "1", name: "High CPU", severity: "critical" }),
      makeRule({ id: "2", name: "Low Memory", severity: "warning" }),
    ]);

    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("High CPU")).toBeInTheDocument();
    });
    expect(screen.getByText("Low Memory")).toBeInTheDocument();
  });

  it("displays severity badges with correct labels", async () => {
    mockList.mockResolvedValue([
      makeRule({ id: "1", name: "Crit Rule", severity: "critical" }),
      makeRule({ id: "2", name: "Warn Rule", severity: "warning" }),
      makeRule({ id: "3", name: "Info Rule", severity: "info" }),
    ]);

    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("Crit Rule")).toBeInTheDocument();
    });

    // Each severity badge text
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("info")).toBeInTheDocument();
  });

  it("shows empty state when no rules", async () => {
    mockList.mockResolvedValue([]);
    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("No alerting rules")).toBeInTheDocument();
    });
  });

  it("calls toggle API when enabled switch is clicked", async () => {
    const user = userEvent.setup();
    const rule = makeRule({ enabled: true });
    mockList.mockResolvedValue([rule]);
    mockUpdate.mockResolvedValue({ ...rule, enabled: false });

    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("High CPU")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole("button", { name: /disable rule/i });
    await user.click(toggleBtn);

    expect(mockUpdate).toHaveBeenCalledWith("rule-1", { enabled: false });
  });

  it("shows delete confirmation dialog on delete click", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([makeRule()]);

    render(<AlertingRulesPage />);

    await waitFor(() => {
      expect(screen.getByText("High CPU")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete alerting rule")).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockList.mockRejectedValue(new Error("Network error"));
    render(<AlertingRulesPage />);

    // Should not crash; empty state eventually renders
    await waitFor(() => {
      expect(screen.getByText("No alerting rules")).toBeInTheDocument();
    });
  });
});
