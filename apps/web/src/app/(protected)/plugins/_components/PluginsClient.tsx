"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { plugins as pluginsApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { PluginMetadata } from "@/types/api";
import { Puzzle, RefreshCw, Menu, Route, LayoutGrid, List as ListIcon } from "lucide-react";
import { toast } from "sonner";

// ── Loading skeleton ─────────────────────────────────────────────────────────

function PluginCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Plugin card ──────────────────────────────────────────────────────────────

interface PluginCardProps {
  plugin: PluginMetadata;
}

function PluginCard({ plugin }: PluginCardProps) {
  const menuCount = plugin.menuItems?.length ?? 0;
  const routeCount = plugin.routes?.length ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{plugin.name}</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">v{plugin.version}</span>
          </div>
          {/* Visual indicator that this is an active plugin */}
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase font-bold">
            Installed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{plugin.description}</p>

        {/* Contribution badges */}
        <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Menu className="h-3 w-3" />
            {menuCount} menu {menuCount === 1 ? "item" : "items"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Route className="h-3 w-3" />
            {routeCount} {routeCount === 1 ? "route" : "routes"}
          </span>
        </div>

        {/* Menu item list (collapsed to avoid overwhelming UI) */}
        {menuCount > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Menu Items
            </p>
            <div className="flex flex-wrap gap-1">
              {plugin.menuItems!.map((item) => (
                <Badge key={item.path} variant="outline" className="text-[11px]">
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Plugin list row (list view) ───────────────────────────────────────────────

function PluginListRow({ plugin }: { plugin: PluginMetadata }) {
  return (
    <div className="flex items-center gap-4 rounded-md border px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{plugin.name}</span>
          <span className="text-xs text-muted-foreground font-mono">v{plugin.version}</span>
          <Badge variant="secondary" className="text-[10px] uppercase font-bold">Installed</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{plugin.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Menu className="h-3 w-3" aria-hidden="true" />{plugin.menuItems?.length ?? 0} items
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Route className="h-3 w-3" aria-hidden="true" />{plugin.routes?.length ?? 0} routes
        </span>
      </div>
    </div>
  );
}

// ── Main client component ────────────────────────────────────────────────────

export function PluginsClient() {
  const { hasRole, isAuthenticated } = useAuth();
  const isAdmin = hasRole("admin");
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch the installed plugin list — cached for 60 s by the global QueryClient.
  const { data: pluginList = [], isLoading } = useQuery<PluginMetadata[]>({
    queryKey: ["plugins"],
    queryFn: () => pluginsApi.list(),
    enabled: isAuthenticated,
  });

  // Mutation for the admin "Reload Plugins" action.
  // On success we invalidate the plugins query so the list refreshes
  // automatically — no manual fetchPlugins() call needed.
  const reloadMutation = useMutation({
    mutationFn: () => pluginsApi.reload(),
    onSuccess: (result) => {
      toast.success(
        `Plugin scan complete — ${result.scanned} plugin${result.scanned === 1 ? "" : "s"} found`,
      );
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
    },
    onError: () => {
      toast.error("Failed to reload plugins. Check server logs.");
    },
  });

  async function handleReload() {
    setConfirmOpen(false);
    reloadMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title="Plugin Marketplace"
        description="Extend Farm with plugins. Each plugin can contribute menu items, routes, and more."
      >
        <div className="flex items-center gap-2">
          {/* Grid / list view toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Reload button is only shown to admins */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={reloadMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${reloadMutation.isPending ? "animate-spin" : ""}`} />
              {reloadMutation.isPending ? "Reloading..." : "Reload Plugins"}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Plugin grid or list */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PluginCardSkeleton />
          <PluginCardSkeleton />
          <PluginCardSkeleton />
        </div>
      ) : pluginList.length === 0 ? (
        <EmptyState
          title="No plugins installed"
          description="Drop a plugin.json in the plugins directory and click Reload Plugins to register new extensions."
          icon={<Puzzle className="h-6 w-6 text-muted-foreground" />}
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pluginList.map((plugin) => (
            <PluginCard key={plugin.name} plugin={plugin} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pluginList.map((plugin) => (
            <PluginListRow key={plugin.name} plugin={plugin} />
          ))}
        </div>
      )}

      {/* Admin-only confirmation before triggering plugin re-scan */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reload plugins?"
        description="This will re-scan the plugins directory and register any new or updated plugins. Existing sessions may be affected."
        confirmLabel="Reload"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleReload}
      />
    </div>
  );
}
