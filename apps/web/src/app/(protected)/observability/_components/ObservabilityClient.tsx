"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";
import { health as healthApi, observability as obsApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";
import type { HealthStatus, ObservabilitySummary } from "@/types/api";
// HealthTab is the default active tab — keep it statically imported to avoid
// a loading flash on first render.
import { HealthTab } from "./health-tab";

// --- Dynamically imported tabs ---
// These tabs are only mounted when the user navigates to them, so we defer
// their JS bundles with next/dynamic + ssr:false to reduce the initial parse cost.

/** MetricsTab: 363 lines — custom SVG MiniLineChart + interactive PromQLChartCard */
const MetricsTab = dynamic(
  () => import("./metrics-tab").then((m) => ({ default: m.MetricsTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

/** TracesTab: 233 lines — fetches Jaeger traces, renders TraceWaterfall on demand */
const TracesTab = dynamic(
  () => import("./traces-tab").then((m) => ({ default: m.TracesTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

/** LogsTab: 217 lines — interactive Loki log query viewer */
const LogsTab = dynamic(
  () => import("./logs-tab").then((m) => ({ default: m.LogsTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

type TabId = "health" | "metrics" | "traces" | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "metrics", label: "Metrics" },
  { id: "traces", label: "Traces" },
  { id: "logs", label: "Logs" },
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
    <ErrorBoundary>
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
        {activeTab === "logs" && <LogsTab />}
      </div>
    </div>
    </ErrorBoundary>
  );
}
