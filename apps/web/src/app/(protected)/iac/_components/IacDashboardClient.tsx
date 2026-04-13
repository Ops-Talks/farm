"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { iac } from "@/lib/api-client";
import type {
  IacDashboard,
  IacStackSummary,
  IacModuleDrift,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  ExternalLink,
  AlertTriangle,
  Server,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative time string (e.g., "3m ago").
 * Avoids an external dependency on date-fns.
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
// Helper components
// ---------------------------------------------------------------------------

function RunStatusIcon({ status }: { status: string | null }) {
  if (status === "succeeded") {
    return (
      <CheckCircle className="h-4 w-4 text-green-500" aria-label="Succeeded" />
    );
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4 text-red-500" aria-label="Failed" />;
  }
  return (
    <MinusCircle className="h-4 w-4 text-muted-foreground" aria-label="No run" />
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

function ResourceChips({
  changes,
}: {
  changes: { add: number; change: number; destroy: number } | null;
}) {
  if (!changes) {
    return <span className="text-muted-foreground text-xs">--</span>;
  }
  return (
    <span className="flex gap-1 text-xs font-mono">
      {changes.add > 0 && (
        <span className="text-green-600 dark:text-green-400">+{changes.add}</span>
      )}
      {changes.change > 0 && (
        <span className="text-yellow-600 dark:text-yellow-400">~{changes.change}</span>
      )}
      {changes.destroy > 0 && (
        <span className="text-red-600 dark:text-red-400">-{changes.destroy}</span>
      )}
      {changes.add === 0 && changes.change === 0 && changes.destroy === 0 && (
        <span className="text-muted-foreground">no changes</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stack card
// ---------------------------------------------------------------------------

function StackCard({ stack }: { stack: IacStackSummary }) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border bg-card p-4 flex flex-col gap-2 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => router.push(`/iac/stacks/${stack.stackId}/runs`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          router.push(`/iac/stacks/${stack.stackId}/runs`);
        }

        if (e.key === " ") {
          e.preventDefault();
          router.push(`/iac/stacks/${stack.stackId}/runs`);
        }
      }}
      aria-label={`Stack ${stack.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RunStatusIcon status={stack.lastRunStatus} />
          <span className="font-medium text-sm truncate">{stack.name}</span>
        </div>
        {stack.externalToolUrl && (
          <a
            href={stack.externalToolUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in external tool"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <ProviderBadge provider={stack.provider} />
        {stack.lastRunType && (
          <Badge variant="outline" className="text-xs h-5">
            {stack.lastRunType}
          </Badge>
        )}
        {stack.autoImported && (
          <Badge variant="secondary" className="text-xs h-5">
            auto
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <ResourceChips changes={stack.resourceChanges} />
        {stack.lastRunAt && <span>{timeAgo(stack.lastRunAt)}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module drift table
// ---------------------------------------------------------------------------

function ModuleDriftTable({ records }: { records: IacModuleDrift[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className="h-8 w-8 text-green-500" />}
        title="All modules are up to date"
        description="No module drift was detected in the last Agronomist scan."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Stack Path</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead>Versions Behind</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((drift) => (
            <TableRow key={drift.id}>
              <TableCell className="font-mono text-sm">{drift.moduleName}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {drift.stackPath}
              </TableCell>
              <TableCell className="font-mono text-xs">{drift.currentRef}</TableCell>
              <TableCell className="font-mono text-xs text-green-600 dark:text-green-400">
                {drift.latestRef}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    drift.versionsBehind > 2
                      ? "text-red-600 dark:text-red-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {drift.versionsBehind > 2 && (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {drift.versionsBehind}
                </span>
              </TableCell>
              <TableCell>
                <a
                  href={
                    drift.sourceUrl.startsWith("http://") ||
                    drift.sourceUrl.startsWith("https://")
                      ? drift.sourceUrl
                      : `https://${drift.sourceUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  registry <ExternalLink className="h-3 w-3" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

const ALL_ENVS = "__all__";

export function IacDashboardClient() {
  const [dashboard, setDashboard] = useState<IacDashboard | null>(null);
  const [drift, setDrift] = useState<IacModuleDrift[]>([]);
  const [loading, setLoading] = useState(true);
  const [driftLoading, setDriftLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(ALL_ENVS);
  const [activeView, setActiveView] = useState<"stacks" | "drift">("stacks");

  useEffect(() => {
    iac
      .getDashboard()
      .then((data) => {
        setDashboard(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load IaC dashboard.");
        setLoading(false);
      });

    iac
      .getModuleDrift()
      .then((data) => {
        setDrift(data);
        setDriftLoading(false);
      })
      .catch(() => {
        setDriftLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="IaC" description="Infrastructure-as-Code stack overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="IaC" description="Infrastructure-as-Code stack overview" />
        <EmptyState
          icon={<XCircle className="h-8 w-8 text-red-500" />}
          title="Failed to load"
          description={error}
        />
      </div>
    );
  }

  const environments = [ALL_ENVS, ...(dashboard?.environments ?? [])];

  const visibleStacks: IacStackSummary[] =
    activeTab === ALL_ENVS
      ? Object.values(dashboard?.stacksByEnvironment ?? {}).flat()
      : (dashboard?.stacksByEnvironment[activeTab] ?? []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IaC"
        description="Infrastructure-as-Code stack overview — powered by Cultivator and Agronomist"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{dashboard?.totalStacks ?? 0} stacks</span>
          {(dashboard?.failedLastRun ?? 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              {dashboard!.failedLastRun} failed
            </Badge>
          )}
        </div>
      </PageHeader>

      {/* View toggle */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeView === "stacks" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveView("stacks")}
        >
          <Server className="h-4 w-4 mr-1" />
          Stacks
        </Button>
        <Button
          variant={activeView === "drift" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveView("drift")}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Module Drift
          {drift.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {drift.length}
            </Badge>
          )}
        </Button>
      </div>

      {activeView === "stacks" && (
        <>
          {/* Environment tabs */}
          <div className="flex flex-wrap gap-2">
            {environments.map((env) => (
              <Button
                key={env}
                variant={activeTab === env ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(env)}
              >
                {env === ALL_ENVS ? "All" : env}
              </Button>
            ))}
          </div>

          {/* Stack cards */}
          {visibleStacks.length === 0 ? (
            <EmptyState
              icon={<Server className="h-8 w-8 text-muted-foreground" />}
              title="No stacks found"
              description="Import stacks using Cultivator or run a plan/apply to auto-create them."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleStacks.map((stack) => (
                <StackCard key={stack.stackId} stack={stack} />
              ))}
            </div>
          )}
        </>
      )}

      {activeView === "drift" && (
        <>
          {driftLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ModuleDriftTable records={drift} />
          )}
        </>
      )}
    </div>
  );
}


