"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { environmentRequests } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  EnvironmentRequest,
  EnvironmentRequestStatus,
  EnvironmentTier,
  CreateEnvironmentRequestDto,
  UpdateEnvironmentRequestDto,
} from "@/types/api";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FilterTabs } from "@/components/shared/filter-tabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_FILTER_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "active", label: "Active" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
];

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function statusBadgeClass(status: EnvironmentRequestStatus): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "approved":
    case "provisioning":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "active":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "expired":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case "ephemeral":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "persistent":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function tierBadgeClass(tier: EnvironmentTier): string {
  switch (tier) {
    case "small":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "medium":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "large":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

function formatStatus(status: EnvironmentRequestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatTier(tier: EnvironmentTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTtl(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  return remaining > 0 ? `${days}d ${remaining}h` : `${days}d`;
}

// ---------------------------------------------------------------------------
// EnvRequestsClient
// ---------------------------------------------------------------------------

export function EnvRequestsClient() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  // -- List state -----------------------------------------------------------
  const [requests, setRequests] = useState<EnvironmentRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // -- Create / Edit dialog state -------------------------------------------
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] =
    useState<EnvironmentRequest | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<string>("ephemeral");
  const [formTier, setFormTier] = useState<EnvironmentTier>("small");
  const [formTtlHours, setFormTtlHours] = useState("24");
  const [submitting, setSubmitting] = useState(false);

  // -- Review dialog state --------------------------------------------------
  const [reviewRequest, setReviewRequest] =
    useState<EnvironmentRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // -- Delete / Expire confirmation state -----------------------------------
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expiringId, setExpiringId] = useState<string | null>(null);

  // -- Data fetching --------------------------------------------------------

  const fetchRequests = useCallback(
    async (currentSkip: number, status: string) => {
      setLoading(true);
      try {
        const params: {
          skip: number;
          take: number;
          status?: string;
        } = { skip: currentSkip, take: PAGE_SIZE };
        if (status !== "all") {
          params.status = status;
        }
        const res = await environmentRequests.list(params);
        setRequests(res.data);
        setTotal(res.total);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load environment requests";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchRequests(skip, statusFilter);
  }, [fetchRequests, skip, statusFilter]);

  // -- Filter handler -------------------------------------------------------

  function handleFilterChange(id: string) {
    setStatusFilter(id);
    setSkip(0);
  }

  // -- Pagination -----------------------------------------------------------

  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handlePrevPage() {
    setSkip((prev) => Math.max(0, prev - PAGE_SIZE));
  }

  function handleNextPage() {
    setSkip((prev) => prev + PAGE_SIZE);
  }

  // -- Create / Edit dialog helpers -----------------------------------------

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormType("ephemeral");
    setFormTier("small");
    setFormTtlHours("24");
  }

  function openCreateDialog() {
    setEditingRequest(null);
    resetForm();
    setCreateDialogOpen(true);
  }

  function openEditDialog(req: EnvironmentRequest) {
    setEditingRequest(req);
    setFormName(req.name);
    setFormDescription(req.description ?? "");
    setFormType(req.type as string);
    setFormTier(req.tier);
    setFormTtlHours(String(req.ttlHours));
    setCreateDialogOpen(true);
  }

  async function handleCreateEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name || name.length < 2 || name.length > 100) return;

    const isEphemeral = formType === "ephemeral";
    const ttl = parseInt(formTtlHours, 10);
    if (isEphemeral && (isNaN(ttl) || ttl < 1 || ttl > 720)) return;

    setSubmitting(true);
    try {
      if (editingRequest) {
        const dto: UpdateEnvironmentRequestDto = {
          name,
          description: formDescription.trim() || undefined,
          ...(editingRequest.type === "ephemeral" && { ttlHours: ttl }),
        };
        const updated = await environmentRequests.update(editingRequest.id, dto);
        setRequests((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        toast.success(`Request "${updated.name}" updated`);
      } else {
        const dto: CreateEnvironmentRequestDto = {
          name,
          description: formDescription.trim() || undefined,
          type: formType as CreateEnvironmentRequestDto["type"],
          tier: formTier,
          ...(isEphemeral && { ttlHours: ttl }),
        };
        const created = await environmentRequests.create(dto);
        setRequests((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
        toast.success(`Request "${created.name}" created`);
      }
      setCreateDialogOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : editingRequest
            ? "Failed to update request"
            : "Failed to create request";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // -- Review (approve / reject) handlers -----------------------------------

  function openReviewDialog(
    req: EnvironmentRequest,
    action: "approve" | "reject",
  ) {
    setReviewRequest(req);
    setReviewAction(action);
    setReviewComment("");
    setReviewSubmitting(false);
  }

  function closeReviewDialog() {
    setReviewRequest(null);
    setReviewComment("");
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewRequest) return;

    setReviewSubmitting(true);
    try {
      const dto = reviewComment.trim()
        ? { comment: reviewComment.trim() }
        : undefined;
      let updated: EnvironmentRequest;
      if (reviewAction === "approve") {
        updated = await environmentRequests.approve(reviewRequest.id, dto);
        toast.success(`Request "${updated.name}" approved`);
      } else {
        updated = await environmentRequests.reject(reviewRequest.id, dto);
        toast.success(`Request "${updated.name}" rejected`);
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      closeReviewDialog();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to ${reviewAction} request`;
      toast.error(message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  // -- Delete handler -------------------------------------------------------

  async function handleDelete() {
    if (!deletingId) return;
    const target = requests.find((r) => r.id === deletingId);
    try {
      await environmentRequests.remove(deletingId);
      setRequests((prev) => prev.filter((r) => r.id !== deletingId));
      setTotal((prev) => prev - 1);
      toast.success(`Request "${target?.name}" deleted`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete request";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  // -- Expire handler -------------------------------------------------------

  async function handleExpire() {
    if (!expiringId) return;
    const target = requests.find((r) => r.id === expiringId);
    try {
      const updated = await environmentRequests.expire(expiringId);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      toast.success(`Request "${target?.name}" expired`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to expire request";
      toast.error(message);
    } finally {
      setExpiringId(null);
    }
  }

  // -- Row-level permissions helper -----------------------------------------

  function canEdit(req: EnvironmentRequest): boolean {
    if (req.status !== "pending") return false;
    return isAdmin || req.requestedBy === user?.id;
  }

  // -- Render ---------------------------------------------------------------

  const deletingName = requests.find((r) => r.id === deletingId)?.name;
  const expiringName = requests.find((r) => r.id === expiringId)?.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Environment Requests"
        description="Self-service environment provisioning"
      >
        <Button onClick={openCreateDialog}>Request Environment</Button>
      </PageHeader>

      {/* Status filter tabs */}
      <FilterTabs
        tabs={STATUS_FILTER_TABS}
        activeTab={statusFilter}
        onChange={handleFilterChange}
      />

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <EmptyState
          title="No environment requests"
          description={
            statusFilter === "all"
              ? "Submit your first environment provisioning request to get started."
              : `No requests with status "${statusFilter}" found.`
          }
        >
          {statusFilter === "all" && (
            <Button className="mt-4" onClick={openCreateDialog}>
              Request Environment
            </Button>
          )}
        </EmptyState>
      )}

      {/* Requests table */}
      {!loading && requests.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(req.type)}`}
                    >
                      {formatType(req.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(req.tier)}`}
                    >
                      {formatTier(req.tier)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {req.type === "ephemeral" ? formatTtl(req.ttlHours) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(req.status)}`}
                    >
                      {formatStatus(req.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(req.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(req.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Admin can approve or reject pending requests */}
                      {req.status === "pending" && isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              openReviewDialog(req, "approve")
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              openReviewDialog(req, "reject")
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {/* Requester or admin can edit pending requests */}
                      {canEdit(req) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(req)}
                        >
                          Edit
                        </Button>
                      )}
                      {/* Only admin can delete pending requests */}
                      {req.status === "pending" && isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(req.id)}
                        >
                          Delete
                        </Button>
                      )}
                      {/* Admin can expire active requests */}
                      {req.status === "active" && isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setExpiringId(req.id)}
                        >
                          Expire
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {skip + 1}&ndash;{Math.min(skip + PAGE_SIZE, total)} of{" "}
            {total} request{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrevPage}
              disabled={skip === 0}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNextPage}
              disabled={skip + PAGE_SIZE >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Total count (when no pagination needed) */}
      {!loading && requests.length > 0 && total <= PAGE_SIZE && (
        <p className="text-xs text-muted-foreground">
          Showing {requests.length} of {total} request
          {total !== 1 ? "s" : ""}
        </p>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Create / Edit request dialog                                      */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRequest ? "Edit Request" : "Request Environment"}
            </DialogTitle>
            <DialogDescription>
              {editingRequest
                ? "Update the environment request details."
                : "Submit a new environment provisioning request."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEditSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="req-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="req-name"
                  placeholder="my-feature-env"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="req-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="req-description"
                  placeholder="Optional description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Type and Tier are only settable on create */}
              {!editingRequest && (
                <>
                  <div>
                    <label
                      htmlFor="req-type"
                      className="text-sm font-medium"
                    >
                      Type
                    </label>
                    <select
                      id="req-type"
                      value={formType}
                      onChange={(e) =>
                        setFormType(e.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="ephemeral">Ephemeral</option>
                      <option value="persistent">Persistent</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="req-tier"
                      className="text-sm font-medium"
                    >
                      Tier
                    </label>
                    <select
                      id="req-tier"
                      value={formTier}
                      onChange={(e) =>
                        setFormTier(e.target.value as EnvironmentTier)
                      }
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </>
              )}

              {/* TTL only applies to ephemeral environments */}
              {formType === "ephemeral" && (
              <div>
                <label htmlFor="req-ttl" className="text-sm font-medium">
                  TTL (hours)
                </label>
                <Input
                  id="req-ttl"
                  type="number"
                  min={1}
                  max={720}
                  placeholder="24"
                  value={formTtlHours}
                  onChange={(e) => setFormTtlHours(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Between 1 and 720 hours (30 days)
                </p>
              </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingRequest
                    ? "Updating..."
                    : "Submitting..."
                  : editingRequest
                    ? "Update"
                    : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Review (approve / reject) dialog                                  */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={!!reviewRequest}
        onOpenChange={(open) => {
          if (!open) closeReviewDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve"
                ? "Approve Request"
                : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "Approve this environment provisioning request."
                : "Reject this environment provisioning request."}
            </DialogDescription>
          </DialogHeader>

          {reviewRequest && (
            <form onSubmit={handleReviewSubmit}>
              {/* Request summary */}
              <div className="rounded-md border p-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{reviewRequest.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(reviewRequest.type)}`}
                  >
                    {formatType(reviewRequest.type)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tier</span>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(reviewRequest.tier)}`}
                  >
                    {formatTier(reviewRequest.tier)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TTL</span>
                  <span className="font-mono text-xs">
                    {reviewRequest.type === "ephemeral"
                      ? formatTtl(reviewRequest.ttlHours)
                      : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested By</span>
                  <span className="text-xs">{reviewRequest.requestedBy}</span>
                </div>
                {reviewRequest.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-xs text-right max-w-[200px]">
                      {reviewRequest.description}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="text-sm font-medium"
                >
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Add an optional comment..."
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReviewDialog}
                  disabled={reviewSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={
                    reviewAction === "reject" ? "destructive" : "default"
                  }
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting
                    ? reviewAction === "approve"
                      ? "Approving..."
                      : "Rejecting..."
                    : reviewAction === "approve"
                      ? "Approve"
                      : "Reject"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete confirmation                                               */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title="Delete Request"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Expire confirmation                                               */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        open={!!expiringId}
        onOpenChange={(open) => {
          if (!open) setExpiringId(null);
        }}
        title="Expire Environment"
        description={`Are you sure you want to expire "${expiringName}"? The environment will be deprovisioned.`}
        confirmLabel="Expire"
        variant="destructive"
        onConfirm={handleExpire}
      />
    </div>
  );
}
