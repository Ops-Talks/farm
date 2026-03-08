"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { deployments } from "@/lib/api-client";
import { subscribe } from "@/lib/ws-client";
import {
  ComponentKindGroup,
  DeploymentStatus,
  FarmEvent,
} from "@/types/api";
import type { DeploymentMatrixRow } from "@/types/api";

const KIND_GROUP_TABS: { label: string; value: string | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Dev", value: ComponentKindGroup.DEV },
  { label: "Infra", value: ComponentKindGroup.INFRA },
  { label: "Data", value: ComponentKindGroup.DATA },
  { label: "Security", value: ComponentKindGroup.SECURITY },
];

function statusColor(status: DeploymentStatus | null): string {
  switch (status) {
    case DeploymentStatus.SUCCEEDED:
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case DeploymentStatus.IN_PROGRESS:
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    case DeploymentStatus.PENDING:
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    case DeploymentStatus.FAILED:
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case DeploymentStatus.ROLLED_BACK:
      return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: DeploymentStatus | null): string {
  if (!status) return "--";
  return status.replace(/_/g, " ");
}

export default function DeploymentsPage() {
  const [matrix, setMatrix] = useState<DeploymentMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindGroup, setKindGroup] = useState<string | undefined>(undefined);

  const fetchMatrix = useCallback(() => {
    deployments
      .matrix({ kindGroup })
      .then(setMatrix)
      .catch(() => setMatrix([]))
      .finally(() => setLoading(false));
  }, [kindGroup]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // WebSocket: refresh on deployment changes
  useEffect(() => {
    const unsubs = [
      subscribe(FarmEvent.DEPLOYMENT_CREATED, () => fetchMatrix()),
      subscribe(FarmEvent.DEPLOYMENT_UPDATED, () => fetchMatrix()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchMatrix]);

  // Collect unique environment names from the matrix data
  const envNames: string[] = [];
  const envIds: string[] = [];
  const firstRow = matrix[0];
  if (firstRow && firstRow.environments.length > 0) {
    for (const env of firstRow.environments) {
      envNames.push(env.environmentName);
      envIds.push(env.environmentId);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deployment Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Latest deployment status per component and environment
          </p>
        </div>
        <Link href="/deployments/history">
          <Button variant="outline">Deployment History</Button>
        </Link>
      </div>

      {/* Kind group filter tabs */}
      <div className="flex items-center gap-2">
        {KIND_GROUP_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={kindGroup === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setKindGroup(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Matrix grid */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : matrix.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No components found. Register components and create deployments to
            populate the matrix.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {matrix.length} component{matrix.length !== 1 ? "s" : ""} across{" "}
              {envNames.length} environment{envNames.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Component
                  </th>
                  {envNames.map((name, i) => (
                    <th
                      key={envIds[i]}
                      className="px-3 py-2 text-center font-medium capitalize text-muted-foreground"
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/catalog/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.kind}
                      </span>
                    </td>
                    {row.environments.map((env) => (
                      <td key={env.environmentId} className="px-3 py-2">
                        <div
                          className={`mx-auto flex w-fit flex-col items-center gap-0.5 rounded px-2 py-1 ${statusColor(env.status)}`}
                        >
                          <span className="text-xs font-medium capitalize">
                            {statusLabel(env.status)}
                          </span>
                          {env.version && (
                            <span className="text-[10px] opacity-80">
                              {env.version}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Status:</span>
        {Object.values(DeploymentStatus).map((s) => (
          <Badge
            key={s}
            variant="outline"
            className={`capitalize ${statusColor(s)}`}
          >
            {s.replace(/_/g, " ")}
          </Badge>
        ))}
        <Badge variant="outline" className={statusColor(null)}>
          Not deployed
        </Badge>
      </div>
    </div>
  );
}
