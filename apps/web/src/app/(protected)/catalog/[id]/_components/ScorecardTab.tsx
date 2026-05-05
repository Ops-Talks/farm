"use client";

// ScorecardTab — displays the maturity scorecard for a catalog component.
// Shows overall score, level badge, per-category breakdown, and a detailed
// criteria checklist grouped by category. (FARM-S393)

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { scorecards as scorecardsApi } from "@/lib/api-client";
import { EmptyState } from "@/components/shared/empty-state";
import type {
  ScorecardResult,
  ScorecardCriterionResult,
  ScorecardLevel,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable labels for each category key. */
const CATEGORY_LABELS: Record<string, string> = {
  ownershipDocs: "Ownership & Docs",
  reliability: "Reliability",
  security: "Security",
  infrastructure: "Infrastructure & Ops",
  cost: "Cost",
};

/** Ordered list of category keys for deterministic rendering. */
const CATEGORY_KEYS = [
  "ownershipDocs",
  "reliability",
  "security",
  "infrastructure",
  "cost",
] as const;

// ---------------------------------------------------------------------------
// Level badge
// ---------------------------------------------------------------------------

/** Returns Tailwind utility classes for the level badge background + text. */
function levelBadgeClass(level: ScorecardLevel): string {
  switch (level) {
    case "platinum":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300";
    case "gold":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "silver":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    case "bronze":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "none":
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
}

function LevelBadge({ level }: { level: ScorecardLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${levelBadgeClass(level)}`}
    >
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Progress bar (inline — no external Progress component needed)
// ---------------------------------------------------------------------------

function ScoreBar({ score, label }: { score: number; label: string }) {
  // Clamp to [0, 100] defensively
  const pct = Math.min(100, Math.max(0, score));

  // Colour shifts from red → amber → green as the score increases
  let barClass = "bg-red-500";
  if (pct >= 80) barClass = "bg-green-500";
  else if (pct >= 50) barClass = "bg-amber-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criterion row
// ---------------------------------------------------------------------------

function CriterionRow({ criterion }: { criterion: ScorecardCriterionResult }) {
  if (criterion.notApplicable) {
    return (
      <li className="flex items-start gap-3 py-2 opacity-50">
        <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground line-through">
              {criterion.name}
            </span>
            <span className="text-xs text-muted-foreground">(N/A)</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {criterion.description}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          w={criterion.weight}
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-2">
      {criterion.passed ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      )}
      <div className="min-w-0 flex-1">
        <span
          className={`text-sm font-medium ${criterion.passed ? "" : "text-red-700 dark:text-red-400"}`}
        >
          {criterion.name}
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {criterion.description}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        w={criterion.weight}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ScorecardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Category bars */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ScorecardTabProps {
  componentId: string;
}

export function ScorecardTab({ componentId }: ScorecardTabProps) {
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial fetch on mount
  useEffect(() => {
    scorecardsApi
      .getByComponent(componentId)
      .then((result) => {
        setScorecard(result);
      })
      .catch(() => {
        toast.error("Failed to load scorecard");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [componentId]);

  // Refresh handler — calls the POST endpoint
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    scorecardsApi
      .refresh(componentId)
      .then((result) => {
        setScorecard(result);
        toast.success("Scorecard refreshed");
      })
      .catch(() => {
        toast.error("Failed to refresh scorecard");
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [componentId]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return <ScorecardSkeleton />;
  }

  // ── Empty state (no scorecard computed yet) ────────────────────────────────
  if (!scorecard) {
    return (
      <EmptyState
        title="No scorecard computed yet"
        description="Trigger a computation to evaluate this component's maturity level against the defined criteria."
        icon={<Award className="h-6 w-6 text-muted-foreground" />}
      >
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Computing..." : "Compute Scorecard"}
        </Button>
      </EmptyState>
    );
  }

  // Group criteria by category for the checklist section
  const criteriaByCategory = scorecard.criteria.reduce<
    Record<string, ScorecardCriterionResult[]>
  >((acc, c) => {
    const key = c.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Score + level */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-muted">
                <span className="text-3xl font-bold tabular-nums">
                  {scorecard.overallScore}
                </span>
              </div>
              <div className="space-y-1.5">
                <LevelBadge level={scorecard.level} />
                <p className="text-xs text-muted-foreground">
                  {scorecard.evaluatedAt
                    ? `Evaluated ${new Date(scorecard.evaluatedAt).toLocaleString()}`
                    : "Not yet evaluated"}
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 self-start sm:self-center"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Category breakdown ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORY_KEYS.map((key) => {
            const score =
              scorecard.categoryScores[
                key as keyof typeof scorecard.categoryScores
              ] ?? 0;
            return (
              <ScoreBar
                key={key}
                score={score}
                label={CATEGORY_LABELS[key] ?? key}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* ── Criteria checklist ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(criteriaByCategory).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground italic">
              No criteria available for this scorecard.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(criteriaByCategory).map(([category, items]) => (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABELS[category] ?? category}
                  </h4>
                  <ul className="divide-y divide-border">
                    {items.map((c) => (
                      <CriterionRow key={c.id} criterion={c} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
