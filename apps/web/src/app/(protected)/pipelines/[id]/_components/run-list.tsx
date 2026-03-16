"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PipelineRun } from "@/types/api";
import { PipelineRunStatus } from "@/types/api";

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

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

interface RunListProps {
  runs: PipelineRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

export function RunList({ runs, selectedRunId, onSelectRun }: RunListProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No runs yet. Trigger the pipeline to see run history here.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell>
                <span className="font-mono text-xs">{shortId(run.id)}</span>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(run.status)} className="capitalize">
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
  );
}
