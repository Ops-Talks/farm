"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FilterTabs } from "@/components/shared/filter-tabs";
import { catalog } from "@/lib/api-client";
import { subscribe } from "@/lib/ws-client";
import {
  ComponentKindGroup,
  FarmEvent,
} from "@/types/api";
import type { CatalogComponent } from "@/types/api";
import { recordSpan } from "@/lib/otel-spans";

const KIND_GROUP_TABS = [
  { label: "All", id: "all" },
  { label: "Dev", id: ComponentKindGroup.DEV },
  { label: "Infra", id: ComponentKindGroup.INFRA },
  { label: "Data", id: ComponentKindGroup.DATA },
  { label: "Security", id: ComponentKindGroup.SECURITY },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Lifecycle badge color helper (FARM-S167)
// Exported so it can be unit-tested independently.
// ---------------------------------------------------------------------------
export function lifecycleBadgeClass(lifecycle: string): string {
  switch (lifecycle) {
    case "production":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "experimental":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "deprecated":
    case "decommissioned":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "development":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function CatalogClient() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch components — TanStack Query handles loading/error state and caching.
  const { data, isLoading } = useQuery({
    queryKey: ["catalog-components", page, activeTab],
    queryFn: () => {
      const kindGroup = activeTab === "all" ? undefined : activeTab;
      return catalog.listComponents({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        kindGroup,
      });
    },
  });

  const components: CatalogComponent[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  // WebSocket: invalidate the catalog query when components change so the
  // table stays in sync without a manual page refresh.
  useEffect(() => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["catalog-components"] });

    const unsubs = [
      subscribe(FarmEvent.COMPONENT_CREATED, invalidate),
      subscribe(FarmEvent.COMPONENT_UPDATED, invalidate),
      subscribe(FarmEvent.COMPONENT_DELETED, invalidate),
    ];
    return () => unsubs.forEach((u) => u());
  }, [queryClient]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side name filter (backend does not support search)
  const filtered = search
    ? components.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      )
    : components;

  // Record a catalog.search span whenever the user types in the search box.
  // We fire this in a useEffect so `filtered` is already computed (it is a
  // derived value that lives outside the effect) and the count is accurate.
  useEffect(() => {
    if (!search) return;
    void recordSpan(
      "catalog.search",
      () => filtered.length,
      {
        "search.query": search,
        "search.results_count": filtered.length,
      },
    );
  }, [search, filtered.length]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
      <PageHeader
        title="Software Catalog"
        description={`${total} component${total !== 1 ? "s" : ""} registered`}
      >
        <Link href="/catalog/new">
          <Button>Register Component</Button>
        </Link>
      </PageHeader>

      {/* Filters and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <FilterTabs
          tabs={KIND_GROUP_TABS}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            setPage(0);
          }}
          className="flex-1"
        />
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filter by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Components table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Lifecycle</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  {search
                    ? "No components match the search filter."
                    : "No components found. Register your first component."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                // Row hover effect: subtle muted background transition (FARM-S167)
                <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Link
                      href={`/catalog/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {/* Component kind: subtle muted pill (FARM-S167) */}
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground capitalize">
                      {c.kind}
                    </span>
                  </TableCell>
                  <TableCell>
                    {/* Lifecycle: color-coded status badge (FARM-S167) */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${lifecycleBadgeClass(c.lifecycle)}`}
                    >
                      {c.lifecycle}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.owner}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {(c.tags?.length ?? 0) > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{(c.tags?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
