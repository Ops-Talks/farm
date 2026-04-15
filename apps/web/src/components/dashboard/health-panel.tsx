"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { health } from "@/lib/api-client";
import type { HealthStatus } from "@/types/api";

const REFRESH_INTERVAL = 30_000;

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "up" || status === "ok") return "default";
  if (status === "down" || status === "error") return "destructive";
  return "secondary";
}

function statusLabel(status: string): string {
  if (status === "up" || status === "ok") return "Healthy";
  if (status === "down" || status === "error") return "Down";
  return status;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

export function HealthPanel() {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(() => {
    health
      .check()
      .then(setHealthData)
      .catch(() => setHealthData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardContent className="py-6">
          <Badge variant="destructive" className="text-sm">
            API Unreachable
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Unable to connect to the Farm API. Retrying every 30 seconds.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Overall status card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge
            variant={statusVariant(healthData.status)}
            className="text-base"
          >
            {statusLabel(healthData.status)}
          </Badge>
        </CardContent>
      </Card>

      {/* Individual health check cards */}
      {Object.entries(healthData.details ?? {}).map(([key, detail]) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
              {key.replace(/_/g, " ")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Badge variant={statusVariant(detail.status)}>
              {detail.status === "up" ? "UP" : "DOWN"}
            </Badge>
            {Object.entries(detail)
              .filter(([k]) => k !== "status")
              .map(([k, v]) => (
                <p key={k} className="text-xs text-muted-foreground">
                  <span className="capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                  {formatDetailValue(k, v)}
                </p>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
