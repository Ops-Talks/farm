"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { incidents } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { Incident, IncidentSeverity, IncidentStatus, CreateIncidentDto } from "@/types/api";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// ---------------------------------------------------------------------------
// Badge colour helpers
// ---------------------------------------------------------------------------

function severityBadgeClass(severity: IncidentSeverity): string {
  switch (severity) {
    case "P1":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "P2":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "P3":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "P4":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

function statusBadgeClass(status: IncidentStatus): string {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "investigating":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "identified":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "resolved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Investigating", value: "investigating" },
  { label: "Identified", value: "identified" },
  { label: "Resolved", value: "resolved" },
];

const SEVERITY_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "P1", value: "P1" },
  { label: "P2", value: "P2" },
  { label: "P3", value: "P3" },
  { label: "P4", value: "P4" },
];

// ---------------------------------------------------------------------------
// IncidentsClient
// ---------------------------------------------------------------------------

export function IncidentsClient() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [incidentList, setIncidentList] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSeverity, setCreateSeverity] = useState<IncidentSeverity>("P3");
  const [createCommander, setCreateCommander] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await incidents.list({
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      setIncidentList(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, page]);

  useEffect(() => {
    setLoading(true);
    fetchIncidents();
  }, [fetchIncidents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------------------------------------------------------------------------
  // Create handler
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      const dto: CreateIncidentDto = {
        title: createTitle.trim(),
        severity: createSeverity,
      };
      if (createDescription.trim()) dto.description = createDescription.trim();
      if (createCommander.trim()) dto.commanderUserId = createCommander.trim();

      await incidents.create(dto);
      toast.success("Incident created");
      setCreateOpen(false);
      resetCreateForm();
      await fetchIncidents();
    } catch {
      toast.error("Failed to create incident");
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setCreateTitle("");
    setCreateDescription("");
    setCreateSeverity("P3");
    setCreateCommander("");
  }

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await incidents.remove(deleteTarget.id);
      setIncidentList((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      toast.success(`Incident "${deleteTarget.title}" deleted`);
    } catch {
      toast.error("Failed to delete incident");
    } finally {
      setDeleteTarget(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Incidents"
        description={`${total} incident${total !== 1 ? "s" : ""} tracked`}
      >
        {isAdmin && <Button onClick={() => setCreateOpen(true)}>Create Incident</Button>}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="block rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="severity-filter" className="text-sm font-medium whitespace-nowrap">
            Severity
          </label>
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(0);
            }}
            className="block rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commander</TableHead>
                <TableHead className="text-right">Created</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: isAdmin ? 6 : 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state */}
      {!loading && incidentList.length === 0 && (
        <EmptyState
          title="No incidents"
          description="No incidents match the current filters."
        />
      )}

      {/* Incidents table */}
      {!loading && incidentList.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commander</TableHead>
                <TableHead className="text-right">Created</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidentList.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/incidents/${incident.id}`)}
                >
                  <TableCell className="font-medium">{incident.title}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass(incident.severity)}`}
                    >
                      {incident.severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(incident.status)}`}
                    >
                      {incident.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {incident.commanderUserId
                      ? incident.commanderUserId.slice(0, 8)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(incident);
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Create Incident Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <label htmlFor="incident-title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="incident-title"
                  placeholder="Brief incident summary"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="incident-description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="incident-description"
                  placeholder="Describe what happened..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              <div>
                <label htmlFor="incident-severity" className="text-sm font-medium">
                  Severity
                </label>
                <select
                  id="incident-severity"
                  value={createSeverity}
                  onChange={(e) => setCreateSeverity(e.target.value as IncidentSeverity)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Medium</option>
                  <option value="P4">P4 — Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="incident-commander" className="text-sm font-medium">
                  Commander User ID
                </label>
                <Input
                  id="incident-commander"
                  placeholder="User ID of the incident commander"
                  value={createCommander}
                  onChange={(e) => setCreateCommander(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Incident"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete incident"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
