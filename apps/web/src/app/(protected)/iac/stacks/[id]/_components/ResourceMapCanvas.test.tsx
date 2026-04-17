import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock @xyflow/react CSS import to avoid Vitest transform issues
vi.mock("@xyflow/react/dist/style.css", () => ({}));

// Mock @xyflow/react so we avoid DOM complexity in unit tests
vi.mock("@xyflow/react", () => ({
  ReactFlow: vi.fn(
    ({
      nodes,
      edges,
    }: {
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string }>;
    }) => (
      <div
        data-testid="react-flow-mock"
        data-nodes={nodes.length}
        data-edges={edges.length}
      />
    ),
  ),
  Background: vi.fn(() => null),
  Controls: vi.fn(() => null),
  MiniMap: vi.fn(() => null),
  MarkerType: { ArrowClosed: "arrowclosed" },
}));

// Mock @dagrejs/dagre — return fixed positions so layout doesn't throw
vi.mock("@dagrejs/dagre", () => {
  class MockGraph {
    private nodes: Map<string, { width: number; height: number }> = new Map();
    setGraph() {}
    setDefaultEdgeLabel() {}
    setNode(id: string, data: { width: number; height: number }) {
      this.nodes.set(id, data);
    }
    setEdge() {}
    node(id: string) {
      const n = this.nodes.get(id) ?? { width: 180, height: 60 };
      return { x: 100, y: 100, width: n.width, height: n.height };
    }
  }

  const graphlib = { Graph: MockGraph };
  const layout = vi.fn();

  return { default: { graphlib, layout } };
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "stack-uuid-test" }),
}));

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  iac: {
    getResources: vi.fn(),
  },
}));

import { ResourceMapCanvas } from "./ResourceMapCanvas";
import { iac } from "@/lib/api-client";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("ResourceMapCanvas", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    vi.mocked(iac.getResources).mockReturnValue(new Promise(() => {}));

    render(<ResourceMapCanvas />, { wrapper: createWrapper() });

    expect(screen.getByTestId("resource-map-loading")).toBeInTheDocument();
  });

  it("renders empty state when there are no resources (ST405)", async () => {
    vi.mocked(iac.getResources).mockResolvedValue({
      resources: [],
      dependencies: [],
    });

    render(<ResourceMapCanvas />, { wrapper: createWrapper() });

    expect(
      await screen.findByTestId("resource-map-empty"),
    ).toBeInTheDocument();
  });

  it("renders error state when the query fails", async () => {
    vi.mocked(iac.getResources).mockRejectedValue(new Error("network error"));

    render(<ResourceMapCanvas />, { wrapper: createWrapper() });

    expect(await screen.findByTestId("resource-map-error")).toBeInTheDocument();
  });

  it("renders the canvas with correct node and edge counts (ST405)", async () => {
    vi.mocked(iac.getResources).mockResolvedValue({
      resources: [
        {
          address: "aws_instance.web",
          resourceType: "aws_instance",
          resourceName: "web",
          provider: "aws",
        },
        {
          address: "aws_security_group.web",
          resourceType: "aws_security_group",
          resourceName: "web",
          provider: "aws",
        },
      ],
      dependencies: [
        { source: "aws_instance.web", target: "aws_security_group.web" },
      ],
    });

    render(<ResourceMapCanvas />, { wrapper: createWrapper() });

    const canvas = await screen.findByTestId("resource-map-canvas");
    expect(canvas).toBeInTheDocument();

    const flow = screen.getByTestId("react-flow-mock");
    expect(flow).toHaveAttribute("data-nodes", "2");
    expect(flow).toHaveAttribute("data-edges", "1");
  });

  it("renders canvas with zero edges when no dependencies exist", async () => {
    vi.mocked(iac.getResources).mockResolvedValue({
      resources: [
        {
          address: "aws_vpc.main",
          resourceType: "aws_vpc",
          resourceName: "main",
          provider: "aws",
        },
      ],
      dependencies: [],
    });

    render(<ResourceMapCanvas />, { wrapper: createWrapper() });

    const flow = await screen.findByTestId("react-flow-mock");
    expect(flow).toHaveAttribute("data-nodes", "1");
    expect(flow).toHaveAttribute("data-edges", "0");
  });
});
