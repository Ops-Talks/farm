"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { health } from "@/lib/api-client";
import type { HealthStatus } from "@/types/api";

export default function DashboardPage() {
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
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          System overview and health status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : healthData ? (
              <Badge
                variant={
                  healthData.status === "ok" ? "default" : "destructive"
                }
                className="text-lg"
              >
                {healthData.status === "ok" ? "Healthy" : "Degraded"}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-lg">
                Unreachable
              </Badge>
            )}
          </CardContent>
        </Card>

        {healthData &&
          Object.entries(healthData.details).map(([key, detail]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    detail.status === "up" ? "default" : "destructive"
                  }
                >
                  {detail.status === "up" ? "UP" : "DOWN"}
                </Badge>
                {Object.entries(detail)
                  .filter(([k]) => k !== "status")
                  .map(([k, v]) => (
                    <p
                      key={k}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {k}: {String(v)}
                    </p>
                  ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
