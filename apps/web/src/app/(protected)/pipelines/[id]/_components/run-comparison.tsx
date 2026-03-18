"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pipelines as pipelinesApi } from "@/lib/api-client";
// Rename the data interface to avoid collision with the component name
import type { RunComparison as RunComparisonData } from "@/lib/api-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

/** Formats a duration delta with a leading sign (+/-). */
function formatDelta(deltaMs: number | null): string {
  if (deltaMs == null) return "—";
  const sign = deltaMs > 0 ? "+" : deltaMs < 0 ? "-" : "";
  return `${sign}${formatDuration(Math.abs(deltaMs))}`;
}

/** Returns a Tailwind class to colour the delta value red/green. */
function deltaColor(deltaMs: number | null): string {
  if (deltaMs == null || deltaMs === 0) return "";
  return deltaMs > 0
    ? "text-destructive" // slower — bad
    : "text-green-600 dark:text-green-400"; // faster — good
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RunComparisonProps {
  pipelineId: string;
  runIdA: string;
  runIdB: string;
  /**
   * Controls both Sheet visibility and the useQuery `enabled` flag.
   * When false the sheet is hidden and no network request is made.
   */
  open?: boolean;
  onClose: () => void;
}

export function RunComparison({
  pipelineId,
  runIdA,
  runIdB,
  open = true,
  onClose,
}: RunComparisonProps) {
  // Fetch only when the sheet is open AND both run IDs are present.
  // This prevents a stale network request when the component is mounted
  // but not yet visible (open=false).
  const { data, isLoading } = useQuery<RunComparisonData>({
    queryKey: ["run-compare", pipelineId, runIdA, runIdB],
    queryFn: () => pipelinesApi.runs.compare(pipelineId, runIdA, runIdB),
    enabled: open && !!runIdA && !!runIdB,
  });

  return (
    // Sheet visibility is driven by the `open` prop — the parent can toggle
    // it without unmounting the component (preserving query cache).
    <Sheet
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose();
      }}
    >
      {/* Wide sheet to accommodate the stage-diff table */}
      <SheetContent
        className="w-full sm:max-w-3xl overflow-y-auto flex flex-col gap-6"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>
            Comparing Run #{runIdA.slice(0, 8)} vs #{runIdB.slice(0, 8)}
          </SheetTitle>
        </SheetHeader>

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        )}

        {/* ── Error state ── */}
        {!isLoading && !data && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Failed to load comparison data.
          </p>
        )}

        {/* ── Comparison content ── */}
        {!isLoading && data && (
          <div className="flex flex-col gap-6">
            {/* Summary cards — one per run */}
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  { run: data.runA, label: "Run A" },
                  { run: data.runB, label: "Run B" },
                ] as const
              ).map(({ run, label }) => (
                <Card key={run.id}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium">
                      {label} —{" "}
                      <span className="font-mono text-xs">
                        #{run.id.slice(0, 8)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      Status:
                      <Badge variant="outline" className="capitalize text-xs">
                        {run.status}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">
                      Triggered by:{" "}
                      <span className="text-foreground font-medium">
                        {run.triggeredBy}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Duration:{" "}
                      <span className="text-foreground font-medium">
                        {formatDuration(run.durationMs)}
                      </span>
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stage diff table */}
            <div>
              <h3 className="text-sm font-medium mb-3">Stage Differences</h3>

              {data.stageDiff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No stage data available for this comparison.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status A</TableHead>
                        <TableHead>Status B</TableHead>
                        <TableHead>Duration A</TableHead>
                        <TableHead>Duration B</TableHead>
                        <TableHead>Delta</TableHead>
                        <TableHead>Changed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.stageDiff.map((entry) => (
                        <TableRow
                          key={entry.stageId}
                          // Highlight rows where something changed
                          className={
                            entry.changed
                              ? "bg-amber-50 dark:bg-amber-950/20"
                              : undefined
                          }
                        >
                          <TableCell className="font-mono text-xs">
                            {entry.stageId.slice(0, 8)}
                          </TableCell>

                          <TableCell>
                            {entry.statusA ? (
                              <Badge
                                variant="outline"
                                className="capitalize text-xs"
                              >
                                {entry.statusA}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {entry.statusB ? (
                              <Badge
                                variant="outline"
                                className="capitalize text-xs"
                              >
                                {entry.statusB}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-sm">
                            {formatDuration(entry.durationMsA)}
                          </TableCell>

                          <TableCell className="text-sm">
                            {formatDuration(entry.durationMsB)}
                          </TableCell>

                          <TableCell
                            className={`text-sm font-medium ${deltaColor(entry.durationDeltaMs)}`}
                          >
                            {formatDelta(entry.durationDeltaMs)}
                          </TableCell>

                          <TableCell>
                            {entry.changed ? (
                              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
