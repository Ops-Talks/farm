"use client";

import { useEffect, useCallback, useRef, useState, type ElementType, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  BookOpen,
  Users,
  Building2,
  GitPullRequest,
  FileText,
  Server,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacetedSearch } from "@/hooks/use-faceted-search";

// ── Highlight helper ────────────────────────────────────────────────────────
// Takes the first fragment from the highlights array, swaps <em>…</em> for
// <strong>…</strong>, then strips every other HTML tag to prevent XSS.
function renderHighlight(fragments: string[] | undefined, fallback: string): string {
  if (!fragments?.length) return fallback;
  const raw = fragments[0]!;
  const withStrong = raw.replace(/<em>/gi, '<strong>').replace(/<\/em>/gi, '</strong>');
  // strip any remaining tags except <strong> and </strong>
  return withStrong.replace(/<(?!\/?strong[ />])[^>]+>/gi, '');
}

// ── Type icon map ────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, ElementType> = {
  component: BookOpen,
  team: Users,
  organization: Building2,
  pipeline: GitPullRequest,
  documentation: FileText,
  environment: Server,
};

function ResultIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? Search;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

// ── Component props ──────────────────────────────────────────────────────────
interface AdvancedSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdvancedSearchModal({ open, onClose }: AdvancedSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [facetsPanelOpen, setFacetsPanelOpen] = useState(true);

  const {
    query,
    setQuery,
    filters,
    toggleType,
    toggleTag,
    setNamespace,
    page,
    setPage,
    result,
    isLoading,
    reset,
  } = useFacetedSearch(open);

  // Focus input & reset when modal opens
  useEffect(() => {
    if (open) {
      void Promise.resolve().then(() => reset());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, reset]);

  // Reset selection when hits change
  useEffect(() => {
    void Promise.resolve().then(() => setSelectedIndex(0));
  }, [result.hits.length]);

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, result.hits.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && result.hits[selectedIndex]) {
        handleNavigate(result.hits[selectedIndex].url);
      }
    },
    [result.hits, selectedIndex, handleNavigate, onClose],
  );

  if (!open) return null;

  const { hits, facets, total, totalPages, source } = result;
  const hasQuery = query.trim().length >= 2;

  // Only show facet sections that have entries
  const showTypesFacet = facets.types.length > 0;
  const showNamespacesFacet = facets.namespaces.length > 0;
  const showTagsFacet = facets.tags.length > 0;
  const hasFacets = showTypesFacet || showNamespacesFacet || showTagsFacet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Advanced search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-4xl mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[80vh]">

        {/* ── Header: search input ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search components, teams, docs, environments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search query"
            aria-autocomplete="list"
            aria-controls="advanced-search-results"
          />
          {/* Mobile facet toggle */}
          <button
            onClick={() => setFacetsPanelOpen((v) => !v)}
            className="md:hidden text-muted-foreground hover:text-foreground p-1"
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </button>
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground ml-1"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Source degradation badge ── */}
        {source === 'database' && (
          <div className="shrink-0 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Full-text search unavailable — showing basic results
            </p>
          </div>
        )}

        {/* ── Body: facets + results ── */}
        <div className="flex flex-1 min-h-0">

          {/* Left pane: facets (280px, collapsible on mobile) */}
          <aside
            className={cn(
              "w-[280px] shrink-0 border-r overflow-y-auto",
              !facetsPanelOpen && "hidden md:block",
            )}
            aria-label="Search filters"
          >
            {!hasFacets ? (
              <p className="px-4 py-6 text-xs text-muted-foreground">
                {hasQuery ? "No filters available" : "Filters appear after searching"}
              </p>
            ) : (
              <div className="px-3 py-3 space-y-4">
                {/* Types facet */}
                {showTypesFacet && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Type
                    </p>
                    <ul className="space-y-1">
                      {facets.types.map((bucket) => (
                        <li key={bucket.key}>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={filters.types.includes(bucket.key)}
                              onChange={() => toggleType(bucket.key)}
                              className="rounded border-muted-foreground"
                              aria-label={`Filter by type ${bucket.key}`}
                            />
                            <span className="text-sm flex-1 group-hover:text-foreground text-muted-foreground capitalize">
                              {bucket.key}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {bucket.count}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Namespaces facet */}
                {showNamespacesFacet && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Namespace
                    </p>
                    <ul className="space-y-1">
                      {facets.namespaces.map((bucket) => (
                        <li key={bucket.key}>
                          <button
                            onClick={() =>
                              setNamespace(filters.namespace === bucket.key ? "" : bucket.key)
                            }
                            className={cn(
                              "flex w-full items-center justify-between text-sm px-1 py-0.5 rounded hover:bg-muted",
                              filters.namespace === bucket.key && "bg-muted font-medium",
                            )}
                          >
                            <span className="truncate">{bucket.key}</span>
                            <span className="text-xs text-muted-foreground tabular-nums ml-2">
                              {bucket.count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags facet */}
                {showTagsFacet && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Tags
                    </p>
                    <ul className="space-y-1">
                      {facets.tags.map((bucket) => (
                        <li key={bucket.key}>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={filters.tags.includes(bucket.key)}
                              onChange={() => toggleTag(bucket.key)}
                              className="rounded border-muted-foreground"
                              aria-label={`Filter by tag ${bucket.key}`}
                            />
                            <span className="text-sm flex-1 group-hover:text-foreground text-muted-foreground">
                              {bucket.key}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {bucket.count}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Right pane: results */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Result count — only when there are results */}
            {hasQuery && !isLoading && total > 0 && (
              <div className="px-4 py-2 border-b shrink-0">
                <p className="text-xs text-muted-foreground">
                  {`${total.toLocaleString()} result${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            )}

            {/* Results list */}
            <div
              id="advanced-search-results"
              role="listbox"
              className="flex-1 overflow-y-auto"
            >
              {!hasQuery ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              ) : isLoading ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Searching...
                </p>
              ) : hits.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              ) : (
                <ul>
                  {hits.map((hit, i) => (
                    <li
                      key={`${hit.type}-${hit.id}`}
                      role="option"
                      aria-selected={i === selectedIndex}
                    >
                      <button
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors",
                          i === selectedIndex && "bg-muted",
                        )}
                        onClick={() => handleNavigate(hit.url)}
                      >
                        <ResultIcon type={hit.type} />
                        <div className="flex-1 min-w-0">
                          {/* Name with highlight */}
                          <span
                            className="text-sm font-medium"
                            dangerouslySetInnerHTML={{
                              __html: renderHighlight(hit.highlights?.name, hit.name),
                            }}
                          />
                          {/* Description with highlight */}
                          {(hit.highlights?.description || hit.description) && (
                            <p
                              className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                              dangerouslySetInnerHTML={{
                                __html: renderHighlight(
                                  hit.highlights?.description,
                                  hit.description ?? "",
                                ),
                              }}
                            />
                          )}
                          {/* Meta row: namespace + tags */}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {hit.namespace && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                {hit.namespace}
                              </span>
                            )}
                            {hit.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Type badge */}
                        <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0 mt-0.5">
                          {hit.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="shrink-0 border-t px-4 py-2 flex items-center justify-between">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: keyboard hints ── */}
        <div className="shrink-0 border-t px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
