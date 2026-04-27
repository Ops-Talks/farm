"use client";

/**
 * ElasticsearchOverviewClient (FARM-S354 / FARM-T406 / Phase 35).
 *
 * Cross-component admin view of every Elasticsearch index linked to a
 * catalog component, with live cluster health, document counts and store
 * size. Surfaces a deep-link into Kibana Discover when
 * `NEXT_PUBLIC_KIBANA_URL` is configured.
 *
 * The page is admin-only at the API layer; if the backend rejects with
 * 403, we render a "Forbidden" state instead of a generic error so deep
 * links from non-admins are not confusing.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  elasticsearchIndicesOverview,
  ApiError,
  type OverviewComponentGroup,
  type OverviewIndexEntry,
} from "@/lib/api-client";
import { buildKibanaDiscoverUrl, getKibanaUrl } from "@/lib/kibana-config";
import {
  EsHealthBadge,
  resolveEsHealthKind,
  type EsHealthKind,
} from "@/components/elasticsearch/EsHealthBadge";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

interface FlatRow {
  componentId: string;
  componentName: string;
  entry: OverviewIndexEntry;
  kind: EsHealthKind;
}

type FilterKind = "all" | "green" | "yellow" | "red" | "other";

const FILTER_OPTIONS: { value: FilterKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "other", label: "Other" },
];

/** Flatten the grouped backend response into one row per index, preserving order. */
function flatten(groups: OverviewComponentGroup[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const group of groups) {
    for (const entry of group.indices) {
      rows.push({
        componentId: group.componentId,
        componentName: group.componentName,
        entry,
        kind: resolveEsHealthKind(entry),
      });
    }
  }
  return rows;
}

function matchesFilter(kind: EsHealthKind, filter: FilterKind): boolean {
  if (filter === "all") return true;
  if (filter === "other") return kind === "unknown" || kind === "unreachable";
  return kind === filter;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function FilterChips({
  active,
  onChange,
}: {
  active: FilterKind;
  onChange: (next: FilterKind) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter indices by health"
      className="flex flex-wrap items-center gap-2"
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function OverviewTable({ rows }: { rows: FlatRow[] }) {
  const kibanaConfigured = Boolean(getKibanaUrl());

  if (rows.length === 0) {
    return (
      <div
        className="rounded-md border bg-muted/20 py-8 text-center"
        role="status"
      >
        <p className="text-sm text-muted-foreground">
          No indices match this filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table
        className="w-full text-sm"
        aria-label="Elasticsearch indices across all components"
      >
        <caption className="sr-only">
          All Elasticsearch indices linked to catalog components, with cluster
          health, document counts and store size.
        </caption>
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Component
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Index pattern
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Health
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Docs
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Store size
            </th>
            {kibanaConfigured && (
              <th scope="col" className="px-3 py-2 text-right font-medium">
                <span className="sr-only">Open in Kibana</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { entry } = row;
            const kibanaUrl = buildKibanaDiscoverUrl(entry.indexPattern);
            return (
              <tr
                key={`${row.componentId}:${entry.indexId}`}
                className="border-t hover:bg-muted/20"
                data-testid="es-overview-row"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/catalog/${row.componentId}`}
                    className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted hover:underline"
                  >
                    {row.componentName}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {entry.indexPattern}
                </td>
                <td className="px-3 py-2">
                  <EsHealthBadge row={entry} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {entry.stats
                    ? NUMBER_FORMATTER.format(entry.stats.docsCount)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {entry.stats?.storeSize ?? "—"}
                </td>
                {kibanaConfigured && (
                  <td className="px-3 py-2 text-right">
                    {kibanaUrl && (
                      <a
                        href={kibanaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        aria-label={`Open ${entry.indexPattern} in Kibana`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in Kibana
                      </a>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page client
// ---------------------------------------------------------------------------

const HEADER_TITLE = "Elasticsearch Indices";
const HEADER_SUBTITLE =
  "Cross-component view of every Elasticsearch index linked to a catalog component, with live cluster health.";

export function ElasticsearchOverviewClient() {
  const [groups, setGroups] = useState<OverviewComponentGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");

  // Bump to trigger a re-fetch (Retry button). The effect below only performs
  // setState inside async .then/.catch callbacks — never synchronously in the
  // effect body — so the `react-hooks/set-state-in-effect` rule stays happy.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    elasticsearchIndicesOverview
      .list()
      .then((data) => {
        if (cancelled) return;
        setGroups(data);
        setLoading(false);
        setError(null);
        setForbidden(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Failed to load Elasticsearch indices."));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const flatRows = useMemo(
    () => (groups ? flatten(groups) : []),
    [groups],
  );

  const filteredRows = useMemo(
    () => flatRows.filter((row) => matchesFilter(row.kind, filter)),
    [flatRows, filter],
  );

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={HEADER_TITLE} description={HEADER_SUBTITLE} />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6 text-destructive" />}
          title="Forbidden — admin access required"
          description="This page is restricted to administrators. Contact your platform admin if you need access."
        />
      </div>
    );
  }

  if (loading && !groups) {
    return (
      <div className="flex flex-col gap-6" data-testid="es-overview-loading">
        <PageHeader title={HEADER_TITLE} description={HEADER_SUBTITLE} />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={HEADER_TITLE} description={HEADER_SUBTITLE} />
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>
              Failed to load Elasticsearch indices: {error.message}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={reload}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hasAnyData = flatRows.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={HEADER_TITLE} description={HEADER_SUBTITLE} />

      {hasAnyData ? (
        <>
          <FilterChips active={filter} onChange={setFilter} />
          <OverviewTable rows={filteredRows} />
        </>
      ) : (
        <EmptyState
          title="No indices linked"
          description="Link Elasticsearch indices to components from the Elasticsearch tab on each component detail page."
        >
          <Link
            href="/catalog"
            className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Browse catalog
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
