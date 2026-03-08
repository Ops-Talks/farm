"use client";

import { useCallback, useEffect, useState } from "react";
import { health as healthApi, observability as obsApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthStatus, ObservabilitySummary } from "@/types/api";

type TabId = "health" | "metrics" | "traces";

const TABS: { id: TabId; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "metrics", label: "Metrics" },
  { id: "traces", label: "Traces" },
];

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

function formatLatency(seconds: number): string {
  if (seconds === 0) return "--";
  if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}us`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`;
  return `${seconds.toFixed(2)}s`;
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

// -- Health Tab --

function HealthTab({
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
                  {formatBytes(summary.memory.heapUsed)}
                </div>
                <div className="text-xs text-muted-foreground">
                  of {formatBytes(summary.memory.heapTotal)} allocated
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
                  {formatBytes(summary.memory.rss)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Individual health checks */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Health Checks</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(healthData.details).map(([key, detail]) => (
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
      </div>
    </div>
  );
}

// -- Metrics Tab --

function MetricsTab({ summary }: { summary: ObservabilitySummary | null }) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-muted-foreground">
          Metrics unavailable. The API may not be running.
        </CardContent>
      </Card>
    );
  }

  const errorRate =
    summary.totalRequests > 0
      ? ((summary.requestsByStatus["5xx"] / summary.totalRequests) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      {/* Key metrics cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {summary.totalRequests.toLocaleString()}
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
            <div
              className={`text-2xl font-semibold ${
                parseFloat(errorRate) > 5
                  ? "text-red-600"
                  : parseFloat(errorRate) > 1
                    ? "text-yellow-600"
                    : "text-green-600"
              }`}
            >
              {errorRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              p95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatLatency(summary.latencyPercentiles.p95)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              p99 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatLatency(summary.latencyPercentiles.p99)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold text-green-600">
                {summary.requestsByStatus["2xx"].toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">2xx Success</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-yellow-600">
                {summary.requestsByStatus["4xx"].toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">4xx Client</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-red-600">
                {summary.requestsByStatus["5xx"].toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">5xx Server</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-muted-foreground">
                {summary.requestsByStatus.other.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Other</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latency percentiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latency Percentiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold">
                {formatLatency(summary.latencyPercentiles.p50)}
              </div>
              <div className="text-xs text-muted-foreground">p50</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {formatLatency(summary.latencyPercentiles.p90)}
              </div>
              <div className="text-xs text-muted-foreground">p90</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {formatLatency(summary.latencyPercentiles.p95)}
              </div>
              <div className="text-xs text-muted-foreground">p95</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {formatLatency(summary.latencyPercentiles.p99)}
              </div>
              <div className="text-xs text-muted-foreground">p99</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grafana link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grafana Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Detailed request rate, latency heatmaps, and error breakdowns by route
            are available in the pre-configured Grafana dashboard.
          </p>
          <a
            href={summary.grafanaUrl || "http://localhost:3001"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">Open Grafana Dashboard</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Traces Tab --

function TracesTab({ summary }: { summary: ObservabilitySummary | null }) {
  const grafanaUrl = summary?.grafanaUrl || "http://localhost:3001";
  const tempoExploreUrl = `${grafanaUrl}/explore?orgId=1&left=%7B%22datasource%22:%22Tempo%22%7D`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distributed Tracing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Farm uses OpenTelemetry to automatically trace HTTP requests, Express
            route handlers, and TypeORM database queries. Traces are collected by
            Grafana Tempo and can be explored in Grafana.
          </p>

          <div className="rounded border p-4 text-sm">
            <h3 className="mb-2 font-medium">How to use</h3>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>
                Start the observability stack:{" "}
                <code className="rounded bg-muted px-1">make up-observability</code>
              </li>
              <li>
                Set <code className="rounded bg-muted px-1">OTEL_ENABLED=true</code> in
                your environment
              </li>
              <li>Open Grafana Explore and select the Tempo data source</li>
              <li>Search traces by service name, duration, or status code</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <a href={tempoExploreUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Explore Traces in Grafana</Button>
            </a>
            <a href="http://localhost:3200" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Tempo API</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrumented Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded border p-3">
              <div className="font-medium">HTTP / Express</div>
              <div className="text-xs text-muted-foreground">
                Incoming and outgoing HTTP requests with route, method, and status
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">TypeORM / Database</div>
              <div className="text-xs text-muted-foreground">
                SQL queries with statement text and duration
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">BullMQ / Queues</div>
              <div className="text-xs text-muted-foreground">
                Job processing with queue name, job ID, and result
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Main Page --

export default function ObservabilityPage() {
  const [activeTab, setActiveTab] = useState<TabId>("health");
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    Promise.all([
      healthApi.check().catch(() => null),
      obsApi.summary().catch(() => null),
    ])
      .then(([h, s]) => {
        setHealthData(h);
        setSummary(s);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Observability</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Observability</h1>
        <div className="flex gap-2">
          <a href="/api/metrics" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              Raw Metrics
            </Button>
          </a>
          <a
            href={summary?.grafanaUrl || "http://localhost:3001"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Grafana
            </Button>
          </a>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab(tab.id);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "health" && (
        <HealthTab healthData={healthData} summary={summary} />
      )}
      {activeTab === "metrics" && <MetricsTab summary={summary} />}
      {activeTab === "traces" && <TracesTab summary={summary} />}
    </div>
  );
}
