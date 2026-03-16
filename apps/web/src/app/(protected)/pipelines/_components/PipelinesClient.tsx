"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { pipelines as pipelinesApi, ApiError } from "@/lib/api-client";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import type { Pipeline } from "@/types/api";
import { GitBranch } from "lucide-react";

export function PipelinesClient() {
  const [pipelineList, setPipelineList] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const fetchPipelines = useCallback(() => {
    pipelinesApi
      .list()
      .then(setPipelineList)
      .catch(() => setPipelineList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleTrigger = (id: string, name: string) => {
    setTriggeringId(id);
    pipelinesApi
      .trigger(id)
      .then((run) => {
        toast.success(`Pipeline "${name}" triggered — Run ${run.id.slice(0, 8)}`);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to trigger pipeline");
        }
      })
      .finally(() => setTriggeringId(null));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-md border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipelines"
        description={`${pipelineList.length} pipeline${pipelineList.length !== 1 ? "s" : ""} configured`}
      >
        <Link href="/pipelines/new">
          <Button>Create Pipeline</Button>
        </Link>
      </PageHeader>

      {pipelineList.length === 0 ? (
        <EmptyState
          title="No pipelines yet"
          description="Create your first pipeline to automate deployments and workflows."
          icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
        >
          <Link href="/pipelines/new">
            <Button className="mt-2">Create Pipeline</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineList.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell>
                    <Link
                      href={`/pipelines/${pipeline.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {pipeline.name}
                    </Link>
                    {pipeline.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px] truncate">
                        {pipeline.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {pipeline.stages?.length ?? 0} stage
                      {(pipeline.stages?.length ?? 0) !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {pipeline.createdBy}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(pipeline.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTrigger(pipeline.id, pipeline.name)}
                        disabled={triggeringId === pipeline.id}
                        aria-label={`Trigger pipeline ${pipeline.name}`}
                      >
                        {triggeringId === pipeline.id ? "Triggering…" : "Trigger"}
                      </Button>
                      <Link href={`/pipelines/${pipeline.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
