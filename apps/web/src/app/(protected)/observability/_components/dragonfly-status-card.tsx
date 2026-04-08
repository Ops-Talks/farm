"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DragonflyInstallStatus, DragonflyComponentInfo } from "@/types/api";

function componentDisplayName(component: DragonflyComponentInfo["component"]): string {
  switch (component) {
    case "manager":
      return "Manager";
    case "scheduler":
      return "Scheduler";
    case "dfdaemon":
      return "Dfget Daemon";
  }
}

function statusBadge(status: DragonflyInstallStatus["status"]) {
  switch (status) {
    case "not-installed":
      return <Badge variant="secondary">Not Installed</Badge>;
    case "healthy":
      return <Badge variant="default">Healthy</Badge>;
    case "degraded":
      return <Badge variant="destructive">Degraded</Badge>;
  }
}

export function DragonflyStatusCard({ status }: { status: DragonflyInstallStatus }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Dragonfly P2P CDN</CardTitle>
          <div className="flex items-center gap-2">
            {status.version !== null && (
              <span className="text-sm text-muted-foreground">
                v{status.version}
              </span>
            )}
            {statusBadge(status.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {status.status === "not-installed" ? (
          <p className="text-sm text-muted-foreground">
            Dragonfly is not detected in this cluster.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {status.components.map((component, index) => {
              const isReady = component.readyReplicas === component.totalReplicas;
              return (
                <div
                  key={`${component.component}-${index}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {componentDisplayName(component.component)}
                    </span>
                    <span className="text-muted-foreground">{component.namespace}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {component.readyReplicas}/{component.totalReplicas} replicas
                    </span>
                    <Badge variant={isReady ? "default" : "destructive"}>
                      {isReady ? "Ready" : "Degraded"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
