"use client";

import type { JobInfo } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { statusBadgeVariant, formatTimestamp, formatDuration } from "./queue-utils";
import { JobDetailPanel } from "./job-detail-panel";

const STATUS_FILTERS = ["all", "active", "completed", "failed", "delayed", "waiting"] as const;

interface JobListProps {
  jobs: JobInfo[];
  statusFilter: string;
  expandedJob: string | null;
  retryingId: string | null;
  onStatusFilterChange: (status: string) => void;
  onExpandJob: (jobId: string | null) => void;
  onRetry: (jobId: string) => void;
}

export function JobList({
  jobs,
  statusFilter,
  expandedJob,
  retryingId,
  onStatusFilterChange,
  onExpandJob,
  onRetry,
}: JobListProps) {
  return (
    <div className="space-y-4">
      {/* Status filter buttons */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onStatusFilterChange(s);
            }}
          >
            <span className="capitalize">{s}</span>
          </Button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title={`No jobs found${statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.`}
          description="Try selecting a different status filter or wait for new jobs to arrive."
        />
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{jobs.length} jobs</div>

          {/* Jobs table */}
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
                      onExpandJob(expandedJob === job.id ? null : job.id);
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
                            onRetry(job.id);
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

          {/* Expanded job detail panel */}
          {expandedJob && (
            <div className="mt-4">
              {jobs
                .filter((j) => j.id === expandedJob)
                .map((job) => (
                  <JobDetailPanel
                    key={job.id}
                    job={job}
                    onRetry={onRetry}
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
