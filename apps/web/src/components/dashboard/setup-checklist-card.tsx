"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setup as setupApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { SetupChecklistItem } from "@/types/api";
import { toast } from "sonner";

function ChecklistItemRow({
  item,
  onDismiss,
  isDismissing,
}: {
  item: SetupChecklistItem;
  onDismiss: (key: string) => void;
  isDismissing: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {item.completed ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span
        className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
      >
        {item.title}
      </span>
      {!item.completed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(item.key)}
          disabled={isDismissing}
          aria-label={`Dismiss ${item.title}`}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function SetupChecklistCard() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["setup-checklist"],
    queryFn: () => setupApi.getChecklist(),
    enabled: isAuthenticated,
  });

  const dismissMutation = useMutation({
    mutationFn: (key: string) => setupApi.dismissItem(key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["setup-checklist"] });
    },
    onError: () => {
      toast.error("Failed to dismiss item");
    },
  });

  const items = data ?? [];
  const pendingItems = items.filter((i) => !i.completed && !i.dismissed);

  // Hide the card when everything is done or dismissed.
  if (!isLoading && pendingItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Setup Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        ) : (
          <div className="divide-y">
            {items.filter((i) => !i.dismissed).map((item) => (
              <ChecklistItemRow
                key={item.key}
                item={item}
                onDismiss={(key) => dismissMutation.mutate(key)}
                isDismissing={dismissMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
