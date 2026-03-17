"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { pipelines as pipelinesApi, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pipeline } from "@/types/api";

const MAX_PIPELINES = 5;

export function RecentPipelinesWidget() {
  const [pipelineList, setPipelineList] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const fetchPipelines = useCallback(() => {
    pipelinesApi
      .list()
      .then((data) => setPipelineList(data.slice(0, MAX_PIPELINES)))
      .catch(() => setPipelineList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleTrigger = (id: string, name: string) => {
    setTriggeringId(id);
    pipelinesApi
      .trigger(id)
      .then((run) => {
        toast.success(`Pipeline "${name}" triggered — Run ${run.id.slice(0, 8)}`);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to trigger pipeline");
        }
      })
      .finally(() => setTriggeringId(null));
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Pipelines</CardTitle>
          <Link
            href="/pipelines"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View all pipelines"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : pipelineList.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No pipelines configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineList.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell>
                    <Link
                      href={`/pipelines/${pipeline.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {pipeline.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(pipeline.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTrigger(pipeline.id, pipeline.name)}
                      disabled={triggeringId === pipeline.id}
                      aria-label={`Trigger pipeline ${pipeline.name}`}
                    >
                      {triggeringId === pipeline.id ? "Triggering..." : "Trigger"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
