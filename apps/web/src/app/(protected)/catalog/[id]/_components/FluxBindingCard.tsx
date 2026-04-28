"use client";

import { useQuery } from "@tanstack/react-query";
import { kubernetes } from "@/lib/api-client";
import type { FluxBinding } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FluxBindingCardProps {
  componentId: string;
}

/**
 * Displays active Flux GitOps bindings for a catalog component.
 * Renders nothing while loading or when there are no bindings.
 */
export function FluxBindingCard({ componentId }: FluxBindingCardProps) {
  const { data: bindings, isLoading } = useQuery({
    queryKey: ["flux-bindings", componentId],
    queryFn: () => kubernetes.listFluxBindings(componentId),
  });

  // Show skeleton only briefly; if there are no bindings the card is hidden.
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Return null when there are no bindings — no empty-state card is shown.
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          GitOps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bindings.map((binding: FluxBinding) => (
          <div
            key={binding.id}
            className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {binding.resourceKind}
                </Badge>
                <span className="font-mono font-medium truncate">
                  {binding.resourceName}
                </span>
              </div>
              <p className="text-muted-foreground">{binding.resourceNamespace}</p>
            </div>
            <span className="text-muted-foreground whitespace-nowrap text-[10px] font-mono pt-0.5">
              {new Date(binding.boundAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
