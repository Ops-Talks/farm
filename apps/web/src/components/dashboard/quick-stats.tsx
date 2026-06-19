"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog, deployments, environments, teams } from "@/lib/api-client";

interface StatItem {
  label: string;
  value: number | null;
  errored: boolean;
}

const REFRESH_INTERVAL = 60_000;

const INITIAL_STATS: StatItem[] = [
  { label: "Components", value: null, errored: false },
  { label: "Teams", value: null, errored: false },
  { label: "Environments", value: null, errored: false },
  { label: "Deployments", value: null, errored: false },
];

function FadeIn({ value }: { value: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span
      className="inline-block transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.95)",
      }}
    >
      {value}
    </span>
  );
}

export function QuickStats() {
  const [stats, setStats] = useState<StatItem[]>(INITIAL_STATS);
  const mountedRef = useRef(true);

  function setStatValue(label: string, value: number | null, errored = false) {
    if (!mountedRef.current) return;
    setStats((prev) =>
      prev.map((s) => (s.label === label ? { ...s, value, errored } : s)),
    );
  }

  useEffect(() => {
    mountedRef.current = true;
    function fetchStats() {
      catalog
        .listComponents({ take: 1 })
        .then((r) => setStatValue("Components", r.total ?? 0))
        .catch(() => setStatValue("Components", 0, true));

      teams
        .list()
        .then((r) => setStatValue("Teams", r.total ?? 0))
        .catch(() => setStatValue("Teams", 0, true));

      environments
        .list()
        .then((r) => setStatValue("Environments", r.total ?? 0))
        .catch(() => setStatValue("Environments", 0, true));

      deployments
        .list({ take: 1 })
        .then((r) => setStatValue("Deployments", r.total ?? 0))
        .catch(() => setStatValue("Deployments", 0, true));
    }

    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
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
              <p
                className={`text-3xl font-bold tabular-nums ${stat.errored ? "opacity-40" : ""}`}
                title={stat.errored ? "Failed to load" : undefined}
              >
                <FadeIn value={stat.value} />
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
