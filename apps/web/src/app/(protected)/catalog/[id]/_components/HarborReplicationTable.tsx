"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { registry as registryApi } from "@/lib/api-client";
import type { HarborReplicationPolicy } from "@/types/api";

function executionStatusVariant(
  status: string | null,
): "default" | "destructive" | "secondary" {
  if (!status) return "secondary";
  if (status === "succeed" || status === "success") return "default";
  if (status === "failed" || status === "error") return "destructive";
  return "secondary";
}

function executionStatusLabel(status: string | null): string {
  if (!status) return "No runs";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function triggerLabel(triggerType: string): string {
  switch (triggerType) {
    case "scheduled":
      return "Scheduled";
    case "event_based":
      return "Event-based";
    case "manual":
    default:
      return "Manual";
  }
}

export function HarborReplicationTable() {
  const [policies, setPolicies] = useState<HarborReplicationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registryApi
      .listHarborReplications()
      .then((data) => setPolicies(data))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Harbor Replication Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (policies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Harbor Replication Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No replication rules configured.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Harbor Replication Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trigger</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Run</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{policy.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{policy.srcRegistry}</td>
                  <td className="px-4 py-3 text-muted-foreground">{policy.destRegistry}</td>
                  <td className="px-4 py-3">{triggerLabel(policy.triggerType)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={executionStatusVariant(policy.lastExecutionStatus)}>
                      {executionStatusLabel(policy.lastExecutionStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={policy.enabled ? "default" : "secondary"}>
                      {policy.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
