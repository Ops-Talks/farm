// Server Component wrapper — thin shell that hands off to the client component.
// Keeps the route entry-point server-first (no 'use client' here).
import type { Metadata } from "next";
import { ComplianceDashboardClient } from "./_components/ComplianceDashboardClient";

export const metadata: Metadata = {
  title: "Compliance Dashboard",
  description: "Tag policy compliance and violation overview",
};

export default function CompliancePage() {
  return <ComplianceDashboardClient />;
}
