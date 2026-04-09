import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListFluxBindings = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listFluxBindings: (...args: unknown[]) => mockListFluxBindings(...args),
  },
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { FluxBindingCard } from "./FluxBindingCard";

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

function makeBinding(overrides = {}) {
  return {
    id: "binding-1",
    resourceKind: "Kustomization" as const,
    resourceName: "infra-configs",
    resourceNamespace: "flux-system",
    componentId: "comp-abc",
    boundAt: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("FluxBindingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  it("renders nothing when there are no bindings", async () => {
    mockListFluxBindings.mockResolvedValue([]);

    const { container } = render(
      <FluxBindingCard componentId="comp-abc" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockListFluxBindings).toHaveBeenCalledWith("comp-abc");
    });

    // After data loads, the component should return null (empty DOM).
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  // ── Renders bindings ────────────────────────────────────────────────────────

  it("shows the GitOps card title when bindings exist", async () => {
    mockListFluxBindings.mockResolvedValue([makeBinding()]);

    render(<FluxBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("GitOps")).toBeInTheDocument();
    });
  });

  it("displays resourceName and resourceNamespace for each binding", async () => {
    mockListFluxBindings.mockResolvedValue([
      makeBinding({
        resourceName: "infra-configs",
        resourceNamespace: "flux-system",
      }),
    ]);

    render(<FluxBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("infra-configs")).toBeInTheDocument();
      expect(screen.getByText("flux-system")).toBeInTheDocument();
    });
  });

  it("shows a Kustomization kind badge for Kustomization bindings", async () => {
    mockListFluxBindings.mockResolvedValue([
      makeBinding({ resourceKind: "Kustomization" }),
    ]);

    render(<FluxBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Kustomization")).toBeInTheDocument();
    });
  });

  it("shows a HelmRelease kind badge for HelmRelease bindings", async () => {
    mockListFluxBindings.mockResolvedValue([
      makeBinding({ resourceKind: "HelmRelease", resourceName: "nginx" }),
    ]);

    render(<FluxBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("HelmRelease")).toBeInTheDocument();
      expect(screen.getByText("nginx")).toBeInTheDocument();
    });
  });

  it("renders multiple bindings when several exist", async () => {
    mockListFluxBindings.mockResolvedValue([
      makeBinding({ id: "b1", resourceName: "configs", resourceNamespace: "flux-system" }),
      makeBinding({ id: "b2", resourceName: "apps", resourceNamespace: "default", resourceKind: "HelmRelease" }),
    ]);

    render(<FluxBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("configs")).toBeInTheDocument();
      expect(screen.getByText("apps")).toBeInTheDocument();
    });
  });

  // ── API call ───────────────────────────────────────────────────────────────

  it("calls listFluxBindings with the given componentId", async () => {
    mockListFluxBindings.mockResolvedValue([]);

    render(<FluxBindingCard componentId="my-component-id" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockListFluxBindings).toHaveBeenCalledWith("my-component-id");
    });
  });
});
