"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { queues as queuesApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueInfo, JobInfo } from "@/types/api";
import { JobList } from "./job-list";

export function QueueDetailClient() {
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
          toast.success("Job queued for retry");
          fetchData(statusFilter);
        })
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Retry failed");
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
      {/* Header: back link, queue name, paused badge, Bull Board link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/queues">
            <Button variant="ghost" size="sm">Back</Button>
          </Link>
          <h1 className="text-2xl font-bold">{queueName}</h1>
          {queueInfo?.isPaused && <Badge variant="secondary">Paused</Badge>}
        </div>
        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">Bull Board</Button>
        </a>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Queue stats */}
      {queueInfo && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-center sm:grid-cols-7">
              {(Object.entries(queueInfo.jobCounts) as [string, number][]).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xl font-semibold">{value}</div>
                  <div className="text-xs capitalize text-muted-foreground">{key}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs table with filter controls */}
      <JobList
        jobs={jobs}
        statusFilter={statusFilter}
        expandedJob={expandedJob}
        retryingId={retryingId}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
        }}
        onExpandJob={(jobId) => {
          setExpandedJob(jobId);
        }}
        onRetry={handleRetry}
      />
    </div>
  );
}
