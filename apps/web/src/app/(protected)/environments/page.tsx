// Server Component — no "use client" needed.
// Interactive panels are Client Components rendered below.

import { ErrorBoundary } from "@/components/error-boundary";
import { PageHeader } from "@/components/shared/page-header";
import { HelmReleasesPanel } from "./_components/HelmReleasesPanel";
import { RolloutStatusCard } from "./_components/RolloutStatusCard";

export const metadata = {
  title: "Environments",
};

export default function EnvironmentsPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        title="Environments"
        description="Monitor Helm releases and Argo Rollout status across all cluster namespaces."
      />

      {/* Helm releases discovered from the cluster */}
      <ErrorBoundary>
        <HelmReleasesPanel />
      </ErrorBoundary>

      {/* Argo Rollout status — polls every 30 s */}
      <ErrorBoundary>
        <RolloutStatusCard />
      </ErrorBoundary>
    </div>
  );
}
