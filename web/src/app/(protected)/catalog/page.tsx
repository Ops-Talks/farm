"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { catalog } from "@/lib/api-client";
import { subscribe } from "@/lib/ws-client";
import {
  ComponentKindGroup,
  FarmEvent,
} from "@/types/api";
import type { CatalogComponent } from "@/types/api";

const KIND_GROUP_TABS: { label: string; value: string | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Dev", value: ComponentKindGroup.DEV },
  { label: "Infra", value: ComponentKindGroup.INFRA },
  { label: "Data", value: ComponentKindGroup.DATA },
  { label: "Security", value: ComponentKindGroup.SECURITY },
];

const PAGE_SIZE = 20;

function lifecycleVariant(
  lifecycle: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (lifecycle) {
    case "production":
      return "default";
    case "experimental":
      return "secondary";
    case "deprecated":
    case "decommissioned":
      return "destructive";
    default:
      return "outline";
  }
}

export default function CatalogPage() {
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [kindGroup, setKindGroup] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComponents = useCallback(() => {
    catalog
      .listComponents({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        kindGroup,
      })
      .then((res) => {
        setComponents(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        setComponents([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, kindGroup]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // WebSocket: refresh on component changes
  useEffect(() => {
    const unsubs = [
      subscribe(FarmEvent.COMPONENT_CREATED, () => fetchComponents()),
      subscribe(FarmEvent.COMPONENT_UPDATED, () => fetchComponents()),
      subscribe(FarmEvent.COMPONENT_DELETED, () => fetchComponents()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [fetchComponents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side name filter (backend does not support search)
  const filtered = search
    ? components.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      )
    : components;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Software Catalog</h1>
          <p className="text-sm text-muted-foreground">
            {total} component{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link href="/catalog/new">
          <Button>Register Component</Button>
        </Link>
      </div>

      {/* Kind group filter tabs */}
      <div className="flex items-center gap-2">
        {KIND_GROUP_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={kindGroup === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setKindGroup(tab.value);
              setPage(0);
            }}
          >
            {tab.label}
          </Button>
        ))}
        <div className="ml-auto w-64">
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
            {loading ? (
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
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/catalog/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {c.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lifecycleVariant(c.lifecycle)}>
                      {c.lifecycle}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.owner}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
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
  );
}
