"use client";

import { useCallback, useEffect, useState } from "react";
import { health as healthApi, observability as obsApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";
import type { HealthStatus, ObservabilitySummary } from "@/types/api";
// Co-located sub-components — same _components/ directory
import { HealthTab } from "./health-tab";
import { MetricsTab } from "./metrics-tab";
import { TracesTab } from "./traces-tab";

type TabId = "health" | "metrics" | "traces";

const TABS: { id: TabId; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "metrics", label: "Metrics" },
  { id: "traces", label: "Traces" },
];

export function ObservabilityClient() {
  const [activeTab, setActiveTab] = useState<TabId>("health");
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        healthApi.check(),
        obsApi.summary(),
      ]);
      setHealthData(h);
      setSummary(s);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch observability data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Observability"
        description="System health, metrics, and distributed traces."
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button size="sm" variant="ghost" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </PageHeader>

      <FilterTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === "health" && (
          <HealthTab healthData={healthData} summary={summary} />
        )}
        {activeTab === "metrics" && <MetricsTab summary={summary} />}
        {activeTab === "traces" && <TracesTab />}
      </div>
    </div>
  );
}
