"use server";

/**
 * FARM-S603 — Server Action: Create Team
 *
 * Runs on the Next.js server — never shipped to the client bundle.
 * Falls back to { __clientFallback: true } when API_INTERNAL_URL is not
 * configured so existing Playwright and unit tests remain unaffected.
 */

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

export interface CreateTeamInput {
  name: string;
  displayName: string;
  description?: string;
  type: string;
  contactEmail?: string;
  slackChannel?: string;
}

export type CreateTeamResult =
  | { __clientFallback: true }
  | { error: string }
  | {
      success: true;
      team: { id: string; name: string; displayName: string };
    };

export async function createTeamAction(
  input: CreateTeamInput,
): Promise<CreateTeamResult> {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return { __clientFallback: true };

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return { __clientFallback: true };

  let res: Response;
  try {
    res = await fetch(`${internalUrl}/v1/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        name: input.name.trim(),
        displayName: input.displayName.trim(),
        description: input.description?.trim() || undefined,
        type: input.type,
        contactEmail: input.contactEmail?.trim() || undefined,
        slackChannel: input.slackChannel?.trim() || undefined,
      }),
    });
  } catch {
    return { __clientFallback: true };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    const msg = body.message;
    return {
      error: Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Failed to create team"),
    };
  }

  const team = await res.json() as { id: string; name: string; displayName: string };

  revalidateTag("teams", {});
  revalidatePath("/teams");

  return { success: true, team };
}
