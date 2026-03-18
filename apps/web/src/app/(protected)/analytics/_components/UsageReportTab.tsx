'use client';

// UsageReportTab — shows audit event totals, action breakdown, top accessed
// components, and most active users for the selected period.
// Also exposes a CSV export button that triggers a browser file download.

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { analytics } from '@/lib/api-client';
import type { UsageAnalytics } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------- Types -------------------------------------------------------------

interface UsageReportTabProps {
  days: number;
}

// ---------- Loading skeleton -------------------------------------------------

function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ---------- Inline percentage bar --------------------------------------------

function PctBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground tabular-nums shrink-0">
        {pct}%
      </span>
    </div>
  );
}

// ---------- Main component ---------------------------------------------------

export function UsageReportTab({ days }: UsageReportTabProps) {
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError } = useQuery<UsageAnalytics>({
    queryKey: ['analytics', 'usage', days],
    queryFn: () => analytics.getUsage({ days }),
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await analytics.exportReport('usage', days);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <UsageSkeleton />;

  if (isError) {
    return (
      <p className="text-sm text-destructive py-4">
        Failed to load usage report.
      </p>
    );
  }

  if (!data || data.totalAuditEvents === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-16 text-sm text-muted-foreground">
        No activity recorded in this period
      </div>
    );
  }

  const { totalAuditEvents, actionBreakdown, topComponents, activeUsers } = data;
  const maxActionCount = Math.max(...actionBreakdown.map((a) => a.count), 1);

  return (
    <div className="space-y-6">
      {/* Header row: total events badge + export button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total audit events:</span>
          <Badge variant="secondary" className="text-sm font-semibold tabular-nums">
            {totalAuditEvents.toLocaleString()}
          </Badge>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Action Breakdown --------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Action Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {actionBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions recorded</p>
          ) : (
            <div className="space-y-2">
              {actionBreakdown.map((row) => (
                <div key={row.action} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm font-mono">{row.action}</span>
                  <div className="flex-1">
                    <PctBar count={row.count} max={maxActionCount} />
                  </div>
                  <span className="w-14 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                    {row.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Components --------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Top Components</CardTitle>
          </CardHeader>
          <CardContent>
            {topComponents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No component access recorded</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Accesses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topComponents.map((c) => (
                    <TableRow key={c.componentId}>
                      <TableCell>
                        <Link
                          href={`/catalog/${c.componentId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.componentName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.accessCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Users ------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {activeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No user activity recorded</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((u) => (
                    <TableRow key={u.actorId}>
                      <TableCell className="font-medium">{u.actorUsername}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.actionCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
