"use server";

/**
 * FARM-S603 — Server Actions: Create / Register Catalog Component
 *
 * Two actions cover the two form tabs in NewComponentClient:
 *   • createComponentAction  — structured form → POST /v1/catalog/components
 *   • registerComponentYamlAction — raw YAML → POST /v1/catalog/components/yaml
 *
 * Both fall back to { __clientFallback: true } when API_INTERNAL_URL is not
 * configured so existing Playwright and unit tests remain unaffected.
 */

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// createComponentAction
// ---------------------------------------------------------------------------
export interface CreateComponentInput {
  name: string;
  owner: string;
  kind: string;
  lifecycle: string;
  description?: string;
  repositoryUrl?: string;
  tags?: string[];
  helmChart?: {
    repo?: string;
    chart?: string;
    version?: string;
    valuesRef?: string;
  };
}

export type CreateComponentResult =
  | { __clientFallback: true }
  | { error: string }
  | { success: true; component: { id: string; name: string } };

export async function createComponentAction(
  input: CreateComponentInput,
): Promise<CreateComponentResult> {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return { __clientFallback: true };

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return { __clientFallback: true };

  let res: Response;
  try {
    res = await fetch(`${internalUrl}/v1/catalog/components`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      body: JSON.stringify(input),
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
        : (msg ?? "Failed to create component"),
    };
  }

  const component = await res.json() as { id: string; name: string };

  revalidateTag("catalog", {});
  revalidatePath("/catalog");

  return { success: true, component };
}

// ---------------------------------------------------------------------------
// registerComponentYamlAction
// ---------------------------------------------------------------------------
export type RegisterYamlResult =
  | { __clientFallback: true }
  | { error: string }
  | { success: true; component: { id: string; name: string } };

export async function registerComponentYamlAction(
  yaml: string,
): Promise<RegisterYamlResult> {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return { __clientFallback: true };

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return { __clientFallback: true };

  let res: Response;
  try {
    res = await fetch(`${internalUrl}/v1/catalog/components/yaml`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-yaml",
        Cookie: `access_token=${accessToken}`,
      },
      body: yaml,
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
        : (msg ?? "Failed to register component"),
    };
  }

  const component = await res.json() as { id: string; name: string };

  revalidateTag("catalog", {});
  revalidatePath("/catalog");

  return { success: true, component };
}
