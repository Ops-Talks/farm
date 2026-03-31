"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { kubernetes } from "@/lib/api-client";
import type { NodeRuntimeInfo } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Runtime name badge colour.
function runtimeBadgeClass(runtime: string): string {
  const r = runtime.toLowerCase();
  if (r.includes("containerd"))
    return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
  if (r.includes("cri-o") || r.includes("crio"))
    return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
  if (r.includes("docker"))
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
}

// Summarise runtime distribution across nodes.
function buildRuntimeSummary(nodes: NodeRuntimeInfo[]): string {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    const key = node.runtimeName;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => `${count} node${count !== 1 ? "s" : ""}: ${name}`)
    .join(", ");
}

// Format bytes to human-readable.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// CRI-O metrics row expander.
function CrioMetricsSection({ nodeName }: { nodeName: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["crio-metrics", nodeName],
    queryFn: () => kubernetes.getCrioMetrics(nodeName),
    enabled: expanded,
  });

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="text-xs"
      >
        Show CRI-O Metrics
      </Button>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-4 w-32" />;
  }

  if (!metrics?.available) {
    return (
      <span className="text-xs text-muted-foreground">
        CRI-O metrics unavailable
      </span>
    );
  }

  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      {metrics.imageLayers != null && (
        <span>Layers: {metrics.imageLayers}</span>
      )}
      {metrics.cacheHitRate != null && (
        <span>Cache hit: {(metrics.cacheHitRate * 100).toFixed(1)}%</span>
      )}
      {metrics.storageUsageBytes != null && (
        <span>Storage: {formatBytes(metrics.storageUsageBytes)}</span>
      )}
    </div>
  );
}

export function RuntimeClient() {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["node-runtimes"],
    queryFn: () => kubernetes.listNodeRuntimes(),
  });

  const summary = nodes.length > 0 ? buildRuntimeSummary(nodes) : "";

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Runtime Info"
          description={`${nodes.length} node${nodes.length !== 1 ? "s" : ""} in cluster`}
        />

        {/* Summary card */}
        {!isLoading && nodes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Runtime Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{summary}</p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No node runtime information available.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Kernel</TableHead>
                <TableHead>Architecture</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node: NodeRuntimeInfo) => {
                const isCrio =
                  node.runtimeName.toLowerCase().includes("cri-o") ||
                  node.runtimeName.toLowerCase().includes("crio");
                return (
                  <TableRow key={node.nodeName}>
                    <TableCell className="font-medium">
                      {node.nodeName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={runtimeBadgeClass(node.runtimeName)}
                      >
                        {node.runtimeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {node.runtimeVersion}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {node.kernelVersion}
                    </TableCell>
                    <TableCell className="text-xs">
                      {node.architecture}
                    </TableCell>
                    <TableCell>
                      {isCrio ? (
                        <CrioMetricsSection nodeName={node.nodeName} />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </ErrorBoundary>
  );
}

