"use client";

// CRDResourcesTab — displays Kubernetes Custom Resource Definitions
// discovered from the cluster, grouped by operator (displayTemplate).
// Includes a free-text filter for kind and group.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { kubernetes } from "@/lib/api-client";
import type { KubernetesCRD } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group CRDs by their displayTemplate (operator name). */
function groupByOperator(crds: KubernetesCRD[]): Map<string, KubernetesCRD[]> {
  const map = new Map<string, KubernetesCRD[]>();
  for (const crd of crds) {
    const key = crd.displayTemplate || "Other";
    const existing = map.get(key) ?? [];
    existing.push(crd);
    map.set(key, existing);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CRDResourcesTab() {
  const [filter, setFilter] = useState("");

  const { data: crds = [], isPending } = useQuery({
    queryKey: ["kubernetes-crds"],
    queryFn: () => kubernetes.listCRDs(),
  });

  // Apply case-insensitive filter against kind and group.
  const normalizedFilter = filter.toLowerCase().trim();
  const filtered = normalizedFilter
    ? crds.filter(
        (crd) =>
          crd.kind.toLowerCase().includes(normalizedFilter) ||
          crd.group.toLowerCase().includes(normalizedFilter),
      )
    : crds;

  const grouped = groupByOperator(filtered);

  return (
    <div className="space-y-4">
      {/* Filter input */}
      <div className="max-w-sm">
        <Input
          placeholder="Filter by kind or group..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter CRDs"
        />
      </div>

      {/* Loading skeleton */}
      {isPending && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isPending && filtered.length === 0 && (
        <div className="py-16 text-center border rounded-xl bg-muted/20">
          <p className="text-sm font-medium text-muted-foreground">
            No Custom Resources discovered.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ensure your cluster has Operators installed.
          </p>
        </div>
      )}

      {/* Grouped tables */}
      {!isPending &&
        Array.from(grouped.entries()).map(([operator, items]) => (
          <div key={operator} className="space-y-2">
            {/* Section header for the operator group */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {operator}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((crd) => (
                  <TableRow key={crd.name}>
                    <TableCell className="font-medium">{crd.kind}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {crd.group}
                    </TableCell>
                    <TableCell>{crd.displayTemplate}</TableCell>
                    <TableCell className="font-mono text-xs">{crd.version}</TableCell>
                    <TableCell>
                      <span className="capitalize">{crd.scope}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
    </div>
  );
}
