"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { subscribe } from "@/lib/ws-client";
import { FarmEvent, PipelineRunStatus } from "@/types/api";
import type { PipelineRun, AuditLog } from "@/types/api";

// FinOps WebSocket event payloads (Phase 19)
interface CostActualBudgetExceededPayload {
  componentId: string;
  totalCost: number;
  budgetUsd: number;
  timestamp: string;
}

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

    // S116 / FARM-E26: pipeline.run.updated → toast for terminal statuses only.
    // WAITING_APPROVAL and RUNNING/QUEUED are intentionally omitted — the run
    // detail page handles those states with inline UI.
    const unsubPipeline = subscribe(
      FarmEvent.PIPELINE_RUN_UPDATED,
      (payload) => {
        const run = payload as unknown as PipelineRun;
        const shortId = run.id.slice(0, 8);

        if (run.status === PipelineRunStatus.SUCCEEDED) {
          toast.success(`Pipeline run ${shortId} → SUCCEEDED`);
        } else if (run.status === PipelineRunStatus.FAILED) {
          toast.error(`Pipeline run ${shortId} → FAILED`);
        } else if (run.status === PipelineRunStatus.CANCELLED) {
          toast.info(`Pipeline run ${shortId} → CANCELLED`);
        }
      },
    );

    // Phase 19 — FinOps: actual cost budget exceeded → warning toast
    const unsubCostActual = subscribe(
      FarmEvent.COST_ACTUAL_BUDGET_EXCEEDED,
      (payload) => {
        const event = payload as unknown as CostActualBudgetExceededPayload;
        const totalStr = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(event.totalCost);
        const budgetStr = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(event.budgetUsd);
        toast.warning(
          `Component ${event.componentId} exceeded monthly budget: ${totalStr} vs ${budgetStr} budget`,
        );
      },
    );

    return () => {
      unsubAudit();
      unsubPipeline();
      unsubCostActual();
    };
  }, []);

  return null;
}
