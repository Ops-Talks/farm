"use server";

/**
 * FARM-S603 — Server Action: Create Organisation
 *
 * Runs on the Next.js server — never shipped to the client bundle.
 * Reads the httpOnly access_token cookie and calls the backend directly
 * via API_INTERNAL_URL (Docker-internal or localhost) to create a new org.
 *
 * Falls back to { __clientFallback: true } when API_INTERNAL_URL is not
 * configured (CI / Playwright tests / local dev without the flag set) so
 * the calling component can transparently fall through to the browser-side
 * api-client.  This preserves the existing Playwright route mocks.
 */

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

export interface CreateOrgInput {
  name: string;
  description?: string;
}

export type CreateOrgResult =
  | { __clientFallback: true }
  | { error: string }
  | { success: true; org: { id: string; name: string; slug?: string } };

export async function createOrganizationAction(
  input: CreateOrgInput,
): Promise<CreateOrgResult> {
  const internalUrl = process.env.API_INTERNAL_URL;
  // No internal URL configured → signal the client to use the browser api-client.
  // This keeps unit tests and Playwright tests working without changes.
  if (!internalUrl) return { __clientFallback: true };

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return { __clientFallback: true };

  let res: Response;
  try {
    res = await fetch(`${internalUrl}/v1/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify({
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
      }),
    });
  } catch {
    // Backend unreachable (e.g. connection refused in test env) — fall back.
    return { __clientFallback: true };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    const msg = body.message;
    return {
      error: Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Failed to create organisation"),
    };
  }

  const org = await res.json() as { id: string; name: string; slug?: string };

  revalidateTag("organizations");
  revalidatePath("/organizations");

  return { success: true, org };
}
