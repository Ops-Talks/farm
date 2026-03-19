"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog, deployments, environments, teams } from "@/lib/api-client";

interface StatItem {
  label: string;
  value: number | null;
}

const REFRESH_INTERVAL = 60_000;

const INITIAL_STATS: StatItem[] = [
  { label: "Components", value: null },
  { label: "Teams", value: null },
  { label: "Environments", value: null },
  { label: "Deployments", value: null },
];

export function QuickStats() {
  const [stats, setStats] = useState<StatItem[]>(INITIAL_STATS);

  function setStatValue(label: string, value: number | null) {
    setStats((prev) =>
      prev.map((s) => (s.label === label ? { ...s, value } : s)),
    );
  }

  useEffect(() => {
    function fetchStats() {
      // Fire each request independently so each stat renders as soon as its
      // response arrives instead of waiting for the slowest call.
      catalog
        .listComponents({ take: 1 })
        .then((r) => setStatValue("Components", r.total ?? 0))
        .catch(() => setStatValue("Components", 0));

      teams
        .list()
        .then((r) => setStatValue("Teams", r.total ?? 0))
        .catch(() => setStatValue("Teams", 0));

      environments
        .list()
        .then((r) => setStatValue("Environments", r.total ?? 0))
        .catch(() => setStatValue("Environments", 0));

      deployments
        .list({ take: 1 })
        .then((r) => setStatValue("Deployments", r.total ?? 0))
        .catch(() => setStatValue("Deployments", 0));
    }

    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

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
