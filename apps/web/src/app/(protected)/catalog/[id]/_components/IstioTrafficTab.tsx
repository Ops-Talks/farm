'use client';

// IstioTrafficTab — shows Istio traffic metrics (RPS, Error Rate, Latency)
// for a catalog component. Fetches data from the Istio metrics API endpoints.
// FARM-S156

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { istio as istioApi } from '@/lib/api-client';
import type { CatalogComponent, IstioMetricsTimeseries } from '@/types/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(value: number, unit?: string): string {
  const rounded = Math.round(value * 1000) / 1000;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function latestValue(series: IstioMetricsTimeseries): string {
  const last = series.timeseries[series.timeseries.length - 1];
  if (!last) return '—';
  return formatValue(last.value);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function IstioTrafficSkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="istio-traffic-skeleton">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse rounded-lg border p-4 space-y-2">
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-8 w-1/3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border p-4 space-y-2">
        <div className="h-4 w-1/4 bg-gray-200 rounded" />
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-3 w-full bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric summary card
// ---------------------------------------------------------------------------

interface MetricSummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  testId: string;
}

function MetricSummaryCard({ title, value, subtitle, testId }: MetricSummaryCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Timeseries table
// ---------------------------------------------------------------------------

interface MetricsTableProps {
  series: IstioMetricsTimeseries;
  title: string;
  unit?: string;
  testId: string;
}

function MetricsTable({ series, title, unit, testId }: MetricsTableProps) {
  const rows = series.timeseries.slice(-10); // last 10 data points

  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono">{series.query}</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No data points available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-right py-1 font-medium text-muted-foreground">
                    Value{unit ? ` (${unit})` : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((point) => (
                  <tr key={point.timestamp} className="border-b last:border-0">
                    <td className="py-1 pr-4 text-muted-foreground font-mono">
                      {formatTimestamp(point.timestamp)}
                    </td>
                    <td className="py-1 text-right font-mono">
                      {formatValue(point.value, unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface IstioTrafficTabProps {
  component: CatalogComponent;
}

export function IstioTrafficTab({ component }: IstioTrafficTabProps) {
  const namespace = component.namespace ?? 'default';
  const queryParams = { service: component.name, namespace, range: '1h' };

  const rpsQuery = useQuery({
    queryKey: ['istio-metrics-rps', component.name, namespace],
    queryFn: () => istioApi.getMetricsRps(queryParams),
    retry: false,
  });

  const errorRateQuery = useQuery({
    queryKey: ['istio-metrics-error-rate', component.name, namespace],
    queryFn: () => istioApi.getMetricsErrorRate(queryParams),
    retry: false,
  });

  const latencyQuery = useQuery({
    queryKey: ['istio-metrics-latency', component.name, namespace],
    queryFn: () => istioApi.getMetricsLatency(queryParams),
    retry: false,
  });

  const isLoading = rpsQuery.isLoading || errorRateQuery.isLoading || latencyQuery.isLoading;
  const allFailed = rpsQuery.isError && errorRateQuery.isError && latencyQuery.isError;

  if (isLoading) {
    return <IstioTrafficSkeleton />;
  }

  if (allFailed) {
    return (
      <EmptyState
        title="Istio is not installed in this cluster"
        description="Traffic metrics require Istio service mesh to be installed and configured."
        icon={<Activity className="h-6 w-6 text-muted-foreground" />}
      />
    );
  }

  const rps = rpsQuery.data;
  const errorRate = errorRateQuery.data;
  const latency = latencyQuery.data;

  // Compute the latest P99 value for the summary card
  const p99Latest = latency?.p99
    ? latestValue(latency.p99)
    : '—';

  return (
    <div className="space-y-6 pt-4">
      {/* ── Summary stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricSummaryCard
          title="Requests / Second"
          value={rps ? latestValue(rps) : '—'}
          subtitle="Latest RPS (1h window)"
          testId="istio-metric-rps"
        />
        <MetricSummaryCard
          title="Error Rate"
          value={errorRate ? `${latestValue(errorRate)}%` : '—'}
          subtitle="Latest error rate (1h window)"
          testId="istio-metric-error-rate"
        />
        <MetricSummaryCard
          title="Latency P99"
          value={p99Latest !== '—' ? `${p99Latest} ms` : '—'}
          subtitle="99th percentile (1h window)"
          testId="istio-metric-latency-p99"
        />
      </div>

      {/* ── Timeseries tables ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {rps && (
          <MetricsTable
            series={rps}
            title="Requests Per Second"
            unit="req/s"
            testId="istio-rps-table"
          />
        )}
        {errorRate && (
          <MetricsTable
            series={errorRate}
            title="Error Rate"
            unit="%"
            testId="istio-error-rate-table"
          />
        )}
        {latency && (
          <>
            <MetricsTable
              series={latency.p50}
              title="Latency P50"
              unit="ms"
              testId="istio-latency-p50-table"
            />
            <MetricsTable
              series={latency.p95}
              title="Latency P95"
              unit="ms"
              testId="istio-latency-p95-table"
            />
            <MetricsTable
              series={latency.p99}
              title="Latency P99"
              unit="ms"
              testId="istio-latency-p99-table"
            />
          </>
        )}
      </div>
    </div>
  );
}
