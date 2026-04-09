"use client";

import { useQuery } from "@tanstack/react-query";
import { kubernetes } from "@/lib/api-client";
import type { KedaBinding } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KedaBindingCardProps {
  componentId: string;
}

/**
 * Displays active KEDA autoscaling bindings for a catalog component.
 * Renders nothing while loading or when there are no bindings.
 */
export function KedaBindingCard({ componentId }: KedaBindingCardProps) {
  const { data: bindings, isLoading } = useQuery({
    queryKey: ["keda-bindings", componentId],
    queryFn: () => kubernetes.listKedaBindings(componentId),
  });

  // Show a brief skeleton while the request is in flight.
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

  // Return null when there are no bindings — no empty-state card is rendered.
  if (!bindings || bindings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Autoscaling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bindings.map((binding: KedaBinding) => (
          <div
            key={binding.id}
            className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  ScaledObject
                </Badge>
                <span className="font-mono font-medium truncate">
                  {binding.scaledObjectName}
                </span>
              </div>
              <p className="text-muted-foreground">{binding.scaledObjectNamespace}</p>
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
