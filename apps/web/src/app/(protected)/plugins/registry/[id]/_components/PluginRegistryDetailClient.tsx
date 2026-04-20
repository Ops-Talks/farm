"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pluginRegistry, pluginInstances } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Download, Tag } from "lucide-react";
import { toast } from "sonner";
import type { PluginRegistryEntry } from "@/types/api";

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// ── Version badge list ────────────────────────────────────────────────────────

function VersionHistory({ pluginId }: { pluginId: string }) {
  const { data: versions = [], isLoading } = useQuery<string[]>({
    queryKey: ["plugin-versions", pluginId],
    queryFn: () => pluginRegistry.getVersions(pluginId),
  });

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
    );
  }

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No versions recorded.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {versions.map((v) => (
        <Badge key={v} variant="outline" className="font-mono text-xs">
          <Tag className="h-3 w-3 mr-1" />
          {v}
        </Badge>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PluginRegistryDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: entry, isLoading } = useQuery<PluginRegistryEntry>({
    queryKey: ["plugin-registry-entry", id],
    queryFn: () => pluginRegistry.getOne(id),
    enabled: !!id,
  });

  const installMutation = useMutation({
    mutationFn: () => pluginInstances.install(id),
    onSuccess: () => {
      toast.success(`Plugin "${entry?.name}" installed successfully`);
      queryClient.invalidateQueries({ queryKey: ["plugin-instances"] });
    },
    onError: () => {
      toast.error("Failed to install plugin. Check server logs.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <PageHeader title="Plugin not found" description="This plugin does not exist in the registry." />
        <Button variant="ghost" onClick={() => router.back()} className="w-fit gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to registry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="w-fit gap-2 -mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to registry
      </Button>

      <PageHeader
        title={entry.name}
        description={entry.description}
      >
        {isAdmin && (
          <Button
            onClick={() => installMutation.mutate()}
            disabled={installMutation.isPending}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {installMutation.isPending ? "Installing..." : "Install"}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plugin ID
          </p>
          <p className="font-mono text-sm">{entry.pluginId}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Latest Version
          </p>
          <Badge variant="secondary" className="font-mono">
            {entry.latestVersion}
          </Badge>
        </div>
        {entry.author && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Author
            </p>
            <p className="text-sm">{entry.author}</p>
          </div>
        )}
        {entry.category && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <Badge variant="outline">{entry.category}</Badge>
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Installs
          </p>
          <p className="text-sm">{entry.installCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Version History
        </p>
        <VersionHistory pluginId={entry.pluginId} />
      </div>
    </div>
  );
}
