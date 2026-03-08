"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog, deployments, environments, teams } from "@/lib/api-client";

interface StatItem {
  label: string;
  value: number | null;
}

const REFRESH_INTERVAL = 60_000;

export function QuickStats() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Components", value: null },
    { label: "Teams", value: null },
    { label: "Environments", value: null },
    { label: "Deployments", value: null },
  ]);

  const fetchStats = useCallback(() => {
    Promise.allSettled([
      catalog.listComponents({ take: 1 }),
      teams.list(),
      environments.list(),
      deployments.list({ take: 1 }),
    ]).then((results) => {
      setStats([
        {
          label: "Components",
          value:
            results[0].status === "fulfilled" ? results[0].value.total : null,
        },
        {
          label: "Teams",
          value:
            results[1].status === "fulfilled" ? results[1].value.length : null,
        },
        {
          label: "Environments",
          value:
            results[2].status === "fulfilled" ? results[2].value.length : null,
        },
        {
          label: "Deployments",
          value:
            results[3].status === "fulfilled" ? results[3].value.total : null,
        },
      ]);
    });
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stat.value === null ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-3xl font-bold">{stat.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
