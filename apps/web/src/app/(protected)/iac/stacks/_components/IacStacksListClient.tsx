"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { iac } from "@/lib/api-client";
import type { IacStack } from "@/types/api";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  ExternalLink,
  Server,
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

/** Derives a sorted, deduplicated list of environment names from a stack list. */
function extractEnvironments(stacks: IacStack[]): string[] {
  const set = new Set(stacks.map((s) => s.environment));
  return Array.from(set).sort();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function RunStatusBadge({ status }: { status: string | null }) {
  if (status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Succeeded
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <MinusCircle className="h-4 w-4" aria-hidden="true" />
      No run
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

function ProviderBadge({ provider }: { provider: string }) {
  const colour =
    provider === "opentofu"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colour}`}
    >
      {provider}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stack table row
// ---------------------------------------------------------------------------

function StackRow({ stack }: { stack: IacStack }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/iac/stacks/${stack.id}`} className="hover:underline">
          {stack.name}
        </Link>
      </TableCell>
      <TableCell>
        <ProviderBadge provider={stack.provider} />
      </TableCell>
      <TableCell>
        <EnvironmentBadge env={stack.environment} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {stack.componentId ?? <span className="italic">—</span>}
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
// Main client component
// ---------------------------------------------------------------------------

const ALL_ENVS = "__all__";

export function IacStacksListClient() {
  const [activeEnv, setActiveEnv] = useState<string>(ALL_ENVS);

  const { data: allStacks = [], isLoading, isError } = useQuery({
    queryKey: ["iac-stacks-list"],
    queryFn: () => iac.listStacks(),
  });

  const environments = extractEnvironments(allStacks);

  const visibleStacks =
    activeEnv === ALL_ENVS
      ? allStacks
      : allStacks.filter((s) => s.environment === activeEnv);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="IaC Stacks"
          description="All registered infrastructure stacks"
        />
        <TableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="IaC Stacks"
          description="All registered infrastructure stacks"
        />
        <EmptyState
          icon={<XCircle className="h-8 w-8 text-red-500" />}
          title="Failed to load stacks"
          description="Could not reach the API. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IaC Stacks"
        description="All registered infrastructure stacks — populated by Cultivator"
      >
        <span className="text-sm text-muted-foreground">
          {allStacks.length} stack{allStacks.length !== 1 ? "s" : ""}
        </span>
      </PageHeader>

      {/* Environment filter chips */}
      <div className="flex flex-wrap gap-2" aria-label="Filter by environment">
        <Button
          variant={activeEnv === ALL_ENVS ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveEnv(ALL_ENVS)}
        >
          All
        </Button>
        {environments.map((env) => (
          <Button
            key={env}
            variant={activeEnv === env ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveEnv(env)}
          >
            {env}
          </Button>
        ))}
      </div>

      {/* Table */}
      {visibleStacks.length === 0 ? (
        <EmptyState
          icon={<Server className="h-8 w-8 text-muted-foreground" />}
          title="No stacks found"
          description={
            activeEnv === ALL_ENVS
              ? "Import stacks using Cultivator or run a plan/apply to auto-create them."
              : `No stacks found in the "${activeEnv}" environment.`
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stack</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStacks.map((stack) => (
                <StackRow key={stack.id} stack={stack} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
