// Server Component — interactive logic lives in CostDashboardClient.
import type { Metadata } from "next";
import { CostDashboardClient } from "@/components/finops/CostDashboardClient";

export const metadata: Metadata = {
  title: "Cost | Farm",
};

export default function CostPage() {
  return <CostDashboardClient />;
}
