"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { alertingRules } from "@/lib/api-client";
import type { AlertingRule } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function severityBadgeClass(
  severity: AlertingRule["severity"],
): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "warning":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "info":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

export function AlertingRulesClient() {
  const router = useRouter();
  const [rules, setRules] = useState<AlertingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AlertingRule | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const data = await alertingRules.list();
      setRules(data);
    } catch {
      toast.error("Failed to load alerting rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function handleToggle(rule: AlertingRule) {
    setToggling(rule.id);
    try {
      const updated = await alertingRules.update(rule.id, {
        enabled: !rule.enabled,
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? updated : r)),
      );
      toast.success(
        `Rule "${rule.name}" ${updated.enabled ? "enabled" : "disabled"}`,
      );
    } catch {
      toast.error("Failed to update rule");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await alertingRules.remove(deleteTarget.id);
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(`Rule "${deleteTarget.name}" deleted`);
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerting Rules"
        description="Manage PromQL-based alerting rules."
      >
        <Link href="/alerting-rules/new">
          <Button>Create Rule</Button>
        </Link>
      </PageHeader>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <EmptyState
          title="No alerting rules"
          description="Create your first alerting rule to start monitoring your services."
        >
          <Link href="/alerting-rules/new">
            <Button className="mt-4">Create Rule</Button>
          </Link>
        </EmptyState>
      )}

      {!loading && rules.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Severity</th>
                <th className="px-4 py-3 text-left font-medium">Query</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Enabled</th>
                <th className="px-4 py-3 text-left font-medium">Component</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/alerting-rules/${rule.id}`}
                      className="hover:underline"
                    >
                      {rule.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${severityBadgeClass(rule.severity)}`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate text-muted-foreground">
                    {rule.query}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {rule.duration}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(rule)}
                      disabled={toggling === rule.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                        rule.enabled ? "bg-primary" : "bg-input"
                      }`}
                      aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${
                          rule.enabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {rule.componentId ? (
                      <Link
                        href={`/catalog/${rule.componentId}`}
                        className="hover:underline"
                      >
                        {rule.componentId.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          router.push(`/alerting-rules/${rule.id}`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(rule)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete alerting rule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
