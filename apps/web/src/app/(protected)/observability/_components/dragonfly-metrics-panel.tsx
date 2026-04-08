"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DragonflyTaskMetrics, DragonflyTask, DragonflyPeer } from "@/types/api";

function taskStatusBadge(status: DragonflyTask["status"]) {
  switch (status) {
    case "succeeded":
      return <Badge variant="default">succeeded</Badge>;
    case "running":
      return <Badge variant="secondary">running</Badge>;
    case "failed":
      return <Badge variant="destructive">failed</Badge>;
  }
}

function peerStatusBadge(status: DragonflyPeer["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="default">active</Badge>;
    case "idle":
      return <Badge variant="secondary">idle</Badge>;
  }
}

export function DragonflyMetricsPanel({
  metrics,
  tasks,
  peers,
}: {
  metrics: DragonflyTaskMetrics;
  tasks: DragonflyTask[];
  peers: DragonflyPeer[];
}) {
  const successRate =
    metrics.totalTasks > 0
      ? Math.round((metrics.succeededTasks / metrics.totalTasks) * 100) + "%"
      : "N/A";

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Dragonfly Metrics</h2>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{metrics.totalTasks}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{metrics.activeTasks}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{successRate}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Peers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{metrics.totalPeers}</span>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Recent Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No P2P tasks recorded.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Image</th>
                  <th className="px-4 py-2 text-left font-medium">Peers</th>
                  <th className="px-4 py-2 text-left font-medium">Acceleration</th>
                  <th className="px-4 py-2 text-left font-medium">Duration</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => {
                  const accPct = Math.round(task.accelerationRatio * 100);
                  const accVariant: "default" | "secondary" =
                    accPct > 50 ? "default" : "secondary";
                  return (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{task.image}</td>
                      <td className="px-4 py-2">{task.peerCount}</td>
                      <td className="px-4 py-2">
                        <Badge variant={accVariant}>{accPct}%</Badge>
                      </td>
                      <td className="px-4 py-2">{task.durationSeconds.toFixed(1)}s</td>
                      <td className="px-4 py-2">{taskStatusBadge(task.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Peers */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Active Peers</h3>
        {peers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active peers.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {peers.map((peer) => (
              <div
                key={peer.peerId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs">{peer.peerId}</span>
                  <span className="text-muted-foreground">{peer.ip}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{peer.taskCount} tasks</span>
                  {peerStatusBadge(peer.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
