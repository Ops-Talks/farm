"use client";

import { useState, useEffect, useCallback } from "react";
import { observability } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { JaegerTrace } from "@/types/api";
import { TraceWaterfall } from "./trace-waterfall";

const TIME_RANGES = [
  { label: "15m", value: "1000" },
  { label: "1h", value: "3600" },
  { label: "3h", value: "10800" },
  { label: "24h", value: "86400" },
] as const;

function formatDuration(us: number): string {
  if (us >= 1_000_000) return `${(us / 1_000_000).toFixed(2)}s`;
  if (us >= 1_000) return `${(us / 1_000).toFixed(2)}ms`;
  return `${us}\u00b5s`;
}

function getTraceService(trace: JaegerTrace): string {
  const firstSpan = trace.spans[0];
  if (!firstSpan) return "—";
  return trace.processes[firstSpan.processID]?.serviceName ?? "—";
}

function getTraceOperation(trace: JaegerTrace): string {
  return trace.spans[0]?.operationName ?? "—";
}

function getTraceDuration(trace: JaegerTrace): number {
  if (trace.spans.length === 0) return 0;
  const start = Math.min(...trace.spans.map((s) => s.startTime));
  const end = Math.max(...trace.spans.map((s) => s.startTime + s.duration));
  return end - start;
}

function getTraceStartTime(trace: JaegerTrace): number {
  if (trace.spans.length === 0) return 0;
  return Math.min(...trace.spans.map((s) => s.startTime));
}

export function TracesTab() {
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [lookback, setLookback] = useState<string>("3600");
  const [traces, setTraces] = useState<JaegerTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  // Fetch services on mount
  useEffect(() => {
    observability
      .getTraceServices()
      .then((res) => setServices(res.data ?? []))
      .catch(() => setUnavailable(true))
      .finally(() => setServicesLoading(false));
  }, []);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const params: { service?: string; limit?: number; lookback?: string } = {
        limit: 50,
        lookback: `${lookback}s`,
      };
      if (selectedService !== "all") params.service = selectedService;
      const res = await observability.getTraces(params);
      if (res.data === null) {
        setUnavailable(true);
        setTraces([]);
      } else {
        setTraces(res.data ?? []);
      }
    } catch {
      setUnavailable(true);
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, [selectedService, lookback]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Service:</label>
          {servicesLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Range:</span>
          {TIME_RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={lookback === r.value ? "secondary" : "ghost"}
              onClick={() => setLookback(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <Button size="sm" onClick={fetchTraces} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {/* Body */}
      {unavailable && (
        <EmptyState
          title="Jaeger not available"
          description="The tracing backend is currently unreachable. Check your Jaeger configuration."
        />
      )}

      {!unavailable && loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!unavailable && !loading && traces.length === 0 && (
        <EmptyState
          title="No traces found"
          description="Try adjusting the service filter or time range."
        />
      )}

      {!unavailable && !loading && traces.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {traces.length} trace{traces.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Trace ID</th>
                    <th className="px-4 py-2 text-left font-medium">Service</th>
                    <th className="px-4 py-2 text-left font-medium">Operation</th>
                    <th className="px-4 py-2 text-left font-medium">Duration</th>
                    <th className="px-4 py-2 text-left font-medium">Spans</th>
                    <th className="px-4 py-2 text-left font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((trace) => {
                    const isExpanded = expandedTraceId === trace.traceID;
                    return (
                      <>
                        <tr
                          key={trace.traceID}
                          className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() =>
                            setExpandedTraceId(
                              isExpanded ? null : trace.traceID,
                            )
                          }
                        >
                          <td className="px-4 py-2 font-mono text-xs">
                            {trace.traceID.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {getTraceService(trace)}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono max-w-[200px] truncate">
                            {getTraceOperation(trace)}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono">
                            {formatDuration(getTraceDuration(trace))}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {trace.spans.length}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {new Date(
                              getTraceStartTime(trace) / 1000,
                            ).toLocaleTimeString()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${trace.traceID}-expanded`}>
                            <td colSpan={6} className="px-4 pb-3">
                              <TraceWaterfall traceId={trace.traceID} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
