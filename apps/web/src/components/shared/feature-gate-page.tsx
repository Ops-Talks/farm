"use client";

import type { ReactNode } from "react";
import { useFeatureAvailability } from "@/contexts/feature-availability-context";
import { FeatureUnavailablePage } from "./feature-unavailable-page";
import type { FeatureAvailability } from "@/types/api";

interface FeatureGatePageProps {
  feature: keyof Omit<FeatureAvailability, "allConfigured">;
  featureName: string;
  configPath?: string;
  configLabel?: string;
  children: ReactNode;
}

export function FeatureGatePage({
  feature,
  featureName,
  configPath,
  configLabel,
  children,
}: FeatureGatePageProps) {
  const availability = useFeatureAvailability();

  // While loading, render children to avoid flash of "not configured" message.
  if (availability.isLoading) return <>{children}</>;

  if (!availability[feature]) {
    return (
      <FeatureUnavailablePage
        featureName={featureName}
        configPath={configPath}
        configLabel={configLabel}
      />
    );
  }

  return <>{children}</>;
}
