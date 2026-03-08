"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { queues as queuesApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueInfo, JobInfo } from "@/types/api";

const STATUS_FILTERS = ["all", "active", "completed", "failed", "delayed", "waiting"] as const;

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "active":
      return "secondary";
    default:
      return "outline";
  }
}

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleString();
}

function formatDuration(start: number | undefined, end: number | undefined): string {
  if (!start || !end) return "--";
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function JobDetailPanel({
  job,
  onRetry,
  retrying,
}: {
  job: JobInfo;
  onRetry: (jobId: string) => void;
  retrying: boolean;
}) {
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

export default function QueueDetailPage() {
  const params = useParams();
  const queueName = decodeURIComponent(String(params.name));

  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    (status: string) => {
      const statusParam = status === "all" ? undefined : status;

      Promise.all([
        queuesApi.get(queueName),
        queuesApi.listJobs(queueName, { status: statusParam, limit: 50 }),
      ])
        .then(([info, jobList]) => {
          setQueueInfo(info);
          setJobs(jobList);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load queue data");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [queueName],
  );

  useEffect(() => {
    fetchData(statusFilter);
    const interval = setInterval(() => {
      fetchData(statusFilter);
    }, 15000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchData, statusFilter]);

  const handleRetry = useCallback(
    (jobId: string) => {
      setRetryingId(jobId);
      queuesApi
        .retryJob(queueName, jobId)
        .then(() => {
          fetchData(statusFilter);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Retry failed");
        })
        .finally(() => {
          setRetryingId(null);
        });
    },
    [queueName, fetchData, statusFilter],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/queues">
            <Button variant="ghost" size="sm">Back</Button>
          </Link>
          <h1 className="text-2xl font-bold">{queueName}</h1>
          {queueInfo?.isPaused && <Badge variant="secondary">Paused</Badge>}
        </div>
        <a
          href="/api/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">Bull Board</Button>
        </a>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {queueInfo && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-center sm:grid-cols-7">
              {(
                Object.entries(queueInfo.jobCounts) as [string, number][]
              ).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xl font-semibold">{value}</div>
                  <div className="text-xs capitalize text-muted-foreground">{key}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(s);
            }}
          >
            <span className="capitalize">{s}</span>
          </Button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No jobs found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{jobs.length} jobs</div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Attempts</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Duration</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer border-b hover:bg-muted/30"
                    onClick={() => {
                      setExpandedJob(expandedJob === job.id ? null : job.id);
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{job.id}</td>
                    <td className="px-3 py-2">{job.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="px-3 py-2">{job.attemptsMade}</td>
                    <td className="px-3 py-2 text-xs">{formatTimestamp(job.timestamp)}</td>
                    <td className="px-3 py-2 text-xs">
                      {formatDuration(job.processedOn, job.finishedOn)}
                    </td>
                    <td className="px-3 py-2">
                      {job.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(job.id);
                          }}
                          disabled={retryingId === job.id}
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedJob && (
            <div className="mt-4">
              {jobs
                .filter((j) => j.id === expandedJob)
                .map((job) => (
                  <JobDetailPanel
                    key={job.id}
                    job={job}
                    onRetry={handleRetry}
                    retrying={retryingId === job.id}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
