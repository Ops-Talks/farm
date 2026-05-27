// RSC: prefetches the teams list server-side into TanStack Query cache so
// TeamsClient renders instantly without a client-side loading waterfall.
//
// Falls back to empty prefetch when API_INTERNAL_URL is not set.

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { TeamsClient } from "./_components/TeamsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams",
  description: "Manage your organisation's engineering teams",
};

// ---------------------------------------------------------------------------
// Server-side fetch helper
// ---------------------------------------------------------------------------
async function fetchTeams() {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${internalUrl}/v1/teams`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}`,
      },
      next: { revalidate: 60, tags: ["teams"] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TeamsPage() {
  const queryClient = new QueryClient();

  const data = await fetchTeams();
  if (data !== null) {
    // queryKey must match TeamsClient: ["teams"]
    await queryClient.prefetchQuery({
      queryKey: ["teams"],
      queryFn: () => data,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TeamsClient />
    </HydrationBoundary>
  );
}
