"use client";

import { Badge } from "@/components/ui/badge";
import type { MetricsBackendType } from "@/types/api";

interface MetricsBackendBadgeProps {
  backendType: MetricsBackendType | undefined;
}

const LABELS: Partial<Record<MetricsBackendType, string>> = {
  prometheus: "Prometheus",
  thanos: "Thanos",
  mimir: "Grafana Mimir",
  cortex: "Cortex",
};

const COLORS: Partial<Record<MetricsBackendType, string>> = {
  prometheus: "border-orange-500 text-orange-700 bg-orange-50",
  thanos: "border-blue-500 text-blue-700 bg-blue-50",
  mimir: "border-purple-500 text-purple-700 bg-purple-50",
  cortex: "border-indigo-500 text-indigo-700 bg-indigo-50",
};

/**
 * Displays a badge indicating the detected metrics backend type.
 * Hidden when the type is "unknown" or not yet determined.
 */
export function MetricsBackendBadge({ backendType }: MetricsBackendBadgeProps) {
  if (!backendType || backendType === "unknown") {
    return null;
  }

  const label = LABELS[backendType];
  const colorClass = COLORS[backendType] ?? "";

  if (!label) {
    return null;
  }

  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>
      {label}
    </Badge>
  );
}
