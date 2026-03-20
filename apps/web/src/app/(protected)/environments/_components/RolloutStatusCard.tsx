"use client";

// RolloutStatusCard — displays Argo Rollout resources from the cluster.
// Polls every 30 seconds so operators can watch rollout progress live.

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { kubernetes } from "@/lib/api-client";
import type { KubernetesRollout } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Map an Argo Rollout phase to a color-coded inline chip class (FARM-S168).
// Using semantic color classes for at-a-glance deployment status recognition.
function phaseChipClass(phase: string): string {
  switch (phase.toLowerCase()) {
    case "healthy":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "degraded":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "paused":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "progressing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Map an Argo Rollout phase string to a badge variant (kept for analysis runs). */
function phaseVariant(
  phase: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (phase.toLowerCase()) {
    case "healthy":
      return "default";
    case "degraded":
      return "destructive";
    case "paused":
      return "secondary";
    case "progressing":
      return "outline";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Single rollout card
// ---------------------------------------------------------------------------

function RolloutCard({ rollout }: { rollout: KubernetesRollout }) {
  const isCanary = rollout.canaryWeight !== undefined && rollout.canaryWeight !== null;
  const isBlueGreen =
    rollout.blueGreenActive !== undefined || rollout.blueGreenPreview !== undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{rollout.name}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {rollout.namespace}
            </p>
          </div>
          {/* Color-coded deployment status chip (FARM-S168) */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${phaseChipClass(rollout.phase)}`}
          >
            {rollout.phase}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Optional rollout message */}
        {rollout.message && (
          <p className="text-xs text-muted-foreground italic">{rollout.message}</p>
        )}

        {/* Canary progress bar */}
        {isCanary && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Canary weight</span>
              <span className="font-mono font-semibold">{rollout.canaryWeight}%</span>
            </div>
            <div
              className="h-2 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={rollout.canaryWeight}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Canary weight: ${rollout.canaryWeight}%`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${rollout.canaryWeight}%` }}
              />
            </div>
          </div>
        )}

        {/* Blue-green revision info */}
        {isBlueGreen && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground font-medium uppercase tracking-tight">
                Active
              </span>
              <p className="font-mono">{rollout.blueGreenActive ?? "--"}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground font-medium uppercase tracking-tight">
                Preview
              </span>
              <p className="font-mono">{rollout.blueGreenPreview ?? "--"}</p>
            </div>
          </div>
        )}

        {/* Analysis run results */}
        {rollout.analysisRunResults && rollout.analysisRunResults.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
              Analysis Runs
            </p>
            <ul className="space-y-1">
              {rollout.analysisRunResults.map((run) => (
                <li key={run.name} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{run.name}</span>
                  <Badge variant={phaseVariant(run.phase)} className="text-[10px]">
                    {run.phase}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Updated: {new Date(rollout.updatedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RolloutStatusCardProps {
  componentId?: string;
  namespace?: string;
}

export function RolloutStatusCard({ componentId, namespace }: RolloutStatusCardProps) {
  const { data: rollouts = [], isLoading: isPending } = useQuery({
    queryKey: ["rollouts", componentId, namespace],
    queryFn: () => kubernetes.listRollouts({ componentId, namespace }),
    // Poll every 30 seconds to keep rollout status current.
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (rollouts.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-muted/20">
        <p className="text-sm text-muted-foreground font-medium">
          No Argo Rollouts found
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ensure your cluster has the Argo Rollouts controller installed and rollouts deployed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Argo Rollouts
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rollouts.map((rollout) => (
          <RolloutCard key={`${rollout.namespace}/${rollout.name}`} rollout={rollout} />
        ))}
      </div>
    </div>
  );
}
