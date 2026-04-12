"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { features as featuresApi } from "@/lib/api-client";
import type { FeatureAvailability } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";

// Context value extends FeatureAvailability with a loading flag so consumers
// can avoid showing "not configured" before the API responds.
type FeatureAvailabilityContextValue = FeatureAvailability & { isLoading: boolean };

const DEFAULT_AVAILABILITY: FeatureAvailabilityContextValue = {
  kubernetes: false,
  cost: false,
  registry: false,
  helm: false,
  istio: false,
  linkerd: false,
  allConfigured: false,
  isLoading: true,
};

const FeatureAvailabilityContext =
  createContext<FeatureAvailabilityContextValue>(DEFAULT_AVAILABILITY);

export function FeatureAvailabilityProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery<FeatureAvailability>({
    queryKey: ["feature-availability"],
    queryFn: () => featuresApi.getAvailability(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return (
    <FeatureAvailabilityContext.Provider
      value={{ ...(data ?? DEFAULT_AVAILABILITY), isLoading }}
    >
      {children}
    </FeatureAvailabilityContext.Provider>
  );
}

export function useFeatureAvailability(): FeatureAvailabilityContextValue {
  return useContext(FeatureAvailabilityContext);
}
