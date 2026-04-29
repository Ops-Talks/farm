"use client";

// Phase 37 — Org settings → Invitations panel (T413).
//
// • "Invite users" modal (multi-email parser, role picker, optional message)
// • Tabs filter (Pending / Accepted / Revoked)
// • Table with per-row actions (copy invite link, resend, revoke)
// • Empty state with CTA when no invitations exist

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Link2,
  Mail,
  RotateCcw,
  Trash2,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError, invitations } from "@/lib/api-client";
import { OrgRole, type InvitationToken } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a free-text textarea into a deduped list of valid email addresses. */
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => {
      if (seen.has(email)) return;
      seen.add(email);
      if (EMAIL_RE.test(email)) valid.push(email);
      else invalid.push(email);
    });
  return { valid, invalid };
}

function buildInviteLink(token: string): string {
  if (typeof window === "undefined") return `/invitations/accept?token=${token}`;
  return `${window.location.origin}/invitations/accept?token=${token}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  if (min < 60) return diff < 0 ? `${min}m ago` : `in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return diff < 0 ? `${hr}h ago` : `in ${hr}h`;
  const day = Math.round(hr / 24);
  return diff < 0 ? `${day}d ago` : `in ${day}d`;
}

// ---------------------------------------------------------------------------
// Invite modal
// ---------------------------------------------------------------------------

interface InviteModalProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the requester has OWNER role (controls the OWNER option). */
  canInviteOwner: boolean;
  onSent: (count: number) => void;
}

function InviteModal({
  orgId,
  open,
  onOpenChange,
  canInviteOwner,
  onSent,
}: InviteModalProps) {
  const [emailsRaw, setEmailsRaw] = useState("");
  const [role, setRole] = useState<OrgRole>(OrgRole.MEMBER);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parsed = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);

  const sendInvites = useMutation({
    mutationFn: async () =>
      invitations.create({
        organizationId: orgId,
        emails: parsed.valid,
        role,
        message: message.trim() || undefined,
      }),
    onSuccess: (created) => {
      onSent(created.length);
      setEmailsRaw("");
      setMessage("");
      setRole(OrgRole.MEMBER);
      setSubmitError(null);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to send invitations.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (parsed.valid.length === 0) {
      setSubmitError("Please enter at least one valid email address.");
      return;
    }
    sendInvites.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite users</DialogTitle>
          <DialogDescription>
            Send invitations by email. Users will receive a link to join this
            organisation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-emails" className="text-sm font-medium">
              Email addresses
            </label>
            <textarea
              id="invite-emails"
              rows={4}
              placeholder="alice@company.com, bob@company.com"
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas, semicolons, or newlines.
            </p>
            {parsed.valid.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {parsed.valid.length} valid email
                {parsed.valid.length === 1 ? "" : "s"} parsed.
              </p>
            )}
            {parsed.invalid.length > 0 && (
              <p className="text-xs text-destructive">
                Ignoring invalid: {parsed.invalid.join(", ")}
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium mb-1">Role</legend>
            <div className="flex flex-col gap-1.5">
              {[
                { value: OrgRole.MEMBER, label: "Member — read access" },
                { value: OrgRole.ADMIN, label: "Admin — manage resources" },
                ...(canInviteOwner
                  ? [{ value: OrgRole.OWNER, label: "Owner — full control" }]
                  : []),
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="h-4 w-4"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-message" className="text-sm font-medium">
              Message{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="invite-message"
              rows={3}
              placeholder="Welcome to the team!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendInvites.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sendInvites.isPending}>
              {sendInvites.isPending ? "Sending..." : "Send invites"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

type Status = "pending" | "accepted" | "revoked";

export function OrgInvitesClient() {
  const { id: orgId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<InvitationToken | null>(null);

  // Platform admins or organisation OWNERs can issue OWNER-level invites.
  // We expose the OWNER radio option only when the caller is platform admin
  // (full org-role context lives client-side; the backend enforces it too).
  const canInviteOwner = user?.roles?.includes("admin") ?? false;

  const queryKey = ["org-invitations", orgId, activeTab];

  const invitesQuery = useQuery({
    queryKey,
    queryFn: () => invitations.list(orgId, activeTab),
    enabled: !!orgId,
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => invitations.resend(id),
    onSuccess: () => {
      toast.success("Invitation resent.");
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to resend invitation.",
      );
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitations.revoke(id),
    onSuccess: () => {
      toast.success("Invitation revoked.");
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to revoke invitation.",
      );
    },
  });

  const handleCopyLink = useCallback(async (token: string) => {
    const link = buildInviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard.");
    } catch {
      toast.error("Could not copy link.");
    }
  }, []);

  const handleSent = useCallback(
    (count: number) => {
      toast.success(`${count} invite${count === 1 ? "" : "s"} sent.`);
      setActiveTab("pending");
      queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
    },
    [orgId, queryClient],
  );

  const list = invitesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invitations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite users to join this organisation by email.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite users
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage invitations</CardTitle>
          <CardDescription>
            Pending invites can be resent or revoked. Accepted invites show the
            user that joined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as Status)}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="revoked">Revoked</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {invitesQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : list.length === 0 ? (
                <EmptyState
                  icon={<Mail className="h-6 w-6 text-muted-foreground" />}
                  title={
                    activeTab === "pending"
                      ? "No pending invitations"
                      : activeTab === "accepted"
                        ? "No accepted invitations yet"
                        : "No revoked invitations"
                  }
                  description={
                    activeTab === "pending"
                      ? "Get started by inviting your first teammate."
                      : undefined
                  }
                >
                  {activeTab === "pending" && (
                    <Button onClick={() => setModalOpen(true)} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Send your first invite
                    </Button>
                  )}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 font-medium">Sent</th>
                        <th className="px-3 py-2 font-medium">Expires</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="px-3 py-3 font-medium">{inv.email}</td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className="uppercase">
                              {inv.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatRelative(inv.createdAt)}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {activeTab === "pending"
                              ? formatRelative(inv.expiresAt)
                              : activeTab === "accepted"
                                ? inv.acceptedAt
                                  ? formatRelative(inv.acceptedAt)
                                  : "—"
                                : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              {activeTab === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Copy invite link"
                                    aria-label={`Copy invite link for ${inv.email}`}
                                    onClick={() => handleCopyLink(inv.token)}
                                  >
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Resend"
                                    aria-label={`Resend invite to ${inv.email}`}
                                    disabled={resendMutation.isPending}
                                    onClick={() =>
                                      resendMutation.mutate(inv.id)
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Revoke"
                                    aria-label={`Revoke invite to ${inv.email}`}
                                    onClick={() => setRevokeTarget(inv)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {activeTab === "accepted" && inv.acceptedBy && (
                                <a
                                  href={`/users/${inv.acceptedBy}`}
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" /> View user
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <InviteModal
        orgId={orgId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        canInviteOwner={canInviteOwner}
        onSent={handleSent}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke invitation?"
        description={
          revokeTarget
            ? `The invite for ${revokeTarget.email} will no longer be accepted.`
            : ""
        }
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
          setRevokeTarget(null);
        }}
      />
    </div>
  );
}
