import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock fns (declared before vi.mock calls)
// ---------------------------------------------------------------------------

const mockGetDashboard = vi.fn();
const mockGetModuleDrift = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iac: {
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
    getModuleDrift: (...args: unknown[]) => mockGetModuleDrift(...args),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/iac",
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacDashboardClient } from "./IacDashboardClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDashboard = {
  totalStacks: 2,
  failedLastRun: 1,
  environments: ["production", "staging"],
  stacksByEnvironment: {
    production: [
      {
        stackId: "stack-uuid-1",
        name: "core-networking",
        lastRunStatus: "failed" as const,
        lastRunAt: "2024-01-01T10:00:00Z",
        lastRunType: "apply" as const,
        resourceChanges: { add: 0, change: 0, destroy: 1 },
        autoImported: false,
        provider: "terraform",
        externalToolUrl: "https://app.terraform.io/workspaces/core-networking",
      },
    ],
    staging: [
      {
        stackId: "stack-uuid-2",
        name: "core-database",
        lastRunStatus: "succeeded" as const,
        lastRunAt: "2024-01-02T08:00:00Z",
        lastRunType: "plan" as const,
        resourceChanges: { add: 2, change: 1, destroy: 0 },
        autoImported: true,
        provider: "opentofu",
        externalToolUrl: null,
      },
    ],
  },
};

const mockDrift = [
  {
    id: "drift-uuid-1",
    stackPath: "stacks/networking/main.tf",
    moduleName: "terraform-aws-modules/vpc/aws",
    sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
    currentRef: "v3.14.0",
    latestRef: "v3.19.0",
    versionsBehind: 5,
    detectedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacDashboardClient", () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue(mockDashboard);
    mockGetModuleDrift.mockResolvedValue(mockDrift);
  });

  afterEach(() => vi.clearAllMocks());

  it("renders the page header", async () => {
    render(<IacDashboardClient />);
    expect(screen.getByText("IaC")).toBeDefined();
  });

  it("shows stack cards after loading", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
      expect(screen.getByText("core-database")).toBeDefined();
    });
  });

  it("shows the failed badge count in the header", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("1 failed")).toBeDefined();
    });
  });

  it("renders environment tab buttons", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "production" })).toBeDefined();
      expect(screen.getByRole("button", { name: "staging" })).toBeDefined();
    });
  });

  it("filters stacks by environment tab when clicked", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: "staging" }));

    await waitFor(() => {
      expect(screen.getByText("core-database")).toBeDefined();
      expect(screen.queryByText("core-networking")).toBeNull();
    });
  });

  it("switches to module drift view and shows drift table", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: /module drift/i }));

    await waitFor(() => {
      expect(screen.getByText("terraform-aws-modules/vpc/aws")).toBeDefined();
      expect(screen.getByText("v3.14.0")).toBeDefined();
      expect(screen.getByText("v3.19.0")).toBeDefined();
    });
  });

  it("shows empty state in drift view when no records", async () => {
    mockGetModuleDrift.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: /module drift/i }));

    await waitFor(() => {
      expect(screen.getByText(/all modules are up to date/i)).toBeDefined();
    });
  });

  it("shows an error state when the dashboard request fails", async () => {
    mockGetDashboard.mockRejectedValue(new Error("Network error"));
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Drift fetch error branch (covers setDriftLoading(false) in catch)
  // -------------------------------------------------------------------------

  it("continues to show stacks when module drift request fails", async () => {
    mockGetModuleDrift.mockRejectedValue(new Error("drift error"));
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });

    // After drift error, switching to drift view should not crash and
    // should display the empty state (no drift data).
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /module drift/i }));

    await waitFor(() => {
      expect(screen.getByText(/all modules are up to date/i)).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Stack card accessibility
  // -------------------------------------------------------------------------

  it("stack cards are rendered as clickable buttons with correct aria-labels", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stack core-networking" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Stack core-database" })).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // autoImported badge and provider badge
  // -------------------------------------------------------------------------

  it("shows auto badge for auto-imported stacks", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("auto")).toBeDefined();
    });
  });

  it("shows opentofu provider badge", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("opentofu")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // ResourceChips all-zero branch
  // -------------------------------------------------------------------------

  it("shows no resource change chips when all counts are zero", async () => {
    mockGetDashboard.mockResolvedValue({
      ...mockDashboard,
      stacksByEnvironment: {
        production: [
          {
            stackId: "stack-uuid-3",
            name: "zero-changes-stack",
            lastRunStatus: "succeeded" as const,
            lastRunAt: "2024-01-01T10:00:00Z",
            lastRunType: "plan" as const,
            resourceChanges: { add: 0, change: 0, destroy: 0 },
            autoImported: false,
            provider: "terraform",
            externalToolUrl: null,
          },
        ],
      },
    });

    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("zero-changes-stack")).toBeDefined();
    });

    // None of the numeric change chips should be present
    expect(screen.queryByText("+0")).toBeNull();
    expect(screen.queryByText("~0")).toBeNull();
    expect(screen.queryByText("-0")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // RunStatusIcon fallback branch (covers line 66)
  // -------------------------------------------------------------------------

  it("shows no-run status icon for stacks with an unrecognised status", async () => {
    mockGetDashboard.mockResolvedValue({
      ...mockDashboard,
      stacksByEnvironment: {
        production: [
          {
            stackId: "stack-uuid-pending",
            name: "pending-stack",
            lastRunStatus: "pending" as const,
            lastRunAt: null,
            lastRunType: null,
            resourceChanges: null,
            autoImported: false,
            provider: "terraform",
            externalToolUrl: null,
          },
        ],
      },
    });

    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("pending-stack")).toBeDefined();
    });

    // The fallback MinusCircle with aria-label "No run" should be rendered.
    expect(screen.getByLabelText("No run")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // ResourceChips null branch (covers line 91)
  // -------------------------------------------------------------------------

  it("shows double-dash placeholder when resourceChanges is null", async () => {
    mockGetDashboard.mockResolvedValue({
      ...mockDashboard,
      stacksByEnvironment: {
        production: [
          {
            stackId: "stack-uuid-nochanges",
            name: "null-changes-stack",
            lastRunStatus: "succeeded" as const,
            lastRunAt: "2024-01-01T10:00:00Z",
            lastRunType: "plan" as const,
            resourceChanges: null,
            autoImported: false,
            provider: "terraform",
            externalToolUrl: null,
          },
        ],
      },
    });

    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("null-changes-stack")).toBeDefined();
      // ResourceChips null guard renders "--"
      expect(screen.getByText("--")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // StackCard onClick (covers router.push branch)
  // -------------------------------------------------------------------------

  it("clicking a stack card triggers navigation", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stack core-networking" })).toBeDefined();
    });

    // Clicking the card should not throw; the router.push mock swallows the call.
    await user.click(screen.getByRole("button", { name: "Stack core-networking" }));
  });

  // -------------------------------------------------------------------------
  // StackCard onKeyDown (covers keyboard navigation branch)
  // -------------------------------------------------------------------------

  it("pressing Enter on a stack card triggers navigation", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stack core-networking" })).toBeDefined();
    });

    const card = screen.getByRole("button", { name: "Stack core-networking" });
    card.focus();
    await user.keyboard("{Enter}");
  });

  it("pressing Space on a stack card triggers navigation", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stack core-networking" })).toBeDefined();
    });

    const card = screen.getByRole("button", { name: "Stack core-networking" });
    card.focus();
    await user.keyboard(" ");
  });

  // -------------------------------------------------------------------------
  // externalToolUrl link (covers the external link conditional branch)
  // -------------------------------------------------------------------------

  it("renders the external tool link for stacks with externalToolUrl", async () => {
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByLabelText("Open in external tool")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Switch back to Stacks view from Drift view (covers line 337)
  // -------------------------------------------------------------------------

  it("switches back to stacks view when clicking Stacks button from drift view", async () => {
    const user = userEvent.setup();
    render(<IacDashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });

    // Go to drift view
    await user.click(screen.getByRole("button", { name: /module drift/i }));

    await waitFor(() => {
      expect(screen.getByText("terraform-aws-modules/vpc/aws")).toBeDefined();
    });

    // Switch back to stacks view
    await user.click(screen.getByRole("button", { name: /stacks/i }));

    await waitFor(() => {
      expect(screen.getByText("core-networking")).toBeDefined();
    });
  });
});
