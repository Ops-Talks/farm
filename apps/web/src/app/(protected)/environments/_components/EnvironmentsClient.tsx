"use client";

// Client Component wrapper for the Environments page.
// ErrorBoundary, HelmReleasesPanel, and RolloutStatusCard are all rendered here.

import { ErrorBoundary } from "@/components/error-boundary";
import { HelmReleasesPanel } from "./HelmReleasesPanel";
import { RolloutStatusCard } from "./RolloutStatusCard";

export function EnvironmentsClient() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
        <p className="text-muted-foreground mt-1">
          Monitor Helm releases and Argo Rollout status across all cluster namespaces.
        </p>
      </div>

      <ErrorBoundary>
        <HelmReleasesPanel />
      </ErrorBoundary>

      <ErrorBoundary>
        <RolloutStatusCard />
      </ErrorBoundary>
    </div>
  );
}
