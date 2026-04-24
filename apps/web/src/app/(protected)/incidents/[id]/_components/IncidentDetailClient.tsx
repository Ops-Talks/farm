"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { incidents, postMortems } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  Incident,
  IncidentUpdateEntry,
  IncidentStatus,
  PostMortem,
  CreatePostMortemDto,
  UpdateIncidentStatusDto,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ChevronLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Badge colour helpers
// ---------------------------------------------------------------------------

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "P1":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "P2":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "P3":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "P4":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "investigating":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "identified":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "resolved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "resolved":
      return "default";
    case "investigating":
    case "identified":
      return "secondary";
    case "open":
      return "destructive";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Valid next statuses for state machine transitions
// ---------------------------------------------------------------------------

function getNextStatuses(current: IncidentStatus): IncidentStatus[] {
  switch (current) {
    case "open":
      return ["investigating"];
    case "investigating":
      return ["identified", "resolved"];
    case "identified":
      return ["resolved"];
    case "resolved":
      return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface IncidentDetailClientProps {
  id: string;
}

export function IncidentDetailClient({ id }: IncidentDetailClientProps) {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentUpdateEntry[]>([]);
  const [postMortem, setPostMortem] = useState<PostMortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeline update form
  const [updateMessage, setUpdateMessage] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Status transition
  const [transitioning, setTransitioning] = useState(false);

  // Post-mortem create dialog
  const [pmDialogOpen, setPmDialogOpen] = useState(false);
  const [pmRootCause, setPmRootCause] = useState("");
  const [pmContributing, setPmContributing] = useState("");
  const [pmBody, setPmBody] = useState("");
  const [pmActionTitle, setPmActionTitle] = useState("");
  const [pmActions, setPmActions] = useState<{ title: string; assignee?: string; done: boolean }[]>([]);
  const [creatingPm, setCreatingPm] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const [incidentData, timelineData] = await Promise.all([
        incidents.getOne(id),
        incidents.getTimeline(id),
      ]);
      setIncident(incidentData);
      setTimeline(timelineData);

      // Attempt to load post-mortem — 404 is expected when none exists
      try {
        const pm = await postMortems.getByIncident(id);
        setPostMortem(pm);
      } catch {
        // No post-mortem yet — that is fine
        setPostMortem(null);
      }
    } catch {
      setError("Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Status transition handler
  // ---------------------------------------------------------------------------

  async function handleStatusChange(newStatus: IncidentStatus) {
    if (!incident) return;
    setTransitioning(true);
    try {
      const dto: UpdateIncidentStatusDto = {
        status: newStatus,
        message: `Status changed to ${newStatus}`,
      };
      const updated = await incidents.updateStatus(incident.id, dto);
      setIncident(updated);
      // Refresh timeline to show the status change entry
      const newTimeline = await incidents.getTimeline(id);
      setTimeline(newTimeline);
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTransitioning(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Timeline update handler
  // ---------------------------------------------------------------------------

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateMessage.trim()) return;
    setSubmittingUpdate(true);
    try {
      const entry = await incidents.createUpdate(id, {
        message: updateMessage.trim(),
      });
      setTimeline((prev) => [...prev, entry]);
      setUpdateMessage("");
      toast.success("Update added");
    } catch {
      toast.error("Failed to add update");
    } finally {
      setSubmittingUpdate(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Post-mortem create handler
  // ---------------------------------------------------------------------------

  async function handleCreatePostMortem(e: React.FormEvent) {
    e.preventDefault();
    if (!pmRootCause.trim()) return;
    setCreatingPm(true);
    try {
      const dto: CreatePostMortemDto = {
        incidentId: id,
        rootCause: pmRootCause.trim(),
      };
      if (pmContributing.trim()) {
        dto.contributingFactors = pmContributing
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (pmBody.trim()) dto.body = pmBody.trim();
      if (pmActions.length > 0) dto.actionItems = pmActions;

      const pm = await postMortems.create(dto);
      setPostMortem(pm);
      setPmDialogOpen(false);
      resetPmForm();
      toast.success("Post-mortem created");
    } catch {
      toast.error("Failed to create post-mortem");
    } finally {
      setCreatingPm(false);
    }
  }

  function resetPmForm() {
    setPmRootCause("");
    setPmContributing("");
    setPmBody("");
    setPmActionTitle("");
    setPmActions([]);
  }

  function addActionItem() {
    if (!pmActionTitle.trim()) return;
    setPmActions((prev) => [...prev, { title: pmActionTitle.trim(), done: false }]);
    setPmActionTitle("");
  }

  // ---------------------------------------------------------------------------
  // Post-mortem approve handler
  // ---------------------------------------------------------------------------

  async function handleApprovePostMortem() {
    if (!postMortem || !user) return;
    try {
      const updated = await postMortems.approve(postMortem.id);
      setPostMortem(updated);
      toast.success("Post-mortem approved");
    } catch {
      toast.error("Failed to approve post-mortem");
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error || !incident) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit gap-1" onClick={() => router.push("/incidents")}>
          <ChevronLeft className="h-4 w-4" />
          Back to Incidents
        </Button>
        <p className="text-destructive">{error ?? "Incident not found"}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const nextStatuses = getNextStatuses(incident.status);
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <Button variant="ghost" className="w-fit gap-1" onClick={() => router.push("/incidents")}>
        <ChevronLeft className="h-4 w-4" />
        Back to Incidents
      </Button>

      {/* Header */}
      <PageHeader title={incident.title}>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass(incident.severity)}`}
        >
          {incident.severity}
        </span>
        <Badge variant={statusVariant(incident.status)} className="capitalize">
          {incident.status}
        </Badge>
      </PageHeader>

      {/* Meta info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Commander
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {incident.commanderUserId ? incident.commanderUserId.slice(0, 8) : "Unassigned"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{new Date(incident.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {incident.resolvedAt ? "Resolved" : "Last Updated"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {incident.resolvedAt
                ? new Date(incident.resolvedAt).toLocaleString()
                : new Date(incident.updatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {incident.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Status transition buttons (admin only) */}
      {isAdmin && nextStatuses.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Transition to:</span>
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={transitioning}
              onClick={() => handleStatusChange(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      )}

      <Separator />

      {/* Timeline Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Timeline</h2>

        {sortedTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline entries yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedTimeline.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{entry.message}</p>
                    {entry.previousStatus && entry.newStatus && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium capitalize ${statusBadgeClass(entry.previousStatus)}`}
                        >
                          {entry.previousStatus}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium capitalize ${statusBadgeClass(entry.newStatus)}`}
                        >
                          {entry.newStatus}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {entry.authorId && (
                      <span className="mr-2">{entry.authorId.slice(0, 8)}</span>
                    )}
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add update form */}
        <form onSubmit={handleAddUpdate} className="mt-4 flex gap-2">
          <textarea
            placeholder="Add a timeline update..."
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            rows={2}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <Button type="submit" disabled={submittingUpdate || !updateMessage.trim()}>
            {submittingUpdate ? "Sending..." : "Add Update"}
          </Button>
        </form>
      </div>

      <Separator />

      {/* Post-Mortem Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Post-Mortem</h2>
          {isAdmin && !postMortem && (
            <Button size="sm" onClick={() => setPmDialogOpen(true)}>
              Create Post-Mortem
            </Button>
          )}
        </div>

        {!postMortem ? (
          <p className="text-sm text-muted-foreground">
            No post-mortem has been created for this incident yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Approval status */}
            <div className="flex items-center gap-2">
              {postMortem.approvedBy ? (
                <Badge variant="default">
                  Approved by {postMortem.approvedBy.slice(0, 8)} on{" "}
                  {postMortem.approvedAt
                    ? new Date(postMortem.approvedAt).toLocaleDateString()
                    : "—"}
                </Badge>
              ) : (
                <>
                  <Badge variant="outline">Pending Approval</Badge>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={handleApprovePostMortem}>
                      Approve
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Root cause */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Root Cause
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{postMortem.rootCause}</p>
              </CardContent>
            </Card>

            {/* Contributing factors */}
            {postMortem.contributingFactors && postMortem.contributingFactors.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Contributing Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {postMortem.contributingFactors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action items */}
            {postMortem.actionItems && postMortem.actionItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {postMortem.actionItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.done
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {item.done ? "Done" : "Pending"}
                        </span>
                        <span>{item.title}</span>
                        {item.assignee && (
                          <span className="text-xs text-muted-foreground">
                            ({item.assignee})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Body */}
            {postMortem.body && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{postMortem.body}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Create Post-Mortem Dialog */}
      <Dialog
        open={pmDialogOpen}
        onOpenChange={(open) => {
          setPmDialogOpen(open);
          if (!open) resetPmForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Post-Mortem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePostMortem}>
            <div className="space-y-4">
              <div>
                <label htmlFor="pm-root-cause" className="text-sm font-medium">
                  Root Cause
                </label>
                <textarea
                  id="pm-root-cause"
                  placeholder="What was the root cause?"
                  value={pmRootCause}
                  onChange={(e) => setPmRootCause(e.target.value)}
                  required
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              <div>
                <label htmlFor="pm-contributing" className="text-sm font-medium">
                  Contributing Factors (one per line)
                </label>
                <textarea
                  id="pm-contributing"
                  placeholder="Factor 1&#10;Factor 2"
                  value={pmContributing}
                  onChange={(e) => setPmContributing(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              <div>
                <label htmlFor="pm-body" className="text-sm font-medium">
                  Summary
                </label>
                <textarea
                  id="pm-body"
                  placeholder="Detailed post-mortem summary..."
                  value={pmBody}
                  onChange={(e) => setPmBody(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Action Items</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    placeholder="Action item title"
                    value={pmActionTitle}
                    onChange={(e) => setPmActionTitle(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
                    Add
                  </Button>
                </div>
                {pmActions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pmActions.map((item, i) => (
                      <li key={i} className="flex items-center justify-between text-sm rounded border px-2 py-1">
                        <span>{item.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-6 px-2"
                          onClick={() => setPmActions((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPmDialogOpen(false)}
                disabled={creatingPm}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingPm}>
                {creatingPm ? "Creating..." : "Create Post-Mortem"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
