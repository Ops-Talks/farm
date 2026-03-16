"use client";

import { useState, useCallback } from "react";
import { observability } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { LokiStreamValue } from "@/types/api";

const TIME_RANGES = [
  { label: "15m", seconds: 15 * 60 },
  { label: "1h", seconds: 3600 },
  { label: "3h", seconds: 3 * 3600 },
  { label: "24h", seconds: 24 * 3600 },
] as const;

const MAX_LINES = 200;

interface ParsedLogLine {
  ts: string; // nanosecond string
  message: string;
  level: "error" | "warn" | "info" | "debug" | "unknown";
}

function detectLevel(
  line: string,
): ParsedLogLine["level"] {
  const lower = line.toLowerCase();
  if (lower.includes('"level":"error"') || lower.includes("error") || lower.includes("err")) return "error";
  if (lower.includes('"level":"warn"') || lower.includes("warn")) return "warn";
  if (lower.includes('"level":"debug"') || lower.includes("debug")) return "debug";
  if (lower.includes('"level":"info"') || lower.includes("info")) return "info";
  return "unknown";
}

function levelBadgeClass(level: ParsedLogLine["level"]): string {
  switch (level) {
    case "error": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "warn": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "info": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "debug": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default: return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

function parseStreams(streams: LokiStreamValue[]): ParsedLogLine[] {
  const lines: ParsedLogLine[] = [];
  for (const stream of streams) {
    for (const [ts, message] of stream.values) {
      lines.push({ ts, message, level: detectLevel(message) });
    }
  }
  // Sort by timestamp descending
  lines.sort((a, b) => (BigInt(b.ts) > BigInt(a.ts) ? 1 : -1));
  return lines;
}

function formatNanoTs(ns: string): string {
  try {
    const ms = Number(BigInt(ns) / BigInt(1_000_000));
    return new Date(ms).toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ns.slice(0, 10);
  }
}

export function LogsTab() {
  const [query, setQuery] = useState('{' + 'job="farm-api"' + '}');
  const [inputQuery, setInputQuery] = useState('{' + 'job="farm-api"' + '}');
  const [rangeIdx, setRangeIdx] = useState(1); // 1h default
  const [lines, setLines] = useState<ParsedLogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [ran, setRan] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MAX_LINES);

  const runQuery = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    setRan(true);
    setVisibleCount(MAX_LINES);
    const now = Date.now();
    const rangeSeconds = TIME_RANGES[rangeIdx].seconds;
    const end = Math.floor(now / 1000);
    const start = end - rangeSeconds;

    try {
      const res = await observability.getLogs({
        query: inputQuery,
        start,
        end,
        limit: MAX_LINES * 2,
        direction: "backward",
      });
      setQuery(inputQuery);
      if (res.status === "error" || !res.data) {
        setUnavailable(true);
        setLines([]);
      } else {
        const parsed = parseStreams(res.data.result);
        setLines(parsed);
      }
    } catch {
      setUnavailable(true);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [inputQuery, rangeIdx]);

  const displayed = lines.slice(0, visibleCount);
  const hasMore = lines.length > visibleCount;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={'LogQL query, e.g. {job="farm-api"}'}
          className="font-mono text-xs w-72"
          onKeyDown={(e) => e.key === "Enter" && runQuery()}
        />

        <div className="flex items-center gap-1">
          {TIME_RANGES.map((r, i) => (
            <Button
              key={r.label}
              size="sm"
              variant={rangeIdx === i ? "secondary" : "ghost"}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <Button size="sm" onClick={runQuery} disabled={loading}>
          {loading ? "Loading…" : "Run Query"}
        </Button>
      </div>

      {/* Body */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      )}

      {!loading && unavailable && (
        <EmptyState
          title="Loki not available"
          description="The log aggregation backend is currently unreachable."
        />
      )}

      {!loading && !unavailable && ran && lines.length === 0 && (
        <EmptyState
          title="No log lines found"
          description={`No results for query: ${query}`}
        />
      )}

      {!loading && !unavailable && !ran && (
        <div className="flex items-center justify-center rounded border border-dashed p-12 text-sm text-muted-foreground">
          Enter a LogQL query and press Run Query
        </div>
      )}

      {!loading && !unavailable && ran && lines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Showing {displayed.length} of {lines.length} lines
          </p>
          <div
            className="max-h-[500px] overflow-y-auto rounded border bg-muted/30 font-mono text-xs"
          >
            {displayed.map((line, i) => (
              <div
                key={i}
                className="flex gap-2 border-b border-border/30 px-3 py-1 last:border-0 hover:bg-muted/60"
              >
                <span className="shrink-0 text-muted-foreground w-16">
                  {formatNanoTs(line.ts)}
                </span>
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${levelBadgeClass(line.level)}`}
                >
                  {line.level}
                </span>
                <span className="break-all whitespace-pre-wrap">{line.message}</span>
              </div>
            ))}
          </div>
          {hasMore && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setVisibleCount((c) => c + MAX_LINES)}
            >
              Load more ({lines.length - visibleCount} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
