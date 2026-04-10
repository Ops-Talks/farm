"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CostBudgetExceededBannerProps {
  delta: number;
  currency: string;
  onDismiss: () => void;
}

function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CostBudgetExceededBanner({
  delta,
  currency,
  onDismiss,
}: CostBudgetExceededBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-900/20"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm font-medium text-red-700 dark:text-red-300">
        Cost estimate exceeds monthly budget by{" "}
        <span className="font-bold">{formatCost(delta, currency)}</span>.
      </p>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss budget alert"
        className="h-5 w-5 shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/30"
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
