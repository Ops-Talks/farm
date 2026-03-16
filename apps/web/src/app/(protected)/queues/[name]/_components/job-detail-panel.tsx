"use client";

import type { JobInfo } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeVariant, formatTimestamp, formatDuration } from "./queue-utils";

interface JobDetailPanelProps {
  job: JobInfo;
  onRetry: (jobId: string) => void;
  retrying: boolean;
}

export function JobDetailPanel({ job, onRetry, retrying }: JobDetailPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Job #{job.id}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
            {job.status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRetry(job.id);
                }}
                disabled={retrying}
              >
                {retrying ? "Retrying..." : "Retry"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Created</div>
            <div>{formatTimestamp(job.timestamp)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Processed</div>
            <div>{formatTimestamp(job.processedOn)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Finished</div>
            <div>{formatTimestamp(job.finishedOn)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Duration</div>
            <div>{formatDuration(job.processedOn, job.finishedOn)}</div>
          </div>
        </div>

        <div>
          <div className="text-muted-foreground">Attempts</div>
          <div>{job.attemptsMade}</div>
        </div>

        <div>
          <div className="mb-1 text-muted-foreground">Payload</div>
          <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(job.data, null, 2)}
          </pre>
        </div>

        {job.returnValue !== undefined && job.returnValue !== null && (
          <div>
            <div className="mb-1 text-muted-foreground">Result</div>
            <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(job.returnValue, null, 2)}
            </pre>
          </div>
        )}

        {job.failedReason && (
          <div>
            <div className="mb-1 text-muted-foreground">Error</div>
            <pre className="max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
              {job.failedReason}
            </pre>
          </div>
        )}

        {job.stacktrace && job.stacktrace.length > 0 && (
          <div>
            <div className="mb-1 text-muted-foreground">Stack Trace</div>
            <pre className="max-h-60 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
              {job.stacktrace.join("\n")}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
