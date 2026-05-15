"use client";

import { memo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { catalog } from "@/lib/api-client";
import type { Pipeline } from "@/types/api";
import {
  Clock,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TableSkeleton = memo(function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
});

function StageBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {count} {count === 1 ? "stage" : "stages"}
    </Badge>
  );
}

function LastModifiedCell({ isoDate }: { isoDate: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {timeAgo(isoDate)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pipeline row
// ---------------------------------------------------------------------------

interface PipelineRowProps {
  pipeline: Pipeline;
}

function PipelineRow({ pipeline }: PipelineRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/pipelines/${pipeline.id}`} className="hover:underline">
          {pipeline.name}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
        {pipeline.description ?? "—"}
      </TableCell>
      <TableCell>
        <StageBadge count={pipeline.stages.length} />
      </TableCell>
      <TableCell>
        <LastModifiedCell isoDate={pipeline.updatedAt} />
      </TableCell>
      <TableCell>
        <Link
          href={`/pipelines/${pipeline.id}`}
          aria-label={`Open pipeline ${pipeline.name}`}
          className={buttonVariants({
            size: "sm",
            variant: "outline",
            className: "h-7 gap-1.5",
          })}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

interface ComponentPipelinesTabProps {
  componentId: string;
}

export function ComponentPipelinesTab({ componentId }: ComponentPipelinesTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["component-pipelines", componentId],
    queryFn: () => catalog.getComponentPipelines(componentId),
  });

  const pipelines = data?.items ?? [];

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (pipelines.length === 0) {
    return (
      <div className="py-10 text-center rounded-xl border bg-muted/20">
        <p className="text-sm font-medium text-muted-foreground">
          No pipelines are linked to this component.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Link a pipeline by setting its{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            componentId
          </code>{" "}
          in the pipeline definition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Linked Pipelines
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pipeline</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Stages</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map((pipeline) => (
              <PipelineRow key={pipeline.id} pipeline={pipeline} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
