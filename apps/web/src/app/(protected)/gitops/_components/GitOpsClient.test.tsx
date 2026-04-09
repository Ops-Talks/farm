import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetFluxStatus = vi.fn();
const mockListFluxKustomizations = vi.fn();
const mockListFluxHelmReleases = vi.fn();
const mockListFluxSources = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    getFluxStatus: (...args: unknown[]) => mockGetFluxStatus(...args),
    listFluxKustomizations: (...args: unknown[]) =>
      mockListFluxKustomizations(...args),
    listFluxHelmReleases: (...args: unknown[]) =>
      mockListFluxHelmReleases(...args),
    listFluxSources: (...args: unknown[]) => mockListFluxSources(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "1", username: "admin" } }),
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { GitOpsClient } from "./GitOpsClient";

// ── Wrapper ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fluxStatus = {
  installed: true,
  controllers: [
    { name: "source-controller", version: "v1.2.0", ready: true },
    { name: "kustomize-controller", version: "v1.2.0", ready: true },
  ],
};

function makeKustomization(overrides = {}) {
  return {
    name: "infra-configs",
    namespace: "flux-system",
    path: "./clusters/prod",
    ready: true,
    suspended: false,
    lastAppliedRevision: "main/abc1234",
    conditions: [{ type: "Ready", status: "True", message: "Applied revision" }],
    ...overrides,
  };
}

function makeHelmRelease(overrides = {}) {
  return {
    name: "nginx-ingress",
    namespace: "ingress-nginx",
    chartName: "ingress-nginx",
    chartVersion: "4.7.1",
    ready: true,
    suspended: false,
    lastAppliedRevision: "4.7.1",
    conditions: [{ type: "Ready", status: "True", message: "Release reconciliation succeeded" }],
    ...overrides,
  };
}

function makeSource(overrides = {}) {
  return {
    kind: "GitRepository",
    name: "flux-system",
    namespace: "flux-system",
    url: "https://github.com/org/fleet-infra",
    ref: "refs/heads/main",
    lastFetchedRevision: "main/abc1234",
    ready: true,
    suspended: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GitOpsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Page header ────────────────────────────────────────────────────────────

  it("renders PageHeader with title 'GitOps'", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    expect(screen.getByText("GitOps")).toBeInTheDocument();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it("shows skeleton while queries are in flight", () => {
    // Never-resolving promises keep the component in loading state.
    mockGetFluxStatus.mockReturnValue(new Promise(() => {}));
    mockListFluxKustomizations.mockReturnValue(new Promise(() => {}));
    mockListFluxHelmReleases.mockReturnValue(new Promise(() => {}));
    mockListFluxSources.mockReturnValue(new Promise(() => {}));

    render(<GitOpsClient />, { wrapper: createWrapper() });

    // The page header title should still be rendered.
    expect(screen.getByText("GitOps")).toBeInTheDocument();
    // Loading text indicator in description
    expect(screen.getByText("Loading Flux status...")).toBeInTheDocument();
  });

  // ── Flux status card ───────────────────────────────────────────────────────

  it("shows controller names in the status card when Flux is installed", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("source-controller")).toBeInTheDocument();
      expect(screen.getByText("kustomize-controller")).toBeInTheDocument();
    });
  });

  it("shows controller count in header description when Flux is installed", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 controllers running")).toBeInTheDocument();
    });
  });

  it("shows singular 'controller' when exactly one controller exists", async () => {
    mockGetFluxStatus.mockResolvedValue({
      installed: true,
      controllers: [{ name: "source-controller", version: "v1.0.0", ready: true }],
    });
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1 controller running")).toBeInTheDocument();
    });
  });

  // ── Kustomizations tab ─────────────────────────────────────────────────────

  it("shows Kustomizations tab with items when data loads", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([
      makeKustomization({ name: "infra-configs" }),
    ]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("infra-configs")).toBeInTheDocument();
    });
  });

  it("shows ready badge with green styling for a ready kustomization", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([
      makeKustomization({ ready: true, suspended: false }),
    ]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Multiple "Ready" badges may exist (status card + kustomization row).
      // Find the one with the green styling class specifically.
      const badges = screen.getAllByText("Ready");
      const greenBadge = badges.find(
        (el) =>
          el.getAttribute("data-slot") === "badge" &&
          el.className.includes("bg-green-500/20"),
      );
      expect(greenBadge).toBeDefined();
    });
  });

  it("shows Suspended badge with amber styling for a suspended kustomization", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([
      makeKustomization({ ready: false, suspended: true }),
    ]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("Suspended");
      expect(badge.className).toContain("bg-amber-500/20");
    });
  });

  it("shows Not Ready badge with red styling for a failed kustomization", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([
      makeKustomization({ ready: false, suspended: false }),
    ]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText("Not Ready");
      expect(badge.className).toContain("bg-red-500/20");
    });
  });

  it("shows empty state for kustomizations when list is empty", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No Flux Kustomizations found in the cluster."),
      ).toBeInTheDocument();
    });
  });

  // ── Helm Releases tab ──────────────────────────────────────────────────────

  it("shows HelmReleases tab when that tab is selected", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([
      makeHelmRelease({ name: "nginx-ingress" }),
    ]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    // Switch to Helm Releases tab
    await userEvent.click(screen.getByRole("button", { name: "Helm Releases" }));

    await waitFor(() => {
      expect(screen.getByText("nginx-ingress")).toBeInTheDocument();
    });
  });

  it("shows empty state for helm releases when list is empty", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Helm Releases" }));

    await waitFor(() => {
      expect(
        screen.getByText("No Flux HelmReleases found in the cluster."),
      ).toBeInTheDocument();
    });
  });

  // ── Sources tab ────────────────────────────────────────────────────────────

  it("shows Sources tab when that tab is selected", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    // Use a distinct name so the source name does not collide with its namespace.
    mockListFluxSources.mockResolvedValue([
      makeSource({ name: "fleet-infra", namespace: "flux-system", url: "https://github.com/org/fleet" }),
    ]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    // Switch to Sources tab
    await userEvent.click(screen.getByRole("button", { name: "Sources" }));

    await waitFor(() => {
      expect(screen.getByText("fleet-infra")).toBeInTheDocument();
    });
  });

  it("shows empty state for sources when list is empty", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Sources" }));

    await waitFor(() => {
      expect(
        screen.getByText("No Flux sources found in the cluster."),
      ).toBeInTheDocument();
    });
  });

  // ── API calls ──────────────────────────────────────────────────────────────

  it("calls all four kubernetes Flux API methods on mount", async () => {
    mockGetFluxStatus.mockResolvedValue(fluxStatus);
    mockListFluxKustomizations.mockResolvedValue([]);
    mockListFluxHelmReleases.mockResolvedValue([]);
    mockListFluxSources.mockResolvedValue([]);

    render(<GitOpsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGetFluxStatus).toHaveBeenCalledOnce();
      expect(mockListFluxKustomizations).toHaveBeenCalledOnce();
      expect(mockListFluxHelmReleases).toHaveBeenCalledOnce();
      expect(mockListFluxSources).toHaveBeenCalledOnce();
    });
  });
});
