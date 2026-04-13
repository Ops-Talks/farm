"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { iac } from "@/lib/api-client";
import type { IacRun } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative time string (e.g., "3m ago").
 */
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Formats an ISO date string to a locale datetime (e.g., "Jan 1, 2024, 10:00 AM").
 */
function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remaining = secs % 60;
  return `${mins}m ${remaining}s`;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function RunStatusIcon({ status }: { status: string }) {
  if (status === "succeeded") {
    return (
      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" aria-label="Succeeded" />
    );
  }
  if (status === "failed") {
    return (
      <XCircle className="h-5 w-5 text-red-500 shrink-0" aria-label="Failed" />
    );
  }
  return (
    <MinusCircle
      className="h-5 w-5 text-muted-foreground shrink-0"
      aria-label="Cancelled"
    />
  );
}

function RunTypeBadge({ type }: { type: string }) {
  const colour =
    type === "apply"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}
    >
      {type}
    </span>
  );
}

function ResourceChips({
  changes,
}: {
  changes: { add: number; change: number; destroy: number } | null;
}) {
  if (!changes) return null;
  return (
    <span className="flex gap-1 text-xs font-mono">
      {changes.add > 0 && (
        <span className="text-green-600 dark:text-green-400">+{changes.add}</span>
      )}
      {changes.change > 0 && (
        <span className="text-yellow-600 dark:text-yellow-400">
          ~{changes.change}
        </span>
      )}
      {changes.destroy > 0 && (
        <span className="text-red-600 dark:text-red-400">-{changes.destroy}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export function IacStackRunsClient() {
  const params = useParams<{ id: string }>();
  const stackId = params.id;

  const [runs, setRuns] = useState<IacRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = loadedKey !== `${stackId}:${page}`;

  useEffect(() => {
    iac
      .getStackRuns(stackId, page)
      .then((res) => {
        setRuns(res.data);
        setTotal(res.total);
        setLoadedKey(`${stackId}:${page}`);
      })
      .catch(() => {
        setError("Failed to load run history.");
        setLoadedKey(`${stackId}:${page}`);
      });
  }, [stackId, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stack Run History"
        description={`Run timeline for stack ${stackId}`}
      >
        <Link href="/iac">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to IaC
          </Button>
        </Link>
      </PageHeader>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<XCircle className="h-8 w-8 text-red-500" />}
          title="Failed to load"
          description={error}
        />
      )}

      {!loading && !error && runs.length === 0 && (
        <EmptyState
          icon={<MinusCircle className="h-8 w-8 text-muted-foreground" />}
          title="No runs found"
          description="No plan or apply runs have been recorded for this stack."
        />
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="flex flex-col gap-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <RunStatusIcon status={run.status} />

              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <RunTypeBadge type={run.type} />
                  <ResourceChips changes={run.resourceChanges} />
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </span>
                  {run.triggeredBy && (
                    <span className="text-xs text-muted-foreground">
                      by {run.triggeredBy}
                    </span>
                  )}
                  {run.pipelineUrl && (
                    <a
                      href={run.pipelineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      pipeline <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {run.startedAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(run.startedAt)} — {timeAgo(run.startedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} — {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
