'use client';

// CatalogAnalyticsTab — shows ownership coverage, lifecycle / kind
// distributions, and the list of unowned components.
// Data is fetched once via React Query; no user-controlled parameters needed.

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { analytics } from '@/lib/api-client';
import type { CatalogAnalytics } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------- Distribution bar helpers -----------------------------------------

/** A single row in a distribution table: label | inline bar | count */
function DistributionRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-28 shrink-0 text-sm font-medium capitalize">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
        {count} ({pct}%)
      </span>
    </div>
  );
}

// ---------- Loading skeleton --------------------------------------------------

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ---------- Main component ---------------------------------------------------

export function CatalogAnalyticsTab() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useQuery<CatalogAnalytics>({
    queryKey: ['analytics', 'catalog'],
    queryFn: () => analytics.getCatalog(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  if (isLoading) return <CatalogSkeleton />;

  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">
        Failed to load catalog analytics.
      </p>
    );
  }

  // Empty state: no components at all
  if (!data || data.ownershipCoverage.total === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-16 text-sm text-muted-foreground">
        No components in catalog yet
      </div>
    );
  }

  const { ownershipCoverage, lifecycleDistribution, kindDistribution, unownedComponents } = data;
  const coveragePct = Math.round(ownershipCoverage.coveragePercent);

  return (
    <div className="space-y-6">
      {/* 1. Ownership Coverage ------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big percentage */}
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums">{coveragePct}%</span>
            <span className="mb-1 text-sm text-muted-foreground">
              {ownershipCoverage.withOwner} of {ownershipCoverage.total} components have an owner
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${coveragePct}%` }}
              role="progressbar"
              aria-valuenow={coveragePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Ownership coverage: ${coveragePct}%`}
            />
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{ownershipCoverage.withOwner}</span>{' '}
              owned
            </span>
            <span>
              <span className="font-medium text-foreground">{ownershipCoverage.withoutOwner}</span>{' '}
              unowned
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Lifecycle Distribution ------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {lifecycleDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div>
              {lifecycleDistribution.map((row) => (
                <DistributionRow
                  key={row.lifecycle}
                  label={row.lifecycle}
                  count={row.count}
                  total={ownershipCoverage.total}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Kind Distribution ------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>Kind Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {kindDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div>
              {kindDistribution.map((row) => (
                <DistributionRow
                  key={row.kind}
                  label={row.kind}
                  count={row.count}
                  total={ownershipCoverage.total}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Unowned Components ----------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            Unowned Components{' '}
            {unownedComponents.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unownedComponents.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unownedComponents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All components have an owner. Great job!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unownedComponents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/catalog/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.kind}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
