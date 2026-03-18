'use client';

// DoraMetricsTab — shows the four DORA engineering metrics as a 2x2 card grid.
// Receives `days` from AnalyticsPageClient so the user's period selection is
// reflected without extra state management here.

import { useQuery } from '@tanstack/react-query';
import { analytics } from '@/lib/api-client';
import type { DoraAnalytics } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Rocket,
  ShieldAlert,
  Clock,
  GitBranch,
} from 'lucide-react';

// ---------- Types -------------------------------------------------------------

interface DoraMetricsTabProps {
  days: number;
}

// ---------- Helpers ----------------------------------------------------------

/** Colour for the Change Failure Rate value based on common DORA thresholds. */
function cfrColour(rate: number): string {
  if (rate < 0.05) return 'text-green-600 dark:text-green-400';
  if (rate <= 0.15) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/** Format a decimal rate as a percentage string e.g. 0.042 → "4.2%" */
function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Format hours — show minutes when < 1h for readability. */
function formatHours(hours: number): string {
  if (hours === 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

// ---------- Loading skeleton -------------------------------------------------

function DoraSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ---------- Individual metric card -------------------------------------------

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  valueClassName?: string;
}

function MetricCard({ title, value, subtitle, icon, valueClassName }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold tabular-nums ${valueClassName ?? ''}`}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ---------- Main component ---------------------------------------------------

export function DoraMetricsTab({ days }: DoraMetricsTabProps) {
  const { data, isLoading, isError } = useQuery<DoraAnalytics>({
    queryKey: ['analytics', 'dora', days],
    queryFn: () => analytics.getDora({ days }),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <DoraSkeleton />;

  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">
        Failed to load DORA metrics.
      </p>
    );
  }

  if (!data) return null;

  const { deploymentFrequency, changeFailureRate, meanTimeToRecovery, leadTimeForChanges } = data;

  // Empty state: no deployment activity at all
  const allZero =
    deploymentFrequency.total === 0 &&
    changeFailureRate.total === 0 &&
    meanTimeToRecovery.samples === 0 &&
    leadTimeForChanges.samples === 0;

  if (allZero) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-16 text-sm text-muted-foreground">
        No deployment data for this period
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Deployment Frequency */}
      <MetricCard
        title="Deployment Frequency"
        value={`${deploymentFrequency.deploymentsPerDay.toFixed(2)}/day`}
        subtitle={`over last ${days} days (${deploymentFrequency.total} total)`}
        icon={<Rocket className="h-4 w-4" />}
      />

      {/* Change Failure Rate */}
      <MetricCard
        title="Change Failure Rate"
        value={formatPct(changeFailureRate.rate)}
        subtitle={`${changeFailureRate.failed} failed of ${changeFailureRate.total} deployments`}
        icon={<ShieldAlert className="h-4 w-4" />}
        valueClassName={cfrColour(changeFailureRate.rate)}
      />

      {/* Mean Time To Recovery */}
      <MetricCard
        title="Mean Time to Recovery"
        value={formatHours(meanTimeToRecovery.avgHours)}
        subtitle={`${meanTimeToRecovery.samples} recovery events measured`}
        icon={<Clock className="h-4 w-4" />}
      />

      {/* Lead Time For Changes */}
      <MetricCard
        title="Lead Time for Changes"
        value={formatHours(leadTimeForChanges.avgHours)}
        subtitle={`${leadTimeForChanges.samples} deployments measured`}
        icon={<GitBranch className="h-4 w-4" />}
      />
    </div>
  );
}
