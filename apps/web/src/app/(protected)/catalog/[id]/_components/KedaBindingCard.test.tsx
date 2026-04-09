import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockListKedaBindings = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listKedaBindings: (...args: unknown[]) => mockListKedaBindings(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { KedaBindingCard } from "./KedaBindingCard";

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBinding(overrides = {}) {
  return {
    id: "keda-binding-1",
    scaledObjectName: "worker-scaler",
    scaledObjectNamespace: "default",
    componentId: "comp-abc",
    boundAt: "2025-01-20T12:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KedaBindingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there are no bindings", async () => {
    mockListKedaBindings.mockResolvedValue([]);

    const { container } = render(
      <KedaBindingCard componentId="comp-abc" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockListKedaBindings).toHaveBeenCalledWith("comp-abc");
    });

    // After data loads, the component should return null (empty DOM).
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("shows the Autoscaling card title when bindings exist", async () => {
    mockListKedaBindings.mockResolvedValue([makeBinding()]);

    render(<KedaBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Autoscaling")).toBeInTheDocument();
    });
  });

  it("displays scaledObjectName and scaledObjectNamespace for each binding", async () => {
    mockListKedaBindings.mockResolvedValue([
      makeBinding({
        scaledObjectName: "worker-scaler",
        scaledObjectNamespace: "default",
      }),
    ]);

    render(<KedaBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("worker-scaler")).toBeInTheDocument();
      expect(screen.getByText("default")).toBeInTheDocument();
    });
  });

  it("shows the bound date for each binding", async () => {
    mockListKedaBindings.mockResolvedValue([
      makeBinding({ boundAt: "2025-01-20T12:00:00Z" }),
    ]);

    render(<KedaBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Date should be rendered in some locale-formatted form.
      const dateText = new Date("2025-01-20T12:00:00Z").toLocaleDateString();
      expect(screen.getByText(dateText)).toBeInTheDocument();
    });
  });

  it("renders multiple bindings when several exist", async () => {
    mockListKedaBindings.mockResolvedValue([
      makeBinding({ id: "b1", scaledObjectName: "scaler-a", scaledObjectNamespace: "ns-a" }),
      makeBinding({ id: "b2", scaledObjectName: "scaler-b", scaledObjectNamespace: "ns-b" }),
    ]);

    render(<KedaBindingCard componentId="comp-abc" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("scaler-a")).toBeInTheDocument();
      expect(screen.getByText("scaler-b")).toBeInTheDocument();
    });
  });

  it("calls listKedaBindings with the given componentId", async () => {
    mockListKedaBindings.mockResolvedValue([]);

    render(<KedaBindingCard componentId="my-component-id" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockListKedaBindings).toHaveBeenCalledWith("my-component-id");
    });
  });
});
