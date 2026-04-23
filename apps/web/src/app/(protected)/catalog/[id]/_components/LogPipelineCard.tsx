"use client";

import { useQuery } from "@tanstack/react-query";
import { kubernetes } from "@/lib/api-client";
import type {
  EckElasticsearch,
  EckKibana,
  EckBeat,
  EckLogstash,
  FluentBitDaemonSet,
  FluentdDaemonSet,
  LogstashDeployment,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LogPipelineCardProps {
  namespace: string;
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: "eck" | "helm" }) {
  return (
    <Badge variant="outline" className="text-[10px] shrink-0">
      {source === "eck" ? "ECK" : "Helm"}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Health / availability badge helpers
// ---------------------------------------------------------------------------

function availabilityBadge(available: boolean) {
  return available ? (
    <Badge className="bg-green-500 text-white hover:bg-green-600 text-[10px]">
      Available
    </Badge>
  ) : (
    <Badge variant="destructive" className="text-[10px]">
      Unavailable
    </Badge>
  );
}

function collectorHealthBadge(ready: number, desired: number) {
  if (ready === desired && desired > 0) {
    return (
      <Badge className="bg-green-500 text-white hover:bg-green-600 text-[10px]">
        Healthy
      </Badge>
    );
  }
  if (ready > 0 && ready < desired) {
    return (
      <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px]">
        Degraded
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      Unhealthy
    </Badge>
  );
}

function elasticsearchHealthBadge(health: EckElasticsearch["health"]) {
  switch (health) {
    case "green":
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600 text-[10px]">
          {health}
        </Badge>
      );
    case "yellow":
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px]">
          {health}
        </Badge>
      );
    case "red":
      return <Badge variant="destructive" className="text-[10px]">{health}</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">unknown</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Collector row — single row in the card list
// ---------------------------------------------------------------------------

type CollectorRow =
  | { kind: "eck-es"; item: EckElasticsearch }
  | { kind: "eck-kb"; item: EckKibana }
  | { kind: "eck-beat"; item: EckBeat }
  | { kind: "eck-ls"; item: EckLogstash }
  | { kind: "fluentbit"; item: FluentBitDaemonSet }
  | { kind: "fluentd"; item: FluentdDaemonSet }
  | { kind: "logstash"; item: LogstashDeployment };

function CollectorRowItem({ row }: { row: CollectorRow }) {
  if (row.kind === "eck-es") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="eck" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              Elasticsearch
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <span className="text-muted-foreground text-[10px] font-mono">
            v{item.version}
          </span>
          {elasticsearchHealthBadge(item.health)}
        </div>
      </div>
    );
  }

  if (row.kind === "eck-kb") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="eck" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              Kibana
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          {availabilityBadge(item.available)}
        </div>
      </div>
    );
  }

  if (row.kind === "eck-beat") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="eck" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              Beat
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          {availabilityBadge(item.available)}
        </div>
      </div>
    );
  }

  if (row.kind === "eck-ls") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="eck" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              Logstash
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <span className="text-muted-foreground text-[10px] font-mono pt-0.5 shrink-0">
          {item.readyReplicas}/{item.desiredReplicas}
        </span>
      </div>
    );
  }

  if (row.kind === "fluentbit") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="helm" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              FluentBit
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <span className="text-muted-foreground text-[10px]">
            {item.readyNodes}/{item.desiredNodes}
          </span>
          {collectorHealthBadge(item.readyNodes, item.desiredNodes)}
        </div>
      </div>
    );
  }

  if (row.kind === "fluentd") {
    const { item } = row;
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <SourceBadge source="helm" />
            <Badge variant="outline" className="text-[10px] shrink-0">
              Fluentd
            </Badge>
            <span className="font-mono font-medium truncate">{item.name}</span>
          </div>
          <p className="text-muted-foreground">{item.namespace}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <span className="text-muted-foreground text-[10px]">
            {item.readyNodes}/{item.desiredNodes}
          </span>
          {collectorHealthBadge(item.readyNodes, item.desiredNodes)}
        </div>
      </div>
    );
  }

  // logstash helm deployment
  const { item } = row;
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <SourceBadge source="helm" />
          <Badge variant="outline" className="text-[10px] shrink-0">
            Logstash
          </Badge>
          <span className="font-mono font-medium truncate">{item.name}</span>
        </div>
        <p className="text-muted-foreground">{item.namespace}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        <span className="text-muted-foreground text-[10px]">
          {item.readyReplicas}/{item.desiredReplicas}
        </span>
        {collectorHealthBadge(item.readyReplicas, item.desiredReplicas)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogPipelineCard — main export
// ---------------------------------------------------------------------------

/**
 * Displays Elastic Stack log pipeline resources associated with a component's
 * Kubernetes namespace. Always renders the card (never returns null) so that
 * the sidebar layout stays consistent regardless of data availability.
 */
export function LogPipelineCard({ namespace }: LogPipelineCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["elastic-stack", namespace],
    queryFn: () => kubernetes.getElasticStack(namespace),
  });

  // Show a brief skeleton while the request is in flight.
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Build a flat list of collector rows to display, ECK resources first.
  const rows: CollectorRow[] = [];

  if (data) {
    // ECK-managed resources scoped to this namespace.
    for (const item of data.eck.elasticsearch.filter((e) => e.namespace === namespace)) {
      rows.push({ kind: "eck-es", item });
    }
    for (const item of data.eck.kibana.filter((e) => e.namespace === namespace)) {
      rows.push({ kind: "eck-kb", item });
    }
    for (const item of data.eck.beats.filter((e) => e.namespace === namespace)) {
      rows.push({ kind: "eck-beat", item });
    }
    for (const item of data.eck.logstash.filter((e) => e.namespace === namespace)) {
      rows.push({ kind: "eck-ls", item });
    }

    // In-cluster Helm-based collectors.
    for (const item of data.inCluster.fluentBit) {
      rows.push({ kind: "fluentbit", item });
    }
    for (const item of data.inCluster.fluentd) {
      rows.push({ kind: "fluentd", item });
    }
    for (const item of data.inCluster.logstash) {
      rows.push({ kind: "logstash", item });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Log Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No log pipeline detected.
          </p>
        ) : (
          rows.map((row, index) => (
            // Rows are uniquely identified by kind + namespace + name — index
            // is used as a fallback for safety since the combination is unique.
            <CollectorRowItem
              key={`${row.kind}-${row.item.namespace}-${row.item.name}-${index}`}
              row={row}
            />
          ))
        )}
        {data?.external.reachable && (
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs">
            <Badge variant="outline" className="text-[10px] shrink-0">
              External
            </Badge>
            <span className="font-mono font-medium">Elasticsearch</span>
            <Badge className="bg-green-500 text-white hover:bg-green-600 text-[10px] ml-auto shrink-0">
              Reachable
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
