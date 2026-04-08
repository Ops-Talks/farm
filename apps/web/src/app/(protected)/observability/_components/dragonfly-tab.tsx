"use client";

import { DragonflyStatusCard } from "./dragonfly-status-card";
import { DragonflyMetricsPanel } from "./dragonfly-metrics-panel";
import type { DragonflyInstallStatus, DragonflyTaskMetrics, DragonflyTask, DragonflyPeer } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

export function DragonflyTab({
  status,
  metrics,
  tasks,
  peers,
}: {
  status: DragonflyInstallStatus | null;
  metrics: DragonflyTaskMetrics | null;
  tasks: DragonflyTask[];
  peers: DragonflyPeer[];
}) {
  if (!status) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const resolvedMetrics: DragonflyTaskMetrics = metrics ?? {
    totalTasks: 0,
    succeededTasks: 0,
    failedTasks: 0,
    activeTasks: 0,
    totalPeers: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <DragonflyStatusCard status={status} />
      <DragonflyMetricsPanel metrics={resolvedMetrics} tasks={tasks} peers={peers} />
    </div>
  );
}
