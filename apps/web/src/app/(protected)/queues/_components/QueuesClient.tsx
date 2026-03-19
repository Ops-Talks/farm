"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { queues as queuesApi } from "@/lib/api-client";
import { subscribe, FarmEvent } from "@/lib/ws-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueInfo } from "@/types/api";

function statusColor(count: number, type: "failed" | "active" | "delayed"): string {
  if (count === 0) return "text-muted-foreground";
  if (type === "failed") return "text-red-600 font-semibold";
  if (type === "active") return "text-blue-600 font-semibold";
  return "text-yellow-600 font-semibold";
}

function QueueCard({ queue }: { queue: QueueInfo }) {
  const total =
    queue.jobCounts.active +
    queue.jobCounts.completed +
    queue.jobCounts.failed +
    queue.jobCounts.delayed +
    queue.jobCounts.waiting;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <Link href={`/queues/${encodeURIComponent(queue.name)}`} className="hover:underline">
              {queue.name}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-2">
            {queue.isPaused && <Badge variant="secondary">Paused</Badge>}
            <Badge variant="outline">{total} total</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          <div className="text-center">
            <div className={`text-2xl ${statusColor(queue.jobCounts.active, "active")}`}>
              {queue.jobCounts.active}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-muted-foreground">{queue.jobCounts.waiting}</div>
            <div className="text-xs text-muted-foreground">Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-green-600">{queue.jobCounts.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl ${statusColor(queue.jobCounts.failed, "failed")}`}>
              {queue.jobCounts.failed}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl ${statusColor(queue.jobCounts.delayed, "delayed")}`}>
              {queue.jobCounts.delayed}
            </div>
            <div className="text-xs text-muted-foreground">Delayed</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link href={`/queues/${encodeURIComponent(queue.name)}`}>
            <Button variant="outline" size="sm">View Jobs</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function QueuesClient() {
  const [queueList, setQueueList] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueues = useCallback(() => {
    queuesApi
      .list()
      .then((data) => {
        setQueueList(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load queues");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 15000);

    const unsub1 = subscribe(FarmEvent.COMPONENT_CREATED, fetchQueues);
    const unsub2 = subscribe(FarmEvent.DEPLOYMENT_CREATED, fetchQueues);

    return () => {
      clearInterval(interval);
      unsub1();
      unsub2();
    };
  }, [fetchQueues]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Queues</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Queues</h1>
        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            Open Bull Board
          </Button>
        </a>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {queueList.length === 0 && !error ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No queues registered. Queues require Redis to be configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queueList.map((q) => (
            <QueueCard key={q.name} queue={q} />
          ))}
        </div>
      )}
    </div>
  );
}
