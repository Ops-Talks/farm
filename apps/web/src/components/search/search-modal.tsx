"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, X, BookOpen, Users, Building2, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";
import { search as searchApi } from "@/lib/api-client";
import type { QuickSearchResult } from "@/types/api";

const TYPE_ICONS: Record<string, ElementType> = {
  component: BookOpen,
  team: Users,
  organization: Building2,
  pipeline: GitPullRequest,
};

function ResultIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? Search;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["quick-search", query],
    queryFn: () => searchApi.quick(query),
    enabled: open && query.trim().length >= 2,
    staleTime: 5_000,
  });

  const results: QuickSearchResult[] = useMemo(
    () => data ?? [],
    [data],
  );

  useEffect(() => {
    if (open) {
      // Async state reset avoids synchronous setState in the effect body.
      void Promise.resolve().then(() => {
        setQuery("");
        setSelectedIndex(0);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    // Reset selection when the result set changes (async to avoid cascading renders).
    void Promise.resolve().then(() => setSelectedIndex(0));
  }, [results.length]);

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
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        handleNavigate(results[selectedIndex].url);
      }
    },
    [results, selectedIndex, handleNavigate, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Quick search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* Search input row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search components, teams, docs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search query"
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div
          id="search-results"
          role="listbox"
          className="max-h-80 overflow-y-auto"
        >
          {query.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
          ) : isFetching ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul>
              {results.map((result, i) => (
                <li key={`${result.type}-${result.id}`} role="option" aria-selected={i === selectedIndex}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors",
                      i === selectedIndex && "bg-muted",
                    )}
                    onClick={() => handleNavigate(result.url)}
                  >
                    <ResultIcon type={result.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0">
                      {result.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">{"\u2191"}{"\u2193"}</kbd> navigate</span>
          <span><kbd className="font-mono">{"\u21b5"}</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
