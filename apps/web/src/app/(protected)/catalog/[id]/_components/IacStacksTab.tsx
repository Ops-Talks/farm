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
import { iac } from "@/lib/api-client";
import type { CatalogComponent, IacStack } from "@/types/api";
import { CheckCircle, XCircle, MinusCircle, ExternalLink } from "lucide-react";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative time string (e.g., "3m ago").
 */
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

function RunStatusBadge({ status }: { status: string | null }) {
  if (status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        <span>Succeeded</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        <span>Failed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <MinusCircle className="h-4 w-4" aria-hidden="true" />
      <span>No run</span>
    </span>
  );
}

function EnvironmentBadge({ env }: { env: string }) {
  const colour =
    env === "production"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : env === "staging"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
  return (
    <Badge variant="secondary" className={colour}>
      {env}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Stack row
// ---------------------------------------------------------------------------

interface StackRowProps {
  stack: IacStack;
}

function StackRow({ stack }: StackRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/iac/stacks/${stack.id}`}
          className="hover:underline"
        >
          {stack.name}
        </Link>
      </TableCell>
      <TableCell>
        <EnvironmentBadge env={stack.environment} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {stack.provider}
      </TableCell>
      <TableCell>
        <RunStatusBadge status={stack.lastRun?.status ?? null} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {stack.lastRun?.startedAt ? timeAgo(stack.lastRun.startedAt) : "—"}
      </TableCell>
      <TableCell>
        {stack.externalToolUrl ? (
          <a
            href={stack.externalToolUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${stack.name} in external tool`}
            className={buttonVariants({
              size: "sm",
              variant: "outline",
              className: "h-7 gap-1.5",
            })}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

interface IacStacksTabProps {
  component: CatalogComponent;
}

export function IacStacksTab({ component }: IacStacksTabProps) {
  const { data: stacks = [], isLoading } = useQuery({
    queryKey: ["component-iac-stacks", component.id],
    queryFn: () => iac.listStacks({ componentId: component.id }),
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (stacks.length === 0) {
    return (
      <div className="py-10 text-center rounded-xl border bg-muted/20">
        <p className="text-sm font-medium text-muted-foreground">
          No IaC stacks are linked to this component.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Link a stack by setting its{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            componentId
          </code>{" "}
          in Cultivator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Linked IaC Stacks
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stack</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stacks.map((stack) => (
              <StackRow key={stack.id} stack={stack} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
