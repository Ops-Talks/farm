"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostEstimate } from "@/lib/api-client";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CostEstimateCardProps {
  estimate: CostEstimate;
}

function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function CostEstimateCard({ estimate }: CostEstimateCardProps) {
  const isIncrease = estimate.diffMonthlyCost > 0;
  const isDecrease = estimate.diffMonthlyCost < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Cost Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Estimated monthly cost */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium">Monthly Est.</span>
          <span className="font-semibold text-sm">
            {formatCost(estimate.estimatedMonthlyCost, estimate.currency)}/mo
          </span>
        </div>

        {/* Diff badge — only shown when there is a cost change */}
        {estimate.diffMonthlyCost !== 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium">vs. previous</span>
            <span
              className={[
                "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded",
                isIncrease
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              ].join(" ")}
            >
              {isIncrease ? (
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : isDecrease ? (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {isIncrease ? "+" : ""}
              {formatCost(estimate.diffMonthlyCost, estimate.currency)}
            </span>
          </div>
        )}

        {/* Last updated timestamp */}
        <div className="pt-1 border-t">
          <p className="text-[11px] text-muted-foreground">
            Last updated:{" "}
            <span className="font-medium">{formatRelativeTime(estimate.measuredAt)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
