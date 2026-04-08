import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { HarborReplicationPolicy } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListHarborReplications = vi.fn();
vi.mock("@/lib/api-client", () => ({
  registry: {
    listHarborReplications: () => mockListHarborReplications(),
  },
}));

import { HarborReplicationTable } from "./HarborReplicationTable";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockPolicy: HarborReplicationPolicy = {
  id: 1,
  name: "prod-to-dr",
  srcRegistry: "harbor-prod",
  destRegistry: "harbor-dr",
  filters: ["myapp/**"],
  triggerType: "scheduled",
  enabled: true,
  lastExecutionStatus: "succeed",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("HarborReplicationTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockListHarborReplications.mockReturnValue(new Promise(() => {}));
    render(<HarborReplicationTable />);
    // The skeleton is rendered — heading is present but no table data
    expect(screen.getByText("Harbor Replication Rules")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows 'No replication rules configured.' when response is empty array", async () => {
    mockListHarborReplications.mockResolvedValue([]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("No replication rules configured.")).toBeInTheDocument();
    });
  });

  it("renders table with policy name, source, destination when policies are returned", async () => {
    mockListHarborReplications.mockResolvedValue([mockPolicy]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("prod-to-dr")).toBeInTheDocument();
    });
    expect(screen.getByText("harbor-prod")).toBeInTheDocument();
    expect(screen.getByText("harbor-dr")).toBeInTheDocument();
  });

  it("shows 'Scheduled' trigger label for scheduled type", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, triggerType: "scheduled" }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("Scheduled")).toBeInTheDocument();
    });
  });

  it("shows 'Event-based' trigger label for event_based type", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, triggerType: "event_based" }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("Event-based")).toBeInTheDocument();
    });
  });

  it("shows 'Manual' trigger label for manual type", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, triggerType: "manual" }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("Manual")).toBeInTheDocument();
    });
  });

  it("shows last run status badge with 'Succeed' text for 'succeed' status", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, lastExecutionStatus: "succeed" }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("Succeed")).toBeInTheDocument();
    });
  });

  it("shows 'No runs' for null lastExecutionStatus", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, lastExecutionStatus: null }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("No runs")).toBeInTheDocument();
    });
  });

  it("shows 'Disabled' badge when policy.enabled is false", async () => {
    mockListHarborReplications.mockResolvedValue([{ ...mockPolicy, enabled: false }]);
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully (shows 'No replication rules configured.')", async () => {
    mockListHarborReplications.mockRejectedValue(new Error("Network error"));
    render(<HarborReplicationTable />);
    await waitFor(() => {
      expect(screen.getByText("No replication rules configured.")).toBeInTheDocument();
    });
  });
});
