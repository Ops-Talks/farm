interface CostBudgetBarProps {
  totalCost: number;
  budgetUsd: number;
  currency?: string;
}

function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CostBudgetBar({
  totalCost,
  budgetUsd,
  currency = "USD",
}: CostBudgetBarProps) {
  const percentage = budgetUsd > 0 ? Math.min((totalCost / budgetUsd) * 100, 100) : 0;
  const isWarning = percentage >= 75;
  const isExceeded = percentage >= 100;

  const barColor = isExceeded
    ? "bg-red-500"
    : isWarning
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">
        {formatCost(totalCost, currency)} of {formatCost(budgetUsd, currency)} monthly budget used
      </div>
      <div
        className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget usage"
      >
        <div
          className={`${barColor} h-2 rounded transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
