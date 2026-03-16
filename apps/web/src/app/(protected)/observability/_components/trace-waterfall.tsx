"use client";

import { useEffect, useState } from "react";
import { observability } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { JaegerSpan, JaegerTrace } from "@/types/api";

// Simple hash to pick a color class for a service name
function serviceColorClass(service: string): string {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = (hash * 31 + service.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length]!;
}

function formatDuration(us: number): string {
  if (us >= 1_000_000) return `${(us / 1_000_000).toFixed(2)}s`;
  if (us >= 1_000) return `${(us / 1_000).toFixed(2)}ms`;
  return `${us}µs`;
}

interface SpanNode extends JaegerSpan {
  depth: number;
  children: SpanNode[];
  serviceName: string;
}

function buildTree(
  trace: JaegerTrace,
): { roots: SpanNode[]; traceStart: number; traceDuration: number } {
  const spanMap = new Map<string, SpanNode>();

  for (const span of trace.spans) {
    const process = trace.processes[span.processID];
    spanMap.set(span.spanID, {
      ...span,
      depth: 0,
      children: [],
      serviceName: process?.serviceName ?? "unknown",
    });
  }

  const roots: SpanNode[] = [];

  for (const span of spanMap.values()) {
    const parentRef = span.references.find((r) => r.refType === "CHILD_OF");
    if (parentRef && spanMap.has(parentRef.spanID)) {
      spanMap.get(parentRef.spanID)!.children.push(span);
    } else {
      roots.push(span);
    }
  }

  function assignDepth(node: SpanNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) {
      assignDepth(child, depth + 1);
    }
  }
  for (const root of roots) assignDepth(root, 0);

  const traceStart = Math.min(...trace.spans.map((s) => s.startTime));
  const traceEnd = Math.max(
    ...trace.spans.map((s) => s.startTime + s.duration),
  );
  const traceDuration = traceEnd - traceStart || 1;

  return { roots, traceStart, traceDuration };
}

function flattenTree(nodes: SpanNode[]): SpanNode[] {
  const result: SpanNode[] = [];
  function visit(node: SpanNode) {
    result.push(node);
    for (const child of node.children) visit(child);
  }
  for (const root of nodes) visit(root);
  return result;
}

interface SpanRowProps {
  span: SpanNode;
  traceStart: number;
  traceDuration: number;
}

function SpanRow({ span, traceStart, traceDuration }: SpanRowProps) {
  const offsetPct = ((span.startTime - traceStart) / traceDuration) * 100;
  const widthPct = Math.max((span.duration / traceDuration) * 100, 0.5);
  const colorClass = serviceColorClass(span.serviceName);

  return (
    <div className="flex items-center gap-2 py-1 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <div
        className="flex items-center gap-2 min-w-0 shrink-0"
        style={{ width: "45%", paddingLeft: `${span.depth * 16}px` }}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full shrink-0 ${colorClass}`}
        />
        <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[80px]">
          {span.serviceName}
        </span>
        <span className="text-xs truncate font-mono">{span.operationName}</span>
      </div>

      <div className="relative flex-1 h-5 bg-muted rounded overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded opacity-80 ${colorClass}`}
          style={{
            left: `${offsetPct}%`,
            width: `${widthPct}%`,
          }}
        />
      </div>

      <span className="text-xs text-muted-foreground shrink-0 w-16 text-right font-mono">
        {formatDuration(span.duration)}
      </span>
    </div>
  );
}

interface TraceWaterfallProps {
  traceId: string;
}

export function TraceWaterfall({ traceId }: TraceWaterfallProps) {
  // Derive loading from whether we've fetched the current traceId yet —
  // avoids synchronous setState in useEffect body (react-hooks/set-state-in-effect).
  const [fetchedId, setFetchedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<JaegerTrace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = fetchedId !== traceId;

  useEffect(() => {
    let cancelled = false;
    observability
      .getTrace(traceId)
      .then((res) => {
        if (cancelled) return;
        if (!res.data || res.data.length === 0) {
          setError("Trace not found.");
          setTrace(null);
        } else {
          setTrace(res.data[0] ?? null);
          setError(null);
        }
        setFetchedId(traceId);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Jaeger not available");
        setTrace(null);
        setFetchedId(traceId);
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (loading) {
    return (
      <div className="space-y-1 mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!trace || trace.spans.length === 0) {
    return (
      <div className="mt-2 rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
        No spans in this trace.
      </div>
    );
  }

  const { roots, traceStart, traceDuration } = buildTree(trace);
  const flatSpans = flattenTree(roots);

  return (
    <div className="mt-2 rounded border bg-background p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{traceId.slice(0, 16)}…</span>
        <span>{flatSpans.length} spans · {formatDuration(traceDuration)}</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {flatSpans.map((span) => (
          <SpanRow
            key={span.spanID}
            span={span}
            traceStart={traceStart}
            traceDuration={traceDuration}
          />
        ))}
      </div>
    </div>
  );
}
