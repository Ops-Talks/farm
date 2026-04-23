import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { ElasticStackResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks — must be defined before the component import so Vitest hoists them
// ---------------------------------------------------------------------------

const mockGetElasticStack = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    getElasticStack: (...args: unknown[]) => mockGetElasticStack(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import component after mocks are in place
// ---------------------------------------------------------------------------

import { LogPipelineCard } from "./LogPipelineCard";

// ---------------------------------------------------------------------------
// QueryClient wrapper — fresh client per test to avoid shared cache state
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

function makeElasticStackResponse(
  overrides?: Partial<ElasticStackResponse>,
): ElasticStackResponse {
  return {
    eck: { elasticsearch: [], kibana: [], logstash: [], beats: [] },
    inCluster: { fluentBit: [], fluentd: [], logstash: [] },
    external: { reachable: false },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LogPipelineCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Shows "Log Pipeline" card title when data loads (even empty)
  // -------------------------------------------------------------------------

  it("shows the Log Pipeline card title once data has loaded", async () => {
    mockGetElasticStack.mockResolvedValue(makeElasticStackResponse());

    render(<LogPipelineCard namespace="default" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Log Pipeline")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Shows "No log pipeline detected" when there are no collectors
  // -------------------------------------------------------------------------

  it("shows 'No log pipeline detected' when all sections are empty and external is unreachable", async () => {
    mockGetElasticStack.mockResolvedValue(makeElasticStackResponse());

    render(<LogPipelineCard namespace="default" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("No log pipeline detected.")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Shows ECK Elasticsearch collector row scoped to the namespace
  // -------------------------------------------------------------------------

  it("shows the ECK Elasticsearch row when an ES resource matches the namespace", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [
            {
              name: "my-cluster",
              namespace: "elastic",
              health: "green",
              version: "8.12.0",
              nodeCount: 3,
              source: "eck",
            },
          ],
          kibana: [],
          logstash: [],
          beats: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="elastic" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("my-cluster")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Shows in-cluster FluentBit row
  // -------------------------------------------------------------------------

  it("shows the FluentBit row when an in-cluster FluentBit DaemonSet is present", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        inCluster: {
          fluentBit: [
            {
              name: "fluent-bit-ds",
              namespace: "logging",
              desiredNodes: 3,
              readyNodes: 3,
              notReadyNodes: 0,
              source: "helm",
            },
          ],
          fluentd: [],
          logstash: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="logging" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("fluent-bit-ds")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Shows external Elasticsearch row when reachable
  // -------------------------------------------------------------------------

  it("shows the External Elasticsearch row when external is reachable", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        external: { reachable: true },
      }),
    );

    render(<LogPipelineCard namespace="default" />, {
      wrapper: createWrapper(),
    });

    // The component renders an "External" badge and "Elasticsearch" label
    await waitFor(() => {
      expect(screen.getByText("External")).toBeInTheDocument();
      expect(screen.getByText("Elasticsearch")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Calls getElasticStack with the provided namespace
  // -------------------------------------------------------------------------

  it("calls getElasticStack with the provided namespace", async () => {
    mockGetElasticStack.mockResolvedValue(makeElasticStackResponse());

    render(<LogPipelineCard namespace="my-namespace" />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetElasticStack).toHaveBeenCalledWith("my-namespace");
    });
  });

  // -------------------------------------------------------------------------
  // 7. Shows skeleton during loading
  // -------------------------------------------------------------------------

  it("shows skeleton elements while the request is in flight", () => {
    // Return a promise that never resolves so the component stays in loading state
    mockGetElasticStack.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<LogPipelineCard namespace="default" />, {
      wrapper: createWrapper(),
    });

    // The card title ("Log Pipeline") is replaced by a Skeleton during loading
    expect(screen.queryByText("Log Pipeline")).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
