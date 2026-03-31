"use client";

import { memo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { kubernetes } from "@/lib/api-client";
import type { CatalogComponent, OperatorInfo } from "@/types/api";

// Phase badge colour mapping.
function phaseBadgeClass(phase: string): string {
  switch (phase.toLowerCase()) {
    case "succeeded":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "failed":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "pending":
    case "installing":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  }
}

const SectionSkeleton = memo(function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
});

interface OperatorsTabProps {
  component: CatalogComponent;
}

export function OperatorsTab({ component }: OperatorsTabProps) {
  // Fetch all operators and filter those bound to this component.
  // A more targeted API could be added but this reuses existing endpoints.
  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => kubernetes.listOperators(),
  });

  // For each operator, check if it has a binding to this component.
  // We fetch all operator bindings in a single pass.
  const { data: boundOperators = [], isLoading: bindingsLoading } = useQuery({
    queryKey: ["component-operator-bindings", component.id],
    queryFn: async () => {
      // Fetch bindings for all operators and filter by component ID
      const results: OperatorInfo[] = [];
      for (const op of operators) {
        const bindings = await kubernetes.listOperatorBindings(op.name);
        if (bindings.some((b) => b.componentId === component.id)) {
          results.push(op);
        }
      }
      return results;
    },
    enabled: operators.length > 0,
  });

  if (isLoading || bindingsLoading) {
    return <SectionSkeleton />;
  }

  if (boundOperators.length === 0) {
    return (
      <div className="py-8 text-center border rounded-xl bg-muted/20">
        <p className="text-sm text-muted-foreground">
          No operators are bound to this component.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Bound Operators
      </h3>
      <div className="space-y-2">
        {boundOperators.map((op) => (
          <Link
            key={op.name}
            href={`/operators/${encodeURIComponent(op.name)}`}
            className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{op.displayName}</span>
              <Badge variant="outline">v{op.version}</Badge>
            </div>
            <Badge variant="secondary" className={phaseBadgeClass(op.phase)}>
              {op.phase}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
