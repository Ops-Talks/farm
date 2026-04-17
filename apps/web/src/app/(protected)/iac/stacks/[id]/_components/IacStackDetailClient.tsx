"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { iac } from "@/lib/api-client";
import { IacStackRunsClient } from "../runs/_components/IacStackRunsClient";
import { ResourceMapCanvas } from "./ResourceMapCanvas";
import { ExternalLink, XCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function StackDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function IacStackDetailClient() {
  const params = useParams<{ id: string }>();
  const stackId = params.id;

  const { data: stack, isLoading, isError } = useQuery({
    queryKey: ["iac-stack", stackId],
    queryFn: () => iac.getStack(stackId),
  });

  if (isLoading) return <StackDetailSkeleton />;

  if (isError || !stack) {
    return (
      <EmptyState
        icon={<XCircle className="h-8 w-8 text-red-500" />}
        title="Stack not found"
        description="Could not load the stack. It may not exist or the API is unavailable."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stack metadata card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{stack.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <ProviderBadge provider={stack.provider} />
              <EnvironmentBadge env={stack.environment} />
            </div>
          </div>

          {stack.externalToolUrl && (
            <a
              href={stack.externalToolUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${stack.name} in external tool`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open
            </a>
          )}
        </div>

        {stack.repositoryUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Repository:</span>
            <a
              href={stack.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              {stack.repositoryUrl}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        )}

        {stack.componentId && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Component:</span>
            <Link
              href={`/catalog/${stack.componentId}`}
              className="text-primary hover:underline font-mono text-xs"
            >
              {stack.componentId}
            </Link>
          </div>
        )}
      </div>

      {/* Tabbed content: Runs and Resource Map */}
      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="resource-map">Resource Map</TabsTrigger>
        </TabsList>
        <TabsContent value="runs">
          <IacStackRunsClient />
        </TabsContent>
        <TabsContent value="resource-map">
          <ResourceMapCanvas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
