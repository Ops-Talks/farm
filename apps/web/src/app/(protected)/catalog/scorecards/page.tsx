// FARM-S394 — Scorecards Overview page at /catalog/scorecards.
//
// This is a Server Component shell that delegates all interactive rendering
// to ScorecardsClient (a Client Component).  Keeping the page itself as a
// Server Component lets Next.js stream the initial HTML while TanStack Query
// hydrates the data on the client.
import type { Metadata } from "next";
import { ScorecardsClient } from "./_components/ScorecardsClient";

export const metadata: Metadata = {
  title: "Scorecards",
  description: "Maturity scores across all registered components",
};

export default function ScorecardsPage() {
  return <ScorecardsClient />;
}
