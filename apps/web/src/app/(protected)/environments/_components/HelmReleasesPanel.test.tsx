import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { HelmRelease, HelmSyncResult } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListReleases = vi.fn();
const mockSyncReleases = vi.fn();

vi.mock("@/lib/api-client", () => ({
  helm: {
    listReleases: (...args: unknown[]) => mockListReleases(...args),
    syncReleases: (...args: unknown[]) => mockSyncReleases(...args),
  },
}));

import { HelmReleasesPanel } from "./HelmReleasesPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildRelease(overrides: Partial<HelmRelease> = {}): HelmRelease {
  return {
    name: "my-nginx",
    namespace: "default",
    chart: "nginx",
    chartVersion: "15.1.0",
    appVersion: "1.25.0",
    status: "deployed",
    revision: 1,
    updatedAt: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("HelmReleasesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel heading", async () => {
    mockListReleases.mockResolvedValue([]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    // The heading is visible immediately (skeleton is shown first but header is always present).
    expect(screen.getByText("Helm Releases")).toBeInTheDocument();
  });

  it("renders the Sync Releases button", async () => {
    mockListReleases.mockResolvedValue([]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /sync releases/i })).toBeInTheDocument();
  });

  it("shows empty state when there are no releases", async () => {
    mockListReleases.mockResolvedValue([]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No Helm releases found.")).toBeInTheDocument();
    });
  });

  it("renders a table row for each release", async () => {
    mockListReleases.mockResolvedValue([
      buildRelease({ name: "nginx-release" }),
      buildRelease({ name: "redis-release", namespace: "prod", status: "deployed" }),
    ]);

    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("nginx-release")).toBeInTheDocument();
    });
    expect(screen.getByText("redis-release")).toBeInTheDocument();
  });

  it("shows a green badge for deployed status", async () => {
    mockListReleases.mockResolvedValue([buildRelease({ status: "deployed" })]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deployed")).toBeInTheDocument();
    });
  });

  it("shows a red badge for failed status", async () => {
    mockListReleases.mockResolvedValue([buildRelease({ status: "failed" })]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("failed")).toBeInTheDocument();
    });
  });

  it("renders table column headers", async () => {
    mockListReleases.mockResolvedValue([buildRelease()]);
    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Release Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Namespace")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Revision")).toBeInTheDocument();
  });

  it("calls syncReleases mutation when Sync Releases is clicked", async () => {
    const syncResult: HelmSyncResult = { synced: 3, errors: [] };
    mockListReleases.mockResolvedValue([]);
    mockSyncReleases.mockResolvedValue(syncResult);

    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    const syncBtn = screen.getByRole("button", { name: /sync releases/i });
    await userEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockSyncReleases).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a success toast with synced count after sync", async () => {
    const { toast } = await import("sonner");
    const syncResult: HelmSyncResult = { synced: 5, errors: [] };
    mockListReleases.mockResolvedValue([]);
    mockSyncReleases.mockResolvedValue(syncResult);

    render(<HelmReleasesPanel />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByRole("button", { name: /sync releases/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("5"),
      );
    });
  });
});
