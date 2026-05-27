// RSC: fetches the first page of catalog components server-side and hydrates
// the TanStack Query cache so CatalogClient never sees a loading spinner on
// the initial render (instant navigation pattern with PPR).
//
// Falls back to empty prefetch when API_INTERNAL_URL is not configured (CI /
// local dev without a running backend) — CatalogClient will fetch on mount.

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { CatalogClient } from "./_components/CatalogClient";

// ---------------------------------------------------------------------------
// Server-side fetch helper (runs in Node.js — uses httpOnly cookie)
// ---------------------------------------------------------------------------
async function fetchCatalogComponents() {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(
      `${internalUrl}/v1/catalog/components?skip=0&take=20`,
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: `access_token=${accessToken}`,
        },
        // ISR: revalidate every 60 s; tag allows on-demand purge via revalidateTag
        next: { revalidate: 60, tags: ["catalog"] },
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    // Backend unreachable — let the client fetch on mount
    return null;
  }
}

export default async function CatalogPage() {
  const queryClient = new QueryClient();

  // Prefetch the default view (page 0, all kinds) into the server-side cache.
  // The queryKey must match what CatalogClient uses so the hydrated data is
  // picked up automatically when the component mounts.
  const data = await fetchCatalogComponents();
  if (data !== null) {
    await queryClient.prefetchQuery({
      queryKey: ["catalog-components", 0, "all"],
      queryFn: () => data,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CatalogClient />
    </HydrationBoundary>
  );
}
