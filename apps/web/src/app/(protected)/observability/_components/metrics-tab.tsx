"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ObservabilitySummary } from "@/types/api";

function formatLatency(seconds: number): string {
  if (seconds === 0) return "--";
  if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}us`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`;
  return `${seconds.toFixed(2)}s`;
}

export function MetricsTab({
  summary,
}: {
  summary: ObservabilitySummary | null;
}) {
  if (!summary) return null;

  // Estimate requests per second (total / uptime)
  const rps = summary.uptime > 0 ? summary.totalRequests / summary.uptime : 0;
  
  // Calculate error rate (5xx / total)
  const total5xx = summary.requestsByStatus?.["5xx"] ?? 0;
  const errorRate = summary.totalRequests > 0 ? total5xx / summary.totalRequests : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Request Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {rps.toFixed(2)} req/s
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {summary.totalRequests}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Rate (5xx)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {(errorRate * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Total Errors: {total5xx}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              P95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatLatency(summary.latencyPercentiles.p95)}
            </div>
            <div className="text-xs text-muted-foreground">
              P50: {formatLatency(summary.latencyPercentiles.p50)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requestsByStatus).map(
              ([status, count]) => {
                const max = Math.max(...Object.values(summary.requestsByStatus));
                const percent = (count / (max || 1)) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono uppercase">{status}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${status === '5xx' ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
