"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { search as searchApi } from "@/lib/api-client";
import type { AdvancedSearchResult } from "@/types/api";

export interface FacetFilters {
  types: string[];
  namespace: string;
  tags: string[];
}

const EMPTY_RESULT: AdvancedSearchResult = {
  hits: [],
  total: 0,
  page: 1,
  totalPages: 0,
  facets: { types: [], namespaces: [], tags: [] },
  source: 'elasticsearch',
};

export function useFacetedSearch(enabled: boolean) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FacetFilters>({ types: [], namespace: "", tags: [] });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdvancedSearchResult>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (q: string, f: FacetFilters, p: number) => {
      if (!enabled || q.trim().length < 2) {
        setResult(EMPTY_RESULT);
        return;
      }
      setIsLoading(true);
      searchApi
        .advanced({
          q,
          types: f.types.length ? f.types : undefined,
          namespace: f.namespace || undefined,
          tags: f.tags.length ? f.tags : undefined,
          page: p,
        })
        .then((data) => setResult(data))
        .catch(() => setResult(EMPTY_RESULT))
        .finally(() => setIsLoading(false));
    },
    [enabled],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, filters, page), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filters, page, doSearch]);

  const toggleType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
    setPage(1);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
    setPage(1);
  }, []);

  const setNamespace = useCallback((ns: string) => {
    setFilters((prev) => ({ ...prev, namespace: ns }));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setFilters({ types: [], namespace: "", tags: [] });
    setPage(1);
    setResult(EMPTY_RESULT);
  }, []);

  return {
    query,
    setQuery: (q: string) => { setQuery(q); setPage(1); },
    filters,
    toggleType,
    toggleTag,
    setNamespace,
    page,
    setPage,
    result,
    isLoading,
    reset,
  };
}
