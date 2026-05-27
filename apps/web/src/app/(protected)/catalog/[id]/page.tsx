// RSC: provides generateMetadata for the catalog component detail page and
// wraps ComponentDetailClient in a Suspense-compatible loading boundary.
//
// ComponentDetailClient uses useEffect/useState patterns internally, so we
// do not attempt a React Query hydration boundary here. The server still
// fetches the component name for accurate page <title> generation.

import { cookies } from "next/headers";
import type { Metadata } from "next";
import { ComponentDetailClient } from "./_components/ComponentDetailClient";

// ---------------------------------------------------------------------------
// Server-side fetch helper
// ---------------------------------------------------------------------------
async function fetchComponent(id: string) {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${internalUrl}/v1/catalog/components/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      next: { revalidate: 60, tags: [`catalog-component-${id}`, "catalog"] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dynamic metadata: use the component name as the page title
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const component = await fetchComponent(id);
  return {
    title: component?.name ?? "Component",
    description: component?.description ?? "Software catalog component detail",
  };
}

export default function ComponentDetailPage() {
  return <ComponentDetailClient />;
}
