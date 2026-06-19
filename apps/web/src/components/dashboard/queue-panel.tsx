"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queues } from "@/lib/api-client";
import type { QueueInfo } from "@/types/api";

const REFRESH_INTERVAL = 30_000;
const BULL_BOARD_URL = "/admin/queues";

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact" });

function fmtCompact(n: number): string {
  return COMPACT.format(n);
}

function JobCount({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium tabular-nums">{fmtCompact(count)}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function QueuePanel() {
  const [queuesData, setQueuesData] = useState<QueueInfo[] | null>(null);
  const [updated, setUpdated] = useState(false);
  const mountedRef = useRef(true);
  const firstLoad = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    function fetchQueues() {
      queues
        .list()
        .then((data) => {
          if (!mountedRef.current) return;
          setQueuesData(data);
          if (!firstLoad.current) {
            setUpdated(true);
            setTimeout(() => {
              if (mountedRef.current) setUpdated(false);
            }, 2000);
          }
          firstLoad.current = false;
        })
        .catch(() => {
          if (mountedRef.current) setQueuesData([]);
          if (!firstLoad.current) {
            setUpdated(true);
            setTimeout(() => {
              if (mountedRef.current) setUpdated(false);
            }, 2000);
          }
          firstLoad.current = false;
        });
    }
    fetchQueues();
    const interval = setInterval(fetchQueues, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Background Queues
            </CardTitle>
            <span
              className={`text-xs text-muted-foreground transition-opacity duration-500 ease-out ${updated ? "opacity-100" : "opacity-0"}`}
            >
              Updated
            </span>
          </div>
          <a
            href={BULL_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Open Bull Board
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queuesData === null ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : queuesData.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No queues found.
            </p>
          ) : (
            queuesData.map((q) => (
              <div key={q.name} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {q.name}
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <JobCount count={q.jobCounts.waiting} label="waiting" />
                    <JobCount count={q.jobCounts.active} label="active" />
                    {q.jobCounts.failed > 0 && (
                      <JobCount count={q.jobCounts.failed} label="failed" />
                    )}
                    <JobCount count={q.jobCounts.completed} label="completed" />
                  </div>
                </div>
                {q.isPaused && (
                  <span className="shrink-0 rounded border border-amber-600/30 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    Paused
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
