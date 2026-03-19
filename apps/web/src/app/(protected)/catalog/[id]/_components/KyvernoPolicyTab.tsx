'use client';

// KyvernoPolicyTab — shows Kyverno PolicyReport results linked to a catalog
// component. Fetches namespaced policy reports and filters them by
// linkedComponentId or a name-based fuzzy match. (FARM-E40)

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { kyverno as kyvernoApi } from '@/lib/api-client';
import type { CatalogComponent, KyvernoPolicyReportResult } from '@/types/api';

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

type KyvernoStatus = 'pass' | 'fail' | 'warn' | 'error' | 'skip';

function statusVariant(
  status: KyvernoStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'fail':
    case 'error':
      return 'destructive';
    case 'warn':
      return 'secondary';
    case 'pass':
      return 'default';
    default:
      return 'outline';
  }
}

function statusDotClass(status: KyvernoStatus): string {
  switch (status) {
    case 'fail':
    case 'error':
      return 'bg-destructive';
    case 'warn':
      return 'bg-amber-500';
    case 'pass':
      return 'bg-green-500';
    default:
      return 'bg-muted-foreground';
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function KyvernoSkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="kyverno-skeleton">
      {[1, 2, 3].map((n) => (
        <div key={n} className="animate-pulse space-y-2 rounded-lg border p-4">
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single result row
// ---------------------------------------------------------------------------

interface PolicyResultRowProps {
  report: KyvernoPolicyReportResult;
  result: KyvernoPolicyReportResult['results'][number];
  rowIndex: number;
}

function PolicyResultRow({ report, result, rowIndex }: PolicyResultRowProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-3 py-3 border-b last:border-0"
      data-testid={`kyverno-result-${report.name}-${rowIndex}`}
    >
      <div className="shrink-0 flex items-center gap-1.5 min-w-[80px]">
        <span
          className={`inline-block h-2 w-2 rounded-full ${statusDotClass(result.status as KyvernoStatus)}`}
        />
        <Badge
          variant={statusVariant(result.status as KyvernoStatus)}
          className="text-[10px] uppercase font-bold px-1.5 h-5"
          data-testid={`kyverno-status-badge-${result.status}`}
        >
          {result.status.toUpperCase()}
        </Badge>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">{result.policy}</p>
        <p className="text-xs text-muted-foreground">
          Rule: <span className="font-mono">{result.rule}</span>
        </p>
        <p className="text-xs text-muted-foreground break-words">{result.message}</p>
        {result.category && (
          <p className="text-[10px] text-muted-foreground">Category: {result.category}</p>
        )}
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <p className="text-[10px] font-mono text-muted-foreground break-all max-w-[180px]">
          {report.resourceId}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">{report.resourceType}</p>
        {result.severity && (
          <p className="text-[10px] text-muted-foreground">Severity: {result.severity}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report group card — grouped by PolicyReport name
// ---------------------------------------------------------------------------

interface ReportGroupCardProps {
  report: KyvernoPolicyReportResult;
}

function ReportGroupCard({ report }: ReportGroupCardProps) {
  const failCount = report.results.filter(
    (r) => r.status === 'fail' || r.status === 'error',
  ).length;
  const warnCount = report.results.filter((r) => r.status === 'warn').length;

  return (
    <Card data-testid={`kyverno-report-${report.name}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-mono">{report.name}</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {failCount > 0 && (
              <Badge
                variant="destructive"
                className="text-[10px] h-5 px-1.5"
                data-testid={`kyverno-report-fail-${report.name}`}
              >
                {failCount} fail
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-5 px-1.5"
                data-testid={`kyverno-report-warn-${report.name}`}
              >
                {warnCount} warn
              </Badge>
            )}
            {report.namespace && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {report.namespace}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {report.results.map((result, idx) => (
          <PolicyResultRow
            key={`${result.policy}-${result.rule}-${idx}`}
            report={report}
            result={result}
            rowIndex={idx}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface KyvernoPolicyTabProps {
  component: CatalogComponent;
}

export function KyvernoPolicyTab({ component }: KyvernoPolicyTabProps) {
  const { isAuthenticated } = useAuth();

  const namespace =
    (component as CatalogComponent & { namespace?: string }).namespace ?? 'default';

  const { data: reports = [], isLoading: isPending } = useQuery({
    queryKey: ['kyverno', 'policy-reports', namespace],
    queryFn: () => kyvernoApi.listPolicyReports(namespace),
    enabled: isAuthenticated,
  });

  const matched = reports.filter(
    (r) =>
      r.linkedComponentId === component.id ||
      r.resourceId.toLowerCase().includes(component.name.toLowerCase()),
  );

  if (isPending) {
    return <KyvernoSkeleton />;
  }

  const totalFailing = matched.reduce(
    (acc, r) =>
      acc + r.results.filter((res) => res.status === 'fail' || res.status === 'error').length,
    0,
  );
  const totalWarnings = matched.reduce(
    (acc, r) => acc + r.results.filter((res) => res.status === 'warn').length,
    0,
  );

  if (matched.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-testid="kyverno-empty"
      >
        <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-base font-medium">
          No Kyverno policy violations found for this component
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          All Kyverno policy checks passed or no reports are available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div
        className="flex items-center gap-3 text-sm flex-wrap"
        data-testid="kyverno-summary"
      >
        {totalFailing > 0 && (
          <span
            className="text-destructive font-semibold"
            data-testid="kyverno-failing-count"
          >
            {totalFailing} failing
          </span>
        )}
        {totalWarnings > 0 && (
          <span
            className="text-amber-600 font-semibold"
            data-testid="kyverno-warnings-count"
          >
            {totalWarnings} warnings
          </span>
        )}
        {totalFailing === 0 && totalWarnings === 0 && (
          <span className="text-green-600 font-semibold">All checks passed</span>
        )}
        <span className="text-muted-foreground">
          across {matched.length} policy report{matched.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-4">
        {matched.map((report) => (
          <ReportGroupCard
            key={`${report.name}-${report.namespace ?? ''}`}
            report={report}
          />
        ))}
      </div>
    </div>
  );
}
