"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, X, Send } from "lucide-react";
import { organizations as orgsApi, ApiError } from "@/lib/api-client";
import type { OrgInvitation } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvitationsPanelProps {
  orgId: string;
  /** Role of the currently authenticated user in this organization. */
  currentUserRole: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats an ISO date string into a short relative or absolute label. */
function formatExpiry(isoDate: string): string {
  const expiry = new Date(isoDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) return "Expired";
  if (diffHours < 24) return `Expires in ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Expires in ${diffDays}d`;
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function InvitationRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Panel that lists pending organization invitations and provides a form to
 * invite new members by email address.
 * Only rendered when the current user has ADMIN or OWNER role.
 */
export function InvitationsPanel({ orgId, currentUserRole }: InvitationsPanelProps) {
  const canManage = currentUserRole === "admin" || currentUserRole === "owner";

  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cancellation in-flight tracker
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadInvitations = useCallback(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    orgsApi.invitations
      .list(orgId)
      .then((data) => setInvitations(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load invitations."))
      .finally(() => setLoading(false));
  }, [orgId, canManage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInvitations();
  }, [loadInvitations]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleInvite = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      await orgsApi.invitations.create(orgId, { email: trimmed, role });
      toast.success(`Invitation sent to ${trimmed}.`);
      setEmail("");
      setRole("member");
      loadInvitations();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Failed to send invitation.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }, [orgId, email, role, loadInvitations]);

  const handleCancel = useCallback(
    (invitationId: string, inviteeEmail: string) => {
      setCancellingId(invitationId);
      orgsApi.invitations
        .cancel(orgId, invitationId)
        .then(() => {
          toast.success(`Invitation to ${inviteeEmail} cancelled.`);
          loadInvitations();
        })
        .catch(() => toast.error("Failed to cancel invitation."))
        .finally(() => setCancellingId(null));
    },
    [orgId, loadInvitations],
  );

  // ---------------------------------------------------------------------------
  // Do not render for non-admin users
  // ---------------------------------------------------------------------------

  if (!canManage) return null;

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <Card data-testid="invitations-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Invite new members by email. Invitations expire after 48 hours.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite form */}
        <div
          className="rounded-lg border bg-muted/20 p-4 space-y-3"
          data-testid="invite-form"
        >
          <p className="text-sm font-medium">Send Invitation</p>

          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              aria-label="Email address"
              placeholder="user@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1"
              autoComplete="off"
            />

            <select
              aria-label="Invitation role"
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "admin")}
              disabled={submitting}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            <Button
              type="button"
              size="sm"
              onClick={handleInvite}
              disabled={submitting}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
        </div>

        {/* Invitation list */}
        {loading ? (
          <div className="space-y-2">
            <InvitationRowSkeleton />
            <InvitationRowSkeleton />
          </div>
        ) : invitations.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
            data-testid="empty-invitations"
          >
            <Mail className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No pending invitations</p>
            <p className="mt-1 text-xs">
              Invited members will appear here until they accept or the invitation expires.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="invitations-list">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 group"
                data-testid={`invitation-row-${inv.id}`}
              >
                <div className="flex flex-col min-w-0 gap-1">
                  <span className="text-sm font-medium truncate">{inv.email}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {inv.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatExpiry(inv.expiresAt)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  onClick={() => handleCancel(inv.id, inv.email)}
                  disabled={cancellingId === inv.id}
                  aria-label={`Cancel invitation for ${inv.email}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
