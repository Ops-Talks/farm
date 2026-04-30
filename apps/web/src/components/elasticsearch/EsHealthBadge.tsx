"use client";

/**
 * Shared Elasticsearch health badge (FARM-T406 / Phase 35).
 *
 * Originally inlined in `ElasticsearchIndicesTab` (FARM-S353); extracted so
 * the cross-component overview page (FARM-S354) and the per-component tab
 * render an identical badge. The `data-testid` and `data-health`
 * attributes are part of the public contract — both the existing tab tests
 * and the new overview tests assert against them.
 */

export type EsHealthKind =
  | "green"
  | "yellow"
  | "red"
  | "unknown"
  | "unreachable";

interface EsHealthBadgeInput {
  reachable: boolean;
  stats?: { health: "green" | "yellow" | "red" | "unknown" } | undefined;
}

const BADGE_STYLES: Record<EsHealthKind, { dot: string; label: string }> = {
  green: { dot: "bg-emerald-500", label: "Healthy" },
  yellow: { dot: "bg-amber-500", label: "Degraded" },
  red: { dot: "bg-red-500", label: "Critical" },
  unknown: { dot: "bg-slate-400 dark:bg-slate-500", label: "Unknown" },
  unreachable: { dot: "bg-slate-400 dark:bg-slate-500", label: "Unreachable" },
};

/** Resolve the rendered badge kind from a row-like input. */
export function resolveEsHealthKind(input: EsHealthBadgeInput): EsHealthKind {
  if (!input.reachable) return "unreachable";
  if (!input.stats || input.stats.health === "unknown") return "unknown";
  return input.stats.health;
}

interface EsHealthBadgeProps {
  row: EsHealthBadgeInput;
}

export function EsHealthBadge({ row }: EsHealthBadgeProps) {
  const kind = resolveEsHealthKind(row);
  const { dot, label } = BADGE_STYLES[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      data-testid="es-health-badge"
      data-health={kind}
      aria-label={`Health: ${label}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dot}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
