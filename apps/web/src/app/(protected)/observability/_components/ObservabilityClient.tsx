"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";
import { health as healthApi, observability as obsApi, kubernetes } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";
import type { HealthStatus, ObservabilitySummary, DragonflyInstallStatus, DragonflyTaskMetrics, DragonflyTask, DragonflyPeer, KedaInstallStatus, KedaScaledObject, KedaScaledJob, ElasticStackResponse, ThanosResponse } from "@/types/api";
// HealthTab is the default active tab — keep it statically imported to avoid
// a loading flash on first render.
import { HealthTab } from "./health-tab";
import { MetricsBackendBadge } from "./MetricsBackendBadge";

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

/** DragonflyTab: Dragonfly P2P CDN status and metrics */
const DragonflyTab = dynamic(
  () => import("./dragonfly-tab").then((m) => ({ default: m.DragonflyTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

/** KedaTab: KEDA autoscaling ScaledObjects and ScaledJobs */
const KedaTab = dynamic(
  () => import("./keda-tab").then((m) => ({ default: m.KedaTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

/** ElasticStackTab: ECK-managed resources, in-cluster collectors, external Elasticsearch */
const ElasticStackTab = dynamic(
  () => import("./elastic-stack-tab").then((m) => ({ default: m.ElasticStackTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

/** ThanosTab: Thanos component discovery and metrics backend detection */
const ThanosTab = dynamic(
  () => import("./thanos-tab").then((m) => ({ default: m.ThanosTab })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);

type TabId = "health" | "metrics" | "traces" | "logs" | "dragonfly" | "keda" | "elastic-stack" | "thanos";

const TABS: { id: TabId; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "metrics", label: "Metrics" },
  { id: "traces", label: "Traces" },
  { id: "logs", label: "Logs" },
  { id: "dragonfly", label: "Dragonfly" },
  { id: "keda", label: "KEDA" },
  { id: "elastic-stack", label: "Elastic Stack" },
  { id: "thanos", label: "Thanos" },
];

export function ObservabilityClient() {
  const [activeTab, setActiveTab] = useState<TabId>("health");
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Dragonfly state
  const [dragonflyStatus, setDragonflyStatus] = useState<DragonflyInstallStatus | null>(null);
  const [dragonflyMetrics, setDragonflyMetrics] = useState<DragonflyTaskMetrics | null>(null);
  const [dragonflyTasks, setDragonflyTasks] = useState<DragonflyTask[]>([]);
  const [dragonflyPeers, setDragonflyPeers] = useState<DragonflyPeer[]>([]);

  // KEDA Autoscaling state
  const [kedaStatus, setKedaStatus] = useState<KedaInstallStatus | null>(null);
  const [kedaScaledObjects, setKedaScaledObjects] = useState<KedaScaledObject[]>([]);
  const [kedaScaledJobs, setKedaScaledJobs] = useState<KedaScaledJob[]>([]);

  // Elastic Stack state
  const [elasticStack, setElasticStack] = useState<ElasticStackResponse | null>(null);

  // Thanos state
  const [thanosData, setThanosData] = useState<ThanosResponse | null>(null);

  const fetchData = useCallback(async (fetchDragonfly: boolean, fetchKeda: boolean, fetchElasticStack: boolean, fetchThanos: boolean) => {
    // Use allSettled so a failing summary (Prometheus/Loki unavailable) does
    // not prevent the health data from rendering.
    const corePromises = Promise.allSettled([
      healthApi.check(),
      obsApi.summary(),
    ]);

    const dragonflyPromises = fetchDragonfly
      ? Promise.allSettled([
          kubernetes.getDragonflyStatus(),
          kubernetes.getDragonflyMetrics(),
          kubernetes.getDragonflyTasks(),
          kubernetes.getDragonflyPeers(),
        ])
      : Promise.resolve(null);

    const kedaPromises = fetchKeda
      ? Promise.allSettled([
          kubernetes.getKedaStatus(),
          kubernetes.listKedaScaledObjects(),
          kubernetes.listKedaScaledJobs(),
        ])
      : Promise.resolve(null);

    const elasticStackPromises = fetchElasticStack
      ? Promise.allSettled([kubernetes.getElasticStack()])
      : Promise.resolve(null);

    const thanosPromises = fetchThanos
      ? Promise.allSettled([kubernetes.getThanos()])
      : Promise.resolve(null);

    const [coreResults, dragonflyResults, kedaResults, elasticStackResults, thanosResults] = await Promise.all([
      corePromises,
      dragonflyPromises,
      kedaPromises,
      elasticStackPromises,
      thanosPromises,
    ]);

    const [healthResult, summaryResult] = coreResults;

    if (healthResult.status === "fulfilled") {
      setHealthData(healthResult.value);
    } else {
      console.error("Health check failed:", healthResult.reason);
      setHealthData(null);
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      console.warn("Observability summary unavailable:", summaryResult.reason);
      setSummary(null);
    }

    if (dragonflyResults) {
      const [
        dragonflyStatusResult,
        dragonflyMetricsResult,
        dragonflyTasksResult,
        dragonflyPeersResult,
      ] = dragonflyResults;

      if (dragonflyStatusResult.status === "fulfilled") {
        setDragonflyStatus(dragonflyStatusResult.value);
      } else {
        console.warn("Dragonfly status unavailable:", dragonflyStatusResult.reason);
        setDragonflyStatus(null);
      }

      if (dragonflyMetricsResult.status === "fulfilled") {
        setDragonflyMetrics(dragonflyMetricsResult.value);
      } else {
        setDragonflyMetrics(null);
      }

      if (dragonflyTasksResult.status === "fulfilled") {
        setDragonflyTasks(dragonflyTasksResult.value);
      } else {
        setDragonflyTasks([]);
      }

      if (dragonflyPeersResult.status === "fulfilled") {
        setDragonflyPeers(dragonflyPeersResult.value);
      } else {
        setDragonflyPeers([]);
      }
    }

    if (kedaResults) {
      const [kedaStatusResult, kedaScaledObjectsResult, kedaScaledJobsResult] =
        kedaResults;

      if (kedaStatusResult.status === "fulfilled") {
        setKedaStatus(kedaStatusResult.value);
      } else {
        console.warn("KEDA status unavailable:", kedaStatusResult.reason);
        setKedaStatus(null);
      }

      if (kedaScaledObjectsResult.status === "fulfilled") {
        setKedaScaledObjects(kedaScaledObjectsResult.value);
      } else {
        setKedaScaledObjects([]);
      }

      if (kedaScaledJobsResult.status === "fulfilled") {
        setKedaScaledJobs(kedaScaledJobsResult.value);
      } else {
        setKedaScaledJobs([]);
      }
    }

    if (elasticStackResults) {
      const [elasticStackResult] = elasticStackResults;

      if (elasticStackResult.status === "fulfilled") {
        setElasticStack(elasticStackResult.value);
      } else {
        // Preserve the last successful value so transient refresh failures do not
        // push the Elastic Stack tab back into a loading-like null state.
        console.warn("Elastic Stack status unavailable:", elasticStackResult.reason);
      }
    }

    if (thanosResults) {
      const [thanosResult] = thanosResults;

      if (thanosResult.status === "fulfilled") {
        setThanosData(thanosResult.value);
      } else {
        // Preserve last successful value on transient failures.
        console.warn("Thanos status unavailable:", thanosResult.reason);
      }
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData(activeTab === "dragonfly", activeTab === "keda", activeTab === "elastic-stack", activeTab === "thanos");
    const interval = setInterval(
      () => void fetchData(activeTab === "dragonfly", activeTab === "keda", activeTab === "elastic-stack", activeTab === "thanos"),
      10000,
    );
    return () => clearInterval(interval);
  }, [fetchData, activeTab]);

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
          <MetricsBackendBadge backendType={thanosData?.backendType} />
          <Badge variant="outline" className="text-xs">
            Updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => void fetchData(activeTab === "dragonfly", activeTab === "keda", activeTab === "elastic-stack", activeTab === "thanos")}>
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
        {activeTab === "metrics" && <MetricsTab summary={summary} longTermEnabled={thanosData?.longTermEnabled} />}
        {activeTab === "traces" && <TracesTab />}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "dragonfly" && (
          <DragonflyTab
            status={dragonflyStatus}
            metrics={dragonflyMetrics}
            tasks={dragonflyTasks}
            peers={dragonflyPeers}
          />
        )}
        {activeTab === "keda" && (
          <KedaTab
            status={kedaStatus}
            scaledObjects={kedaScaledObjects}
            scaledJobs={kedaScaledJobs}
          />
        )}
        {activeTab === "elastic-stack" && (
          <ElasticStackTab data={elasticStack} />
        )}
        {activeTab === "thanos" && (
          <ThanosTab data={thanosData} />
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
