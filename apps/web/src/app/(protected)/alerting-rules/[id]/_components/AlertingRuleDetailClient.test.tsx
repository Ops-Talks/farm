import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGet = vi.fn();
const mockRemove = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/alerting-rules/rule-1",
  useParams: () => ({ id: "rule-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  alertingRules: {
    get: (...args: unknown[]) => mockGet(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    update: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { AlertingRuleDetailClient } from "@/app/(protected)/alerting-rules/[id]/_components/AlertingRuleDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeRule = () => ({
  id: "rule-1",
  name: "HighMemory",
  description: "Memory > 80%",
  query: "memory_usage > 0.8",
  duration: "5m",
  severity: "warning" as const,
  enabled: true,
  componentId: undefined,
  environmentId: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("AlertingRuleDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<AlertingRuleDetailClient id="rule-1" />);
    expect(screen.queryByText("HighMemory")).not.toBeInTheDocument();
  });

  it("shows 'Rule not found' when the rule does not exist", async () => {
    mockGet.mockRejectedValue(new Error("Not Found"));
    render(<AlertingRuleDetailClient id="rule-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Rule not found or failed to load/)).toBeInTheDocument();
    });
  });

  it("renders the rule name as the page heading", async () => {
    mockGet.mockResolvedValue(makeRule());
    render(<AlertingRuleDetailClient id="rule-1" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "HighMemory" })).toBeInTheDocument();
    });
  });

  it("renders the embedded edit form", async () => {
    mockGet.mockResolvedValue(makeRule());
    render(<AlertingRuleDetailClient id="rule-1" />);

    await waitFor(() => {
      expect(screen.getByText("Edit Alerting Rule")).toBeInTheDocument();
    });
  });

  it("opens the delete confirm dialog when 'Delete Rule' is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makeRule());
    render(<AlertingRuleDetailClient id="rule-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Rule" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete Rule" }));

    await waitFor(() => {
      expect(screen.getByText("Delete alerting rule")).toBeInTheDocument();
    });
  });

  it("calls alertingRules.remove and navigates on confirm", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(makeRule());
    mockRemove.mockResolvedValue(undefined);
    render(<AlertingRuleDetailClient id="rule-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Rule" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete Rule" }));
    await waitFor(() => {
      expect(screen.getByText("Delete alerting rule")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("rule-1");
      expect(mockPush).toHaveBeenCalledWith("/alerting-rules");
    });
  });
});
