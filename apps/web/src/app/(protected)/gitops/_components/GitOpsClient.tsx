"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { kubernetes } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  FluxInstallStatus,
  FluxKustomization,
  FluxHelmRelease,
  FluxSource,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";

// -- Badge helpers ----------------------------------------------------------

/** Returns the Tailwind class string for the ready/suspended/failed state. */
function readyBadgeClass(ready: boolean, suspended: boolean): string {
  if (suspended) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
  if (ready) return "bg-green-500/20 text-green-700 dark:text-green-400";
  return "bg-red-500/20 text-red-700 dark:text-red-400";
}

/** Returns the human-readable label for the ready/suspended/failed state. */
function readyLabel(ready: boolean, suspended: boolean): string {
  if (suspended) return "Suspended";
  if (ready) return "Ready";
  return "Not Ready";
}

// -- Tab definitions --------------------------------------------------------

const RESOURCE_TABS = [
  { label: "Kustomizations", id: "kustomizations" },
  { label: "Helm Releases", id: "helm-releases" },
  { label: "Sources", id: "sources" },
];

// -- FluxStatusCard ---------------------------------------------------------

interface FluxStatusCardProps {
  status: FluxInstallStatus | undefined;
  isLoading: boolean;
}

function FluxStatusCard({ status, isLoading }: FluxStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Flux Installation
          </CardTitle>
          <Badge
            variant="secondary"
            className={
              status.installed
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : "bg-red-500/20 text-red-700 dark:text-red-400"
            }
          >
            {status.installed ? "Installed" : "Not Installed"}
          </Badge>
        </div>
      </CardHeader>
      {status.installed && status.controllers.length > 0 && (
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {status.controllers.map((ctrl) => (
              <div
                key={ctrl.name}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
              >
                <span className="font-mono font-medium truncate pr-2">
                  {ctrl.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground">{ctrl.version}</span>
                  <Badge
                    variant="secondary"
                    className={
                      ctrl.ready
                        ? "bg-green-500/20 text-green-700 dark:text-green-400"
                        : "bg-red-500/20 text-red-700 dark:text-red-400"
                    }
                  >
                    {ctrl.ready ? "Ready" : "Not Ready"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// -- Condition message (used inside the detail sheet) -----------------------

function ReadyConditionMessage({ message }: { message: string | null }) {
  if (!message) {
    return (
      <p className="text-sm text-muted-foreground italic">No condition message reported.</p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground leading-snug">{message}</p>
  );
}

// -- Kustomizations table ---------------------------------------------------

interface KustomizationsTableProps {
  items: FluxKustomization[];
  onSelect: (item: FluxKustomization) => void;
}

function KustomizationsTable({ items, onSelect }: KustomizationsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No Flux Kustomizations found in the cluster.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Namespace</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Path</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Revision</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr
              key={`${item.namespace}/${item.name}`}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
            >
              <td className="px-4 py-2 font-mono font-medium">{item.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.namespace}</td>
              <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{item.path}</td>
              <td className="px-4 py-2">
                <Badge
                  variant="secondary"
                  className={readyBadgeClass(item.ready, item.suspended)}
                >
                  {readyLabel(item.ready, item.suspended)}
                </Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground font-mono text-xs truncate max-w-[200px]">
                {item.lastAppliedRevision || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- HelmReleases table -----------------------------------------------------

interface HelmReleasesTableProps {
  items: FluxHelmRelease[];
  onSelect: (item: FluxHelmRelease) => void;
}

function HelmReleasesTable({ items, onSelect }: HelmReleasesTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No Flux HelmReleases found in the cluster.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Namespace</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Chart</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Version</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr
              key={`${item.namespace}/${item.name}`}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
            >
              <td className="px-4 py-2 font-mono font-medium">{item.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.namespace}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.chartName}</td>
              <td className="px-4 py-2 text-muted-foreground text-xs">{item.chartVersion}</td>
              <td className="px-4 py-2">
                <Badge
                  variant="secondary"
                  className={readyBadgeClass(item.ready, item.suspended)}
                >
                  {readyLabel(item.ready, item.suspended)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- Sources table ----------------------------------------------------------

interface SourcesTableProps {
  items: FluxSource[];
  onSelect: (item: FluxSource) => void;
}

function SourcesTable({ items, onSelect }: SourcesTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No Flux sources found in the cluster.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kind</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Namespace</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">URL</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ref</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr
              key={`${item.kind}/${item.namespace}/${item.name}`}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
            >
              <td className="px-4 py-2">
                <Badge variant="outline" className="text-xs">
                  {item.kind}
                </Badge>
              </td>
              <td className="px-4 py-2 font-mono font-medium">{item.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.namespace}</td>
              <td className="px-4 py-2 text-muted-foreground text-xs truncate max-w-[200px]">
                {item.url}
              </td>
              <td className="px-4 py-2 text-muted-foreground text-xs font-mono">
                {item.branch ?? "—"}
              </td>
              <td className="px-4 py-2">
                <Badge
                  variant="secondary"
                  className={readyBadgeClass(item.ready, false)}
                >
                  {readyLabel(item.ready, false)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- Detail sheets ----------------------------------------------------------

interface KustomizationDetailSheetProps {
  item: FluxKustomization | null;
  onClose: () => void;
}

function KustomizationDetailSheet({
  item,
  onClose,
}: KustomizationDetailSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="font-mono">{item.name}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Namespace
                  </span>
                  <p className="font-mono">{item.namespace}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Path
                  </span>
                  <p className="font-mono">{item.path}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Status
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={readyBadgeClass(item.ready, item.suspended)}
                    >
                      {readyLabel(item.ready, item.suspended)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Last Applied Revision
                  </span>
                  <p className="font-mono text-xs break-all">
                    {item.lastAppliedRevision || "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                  Ready Condition
                </span>
                <div className="mt-2">
                  <ReadyConditionMessage message={item.readyConditionMessage} />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface HelmReleaseDetailSheetProps {
  item: FluxHelmRelease | null;
  onClose: () => void;
}

function HelmReleaseDetailSheet({ item, onClose }: HelmReleaseDetailSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="font-mono">{item.name}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Namespace
                  </span>
                  <p className="font-mono">{item.namespace}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Chart
                  </span>
                  <p>{item.chartName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Chart Version
                  </span>
                  <p className="font-mono">{item.chartVersion}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Status
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={readyBadgeClass(item.ready, item.suspended)}
                    >
                      {readyLabel(item.ready, item.suspended)}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Last Applied Revision
                  </span>
                  <p className="font-mono text-xs break-all">
                    {item.lastAppliedRevision || "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                  Ready Condition
                </span>
                <div className="mt-2">
                  <ReadyConditionMessage message={item.readyConditionMessage} />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SourceDetailSheetProps {
  item: FluxSource | null;
  onClose: () => void;
}

function SourceDetailSheet({ item, onClose }: SourceDetailSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="font-mono">{item.name}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Kind
                  </span>
                  <p>
                    <Badge variant="outline">{item.kind}</Badge>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Namespace
                  </span>
                  <p className="font-mono">{item.namespace}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    URL
                  </span>
                  <p className="font-mono text-xs break-all">{item.url}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Branch
                  </span>
                  <p className="font-mono">{item.branch ?? "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Status
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={readyBadgeClass(item.ready, false)}
                    >
                      {readyLabel(item.ready, false)}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                    Last Fetched Commit
                  </span>
                  <p className="font-mono text-xs break-all">
                    {item.lastFetchedCommit || "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                  Ready Condition
                </span>
                <div className="mt-2">
                  <ReadyConditionMessage message={item.readyConditionMessage} />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// -- Skeleton rows (loading state) ------------------------------------------

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-t">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

// -- Main component ---------------------------------------------------------

export function GitOpsClient() {
  useAuth();
  const [activeTab, setActiveTab] = useState("kustomizations");
  const [selectedKustomization, setSelectedKustomization] =
    useState<FluxKustomization | null>(null);
  const [selectedHelmRelease, setSelectedHelmRelease] =
    useState<FluxHelmRelease | null>(null);
  const [selectedSource, setSelectedSource] = useState<FluxSource | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["flux-status"],
    queryFn: () => kubernetes.getFluxStatus(),
  });

  const { data: kustomizations = [], isLoading: kustomizationsLoading } =
    useQuery({
      queryKey: ["flux-kustomizations"],
      queryFn: () => kubernetes.listFluxKustomizations(),
    });

  const { data: helmReleases = [], isLoading: helmReleasesLoading } = useQuery({
    queryKey: ["flux-helm-releases"],
    queryFn: () => kubernetes.listFluxHelmReleases(),
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["flux-sources"],
    queryFn: () => kubernetes.listFluxSources(),
  });

  // Derive a human-readable controller count for the page header description.
  const controllerCount = status?.controllers?.length ?? 0;
  const descriptionText = statusLoading
    ? "Loading Flux status..."
    : status?.installed
      ? `${controllerCount} controller${controllerCount !== 1 ? "s" : ""} running`
      : "Flux is not installed in this cluster";

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        <PageHeader title="GitOps" description={descriptionText} />

        {/* Flux installation status card */}
        <FluxStatusCard status={status} isLoading={statusLoading} />

        {/* Resource tabs */}
        <FilterTabs
          tabs={RESOURCE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Kustomizations tab */}
        {activeTab === "kustomizations" && (
          <>
            {kustomizationsLoading ? (
              <TableSkeleton />
            ) : (
              <KustomizationsTable
                items={kustomizations as FluxKustomization[]}
                onSelect={setSelectedKustomization}
              />
            )}
            <KustomizationDetailSheet
              item={selectedKustomization}
              onClose={() => setSelectedKustomization(null)}
            />
          </>
        )}

        {/* Helm Releases tab */}
        {activeTab === "helm-releases" && (
          <>
            {helmReleasesLoading ? (
              <TableSkeleton />
            ) : (
              <HelmReleasesTable
                items={helmReleases as FluxHelmRelease[]}
                onSelect={setSelectedHelmRelease}
              />
            )}
            <HelmReleaseDetailSheet
              item={selectedHelmRelease}
              onClose={() => setSelectedHelmRelease(null)}
            />
          </>
        )}

        {/* Sources tab */}
        {activeTab === "sources" && (
          <>
            {sourcesLoading ? (
              <TableSkeleton />
            ) : (
              <SourcesTable
                items={sources as FluxSource[]}
                onSelect={setSelectedSource}
              />
            )}
            <SourceDetailSheet
              item={selectedSource}
              onClose={() => setSelectedSource(null)}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
