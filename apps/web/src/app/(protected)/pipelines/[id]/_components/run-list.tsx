"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pipelines as pipelinesApi } from "@/lib/api-client";
import type { PipelineRun } from "@/types/api";
import { PipelineRunStatus } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All statuses", value: "" },
  { label: "Queued", value: PipelineRunStatus.QUEUED },
  { label: "Running", value: PipelineRunStatus.RUNNING },
  { label: "Succeeded", value: PipelineRunStatus.SUCCEEDED },
  { label: "Failed", value: PipelineRunStatus.FAILED },
  { label: "Cancelled", value: PipelineRunStatus.CANCELLED },
  { label: "Waiting Approval", value: PipelineRunStatus.WAITING_APPROVAL },
];

// ─── Helpers (exported so run-stats.tsx can reuse) ─────────────────────────────

export function formatDuration(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function statusVariant(
  status: PipelineRunStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case PipelineRunStatus.SUCCEEDED:
      return "default";
    case PipelineRunStatus.RUNNING:
      return "secondary";
    case PipelineRunStatus.FAILED:
      return "destructive";
    case PipelineRunStatus.QUEUED:
    case PipelineRunStatus.CANCELLED:
    default:
      return "outline";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RunListProps {
  /** Pipeline to list runs for — the component fetches its own data. */
  pipelineId: string;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  /** Called with two run IDs when the user confirms a comparison. */
  onCompare?: (runIdA: string, runIdB: string) => void;
  /**
   * Increment this key to force a refetch from the parent
   * (e.g. after triggering a new run).
   * Including it in the queryKey causes TanStack Query to treat each new
   * value as a distinct query, triggering an automatic background fetch.
   */
  refreshKey?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RunList({
  pipelineId,
  selectedRunId,
  onSelectRun,
  onCompare,
  refreshKey = 0,
}: RunListProps) {
  // ── Pagination & filter state ─────────────────────────────────────────────
  const [skip, setSkip] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  // ── Compare mode state ────────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  // refreshKey is included in the query key so that incrementing it from the
  // parent (e.g. after triggering a new run) forces an immediate refetch.
  const { data, isLoading } = useQuery({
    queryKey: ["run-list", pipelineId, skip, statusFilter, refreshKey],
    queryFn: () =>
      pipelinesApi.runs.list(pipelineId, {
        skip,
        take: PAGE_SIZE,
        status: statusFilter || undefined,
      }),
  });

  const runs: PipelineRun[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setSkip(0); // reset to first page
    setSelectedForCompare([]); // clear compare selections on filter change
  };

  const handleToggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setSelectedForCompare([]);
  };

  const handleCompareCheck = (runId: string, checked: boolean) => {
    setSelectedForCompare((prev) => {
      if (checked) {
        // enforce maximum of 2 selections
        if (prev.length >= 2) return prev;
        return [...prev, runId];
      }
      return prev.filter((id) => id !== runId);
    });
  };

  // ── Derived pagination values ─────────────────────────────────────────────
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);
  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar: status filter + compare controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Native <select> — no shadcn Select component available in this project */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Filter runs by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Compare toggle — only shown when parent provides onCompare handler */}
        {onCompare && (
          <>
            <Button
              size="sm"
              variant={compareMode ? "secondary" : "outline"}
              onClick={handleToggleCompareMode}
            >
              {compareMode ? "Cancel Compare" : "Compare"}
            </Button>

            {compareMode && selectedForCompare.length === 2 && (
              <Button
                size="sm"
                onClick={() => {
                  // selectedForCompare is guaranteed length 2 by the condition above
                  const [a, b] = selectedForCompare as [string, string];
                  onCompare(a, b);
                }}
              >
                Compare Selected
              </Button>
            )}

            {compareMode && (
              <span className="text-xs text-muted-foreground">
                {selectedForCompare.length}/2 selected
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {statusFilter
            ? `No ${statusFilter} runs found.`
            : "No runs yet. Trigger the pipeline to see run history here."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Checkbox column only visible in compare mode */}
                {compareMode && <TableHead className="w-10" />}
                <TableHead>Run ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Triggered by</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.id}
                  data-selected={selectedRunId === run.id}
                  className="data-[selected=true]:bg-muted/40"
                >
                  {compareMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(run.id)}
                        disabled={
                          !selectedForCompare.includes(run.id) &&
                          selectedForCompare.length >= 2
                        }
                        onChange={(e) =>
                          handleCompareCheck(run.id, e.target.checked)
                        }
                        aria-label={`Select run ${shortId(run.id)} for comparison`}
                        className="cursor-pointer"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="font-mono text-xs">{shortId(run.id)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(run.status)}
                      className="capitalize"
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.triggeredBy}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.startedAt
                      ? new Date(run.startedAt).toLocaleString()
                      : run.createdAt
                        ? new Date(run.createdAt).toLocaleString()
                        : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={selectedRunId === run.id ? "secondary" : "ghost"}
                      onClick={() => onSelectRun(run.id)}
                      aria-label={`View details for run ${shortId(run.id)}`}
                    >
                      {selectedRunId === run.id ? "Hide" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination controls ── */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Runs {pageStart}–{pageEnd} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPrev || isLoading}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasNext || isLoading}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
