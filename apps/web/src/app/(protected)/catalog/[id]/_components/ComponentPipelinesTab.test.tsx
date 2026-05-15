import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { Pipeline } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetComponentPipelines = vi.fn();

vi.mock("@/lib/api-client", () => ({
  catalog: {
    getComponentPipelines: (...args: unknown[]) =>
      mockGetComponentPipelines(...args),
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { ComponentPipelinesTab } from "./ComponentPipelinesTab";

// ---------------------------------------------------------------------------
// Helpers
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

function buildPipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: "pipe-1",
    name: "deploy-production",
    description: "Deploys to prod",
    stages: [
      { id: "s1", name: "Build", type: "build", order: 1, config: {} },
      { id: "s2", name: "Deploy", type: "deploy", order: 2, config: {} },
    ],
    createdBy: "alice",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function makePaginated<T>(items: T[]): { items: T[]; total: number } {
  return { items, total: items.length };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ComponentPipelinesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Loading state
  it("renders skeleton rows while loading", () => {
    mockGetComponentPipelines.mockReturnValue(new Promise(() => {}));
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    // Skeletons are rendered as div.animate-pulse elements; heading not yet visible
    expect(screen.queryByText("Linked Pipelines")).not.toBeInTheDocument();
  });

  // 2. Empty state
  it("renders empty state when no pipelines are linked", async () => {
    mockGetComponentPipelines.mockResolvedValue(makePaginated([]));
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(
        screen.getByText(/No pipelines are linked to this component/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Link a pipeline by setting its/i),
    ).toBeInTheDocument();
    expect(screen.getByText("componentId")).toBeInTheDocument();
  });

  // 3. Renders "Linked Pipelines" heading when data loads
  it("renders the Linked Pipelines heading when pipelines are present", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline()]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("Linked Pipelines")).toBeInTheDocument();
    });
  });

  // 4. Renders pipeline name as a link to the pipeline detail page
  it("renders the pipeline name as a link to /pipelines/:id", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ id: "pipe-abc", name: "my-pipeline" })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "my-pipeline" });
      expect(link).toHaveAttribute("href", "/pipelines/pipe-abc");
    });
  });

  // 5. Renders the "View" external link button for each pipeline
  it("renders a View link button that points to the pipeline detail page", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ id: "pipe-xyz", name: "build-staging" })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      const link = screen.getByRole("link", {
        name: /open pipeline build-staging/i,
      });
      expect(link).toHaveAttribute("href", "/pipelines/pipe-xyz");
    });
  });

  // 6. Renders stage count badge (plural)
  it("renders the stage count badge with plural label for multiple stages", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline()]), // 2 stages
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("2 stages")).toBeInTheDocument();
    });
  });

  // 7. Renders stage count badge (singular)
  it("renders the stage count badge with singular label for a single stage", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([
        buildPipeline({
          stages: [{ id: "s1", name: "Build", type: "build", order: 1, config: {} }],
        }),
      ]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("1 stage")).toBeInTheDocument();
    });
  });

  // 8. Renders description or em dash when absent
  it("renders the pipeline description when present", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ description: "Deploys to prod" })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("Deploys to prod")).toBeInTheDocument();
    });
  });

  it("renders an em dash when description is absent", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ description: undefined })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  // 9. timeAgo — renders minutes ago
  it("renders 'Xm ago' when updatedAt is less than 1 hour ago", async () => {
    const updatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ updatedAt })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("10m ago")).toBeInTheDocument();
    });
  });

  // 10. timeAgo — renders hours ago
  it("renders 'Xh ago' when updatedAt is more than 1 hour ago", async () => {
    const updatedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h ago
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ updatedAt })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("3h ago")).toBeInTheDocument();
    });
  });

  // 11. timeAgo — renders days ago
  it("renders 'Xd ago' when updatedAt is more than 24 hours ago", async () => {
    const updatedAt = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 2 days ago
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ updatedAt })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("2d ago")).toBeInTheDocument();
    });
  });

  // 12. timeAgo — renders seconds ago
  it("renders 'Xs ago' when updatedAt is less than 1 minute ago", async () => {
    const updatedAt = new Date(Date.now() - 30 * 1000).toISOString(); // 30s ago
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([buildPipeline({ updatedAt })]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByText("30s ago")).toBeInTheDocument();
    });
  });

  // 13. Multiple pipelines render multiple rows
  it("renders a row for each pipeline returned", async () => {
    mockGetComponentPipelines.mockResolvedValue(
      makePaginated([
        buildPipeline({ id: "pipe-1", name: "build" }),
        buildPipeline({ id: "pipe-2", name: "release" }),
        buildPipeline({ id: "pipe-3", name: "rollback" }),
      ]),
    );
    render(<ComponentPipelinesTab componentId="comp-1" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "build" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "release" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "rollback" }),
    ).toBeInTheDocument();
  });

  // 14. Query is called with the correct componentId
  it("fetches pipelines using the provided componentId", async () => {
    mockGetComponentPipelines.mockResolvedValue(makePaginated([]));
    render(<ComponentPipelinesTab componentId="comp-unique-999" />, {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(mockGetComponentPipelines).toHaveBeenCalledWith("comp-unique-999");
    });
  });
});
