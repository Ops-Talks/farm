"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { slos } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  Slo,
  SloBudgetResponse,
  SloBudgetStatus,
  SloMetricType,
  SloWindow,
  CreateSloDto,
  UpdateSloDto,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function metricTypeBadgeClass(metricType: SloMetricType): string {
  switch (metricType) {
    case "availability":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "latency":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "error_rate":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }
}

function budgetStatusBadgeClass(status: SloBudgetStatus): string {
  switch (status) {
    case "healthy":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "warning":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "critical":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "exhausted":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

function formatMetricType(metricType: SloMetricType): string {
  switch (metricType) {
    case "availability":
      return "Availability";
    case "latency":
      return "Latency";
    case "error_rate":
      return "Error Rate";
  }
}

// ---------------------------------------------------------------------------
// SlosClient
// ---------------------------------------------------------------------------

export function SlosClient() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [slosList, setSlosList] = useState<Slo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Map<string, SloBudgetResponse>>(
    new Map(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlo, setEditingSlo] = useState<Slo | null>(null);
  const [deletingSloId, setDeletingSloId] = useState<string | null>(null);

  // -- Form state -----------------------------------------------------------
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetPercent, setFormTargetPercent] = useState("99.9");
  const [formMetricType, setFormMetricType] =
    useState<SloMetricType>("availability");
  const [formWindow, setFormWindow] = useState<SloWindow>("30d");
  const [formComponentId, setFormComponentId] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // -- Data fetching --------------------------------------------------------

  const fetchSlos = useCallback(async () => {
    try {
      const res = await slos.list();
      setSlosList(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load SLOs");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBudgets = useCallback(async (items: Slo[]) => {
    const entries = await Promise.allSettled(
      items.map((s) => slos.getBudget(s.id)),
    );
    const map = new Map<string, SloBudgetResponse>();
    entries.forEach((result, idx) => {
      const item = items[idx];
      if (result.status === "fulfilled" && item) {
        map.set(item.id, result.value);
      }
    });
    setBudgets(map);
  }, []);

  useEffect(() => {
    fetchSlos();
  }, [fetchSlos]);

  useEffect(() => {
    if (slosList.length > 0) {
      fetchBudgets(slosList);
    }
  }, [slosList, fetchBudgets]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setBudgets(new Map());
    await fetchSlos();
  }, [fetchSlos]);

  // -- Dialog helpers -------------------------------------------------------

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormTargetPercent("99.9");
    setFormMetricType("availability");
    setFormWindow("30d");
    setFormComponentId("");
    setFormEnabled(true);
  }

  function openCreateDialog() {
    setEditingSlo(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(slo: Slo) {
    setEditingSlo(slo);
    setFormName(slo.name);
    setFormDescription(slo.description ?? "");
    setFormTargetPercent(String(slo.targetPercent));
    setFormMetricType(slo.metricType);
    setFormWindow(slo.window);
    setFormComponentId(slo.componentId ?? "");
    setFormEnabled(slo.enabled);
    setDialogOpen(true);
  }

  // -- CRUD handlers --------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(formTargetPercent);
    if (!formName.trim() || isNaN(target)) return;

    setSubmitting(true);
    try {
      if (editingSlo) {
        const dto: UpdateSloDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          targetPercent: target,
          metricType: formMetricType,
          window: formWindow,
          componentId: formComponentId.trim() || undefined,
          enabled: formEnabled,
        };
        const updated = await slos.update(editingSlo.id, dto);
        setSlosList((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success(`SLO "${updated.name}" updated`);
      } else {
        const dto: CreateSloDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          targetPercent: target,
          metricType: formMetricType,
          window: formWindow,
          componentId: formComponentId.trim() || undefined,
          enabled: formEnabled,
        };
        const created = await slos.create(dto);
        setSlosList((prev) => [...prev, created]);
        setTotal((prev) => prev + 1);
        toast.success(`SLO "${created.name}" created`);
      }
      setDialogOpen(false);
    } catch {
      toast.error(
        editingSlo ? "Failed to update SLO" : "Failed to create SLO",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingSloId) return;
    const target = slosList.find((s) => s.id === deletingSloId);
    try {
      await slos.remove(deletingSloId);
      setSlosList((prev) => prev.filter((s) => s.id !== deletingSloId));
      setTotal((prev) => prev - 1);
      toast.success(`SLO "${target?.name}" deleted`);
    } catch {
      toast.error("Failed to delete SLO");
    } finally {
      setDeletingSloId(null);
    }
  }

  // -- Render ---------------------------------------------------------------

  const deletingName = slosList.find((s) => s.id === deletingSloId)?.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SLOs"
        description="Manage Service Level Objectives and track error budgets."
      >
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          Refresh
        </Button>
        {isAdmin && <Button onClick={openCreateDialog}>Create SLO</Button>}
      </PageHeader>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && slosList.length === 0 && (
        <EmptyState
          title="No SLOs defined"
          description="Create your first Service Level Objective to start tracking reliability."
        >
          {isAdmin && (
            <Button className="mt-4" onClick={openCreateDialog}>
              Create SLO
            </Button>
          )}
        </EmptyState>
      )}

      {/* SLO table */}
      {!loading && slosList.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Metric Type</TableHead>
                <TableHead>Target %</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slosList.map((slo) => {
                const budget = budgets.get(slo.id);
                return (
                  <TableRow key={slo.id}>
                    <TableCell className="font-medium">{slo.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${metricTypeBadgeClass(slo.metricType)}`}
                      >
                        {formatMetricType(slo.metricType)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {slo.targetPercent}%
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {slo.window}
                    </TableCell>
                    <TableCell>
                      <Badge variant={slo.enabled ? "default" : "secondary"}>
                        {slo.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {budget ? (
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${budgetStatusBadgeClass(budget.status)}`}
                        >
                          {budget.status} ({budget.budgetRemaining.toFixed(1)}%
                          remaining)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(slo)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingSloId(slo.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total count */}
      {!loading && slosList.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {slosList.length} of {total} SLO{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlo ? "Edit SLO" : "Create SLO"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="slo-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="slo-name"
                  placeholder="API Availability"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="slo-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="slo-description"
                  placeholder="Optional description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="slo-target"
                  className="text-sm font-medium"
                >
                  Target Percent
                </label>
                <Input
                  id="slo-target"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="99.9"
                  value={formTargetPercent}
                  onChange={(e) => setFormTargetPercent(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="slo-metric-type"
                  className="text-sm font-medium"
                >
                  Metric Type
                </label>
                <select
                  id="slo-metric-type"
                  value={formMetricType}
                  onChange={(e) =>
                    setFormMetricType(e.target.value as SloMetricType)
                  }
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="availability">Availability</option>
                  <option value="latency">Latency</option>
                  <option value="error_rate">Error Rate</option>
                </select>
              </div>

              <div>
                <label htmlFor="slo-window" className="text-sm font-medium">
                  Window
                </label>
                <select
                  id="slo-window"
                  value={formWindow}
                  onChange={(e) => setFormWindow(e.target.value as SloWindow)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="slo-component"
                  className="text-sm font-medium"
                >
                  Component ID
                </label>
                <Input
                  id="slo-component"
                  placeholder="Optional component ID"
                  value={formComponentId}
                  onChange={(e) => setFormComponentId(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="slo-enabled"
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <label htmlFor="slo-enabled" className="text-sm font-medium">
                  Enabled
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingSlo
                    ? "Updating…"
                    : "Creating…"
                  : editingSlo
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingSloId}
        onOpenChange={(open) => !open && setDeletingSloId(null)}
        title="Delete SLO"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
