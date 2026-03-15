"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HealthStatus, ObservabilitySummary } from "@/types/api";

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "up" || status === "ok") return "default";
  if (status === "down" || status === "error") return "destructive";
  return "secondary";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatDetailValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("heap") ||
      lowerKey.includes("rss") ||
      lowerKey.includes("used") ||
      lowerKey.includes("available") ||
      lowerKey.includes("max")
    ) {
      return formatBytes(value);
    }
  }
  return String(value);
}

export function HealthTab({
  healthData,
  summary,
}: {
  healthData: HealthStatus | null;
  summary: ObservabilitySummary | null;
}) {
  if (!healthData) {
    return (
      <Card>
        <CardContent className="py-6">
          <Badge variant="destructive">API Unreachable</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Unable to connect to the Farm API.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall + uptime/memory row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant(healthData.status)} className="text-base">
              {healthData.status === "ok" ? "Healthy" : "Degraded"}
            </Badge>
          </CardContent>
        </Card>

        {summary && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {formatUptime(summary.uptime)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Heap Memory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {formatBytes(summary.memory?.heapUsed ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  of {formatBytes(summary.memory?.heapTotal ?? 0)} allocated
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  RSS Memory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {formatBytes(summary.memory?.rss ?? 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(healthData.info || {}).map(([key, info]) => {
          const infoObj = info as { status: string } & Record<string, unknown>;
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">
                    {key}
                  </CardTitle>
                  <Badge variant={statusVariant(infoObj.status)}>
                    {infoObj.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(infoObj).map(([k, v]) => {
                    if (k === "status") return null;
                    return (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}:</span>
                        <span className="font-mono">
                          {formatDetailValue(k, v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
