"use client";

// HelmReleasesPanel — shows Helm releases discovered from the cluster.
// Provides a sync button to pull the latest state from the cluster.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { helm } from "@/lib/api-client";
import type { HelmRelease } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Helm release status to a badge variant. */
function statusVariant(
  status: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (status.toLowerCase()) {
    case "deployed":
      return "default";   // green-ish (primary)
    case "failed":
      return "destructive";
    default:
      return "secondary"; // yellow-ish for pending-install, superseded, etc.
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReleaseRow({ release }: { release: HelmRelease }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{release.name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {release.namespace}
      </TableCell>
      <TableCell>{release.chart}</TableCell>
      <TableCell className="font-mono text-xs">{release.chartVersion}</TableCell>
      <TableCell className="font-mono text-xs">{release.appVersion}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(release.status)}>{release.status}</Badge>
      </TableCell>
      <TableCell className="text-center">{release.revision}</TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(release.updatedAt).toLocaleString()}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HelmReleasesPanel() {
  const queryClient = useQueryClient();

  const { data: releases = [], isPending } = useQuery({
    queryKey: ["helm-releases"],
    queryFn: () => helm.listReleases(),
  });

  const syncMutation = useMutation({
    mutationFn: () => helm.syncReleases(),
    onSuccess: (result) => {
      toast.success(
        `Synced ${result.synced} release${result.synced !== 1 ? "s" : ""} from cluster`,
      );
      if (result.errors.length > 0) {
        toast.error(`Sync errors: ${result.errors.join(", ")}`);
      }
      // Invalidate the releases query so the table refreshes.
      void queryClient.invalidateQueries({ queryKey: ["helm-releases"] });
    },
    onError: () => {
      toast.error("Failed to sync Helm releases");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Helm Releases
        </CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "Syncing..." : "Sync Releases"}
          </Button>
        </CardAction>
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

        {/* Empty state */}
        {!isPending && releases.length === 0 && (
          <div className="py-12 text-center border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">
              No Helm releases found.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Sync Releases&quot; to discover releases from the cluster.
            </p>
          </div>
        )}

        {/* Releases table */}
        {!isPending && releases.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Chart</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>App Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Revision</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <ReleaseRow key={`${release.namespace}/${release.name}`} release={release} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
