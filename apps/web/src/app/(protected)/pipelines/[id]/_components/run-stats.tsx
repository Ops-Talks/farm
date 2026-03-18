"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pipelines as pipelinesApi } from "@/lib/api-client";
import type { RunStats } from "@/lib/api-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

/** Simple relative-time formatter — no external dependency required. */
function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return "Never";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? "s" : ""} ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

/** Returns a Tailwind text-color class based on the success rate threshold. */
function successRateColor(rate: number): string {
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RunStatsPanelProps {
  pipelineId: string;
}

export function RunStatsPanel({ pipelineId }: RunStatsPanelProps) {
  // useQuery replaces the useState+useEffect fetch pattern.
  // The query is keyed by pipelineId so it automatically refetches
  // whenever the panel is shown for a different pipeline.
  const { data: stats, isLoading } = useQuery<RunStats>({
    queryKey: ["run-stats", pipelineId],
    queryFn: () => pipelinesApi.runs.stats(pipelineId),
  });

  // ── Loading skeleton: 4 equal-width placeholder cards ──
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Silently hide if the fetch failed — avoid blocking the run list
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* ── 1. Total Runs ── */}
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>

      {/* ── 2. Success Rate — color-coded by threshold ── */}
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className={`text-2xl font-bold ${successRateColor(stats.successRate)}`}>
            {stats.successRate.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* ── 3. Average Duration ── */}
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Avg Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-2xl font-bold">{formatDuration(stats.avgDurationMs)}</p>
        </CardContent>
      </Card>

      {/* ── 4. Last Run — relative time ── */}
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Last Run
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm font-medium leading-8">
            {formatRelativeTime(stats.lastRunAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
