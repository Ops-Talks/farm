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
  // 8. ECK Kibana row — available
  // -------------------------------------------------------------------------

  it("shows the ECK Kibana row with Available badge when kibana is available", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [],
          kibana: [
            { name: "my-kb", namespace: "elastic", available: true, source: "eck" },
          ],
          logstash: [],
          beats: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-kb")).toBeInTheDocument();
      expect(screen.getByText("Kibana")).toBeInTheDocument();
      expect(screen.getByText("Available")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 9. ECK Kibana row — unavailable
  // -------------------------------------------------------------------------

  it("shows Unavailable badge when ECK Kibana is not available", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [],
          kibana: [
            { name: "kb-down", namespace: "elastic", available: false, source: "eck" },
          ],
          logstash: [],
          beats: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 10. ECK Beat row
  // -------------------------------------------------------------------------

  it("shows the ECK Beat row with the Beat badge", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [],
          kibana: [],
          logstash: [],
          beats: [
            { name: "filebeat", namespace: "elastic", available: true, source: "eck" },
          ],
        },
      }),
    );

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("filebeat")).toBeInTheDocument();
      expect(screen.getByText("Beat")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 11. ECK Logstash row
  // -------------------------------------------------------------------------

  it("shows the ECK Logstash row with readyReplicas/desiredReplicas", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [],
          kibana: [],
          logstash: [
            {
              name: "logstash-eck",
              namespace: "elastic",
              readyReplicas: 2,
              desiredReplicas: 3,
              source: "eck",
            },
          ],
          beats: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("logstash-eck")).toBeInTheDocument();
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 12. Fluentd row
  // -------------------------------------------------------------------------

  it("shows the Fluentd row when a Fluentd DaemonSet is present", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        inCluster: {
          fluentBit: [],
          fluentd: [
            {
              name: "fluentd-ds",
              namespace: "logging",
              desiredNodes: 3,
              readyNodes: 3,
              notReadyNodes: 0,
              source: "helm",
            },
          ],
          logstash: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="logging" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("fluentd-ds")).toBeInTheDocument();
      expect(screen.getByText("Fluentd")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 13. Helm Logstash row
  // -------------------------------------------------------------------------

  it("shows the Helm Logstash row with readyReplicas/desiredReplicas", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        inCluster: {
          fluentBit: [],
          fluentd: [],
          logstash: [
            {
              name: "logstash-helm",
              namespace: "logging",
              desiredReplicas: 2,
              readyReplicas: 1,
              source: "helm",
            },
          ],
        },
      }),
    );

    render(<LogPipelineCard namespace="logging" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("logstash-helm")).toBeInTheDocument();
      expect(screen.getByText("1/2")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 14. collectorHealthBadge — Degraded
  // -------------------------------------------------------------------------

  it("shows Degraded badge when some FluentBit nodes are not ready", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        inCluster: {
          fluentBit: [
            {
              name: "fluent-bit",
              namespace: "logging",
              desiredNodes: 3,
              readyNodes: 1,
              notReadyNodes: 2,
              source: "helm",
            },
          ],
          fluentd: [],
          logstash: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="logging" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 15. collectorHealthBadge — Unhealthy
  // -------------------------------------------------------------------------

  it("shows Unhealthy badge when no FluentBit nodes are ready", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        inCluster: {
          fluentBit: [
            {
              name: "fluent-bit",
              namespace: "logging",
              desiredNodes: 3,
              readyNodes: 0,
              notReadyNodes: 3,
              source: "helm",
            },
          ],
          fluentd: [],
          logstash: [],
        },
      }),
    );

    render(<LogPipelineCard namespace="logging" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Unhealthy")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 16. elasticsearchHealthBadge — yellow
  // -------------------------------------------------------------------------

  it("shows yellow health badge for a yellow ECK Elasticsearch cluster", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [
            {
              name: "es-yellow",
              namespace: "elastic",
              health: "yellow",
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

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("yellow")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 17. elasticsearchHealthBadge — red
  // -------------------------------------------------------------------------

  it("shows red health badge for a red ECK Elasticsearch cluster", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [
            {
              name: "es-red",
              namespace: "elastic",
              health: "red",
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

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("red")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 18. elasticsearchHealthBadge — unknown (default branch)
  // -------------------------------------------------------------------------

  it("shows 'unknown' badge text for an ECK Elasticsearch cluster with unknown health", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [
            {
              name: "es-unknown",
              namespace: "elastic",
              health: "unknown",
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

    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 19. Namespace filtering — ECK items in a different namespace are excluded
  // -------------------------------------------------------------------------

  it("does NOT show an ECK Elasticsearch row when the namespace does not match", async () => {
    mockGetElasticStack.mockResolvedValue(
      makeElasticStackResponse({
        eck: {
          elasticsearch: [
            {
              name: "other-cluster",
              namespace: "monitoring",
              health: "green",
              version: "8.12.0",
              nodeCount: 1,
              source: "eck",
            },
          ],
          kibana: [],
          logstash: [],
          beats: [],
        },
      }),
    );

    // Render for a DIFFERENT namespace — "other-cluster" should be filtered out
    render(<LogPipelineCard namespace="elastic" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Log Pipeline")).toBeInTheDocument();
    });

    expect(screen.queryByText("other-cluster")).not.toBeInTheDocument();
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
