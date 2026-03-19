'use client';

// CloudCostWidget — monthly cloud spend summary card.
// Shows total spend across all providers and per-environment breakdown.

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cloud as cloudApi } from '@/lib/api-client';
import type { CloudCostEntry } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderSummary {
  provider: string;
  total: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROVIDER_COLORS: Record<string, string> = {
  aws: 'bg-orange-400',
  gcp: 'bg-blue-400',
  azure: 'bg-sky-500',
};

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
};

function sumEntries(entries: CloudCostEntry[]): number {
  return entries.reduce((acc, e) => acc + e.cost, 0);
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CostWidgetSkeleton() {
  return (
    <Card data-testid="cloud-cost-widget-skeleton">
      <CardHeader>
        <CardTitle className="text-base">Cloud Spend (30 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Provider bar row
// ---------------------------------------------------------------------------

interface ProviderBarProps {
  provider: string;
  total: number;
  maxTotal: number;
  currency: string;
}

function ProviderBar({ provider, total, maxTotal, currency }: ProviderBarProps) {
  const label = PROVIDER_LABELS[provider] ?? provider.toUpperCase();
  const colorClass = PROVIDER_COLORS[provider] ?? 'bg-gray-400';
  const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-xs font-medium text-right shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} spend percentage`}
        />
      </div>
      <span className="w-20 text-xs text-right text-muted-foreground shrink-0">
        {formatCurrency(total, currency)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Environment breakdown table
// ---------------------------------------------------------------------------

interface EnvBreakdownProps {
  entries: { environment: string; cost: number; currency: string }[];
}

function EnvBreakdown({ entries }: EnvBreakdownProps) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        By Environment
      </p>
      <table className="w-full text-sm" aria-label="Cost breakdown by environment">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left pb-1 font-medium">Environment</th>
            <th className="text-right pb-1 font-medium">Cost</th>
            <th className="text-right pb-1 font-medium">Currency</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => (
            <tr key={`${e.environment}-${idx}`} className="border-b last:border-0">
              <td className="py-1.5 text-foreground">{e.environment}</td>
              <td className="py-1.5 text-right font-mono">{formatCurrency(e.cost, e.currency)}</td>
              <td className="py-1.5 text-right text-muted-foreground text-xs">{e.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CloudCostWidget() {
  const { isAuthenticated } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';

  const { data: costData = [], isPending } = useQuery({
    queryKey: ['cloud-cost', orgId],
    queryFn: () => cloudApi.getCost(orgId, 30),
    enabled: isAuthenticated && !!orgId,
  });

  if (isPending) {
    return <CostWidgetSkeleton />;
  }

  // Empty state: no providers connected
  if (costData.length === 0) {
    return (
      <Card data-testid="cloud-cost-widget">
        <CardHeader>
          <CardTitle className="text-base">Cloud Spend (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No cost data available.{' '}
            <Link href="/integrations/cloud" className="text-primary hover:underline">
              Connect a cloud provider
            </Link>{' '}
            to start tracking spend.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute per-provider totals
  const providerSummaries: ProviderSummary[] = costData.map((pd) => ({
    provider: pd.provider,
    total: sumEntries(pd.entries),
    currency: pd.entries[0]?.currency ?? 'USD',
  }));

  const grandTotal = providerSummaries.reduce((acc, s) => acc + s.total, 0);
  const maxProviderTotal = Math.max(...providerSummaries.map((s) => s.total), 0);
  const primaryCurrency = providerSummaries[0]?.currency ?? 'USD';

  // Flatten all entries for env breakdown, deduplicate by environment
  const envMap = new Map<string, { cost: number; currency: string }>();
  for (const pd of costData) {
    for (const entry of pd.entries) {
      const existing = envMap.get(entry.environment);
      if (existing) {
        existing.cost += entry.cost;
      } else {
        envMap.set(entry.environment, { cost: entry.cost, currency: entry.currency });
      }
    }
  }
  const envEntries = Array.from(envMap.entries())
    .map(([environment, { cost, currency }]) => ({ environment, cost, currency }))
    .sort((a, b) => b.cost - a.cost);

  return (
    <Card data-testid="cloud-cost-widget">
      <CardHeader>
        <CardTitle className="text-base">Cloud Spend (30 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grand total */}
        <div>
          <p className="text-2xl font-bold">
            {formatCurrency(grandTotal, primaryCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Total across all providers</p>
        </div>

        {/* Per-provider bars */}
        <div className="space-y-2">
          {providerSummaries.map((s) => (
            <ProviderBar
              key={s.provider}
              provider={s.provider}
              total={s.total}
              maxTotal={maxProviderTotal}
              currency={s.currency}
            />
          ))}
        </div>

        {/* Environment breakdown */}
        <EnvBreakdown entries={envEntries} />
      </CardContent>
    </Card>
  );
}
