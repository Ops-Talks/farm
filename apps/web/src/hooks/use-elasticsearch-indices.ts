"use client";

/**
 * useElasticsearchIndices (FARM-T405 / Phase 35)
 *
 * Fetches Elasticsearch indices linked to a component along with live cluster
 * health/document-count statistics. Polls every 30 seconds while the browser
 * tab is visible and pauses polling whenever `document.visibilityState` is
 * not `"visible"` (resuming with an immediate refetch when the tab regains
 * visibility).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  componentElasticsearchIndices,
  type ComponentElasticsearchIndexWithStats,
} from "@/lib/api-client";

const POLL_INTERVAL_MS = 30_000;

export interface UseElasticsearchIndicesResult {
  indices: ComponentElasticsearchIndexWithStats[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useElasticsearchIndices(
  componentId: string,
): UseElasticsearchIndicesResult {
  const [indices, setIndices] = useState<ComponentElasticsearchIndexWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the latest componentId via ref so the visibilitychange/interval
  // callbacks (declared once) always refetch against the current id.
  const componentIdRef = useRef(componentId);
  useEffect(() => {
    componentIdRef.current = componentId;
  }, [componentId]);

  const fetchIndices = useCallback(async (): Promise<void> => {
    const id = componentIdRef.current;
    setLoading(true);
    try {
      const data = await componentElasticsearchIndices.stats(id);
      setIndices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchIndices();
  }, [fetchIndices]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const isVisible = (): boolean =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const startPolling = (): void => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        if (!cancelled && isVisible()) {
          void fetchIndices();
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = (): void => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (isVisible()) {
        // Resume: immediate refetch, then restart the polling cadence.
        void fetchIndices();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial fetch always runs (matches sibling hook conventions). The
    // setState calls inside fetchIndices are intentional — this hook owns
    // the data subscription lifecycle, mirroring useFacetedSearch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchIndices();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    if (isVisible()) {
      startPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [componentId, fetchIndices]);

  return { indices, loading, error, refetch };
}
