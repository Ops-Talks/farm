import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ElasticStackResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import { ElasticStackTab } from "./elastic-stack-tab";

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

describe("ElasticStackTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Skeleton when data is null
  // -------------------------------------------------------------------------

  it("renders skeleton placeholders when data is null", () => {
    const { container } = render(<ElasticStackTab data={null} />);

    // Real content must NOT be in the document.
    expect(screen.queryByText("ECK-Managed Resources")).not.toBeInTheDocument();
    expect(
      screen.queryByText("In-Cluster Collectors"),
    ).not.toBeInTheDocument();

    // Skeleton elements (data-slot="skeleton" / animate-pulse) should exist.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 2. Empty state when all sections are empty
  // -------------------------------------------------------------------------

  it("shows the empty-state message when all sections are empty and external is unreachable", () => {
    render(<ElasticStackTab data={makeElasticStackResponse()} />);

    expect(
      screen.getByText(/No Elastic Stack resources detected/),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. ECK Elasticsearch health badges
  // -------------------------------------------------------------------------

  it("renders a green health badge for a green Elasticsearch cluster", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("green")).toBeInTheDocument();
  });

  it("renders a yellow health badge for a yellow Elasticsearch cluster", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("yellow")).toBeInTheDocument();
  });

  it("renders a red/destructive health badge for a red Elasticsearch cluster", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("red")).toBeInTheDocument();
  });

  it("renders an unknown/secondary badge for an unknown-health Elasticsearch cluster", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. ECK section heading visible when ECK resources are present
  // -------------------------------------------------------------------------

  it("shows the ECK-Managed Resources heading when there is at least one ES resource", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("ECK-Managed Resources")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. In-cluster collector health badges
  // -------------------------------------------------------------------------

  it("renders a Healthy badge when all FluentBit nodes are ready", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [
          {
            name: "fluent-bit",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders a Degraded badge when some FluentBit nodes are not ready", () => {
    const data = makeElasticStackResponse({
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Degraded")).toBeInTheDocument();
  });

  it("renders an Unhealthy badge when no FluentBit nodes are ready", () => {
    const data = makeElasticStackResponse({
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. In-cluster section heading visible
  // -------------------------------------------------------------------------

  it("shows the In-Cluster Collectors heading when a FluentBit collector exists", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [
          {
            name: "fluent-bit",
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
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("In-Cluster Collectors")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 7. External Elasticsearch reachable / unreachable
  // -------------------------------------------------------------------------

  it("shows the Reachable badge when external Elasticsearch is reachable", () => {
    // external.reachable = true → isEmpty = false → all three cards render
    const data = makeElasticStackResponse({
      external: { reachable: true, clusterHealth: "green" },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Reachable")).toBeInTheDocument();
  });

  it("shows the Unreachable badge when external is unreachable and other resources exist", () => {
    // Need at least one ECK resource so isEmpty = false and ExternalElasticsearchCard renders
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
            namespace: "elastic",
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
      external: { reachable: false },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 8. External Elasticsearch heading
  // -------------------------------------------------------------------------

  it("shows the External Elasticsearch heading when the tab has non-empty data", () => {
    // external.reachable = true prevents isEmpty → ExternalElasticsearchCard renders
    const data = makeElasticStackResponse({
      external: { reachable: true },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("External Elasticsearch")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 9. EckKibanaSection — available
  // -------------------------------------------------------------------------

  it("shows Available badge when ECK Kibana item is available", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [{ name: "my-kb", namespace: "elastic", available: true, source: "eck" }],
        logstash: [],
        beats: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("my-kb")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 10. EckKibanaSection — unavailable
  // -------------------------------------------------------------------------

  it("shows Unavailable badge when ECK Kibana item is not available", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [{ name: "kb-down", namespace: "elastic", available: false, source: "eck" }],
        logstash: [],
        beats: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 11. EckKibanaSection — version conditional
  // -------------------------------------------------------------------------

  it("shows version text for ECK Kibana when version is set", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [
          { name: "kb-versioned", namespace: "elastic", available: true, version: "8.12.0", source: "eck" },
        ],
        logstash: [],
        beats: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("v8.12.0")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 12. EckLogstashSection — populated
  // -------------------------------------------------------------------------

  it("shows replicas text for ECK Logstash items", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [],
        logstash: [
          {
            name: "ls-eck",
            namespace: "elastic",
            readyReplicas: 2,
            desiredReplicas: 3,
            source: "eck",
          },
        ],
        beats: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("ls-eck")).toBeInTheDocument();
    expect(screen.getByText("2/3 replicas")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 13. EckBeatsSection — populated with available: true
  // -------------------------------------------------------------------------

  it("shows Available badge for an ECK Beat item that is available", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [],
        logstash: [],
        beats: [
          { name: "filebeat", namespace: "elastic", available: true, source: "eck" },
        ],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("filebeat")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 14. EckBeatsSection — version conditional
  // -------------------------------------------------------------------------

  it("shows version text for ECK Beat when version is set", () => {
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [],
        kibana: [],
        logstash: [],
        beats: [
          {
            name: "metricbeat",
            namespace: "elastic",
            available: true,
            version: "8.12.1",
            source: "eck",
          },
        ],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("v8.12.1")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 15. FluentBitRow — configMapRef conditional
  // -------------------------------------------------------------------------

  it("shows configMapRef text in FluentBitRow when configMapRef is set", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [
          {
            name: "fluent-bit",
            namespace: "logging",
            desiredNodes: 3,
            readyNodes: 3,
            notReadyNodes: 0,
            configMapRef: "fluent-bit-config",
            source: "helm",
          },
        ],
        fluentd: [],
        logstash: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("fluent-bit-config")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 16. FluentdRow — rendering
  // -------------------------------------------------------------------------

  it("renders FluentdRow with name and Fluentd badge", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [],
        fluentd: [
          {
            name: "fluentd-ds",
            namespace: "logging",
            desiredNodes: 2,
            readyNodes: 2,
            notReadyNodes: 0,
            source: "helm",
          },
        ],
        logstash: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("fluentd-ds")).toBeInTheDocument();
    expect(screen.getByText("Fluentd")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 17. FluentdRow — configMapRef conditional
  // -------------------------------------------------------------------------

  it("shows configMapRef text in FluentdRow when configMapRef is set", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [],
        fluentd: [
          {
            name: "fluentd-ds",
            namespace: "logging",
            desiredNodes: 2,
            readyNodes: 2,
            notReadyNodes: 0,
            configMapRef: "fluentd-config",
            source: "helm",
          },
        ],
        logstash: [],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("fluentd-config")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 18. LogstashDeploymentRow — rendering
  // -------------------------------------------------------------------------

  it("renders LogstashDeploymentRow with name and Logstash badge", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [],
        fluentd: [],
        logstash: [
          {
            name: "logstash-helm",
            namespace: "logging",
            desiredReplicas: 3,
            readyReplicas: 3,
            source: "helm",
          },
        ],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("logstash-helm")).toBeInTheDocument();
    expect(screen.getAllByText("Logstash").length).toBeGreaterThan(0);
  });
  // -------------------------------------------------------------------------

  it("shows configMapRef text in LogstashDeploymentRow when configMapRef is set", () => {
    const data = makeElasticStackResponse({
      inCluster: {
        fluentBit: [],
        fluentd: [],
        logstash: [
          {
            name: "logstash-helm",
            namespace: "logging",
            desiredReplicas: 2,
            readyReplicas: 2,
            configMapRef: "logstash-pipeline-config",
            source: "helm",
          },
        ],
      },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("logstash-pipeline-config")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 20. externalHealthBadge — yellow
  // -------------------------------------------------------------------------

  it("shows yellow cluster health badge when external Elasticsearch is reachable with yellow health", () => {
    const data = makeElasticStackResponse({
      external: { reachable: true, clusterHealth: "yellow" },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("yellow")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 21. externalHealthBadge — red
  // -------------------------------------------------------------------------

  it("shows red cluster health badge when external Elasticsearch has red health", () => {
    const data = makeElasticStackResponse({
      external: { reachable: true, clusterHealth: "red" },
    });

    render(<ElasticStackTab data={data} />);
    expect(screen.getByText("red")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 22. InClusterCollectorsCard — empty (no collectors detected)
  // -------------------------------------------------------------------------

  it("shows 'No in-cluster log collectors detected.' when ECK has resources but inCluster is empty", () => {
    // ECK has resources → isEmpty = false → all cards render
    // inCluster is all empty → InClusterCollectorsCard renders the empty message
    const data = makeElasticStackResponse({
      eck: {
        elasticsearch: [
          {
            name: "my-es",
            namespace: "elastic",
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
      inCluster: { fluentBit: [], fluentd: [], logstash: [] },
    });

    render(<ElasticStackTab data={data} />);
    expect(
      screen.getByText("No in-cluster log collectors detected."),
    ).toBeInTheDocument();
  });
});
