"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { observability } from "@/lib/api-client";
import type { ObservabilitySummary, PrometheusResult } from "@/types/api";

function formatLatency(seconds: number): string {
  if (seconds === 0) return "--";
  if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}us`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`;
  return `${seconds.toFixed(2)}s`;
}

// ---- MiniLineChart — pure SVG, no library ----

interface MiniLineChartProps {
  data: [number, string][]; // [unix timestamp, value]
  height?: number;
  label?: string;
}

export const MiniLineChart = memo(function MiniLineChart({ data, height = 80, label }: MiniLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded bg-muted text-xs text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const width = 400;
  const padX = 36;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const values = data.map(([, v]) => parseFloat(v));
  const times = data.map(([t]) => t);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) => padX + ((t - minTime) / timeRange) * chartW;
  const toY = (v: number) => padY + chartH - ((v - minVal) / valRange) * chartH;

  const points = data.map(([t, v]) => `${toX(t)},${toY(parseFloat(v))}`).join(" ");

  const formatNum = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return n.toFixed(2);
  };

  const formatTime = (t: number) => {
    const d = new Date(t * 1000);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div>
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      <svg
        viewBox={`0 0 ${width} ${height + 16}`}
        className="w-full"
        style={{ height: height + 16 }}
        aria-label="Time series chart"
      >
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = padY + frac * chartH;
          const val = maxVal - frac * valRange;
          return (
            <g key={frac}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <text
                x={padX - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {formatNum(val)}
              </text>
            </g>
          );
        })}

        {/* Polyline */}
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Area fill */}
        <polygon
          points={`${toX(times[0]!)},${toY(minVal)} ${points} ${toX(times[times.length - 1]!)},${toY(minVal)}`}
          fill="#6366f1"
          fillOpacity={0.08}
        />

        {/* X-axis labels */}
        {[0, data.length - 1].map((idx) => (
          <text
            key={idx}
            x={toX(times[idx]!)}
            y={height + 14}
            textAnchor={idx === 0 ? "start" : "end"}
            fontSize={9}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {formatTime(times[idx]!)}
          </text>
        ))}
      </svg>
    </div>
  );
});

// ---- PromQLChartCard ----

interface PromQLChartCardProps {
  title: string;
  defaultQuery: string;
}

export const PromQLChartCard = memo(function PromQLChartCard({ title, defaultQuery }: PromQLChartCardProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [inputQuery, setInputQuery] = useState(defaultQuery);
  const [results, setResults] = useState<PrometheusResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [ran, setRan] = useState(false);

  const runQuery = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    setQuery(inputQuery);
    const end = Math.floor(Date.now() / 1000);
    const start = end - 3600; // last 1 hour
    const step = 60; // 60s step
    try {
      const res = await observability.queryRange(inputQuery, start, end, step);
      if (!res.data) {
        setUnavailable(true);
        setResults([]);
      } else {
        setResults(res.data.result ?? []);
      }
    } catch {
      setUnavailable(true);
      setResults([]);
    } finally {
      setLoading(false);
      setRan(true);
    }
  }, [inputQuery]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="PromQL query…"
            className="font-mono text-xs"
            onKeyDown={(e) => e.key === "Enter" && runQuery()}
          />
          <Button size="sm" onClick={runQuery} disabled={loading}>
            {loading ? "…" : "Run"}
          </Button>
        </div>

        {loading && <Skeleton className="h-24 w-full" />}

        {!loading && unavailable && (
          <div className="flex items-center justify-center rounded border border-dashed p-6 text-sm text-muted-foreground">
            Prometheus not available
          </div>
        )}

        {!loading && !unavailable && ran && results.length === 0 && (
          <div className="flex items-center justify-center rounded border border-dashed p-6 text-sm text-muted-foreground">
            No data
          </div>
        )}

        {!loading && !unavailable && results.length > 0 && (
          <div className="space-y-4">
            {results.slice(0, 5).map((r, i) => {
              const metricLabel =
                Object.entries(r.metric)
                  .filter(([k]) => k !== "__name__")
                  .map(([k, v]) => `${k}="${v}"`)
                  .join(", ") || query;
              return (
                <MiniLineChart
                  key={i}
                  data={r.values}
                  label={metricLabel}
                  height={80}
                />
              );
            })}
          </div>
        )}

        {!ran && !loading && (
          <div className="flex items-center justify-center rounded border border-dashed p-6 text-sm text-muted-foreground">
            Press &quot;Run&quot; to execute the query
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---- MetricsTab ----

export function MetricsTab({
  summary,
}: {
  summary: ObservabilitySummary | null;
}) {
  // Estimate requests per second (total / uptime).
  // Hooks must be called unconditionally, before any early return.
  const rps = useMemo(
    () =>
      summary && summary.uptime > 0 ? summary.totalRequests / summary.uptime : 0,
    [summary],
  );

  // Calculate error rate (5xx / total)
  const total5xx = useMemo(
    () => summary?.requestsByStatus?.["5xx"] ?? 0,
    [summary],
  );
  const errorRate = useMemo(
    () => (summary && summary.totalRequests > 0 ? total5xx / summary.totalRequests : 0),
    [summary, total5xx],
  );

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Request Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {rps.toFixed(2)} req/s
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {summary.totalRequests}
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
            <div className="text-2xl font-semibold">
              {(errorRate * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Total Errors: {total5xx}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              P95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatLatency(summary.latencyPercentiles.p95)}
            </div>
            <div className="text-xs text-muted-foreground">
              P50: {formatLatency(summary.latencyPercentiles.p50)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.requestsByStatus).map(
              ([status, count]) => {
                const max = Math.max(...Object.values(summary.requestsByStatus));
                const percent = (count / (max || 1)) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono uppercase">{status}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${status === "5xx" ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Metrics — PromQL charts */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Live Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <PromQLChartCard
            title="HTTP Request Rate"
            defaultQuery="rate(http_requests_total[5m])"
          />
          <PromQLChartCard
            title="Memory Usage"
            defaultQuery="process_resident_memory_bytes"
          />
        </div>
      </div>
    </div>
  );
}
