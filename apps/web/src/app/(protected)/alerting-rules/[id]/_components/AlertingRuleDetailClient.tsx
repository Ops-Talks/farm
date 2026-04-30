"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { alertingRules } from "@/lib/api-client";
import type { AlertingRule } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertingRuleFormClient } from "../../_components/AlertingRuleFormClient";

interface AlertingRuleDetailClientProps {
  id: string;
}

export function AlertingRuleDetailClient({ id }: AlertingRuleDetailClientProps) {
  const router = useRouter();
  const [rule, setRule] = useState<AlertingRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // isPending state for delete ConfirmDialog
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    alertingRules
      .get(id)
      .then(setRule)
      .catch(() => toast.error("Failed to load rule"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!rule) return;
    setIsDeleting(true);
    try {
      await alertingRules.remove(rule.id);
      toast.success(`Rule "${rule.name}" deleted`);
      router.push("/alerting-rules");
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="text-sm text-muted-foreground">
        Rule not found or failed to load.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={rule.name} description="Edit alerting rule details.">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmDelete(true)}
        >
          Delete Rule
        </Button>
      </PageHeader>

      <AlertingRuleFormClient rule={rule} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete alerting rule"
        description={`Are you sure you want to delete "${rule.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  );
}
