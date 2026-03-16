"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pipelines as pipelinesApi } from "@/lib/api-client";
import { subscribe } from "@/lib/ws-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PipelineRun, PipelineStageResult, PipelineLogPayload } from "@/types/api";
import { FarmEvent, PipelineRunStatus } from "@/types/api";

function statusIcon(status: string): string {
  switch (status) {
    case "succeeded":
    case PipelineRunStatus.SUCCEEDED:
      return "✓";
    case "failed":
    case PipelineRunStatus.FAILED:
      return "✗";
    case "running":
    case PipelineRunStatus.RUNNING:
      return "⏳";
    case "waiting_approval":
      return "🔒";
    case "queued":
    case PipelineRunStatus.QUEUED:
      return "⏸";
    case "cancelled":
    case PipelineRunStatus.CANCELLED:
      return "⊘";
    default:
      return "·";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "succeeded":
    case PipelineRunStatus.SUCCEEDED:
      return "text-green-600 dark:text-green-400";
    case "failed":
    case PipelineRunStatus.FAILED:
      return "text-destructive";
    case "running":
    case PipelineRunStatus.RUNNING:
      return "text-blue-600 dark:text-blue-400";
    case "waiting_approval":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function isActiveRun(status: PipelineRunStatus): boolean {
  return status === PipelineRunStatus.RUNNING || status === PipelineRunStatus.QUEUED;
}

interface RunDetailProps {
  pipelineId: string;
  runId: string;
}

export function RunDetail({ pipelineId, runId }: RunDetailProps) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchRun = useCallback(() => {
    pipelinesApi
      .getRun(pipelineId, runId)
      .then((r) => {
        setRun(r);
        // Seed log lines from the persisted logs field
        if (r.logs) {
          setLogLines(r.logs.split("\n").filter(Boolean));
        }
      })
      .catch(() => setRun(null))
      .finally(() => setLoading(false));
  }, [pipelineId, runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  // Auto-scroll to bottom when new log lines arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines]);

  // Subscribe to real-time events when the run is active
  useEffect(() => {
    if (!run || !isActiveRun(run.status)) return;

    const unsubLog = subscribe(
      FarmEvent.PIPELINE_LOG,
      ((payload: PipelineLogPayload) => {
        if (payload.runId !== runId) return;
        const line = `[${payload.stage}] ${payload.message}`;
        setLogLines((prev) => [...prev, line]);
      // The ws-client EventHandler type is a union; cast to satisfy it
      }) as unknown as Parameters<typeof subscribe>[1],
    );

    const unsubRunUpdated = subscribe(
      FarmEvent.PIPELINE_RUN_UPDATED,
      ((payload: PipelineRun) => {
        if (payload.id !== runId) return;
        setRun(payload);
        // If run finished, fetch final state to get complete logs
        if (!isActiveRun(payload.status)) {
          fetchRun();
        }
      // The ws-client EventHandler type is a union; cast to satisfy it
      }) as unknown as Parameters<typeof subscribe>[1],
    );

    return () => {
      unsubLog();
      unsubRunUpdated();
    };
  }, [run, runId, fetchRun]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        Run not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4 animate-in fade-in duration-300">
      {/* Run metadata */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
          {run.id.slice(0, 8)}
        </span>
        <Badge variant="outline" className="capitalize">
          {run.status}
        </Badge>
        {run.startedAt && (
          <span>Started: {new Date(run.startedAt).toLocaleString()}</span>
        )}
        {run.finishedAt && (
          <span>Finished: {new Date(run.finishedAt).toLocaleString()}</span>
        )}
        {run.durationMs !== undefined && (
          <span>
            Duration:{" "}
            {run.durationMs < 1000
              ? `${run.durationMs}ms`
              : `${(run.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Stage results */}
      {run.stageResults && run.stageResults.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-medium">Stage Results</h4>
          <ul className="flex flex-col gap-1">
            {run.stageResults.map((sr: PipelineStageResult) => (
              <li
                key={sr.stageId}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className={statusColor(sr.status)}>{statusIcon(sr.status)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {sr.stageId.slice(0, 8)}
                </span>
                <Badge variant="outline" className="capitalize text-xs">
                  {sr.status}
                </Badge>
                {sr.startedAt && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(sr.startedAt).toLocaleTimeString()}
                  </span>
                )}
                {sr.output && (
                  <span className="hidden sm:block max-w-[200px] truncate text-xs text-muted-foreground">
                    {sr.output}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Log viewer */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Logs</h4>
          {isActiveRun(run.status) && (
            <Badge variant="secondary" className="animate-pulse text-xs">
              Live
            </Badge>
          )}
        </div>
        <pre
          className="max-h-96 overflow-y-auto rounded-lg bg-[#0d1117] p-4 text-xs leading-5 text-green-300 font-mono whitespace-pre-wrap break-all"
          aria-label="Pipeline run logs"
        >
          {logLines.length > 0 ? (
            logLines.join("\n")
          ) : (
            <span className="text-muted-foreground italic">No logs yet.</span>
          )}
          <div ref={logEndRef} />
        </pre>
      </div>
    </div>
  );
}
