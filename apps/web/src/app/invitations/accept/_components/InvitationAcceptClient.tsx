"use client";

// Phase 37 — Public invitation acceptance page (T412 frontend).
//
// Reads ?token=... from the URL, fetches the public preview, and shows one of:
//   • Loading skeleton
//   • Error card (invalid / expired / revoked / already-accepted)
//   • Preview card with login/signup CTAs (when not authenticated)
//   • Preview card with "Accept" button (when authenticated)
//
// On accept it POSTs to /v1/invitations/by-token/:token/accept and redirects
// to the org dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, MailWarning } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, invitations } from "@/lib/api-client";
import type { InvitationPreview } from "@/types/api";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; title: string; message: string }
  | { kind: "ready"; preview: InvitationPreview };

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function InvitationAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [accepting, setAccepting] = useState(false);

  // Fetch the preview (public endpoint — no auth needed).
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        kind: "error",
        title: "Invalid invitation link",
        message:
          "The invitation link is missing a token. Ask the admin to send you a new one.",
      });
      return;
    }

    let cancelled = false;
    invitations
      .getByToken(token)
      .then((preview) => {
        if (!cancelled) setState({ kind: "ready", preview });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          // 404 = not found; 410 = expired/revoked/accepted (per backend convention).
          const message =
            err.status === 410
              ? "This invitation is no longer valid — it may have expired, been revoked, or already been accepted."
              : err.status === 404
                ? "This invitation link is invalid. Double-check the URL or ask the admin to resend it."
                : err.message || "Failed to load invitation.";
          setState({
            kind: "error",
            title: "Invitation unavailable",
            message,
          });
        } else {
          setState({
            kind: "error",
            title: "Something went wrong",
            message: "We couldn't load this invitation. Please try again.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await invitations.acceptByToken(token);
      toast.success("Invitation accepted!");
      // Backend returns a MemberResponse (no orgSlug); fall back to /organizations
      // when we cannot resolve a more specific destination.
      const orgSlugOrId =
        (res as { orgSlug?: string; orgId?: string }).orgSlug ??
        (res as { orgId?: string }).orgId ??
        null;
      router.push(orgSlugOrId ? `/organizations/${orgSlugOrId}` : "/organizations");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to accept invitation.";
      toast.error(msg);
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md shadow-sm">
        {state.kind === "loading" || authLoading ? (
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          </CardContent>
        ) : state.kind === "error" ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
                <MailWarning className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>{state.title}</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/login">
                <Button variant="outline">Go to login</Button>
              </Link>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>You&apos;re invited</CardTitle>
              <CardDescription>
                {state.preview.invitedByName} invited you to join{" "}
                <strong>{state.preview.orgName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary" className="uppercase">
                  {state.preview.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">
                  {formatExpiry(state.preview.expiresAt)}
                </span>
              </div>

              {state.preview.message && (
                <div className="rounded-md border bg-background p-3 text-sm">
                  <p className="font-medium text-foreground mb-1">Message</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {state.preview.message}
                  </p>
                </div>
              )}

              {user ? (
                <Button
                  className="w-full gap-2"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {accepting ? "Accepting..." : "Accept invitation"}
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs text-muted-foreground">
                    Log in or create an account to accept this invitation.
                  </p>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(
                      `/invitations/accept?token=${token}`,
                    )}`}
                    className="block"
                  >
                    <Button className="w-full">Log in to accept</Button>
                  </Link>
                  <Link
                    href={`/signup?invite=${encodeURIComponent(token)}`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      Sign up first
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
