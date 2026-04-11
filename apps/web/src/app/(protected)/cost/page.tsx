import type { Metadata } from "next";
import { CostDashboardClient } from "@/components/finops/CostDashboardClient";
import { FeatureGatePage } from "@/components/shared/feature-gate-page";

export const metadata: Metadata = {
  title: "Cost | Farm",
};

export default function CostPage() {
  return (
    <FeatureGatePage
      feature="cost"
      featureName="OpenCost"
      configPath="/integrations/cloud"
      configLabel="Cloud Providers"
    >
      <CostDashboardClient />
    </FeatureGatePage>
  );
}
