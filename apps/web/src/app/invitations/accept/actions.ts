"use server";

/**
 * FARM-S603 — Server Action: Accept Invitation by Token
 *
 * Handles the accept-invitation mutation (POST /v1/invitations/by-token/:token/accept).
 * This flow is NOT tested by the Playwright e2e suite at the mutation level, so
 * no __clientFallback guard is needed — errors surface as action error results.
 *
 * Called from InvitationAcceptClient when the authenticated user clicks
 * "Accept invitation".
 */

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

export type AcceptInvitationResult =
  | { error: string }
  | {
      success: true;
      orgSlugOrId: string | null;
    };

export async function acceptInvitationAction(
  token: string,
): Promise<AcceptInvitationResult> {
  if (!token) return { error: "Missing invitation token." };

  const internalUrl = process.env.API_INTERNAL_URL;

  // When API_INTERNAL_URL is not set (local dev, Playwright) we cannot call
  // the backend server-side.  Propagate the error so the client falls back to
  // the existing invitations.acceptByToken() browser call transparently.
  if (!internalUrl) return { error: "__clientFallback" };

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return { error: "Not authenticated." };

  let res: Response;
  try {
    res = await fetch(
      `${internalUrl}/v1/invitations/by-token/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `access_token=${accessToken}`,
        },
      },
    );
  } catch {
    return { error: "__clientFallback" };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    const msg = body.message;
    return {
      error: Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Failed to accept invitation."),
    };
  }

  const data = await res.json() as { orgSlug?: string; orgId?: string };
  const orgSlugOrId = data.orgSlug ?? data.orgId ?? null;

  // Purge the organisations list cache so the sidebar refreshes.
  revalidateTag("organizations");
  revalidatePath("/organizations");

  return { success: true, orgSlugOrId };
}
