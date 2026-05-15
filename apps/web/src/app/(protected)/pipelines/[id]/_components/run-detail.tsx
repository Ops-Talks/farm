"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { pipelines as pipelinesApi, ApiError } from "@/lib/api-client";
import { subscribe } from "@/lib/ws-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import type { Pipeline, PipelineRun, PipelineStageResult, PipelineLogPayload } from "@/types/api";
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
      return "⏸";
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

// Returns true when WS subscriptions should be active (run is in-progress or
// paused awaiting approval — any state where an external event can change it).
function shouldSubscribe(status: PipelineRunStatus): boolean {
  return (
    status === PipelineRunStatus.RUNNING ||
    status === PipelineRunStatus.QUEUED ||
    status === PipelineRunStatus.WAITING_APPROVAL
  );
}

// Returns true when the run is actively executing and producing live log lines.
function isLiveLogging(status: PipelineRunStatus): boolean {
  return status === PipelineRunStatus.RUNNING || status === PipelineRunStatus.QUEUED;
}

interface RunDetailProps {
  pipelineId: string;
  runId: string;
  // Optional pipeline definition — used to resolve stage names in the
  // approval banner. If absent, the banner falls back to the stageId.
  pipeline?: Pipeline;
}

export function RunDetail({ pipelineId, runId, pipeline }: RunDetailProps) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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

  // Subscribe to real-time events while the run can still change state.
  // This includes WAITING_APPROVAL so we pick up approve/reject events from
  // other users without requiring a manual page refresh.
  useEffect(() => {
    if (!run || !shouldSubscribe(run.status)) return;

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
        // Once the run reaches a terminal / no-longer-subscribable state,
        // fetch the full record to get persisted logs and final results.
        if (!shouldSubscribe(payload.status)) {
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

  // -- Action error helper --

  const handleActionError = useCallback((err: unknown) => {
    const message =
      err instanceof ApiError
        ? Array.isArray(err.body.message)
          ? err.body.message.join(", ")
          : err.body.message
        : "Action failed";
    setActionError(message);
    toast.error(message);
  }, []);

  // -- Run lifecycle action handlers --

  const handleApprove = useCallback(() => {
    if (!run) return;
    setActionLoading(true);
    setActionError(null);
    pipelinesApi
      .approveRun(pipelineId, run.id)
      .then((updated) => {
        setRun(updated);
        toast.success("Run approved — continuing execution");
      })
      .catch(handleActionError)
      .finally(() => setActionLoading(false));
  }, [run, pipelineId, handleActionError]);

  const handleReject = useCallback(() => {
    if (!run) return;
    setActionLoading(true);
    setActionError(null);
    pipelinesApi
      .rejectRun(pipelineId, run.id)
      .then((updated) => {
        setRun(updated);
        toast.success("Run rejected");
      })
      .catch(handleActionError)
      .finally(() => setActionLoading(false));
  }, [run, pipelineId, handleActionError]);

  const handleCancel = useCallback(() => {
    if (!run) return;
    setActionLoading(true);
    setActionError(null);
    pipelinesApi
      .cancelRun(pipelineId, run.id)
      .then((updated) => {
        setRun(updated);
        toast.success("Run cancelled");
      })
      .catch(handleActionError)
      .finally(() => setActionLoading(false));
  }, [run, pipelineId, handleActionError]);

  const handleRetrigger = useCallback(() => {
    setActionLoading(true);
    setActionError(null);
    pipelinesApi
      .retrigger(pipelineId)
      .then((newRun) => {
        toast.success(`New run triggered — ${newRun.id.slice(0, 8)}`);
      })
      .catch(handleActionError)
      .finally(() => setActionLoading(false));
  }, [pipelineId, handleActionError]);

  // Find the stage currently waiting for approval (used in the banner).
  // These hooks must be called before any early return.
  const waitingStageResult = useMemo(
    () =>
      run?.stageResults?.find(
        (sr) => sr.status === PipelineRunStatus.WAITING_APPROVAL || sr.status === "waiting",
      ),
    [run?.stageResults],
  );
  const waitingStage = useMemo(
    () => pipeline?.stages?.find((s) => s.id === waitingStageResult?.stageId),
    [pipeline?.stages, waitingStageResult?.stageId],
  );

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

  // Determine which action button group to show.
  const showApprovalActions = run.status === PipelineRunStatus.WAITING_APPROVAL;
  const showCancelAction =
    run.status === PipelineRunStatus.RUNNING || run.status === PipelineRunStatus.QUEUED;
  const showRetriggerAction =
    run.status === PipelineRunStatus.FAILED ||
    run.status === PipelineRunStatus.CANCELLED ||
    run.status === PipelineRunStatus.SUCCEEDED;

  return (
    <div className="flex flex-col gap-4 pt-4 animate-in fade-in duration-300">
      {/* Run metadata row with inline action buttons */}
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

        {/* Action buttons — contextual based on current run status */}
        {(showCancelAction || showRetriggerAction) && (
          <div className="ml-auto flex items-center gap-2">
            {showCancelAction && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={handleCancel}
                aria-label="Cancel run"
              >
                {actionLoading ? "Cancelling..." : "Cancel"}
              </Button>
            )}
            {showRetriggerAction && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={handleRetrigger}
                aria-label="Retrigger pipeline"
              >
                {actionLoading ? "Triggering..." : "Retrigger"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Inline error message from a failed action */}
      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {/* Approval banner — shown when the run is waiting for a human decision */}
      {showApprovalActions && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 p-4 flex flex-col gap-3 dark:bg-amber-950/20 dark:border-amber-800"
          role="region"
          aria-label="Approval required"
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              This run is waiting for manual approval to continue.
            </p>
            {(waitingStage ?? waitingStageResult) && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Stage:{" "}
                <span className="font-medium">
                  &quot;{waitingStage?.name ?? waitingStageResult?.stageId}&quot;
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleApprove}
              aria-label="Approve and continue run"
              className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              {actionLoading ? "Processing..." : "Approve and Continue"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading}
              onClick={handleReject}
              aria-label="Reject run"
            >
              Reject
            </Button>
          </div>
        </div>
      )}

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
                {sr.externalRunUrl && (
                  <a
                    href={sr.externalRunUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open external CI run"
                    className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    CI Run
                  </a>
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
          {isLiveLogging(run.status) && (
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
