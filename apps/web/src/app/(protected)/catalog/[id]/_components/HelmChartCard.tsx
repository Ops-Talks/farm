"use client";

// HelmChartCard — displays Helm chart configuration for a catalog component.
// Renders nothing when helmChart is not set on the component.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HelmChart } from "@/types/api";

interface HelmChartCardProps {
  helmChart?: HelmChart | null;
}

export function HelmChartCard({ helmChart }: HelmChartCardProps) {
  // Return nothing when there is no Helm chart configuration attached.
  if (!helmChart) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Helm Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Repository */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              Repo
            </span>
            <p className="text-sm font-mono break-all">{helmChart.repo}</p>
          </div>

          {/* Chart name */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              Chart
            </span>
            <p className="text-sm font-medium">{helmChart.chart}</p>
          </div>

          {/* Version (optional) */}
          {helmChart.version && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Version
              </span>
              <p className="text-sm font-mono">{helmChart.version}</p>
            </div>
          )}

          {/* Values reference (optional) */}
          {helmChart.valuesRef && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Values Ref
              </span>
              <p className="text-sm font-mono break-all">{helmChart.valuesRef}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
