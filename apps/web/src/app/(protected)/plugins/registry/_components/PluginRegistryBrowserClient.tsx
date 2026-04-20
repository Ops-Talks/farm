"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { pluginRegistry } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Search, Puzzle, Download } from "lucide-react";
import type { PluginRegistryEntry } from "@/types/api";

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// ── Registry entry card ───────────────────────────────────────────────────────

function RegistryCard({ entry }: { entry: PluginRegistryEntry }) {
  return (
    <Link
      href={`/plugins/registry/${entry.pluginId}`}
      className="block rounded-xl border p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm">{entry.name}</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            v{entry.latestVersion}
          </span>
        </div>
        {entry.category && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {entry.category}
          </Badge>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
        {entry.description}
      </p>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {entry.author && <span>by {entry.author}</span>}
        <span className="inline-flex items-center gap-1">
          <Download className="h-3 w-3" aria-hidden="true" />
          {entry.installCount.toLocaleString()} installs
        </span>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PluginRegistryBrowserClient() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data: entries = [], isLoading } = useQuery<PluginRegistryEntry[]>({
    queryKey: ["plugin-registry", search, category],
    queryFn: () =>
      pluginRegistry.search(search || undefined, category || undefined),
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title="Plugin Registry"
        description="Discover and install community plugins for your Farm instance."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search plugins"
          />
        </div>
        <Input
          placeholder="Filter by category..."
          className="sm:w-44"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No plugins found"
          description="Try adjusting your search or category filter."
          icon={<Puzzle className="h-6 w-6 text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <RegistryCard key={entry.pluginId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
