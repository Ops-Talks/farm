"use client";

// ArgoCDStatusCard — shows ArgoCD application health and sync status.
// Displayed on the Environments page alongside HelmReleasesPanel.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { argocd } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { ArgoCDApplication } from "@/types/api";

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function healthBadge(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "healthy")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {status}
      </span>
    );
  if (s === "degraded")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {status}
      </span>
    );
  if (s === "progressing")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
        {status}
      </span>
    );
  // Unknown / any other status
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status || "Unknown"}
    </span>
  );
}

function syncBadge(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "synced")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {status}
      </span>
    );
  if (s === "outofsync")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
        {status}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status || "Unknown"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ArgoCDStatusCard() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: apps = [], isPending, isError } = useQuery({
    queryKey: ["argocd-applications"],
    queryFn: () => argocd.listApplications(),
    // Poll every 30 seconds to keep status current
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: (name: string) => argocd.syncApplication(name),
    onSuccess: (_, name) => {
      toast.success(`ArgoCD sync triggered for ${name}`);
      void queryClient.invalidateQueries({ queryKey: ["argocd-applications"] });
    },
    onError: () => toast.error("Failed to trigger ArgoCD sync"),
  });

  // Empty state when no apps returned — likely no credential configured
  if (!isPending && !isError && apps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            ArgoCD Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">
              Connect ArgoCD in Integration Settings to see application status
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Navigate to{" "}
              <span className="font-medium">Settings → Integrations</span> to add
              your ArgoCD credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          ArgoCD Applications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading skeleton */}
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {/* Table */}
        {!isPending && apps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead>Last Sync</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app: ArgoCDApplication) => (
                <TableRow key={app.name}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {app.namespace}
                  </TableCell>
                  <TableCell>{healthBadge(app.status.health.status)}</TableCell>
                  <TableCell>{syncBadge(app.status.sync.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {app.status.operationState?.finishedAt
                      ? new Date(app.status.operationState.finishedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(app.name)}
                        disabled={syncMutation.isPending}
                        aria-label={`Sync ${app.name}`}
                      >
                        Sync
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
