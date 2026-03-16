"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { subscribe } from "@/lib/ws-client";
import { FarmEvent } from "@/types/api";
import type { PipelineRun, AuditLog } from "@/types/api";

/**
 * NotificationListener — mounts inside AuthGuard / AppShell after auth is ready.
 * Subscribes to WebSocket events and shows Sonner toast notifications.
 * Renders nothing in the DOM.
 */
export function NotificationListener() {
  useEffect(() => {
    // S116: audit-log.created → subtle info toast
    const unsubAudit = subscribe(
      FarmEvent.AUDIT_LOG_CREATED,
      (payload) => {
        const log = payload as unknown as AuditLog;
        toast.info(
          `${log.actor} ${log.action} ${log.resourceType}`,
          { duration: 3000 },
        );
      },
    );

    // S116: pipeline.run.updated → success/error based on status
    const unsubPipeline = subscribe(
      FarmEvent.PIPELINE_RUN_UPDATED,
      (payload) => {
        const run = payload as unknown as PipelineRun;
        if (run.status === "succeeded") {
          toast.success("Pipeline run completed");
        } else if (run.status === "failed") {
          toast.error("Pipeline run failed");
        }
      },
    );

    return () => {
      unsubAudit();
      unsubPipeline();
    };
  }, []);

  return null;
}
