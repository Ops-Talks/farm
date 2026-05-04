"use client";

// FARM-S394 — Scorecards Overview interactive table + summary cards.
// This is a Client Component so it can manage filter state, search, and
// sorting without a full page reload.  Data is fetched via TanStack Query
// using the scorecards.listAll() API client method.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Award, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { scorecards as scorecardsApi } from "@/lib/api-client";
import type { ScorecardLevel } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable relative time (e.g. "2h ago"). */
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Tailwind classes for each scorecard level badge. */
function levelBadgeClass(level: ScorecardLevel): string {
  switch (level) {
    case "platinum":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
    case "gold":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "silver":
      return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300";
    case "bronze":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "none":
    default:
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

/** Tailwind color for the score progress bar fill. */
function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-500";
}

/** Format a category score as a percentage string. */
function pct(value: number): string {
  return `${Math.round(value)}%`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { level: ScorecardLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${levelBadgeClass(level)}`}
    >
      {level}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-right text-xs tabular-nums">
        {Math.round(clamped)}
      </span>
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        {/*
         * Inline style for width is intentional: the score is dynamic (0–100)
         * and generating 101 Tailwind arbitrary-value classes would bloat the
         * stylesheet.  All other visual properties use static Tailwind classes.
         */}
        <div
          className={`h-full rounded-full ${scoreBarColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/** Summary stat card for the top-of-page metrics row. */
function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field)
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5" />
  );
}

type SortField = "score" | "component";
type SortDir = "asc" | "desc";

const LEVEL_OPTIONS = [
  { label: "All Levels", value: "all" },
  { label: "None", value: "none" },
  { label: "Bronze", value: "bronze" },
  { label: "Silver", value: "silver" },
  { label: "Gold", value: "gold" },
  { label: "Platinum", value: "platinum" },
] as const;

const LEVEL_ORDER: ScorecardLevel[] = [
  "none",
  "bronze",
  "silver",
  "gold",
  "platinum",
];

const SELECT_CLASS =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring h-9";

export function ScorecardsClient() {
  const router = useRouter();

  // Filter and sort state — all filtering is client-side after the initial
  // fetch so the kind dropdown can be derived from the response data.
  const [levelFilter, setLevelFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: rows = [], isLoading: isListLoading } = useQuery({
    queryKey: ["scorecards-list"],
    queryFn: () => scorecardsApi.listAll(),
  });

  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["scorecards-overview"],
    queryFn: () => scorecardsApi.getOverview(),
  });

  const isLoading = isListLoading || isOverviewLoading;

  // Derive unique component kind values from the response for the dropdown.
  const kindOptions = useMemo(() => {
    const kinds = Array.from(
      new Set(rows.map((r) => r.componentKind)),
    ).sort();
    return [
      { label: "All Kinds", value: "all" },
      ...kinds.map((k) => ({ label: k, value: k })),
    ];
  }, [rows]);

  // Summary card values — use the overview endpoint for aggregates to avoid
  // computing them from the full list (which includes every criterion array).
  const totalComponents = overview?.totalComponents ?? rows.length;
  const averageScore =
    overview !== undefined
      ? Math.round(overview.averageScore)
      : rows.length > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + r.overallScore, 0) / rows.length,
          )
        : 0;
  const goldPlus =
    overview !== undefined
      ? (overview.levelDistribution?.gold ?? 0) +
        (overview.levelDistribution?.platinum ?? 0)
      : rows.filter((r) => r.level === "gold" || r.level === "platinum").length;
  const failingSecurity = rows.filter((r) =>
    r.criteria.some(
      (c) => c.category === "security" && !c.passed && !c.notApplicable,
    ),
  ).length;

  // Level distribution counts — prefer the overview payload.
  const levelCounts = LEVEL_ORDER.map((lvl) => ({
    level: lvl,
    count:
      overview !== undefined
        ? (overview.levelDistribution?.[lvl] ?? 0)
        : rows.filter((r) => r.level === lvl).length,
  }));

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = rows;
    if (levelFilter !== "all")
      result = result.filter((r) => r.level === levelFilter);
    if (kindFilter !== "all")
      result = result.filter((r) => r.componentKind === kindFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.componentName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, levelFilter, kindFilter, search]);

  // Sorting
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const cmp =
          sortField === "score"
            ? a.overallScore - b.overallScore
            : a.componentName.localeCompare(b.componentName);
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [filtered, sortField, sortDir],
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* ------------------------------------------------------------------ */}
        {/* Page header                                                          */}
        {/* ------------------------------------------------------------------ */}
        <PageHeader
          title="Scorecards"
          description="Maturity scores across all registered components"
        />

        {/* ------------------------------------------------------------------ */}
        {/* Summary cards                                                        */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total Components" value={totalComponents} />
          <StatCard
            title="Average Score"
            value={`${averageScore}%`}
            sub="across all components"
          />
          <StatCard
            title="Gold+ Components"
            value={goldPlus}
            sub={
              totalComponents > 0
                ? `${Math.round((goldPlus / totalComponents) * 100)}% of total`
                : undefined
            }
          />
          <StatCard
            title="Failing Security"
            value={failingSecurity}
            sub="components with security criteria failures"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Level distribution row                                               */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && totalComponents > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Level distribution:
            </span>
            {levelCounts.map(({ level, count }) =>
              count > 0 ? (
                <span
                  key={level}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${levelBadgeClass(level)}`}
                >
                  {level}
                  <span className="font-bold">{count}</span>
                </span>
              ) : null,
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Filters row                                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            className={SELECT_CLASS}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className={SELECT_CLASS}
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by kind"
          >
            {kindOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex-1 min-w-0 sm:max-w-xs">
            <Input
              placeholder="Filter by component name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Scorecards table                                                     */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center text-xs font-medium hover:text-foreground transition-colors"
                    onClick={() => toggleSort("component")}
                  >
                    Component
                    <SortIcon field="component" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center text-xs font-medium hover:text-foreground transition-colors"
                    onClick={() => toggleSort("score")}
                  >
                    Score
                    <SortIcon field="score" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Reliability</TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Last Evaluated</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                // Skeleton placeholder rows while the query is in-flight
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    {rows.length === 0 ? (
                      <EmptyState
                        icon={
                          <Award className="h-6 w-6 text-muted-foreground" />
                        }
                        title="No scorecards computed yet"
                        description="Scorecards are computed hourly. You can trigger a refresh from each component's detail page."
                      />
                    ) : (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        No components match the current filters.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/catalog/${row.componentId}?tab=scorecard`,
                      )
                    }
                  >
                    {/* Component name + kind badge */}
                    <TableCell>
                      <Link
                        href={`/catalog/${row.componentId}?tab=scorecard`}
                        className="font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.componentName}
                      </Link>
                      <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {row.componentKind}
                      </span>
                    </TableCell>

                    {/* Team */}
                    <TableCell className="text-sm text-muted-foreground">
                      {row.teamId ?? "—"}
                    </TableCell>

                    {/* Level */}
                    <TableCell>
                      <LevelBadge level={row.level} />
                    </TableCell>

                    {/* Score + progress bar */}
                    <TableCell>
                      <ScoreBar score={row.overallScore} />
                    </TableCell>

                    {/* Category scores */}
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {pct(row.categoryScores.ownershipDocs)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {pct(row.categoryScores.reliability)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {pct(row.categoryScores.security)}
                    </TableCell>

                    {/* Last evaluated */}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.evaluatedAt ? timeAgo(row.evaluatedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Show how many results are visible when filters are active */}
        {!isLoading && sorted.length > 0 && sorted.length < rows.length && (
          <p className="text-xs text-muted-foreground">
            Showing {sorted.length} of {rows.length} components
          </p>
        )}
      </div>
    </ErrorBoundary>
  );
}
