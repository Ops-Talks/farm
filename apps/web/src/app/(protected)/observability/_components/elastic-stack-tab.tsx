"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type {
  EckElasticsearch,
  EckKibana,
  EckBeat,
  EckLogstash,
  FluentBitDaemonSet,
  FluentdDaemonSet,
  LogstashDeployment,
  ElasticStackResponse,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Health badge helpers
// ---------------------------------------------------------------------------

function elasticsearchHealthBadge(health: EckElasticsearch["health"]) {
  switch (health) {
    case "green":
      return <Badge className="bg-green-500 text-white hover:bg-green-600">green</Badge>;
    case "yellow":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-600">yellow</Badge>;
    case "red":
      return <Badge variant="destructive">red</Badge>;
    default:
      return <Badge variant="secondary">unknown</Badge>;
  }
}

function availabilityBadge(available: boolean) {
  return available ? (
    <Badge className="bg-green-500 text-white hover:bg-green-600">Available</Badge>
  ) : (
    <Badge variant="destructive">Unavailable</Badge>
  );
}

/**
 * Returns a health badge for in-cluster DaemonSet / Deployment collectors.
 * - All nodes ready and at least one desired  → Healthy (green)
 * - Some nodes ready but fewer than desired   → Degraded (amber)
 * - Zero nodes ready                          → Unhealthy (red)
 */
function collectorHealthBadge(readyNodes: number, desiredNodes: number) {
  if (readyNodes === desiredNodes && desiredNodes > 0) {
    return <Badge className="bg-green-500 text-white hover:bg-green-600">Healthy</Badge>;
  }
  if (readyNodes > 0 && readyNodes < desiredNodes) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Degraded</Badge>;
  }
  return <Badge variant="destructive">Unhealthy</Badge>;
}

function externalHealthBadge(clusterHealth: "green" | "yellow" | "red") {
  switch (clusterHealth) {
    case "green":
      return <Badge className="bg-green-500 text-white hover:bg-green-600">green</Badge>;
    case "yellow":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-600">yellow</Badge>;
    case "red":
      return <Badge variant="destructive">red</Badge>;
  }
}

// ---------------------------------------------------------------------------
// ECK sub-sections
// ---------------------------------------------------------------------------

function EckElasticsearchSection({ items }: { items: EckElasticsearch[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No ECK Elasticsearch found"
        description="No Elastic Cloud on Kubernetes Elasticsearch instances detected."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((es) => (
        <div
          key={`${es.namespace}/${es.name}`}
          className="rounded-md border px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{es.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {es.namespace}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground text-xs">v{es.version}</span>
              <Badge variant="outline" className="text-xs">
                {es.nodeCount} {es.nodeCount === 1 ? "node" : "nodes"}
              </Badge>
              {elasticsearchHealthBadge(es.health)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EckKibanaSection({ items }: { items: EckKibana[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No ECK Kibana found"
        description="No ECK Kibana instances detected in this cluster."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((kb) => (
        <div
          key={`${kb.namespace}/${kb.name}`}
          className="rounded-md border px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{kb.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {kb.namespace}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {kb.version && (
                <span className="text-muted-foreground text-xs">v{kb.version}</span>
              )}
              {availabilityBadge(kb.available)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EckLogstashSection({ items }: { items: EckLogstash[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No ECK Logstash found"
        description="No ECK Logstash instances detected in this cluster."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((ls) => (
        <div
          key={`${ls.namespace}/${ls.name}`}
          className="rounded-md border px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{ls.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {ls.namespace}
              </span>
            </div>
            <span className="text-muted-foreground text-xs shrink-0">
              {ls.readyReplicas}/{ls.desiredReplicas} replicas
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EckBeatsSection({ items }: { items: EckBeat[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No ECK Beats found"
        description="No ECK Beats agents detected in this cluster."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((beat) => (
        <div
          key={`${beat.namespace}/${beat.name}`}
          className="rounded-md border px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{beat.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {beat.namespace}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {beat.version && (
                <span className="text-muted-foreground text-xs">v{beat.version}</span>
              )}
              {availabilityBadge(beat.available)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ECK-Managed Resources card
// ---------------------------------------------------------------------------

function EckResourcesCard({ eck }: { eck: ElasticStackResponse["eck"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>ECK-Managed Resources</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Elasticsearch</h4>
          <EckElasticsearchSection items={eck.elasticsearch} />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Kibana</h4>
          <EckKibanaSection items={eck.kibana} />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Logstash</h4>
          <EckLogstashSection items={eck.logstash} />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Beats</h4>
          <EckBeatsSection items={eck.beats} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// In-cluster collector rows
// ---------------------------------------------------------------------------

function FluentBitRow({ item }: { item: FluentBitDaemonSet }) {
  return (
    <div className="rounded-md border px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            FluentBit
          </Badge>
          <span className="font-mono font-medium truncate">{item.name}</span>
          <span className="text-muted-foreground text-xs shrink-0">
            {item.namespace}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.configMapRef && (
            <span className="text-muted-foreground text-xs font-mono">
              {item.configMapRef}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {item.readyNodes}/{item.desiredNodes}
          </span>
          {collectorHealthBadge(item.readyNodes, item.desiredNodes)}
        </div>
      </div>
    </div>
  );
}

function FluentdRow({ item }: { item: FluentdDaemonSet }) {
  return (
    <div className="rounded-md border px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            Fluentd
          </Badge>
          <span className="font-mono font-medium truncate">{item.name}</span>
          <span className="text-muted-foreground text-xs shrink-0">
            {item.namespace}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.configMapRef && (
            <span className="text-muted-foreground text-xs font-mono">
              {item.configMapRef}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {item.readyNodes}/{item.desiredNodes}
          </span>
          {collectorHealthBadge(item.readyNodes, item.desiredNodes)}
        </div>
      </div>
    </div>
  );
}

function LogstashDeploymentRow({ item }: { item: LogstashDeployment }) {
  return (
    <div className="rounded-md border px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            Logstash
          </Badge>
          <span className="font-mono font-medium truncate">{item.name}</span>
          <span className="text-muted-foreground text-xs shrink-0">
            {item.namespace}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.configMapRef && (
            <span className="text-muted-foreground text-xs font-mono">
              {item.configMapRef}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {item.readyReplicas}/{item.desiredReplicas}
          </span>
          {collectorHealthBadge(item.readyReplicas, item.desiredReplicas)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In-Cluster Collectors card
// ---------------------------------------------------------------------------

function InClusterCollectorsCard({
  inCluster,
}: {
  inCluster: ElasticStackResponse["inCluster"];
}) {
  const totalCollectors =
    inCluster.fluentBit.length +
    inCluster.fluentd.length +
    inCluster.logstash.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>In-Cluster Collectors</CardTitle>
      </CardHeader>
      <CardContent>
        {totalCollectors === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No in-cluster log collectors detected.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {inCluster.fluentBit.map((item) => (
              <FluentBitRow key={`${item.namespace}/${item.name}`} item={item} />
            ))}
            {inCluster.fluentd.map((item) => (
              <FluentdRow key={`${item.namespace}/${item.name}`} item={item} />
            ))}
            {inCluster.logstash.map((item) => (
              <LogstashDeploymentRow
                key={`${item.namespace}/${item.name}`}
                item={item}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// External Elasticsearch card
// ---------------------------------------------------------------------------

function ExternalElasticsearchCard({
  external,
}: {
  external: ElasticStackResponse["external"];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>External Elasticsearch</CardTitle>
          {external.reachable ? (
            <Badge className="bg-green-500 text-white hover:bg-green-600">
              Reachable
            </Badge>
          ) : (
            <Badge variant="destructive">Unreachable</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {external.reachable ? (
          <div className="flex items-center gap-2">
            {external.version && (
              <span className="text-sm text-muted-foreground">
                v{external.version}
              </span>
            )}
            {external.clusterHealth && externalHealthBadge(external.clusterHealth)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Configure{" "}
            <span className="font-mono text-xs">ELASTICSEARCH_URL</span> to
            enable external monitoring.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ElasticStackTab — main export
// ---------------------------------------------------------------------------

export function ElasticStackTab({ data }: { data: ElasticStackResponse | null }) {
  // Render skeleton placeholders while data is not yet available.
  if (data === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  // Determine whether the entire tab is effectively empty.
  const hasEckResources =
    data.eck.elasticsearch.length > 0 ||
    data.eck.kibana.length > 0 ||
    data.eck.logstash.length > 0 ||
    data.eck.beats.length > 0;

  const hasInClusterCollectors =
    data.inCluster.fluentBit.length > 0 ||
    data.inCluster.fluentd.length > 0 ||
    data.inCluster.logstash.length > 0;

  const isEmpty =
    !hasEckResources && !hasInClusterCollectors && !data.external.reachable;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          No Elastic Stack resources detected. Deploy ECK, configure
          ELASTICSEARCH_URL, or install Fluent Bit/Fluentd to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <EckResourcesCard eck={data.eck} />
      <InClusterCollectorsCard inCluster={data.inCluster} />
      <ExternalElasticsearchCard external={data.external} />
    </div>
  );
}
