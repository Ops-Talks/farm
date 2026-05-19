"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
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

import { usePermission } from "@/hooks/use-permission";
import { Permission } from "@farm/types";

export function PipelinesClient() {
  const queryClient = useQueryClient();
  const canTrigger = usePermission(Permission.PIPELINE_TRIGGER);

  // Fetch all pipelines — TanStack Query caches the result and keeps it fresh.
  const { data: pipelineList = [], isLoading } = useQuery<Pipeline[]>({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesApi.list(),
  });

  // useMutation for triggering a pipeline run.
  // On success we show a toast; the run itself is visible in the detail page.
  const triggerMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      pipelinesApi.trigger(id),
    onSuccess: (run, { name }) => {
      toast.success(`Pipeline "${name}" triggered — Run ${run.id.slice(0, 8)}`);
      // Invalidate the pipelines list so any run-count metadata stays fresh.
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const msg = err.body.message;
        toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
      } else {
        toast.error("Failed to trigger pipeline");
      }
    },
  });

  const handleTrigger = (id: string, name: string) => {
    triggerMutation.mutate({ id, name });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        {/* 5-row skeleton mirrors real table: Name / Stages / Created by / Created / Actions */}
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
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipelines"
        description={`${pipelineList.length} pipeline${pipelineList.length !== 1 ? "s" : ""} configured`}
      >
        {canTrigger && (
          <Link href="/pipelines/new">
            <Button>Create Pipeline</Button>
          </Link>
        )}
      </PageHeader>

      {pipelineList.length === 0 ? (
        <EmptyState
          title="No pipelines yet"
          description="Create your first pipeline to automate deployments and workflows."
          icon={<GitBranch className="h-6 w-6 text-muted-foreground" />}
        >
          {canTrigger && (
            <Link href="/pipelines/new">
              <Button className="mt-2">Create Pipeline</Button>
            </Link>
          )}
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
                <TableRow key={pipeline.id} className="hover:bg-muted/50 transition-colors">
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
                      {canTrigger && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTrigger(pipeline.id, pipeline.name)}
                          // Disable the specific row's button while its mutation is in flight
                          disabled={
                            triggerMutation.isPending &&
                            triggerMutation.variables?.id === pipeline.id
                          }
                          aria-label={`Trigger pipeline ${pipeline.name}`}
                        >
                          {triggerMutation.isPending &&
                          triggerMutation.variables?.id === pipeline.id
                            ? "Triggering…"
                            : "Trigger"}
                        </Button>
                      )}
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
    </ErrorBoundary>
  );
}
