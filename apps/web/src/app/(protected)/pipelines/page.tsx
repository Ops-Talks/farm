// RSC: prefetches the pipelines list server-side into TanStack Query cache so
// PipelinesClient renders instantly without a client-side loading waterfall.
//
// Falls back to empty prefetch when API_INTERNAL_URL is not set.

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { PipelinesClient } from "./_components/PipelinesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipelines",
  description: "View and trigger CI/CD pipelines",
};

// ---------------------------------------------------------------------------
// Server-side fetch helper
// ---------------------------------------------------------------------------
async function fetchPipelines() {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${internalUrl}/v1/pipelines`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      next: { revalidate: 60, tags: ["pipelines"] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PipelinesPage() {
  const queryClient = new QueryClient();

  const data = await fetchPipelines();
  if (data !== null) {
    // queryKey must match PipelinesClient: ["pipelines"]
    await queryClient.prefetchQuery({
      queryKey: ["pipelines"],
      queryFn: () => data,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PipelinesClient />
    </HydrationBoundary>
  );
}
