"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deployments } from "@/lib/api-client";
import { EmptyState } from "@/components/shared/empty-state";
import { DeploymentStatus } from "@/types/api";
import type { Deployment } from "@/types/api";
import { GitBranch } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: DeploymentStatus.PENDING },
  { label: "In Progress", value: DeploymentStatus.IN_PROGRESS },
  { label: "Succeeded", value: DeploymentStatus.SUCCEEDED },
  { label: "Failed", value: DeploymentStatus.FAILED },
  { label: "Rolled Back", value: DeploymentStatus.ROLLED_BACK },
];

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "succeeded":
      return "default";
    case "in_progress":
    case "pending":
      return "secondary";
    case "failed":
    case "rolled_back":
      return "destructive";
    default:
      return "outline";
  }
}

export function DeploymentHistoryClient() {
  const [items, setItems] = useState<Deployment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  const fetchDeployments = useCallback(() => {
    deployments
      .list({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        status: statusFilter,
      })
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deployment History</h1>
          <p className="text-sm text-muted-foreground">
            {total} deployment{total !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Link href="/deployments">
          <Button variant="outline">Matrix View</Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(0);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Deployments table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deployed By</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No deployments found"
                    description="Deployments will appear here once components are deployed to environments."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    {d.component ? (
                      <Link
                        href={`/catalog/${d.componentId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {d.component.name}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {d.componentId.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.environment ? (
                      <Badge variant="outline">{d.environment.name}</Badge>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {d.environmentId.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{d.version}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)} className="capitalize">
                      {d.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {d.deployedBy ?? "--"}
                      {d.pipelineRunId && (
                        <Link
                          href="/pipelines"
                          title={`Pipeline run ${d.pipelineRunId.slice(0, 8)}`}
                          className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:underline"
                        >
                          <GitBranch className="h-3 w-3" aria-hidden="true" />
                          via pipeline
                        </Link>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
