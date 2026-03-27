'use client';

// ComplianceDashboardClient — tag-policy compliance overview for FARM-E39.
// Displays a summary row, per-provider and per-resource-type tables, and a
// paginated, filterable violations table with an inline resolve action.

import { memo, useCallback, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { tagPolicies as tagPoliciesApi } from '@/lib/api-client';
import type { ComplianceSummary } from '@/types/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Tailwind colour class based on compliance rate thresholds. */
function complianceColour(rate: number): string {
  if (rate >= 90) return 'text-green-600 dark:text-green-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function complianceBadgeVariant(rate: number): 'default' | 'secondary' | 'destructive' {
  if (rate >= 90) return 'default';
  if (rate >= 70) return 'secondary';
  return 'destructive';
}

/** Format ISO string to locale date string. */
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString();
}

/** Truncate a long resource id for display. */
function truncId(id: string, max = 24) {
  return id.length > max ? `…${id.slice(-max)}` : id;
}

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

const SummaryCardsSkeleton = memo(function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="summary-skeleton">
      {[1, 2, 3, 4].map((n) => (
        <Card key={n}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

const TableSkeleton = memo(function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="table-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

interface SummaryCardsProps {
  summary: ComplianceSummary;
}

const SummaryCards = memo(function SummaryCards({ summary }: SummaryCardsProps) {
  const rate = Math.round(summary.complianceRate);
  const colourClass = complianceColour(rate);
  const badgeVariant = complianceBadgeVariant(rate);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Compliance Rate */}
      <Card data-testid="card-compliance-rate">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Compliance Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <span className={`text-4xl font-bold ${colourClass}`}>{rate}%</span>
          <div className="mt-1">
            <Badge variant={badgeVariant} className="text-[10px]">
              {rate >= 90 ? 'Healthy' : rate >= 70 ? 'At Risk' : 'Critical'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Resources */}
      <Card data-testid="card-total-resources">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <span className="text-4xl font-bold">{summary.totalResources.toLocaleString()}</span>
        </CardContent>
      </Card>

      {/* Open Violations */}
      <Card data-testid="card-open-violations">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Open Violations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <span className="text-4xl font-bold text-destructive">
            {summary.totalViolations.toLocaleString()}
          </span>
        </CardContent>
      </Card>

      {/* Resolved Today — derived from resolved violations fetched separately */}
      <Card data-testid="card-resolved-today">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Resolved Today
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <span className="text-4xl font-bold text-green-600 dark:text-green-400">—</span>
          <p className="text-xs text-muted-foreground mt-0.5">from audit log</p>
        </CardContent>
      </Card>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Provider breakdown table
// ---------------------------------------------------------------------------

interface ProviderTableProps {
  byProvider: ComplianceSummary['byProvider'];
}

const ProviderTable = memo(function ProviderTable({ byProvider }: ProviderTableProps) {
  const entries = Object.entries(byProvider);
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          By Cloud Provider
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Compliance by provider">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Provider</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Violations</th>
                <th className="px-4 py-2 text-left font-medium">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([provider, stats]) => {
                const rate = stats.total > 0
                  ? Math.round(((stats.total - stats.violations) / stats.total) * 100)
                  : 100;
                return (
                  <tr key={provider} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium uppercase">{provider}</td>
                    <td className="px-4 py-2 text-right">{stats.total}</td>
                    <td className="px-4 py-2 text-right text-destructive">{stats.violations}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rate >= 90
                                ? 'bg-green-500'
                                : rate >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${rate}%` }}
                            role="progressbar"
                            aria-valuenow={rate}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${provider} compliance ${rate}%`}
                          />
                        </div>
                        <span className={`text-xs font-medium w-10 text-right ${complianceColour(rate)}`}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Resource-type breakdown table
// ---------------------------------------------------------------------------

interface ResourceTypeTableProps {
  byResourceType: ComplianceSummary['byResourceType'];
}

const ResourceTypeTable = memo(function ResourceTypeTable({ byResourceType }: ResourceTypeTableProps) {
  const entries = Object.entries(byResourceType);
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          By Resource Type
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Compliance by resource type">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Resource Type</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Violations</th>
                <th className="px-4 py-2 text-right font-medium">Compliance %</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([rtype, stats]) => {
                const rate = stats.total > 0
                  ? Math.round(((stats.total - stats.violations) / stats.total) * 100)
                  : 100;
                return (
                  <tr key={rtype} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{rtype}</td>
                    <td className="px-4 py-2 text-right">{stats.total}</td>
                    <td className="px-4 py-2 text-right text-destructive">{stats.violations}</td>
                    <td className={`px-4 py-2 text-right font-medium ${complianceColour(rate)}`}>
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Provider badge helper
// ---------------------------------------------------------------------------

const ProviderBadge = memo(function ProviderBadge({ provider }: { provider: string }) {
  const colourMap: Record<string, string> = {
    aws: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    gcp: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    azure: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  };
  const cls = colourMap[provider.toLowerCase()] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {provider}
    </span>
  );
});

// ---------------------------------------------------------------------------
// Violations table
// ---------------------------------------------------------------------------

interface ViolationsTableProps {
  orgId: string;
  isAuthenticated: boolean;
}

function ViolationsTable({ orgId, isAuthenticated }: ViolationsTableProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [providerFilter, setProviderFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const { data, isLoading: isPending } = useQuery({
    queryKey: [
      'violations',
      orgId,
      providerFilter,
      resourceTypeFilter,
      showResolved,
      page,
    ],
    queryFn: () =>
      tagPoliciesApi.listViolations({
        orgId,
        provider: providerFilter || undefined,
        resourceType: resourceTypeFilter || undefined,
        resolved: showResolved ? undefined : false,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    enabled: isAuthenticated && !!orgId,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => tagPoliciesApi.resolveViolation(id),
    onSuccess: () => {
      toast.success('Violation resolved');
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
      void queryClient.invalidateQueries({ queryKey: ['compliance-summary'] });
    },
    onError: () => {
      toast.error('Failed to resolve violation');
    },
  });

  // Memoize the resolve handler to keep a stable reference when passed to onClick
  const handleResolve = useCallback(
    (id: string) => resolveMutation.mutate(id),
    [resolveMutation],
  );

  const violations = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Violations
            {total > 0 && (
              <span className="ml-2 text-foreground font-bold">{total}</span>
            )}
          </CardTitle>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2" data-testid="filter-bar">
            <Input
              placeholder="Provider (aws, gcp…)"
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(0);
              }}
              className="h-8 w-40 text-xs"
              aria-label="Filter by provider"
              data-testid="filter-provider"
            />
            <Input
              placeholder="Resource type…"
              value={resourceTypeFilter}
              onChange={(e) => {
                setResourceTypeFilter(e.target.value);
                setPage(0);
              }}
              className="h-8 w-40 text-xs"
              aria-label="Filter by resource type"
              data-testid="filter-resource-type"
            />
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => {
                  setShowResolved(e.target.checked);
                  setPage(0);
                }}
                className="rounded"
                aria-label="Show resolved violations"
                data-testid="filter-resolved"
              />
              Show resolved
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isPending ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : violations.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-testid="violations-empty"
          >
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-base font-medium">No violations found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {showResolved
                ? 'No violations match the current filters.'
                : 'All resources are compliant with tag policies.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Resource violations">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Resource ID</th>
                    <th className="px-4 py-2 text-left font-medium">Provider</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Missing Keys</th>
                    <th className="px-4 py-2 text-left font-medium">Detected</th>
                    <th className="px-4 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                      data-testid={`violation-row-${v.id}`}
                    >
                      <td className="px-4 py-2 font-mono text-xs max-w-[180px] truncate" title={v.resourceId}>
                        {truncId(v.resourceId)}
                      </td>
                      <td className="px-4 py-2">
                        <ProviderBadge provider={v.provider} />
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">{v.resourceType}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {v.missingKeys.map((k) => (
                            <span
                              key={k}
                              className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(v.detectedAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {v.resolvedAt ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Resolved
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleResolve(v.id)}
                            disabled={resolveMutation.isPending}
                            data-testid={`resolve-btn-${v.id}`}
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                <span>
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export function ComplianceDashboardClient() {
  const { isAuthenticated } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryPending } = useQuery({
    queryKey: ['compliance-summary', orgId],
    queryFn: () => tagPoliciesApi.getComplianceSummary(orgId),
    enabled: isAuthenticated && !!orgId,
  });

  const auditMutation = useMutation({
    mutationFn: () => tagPoliciesApi.triggerAudit(orgId),
    onSuccess: () => {
      toast.success('Audit job queued — results will update shortly');
      void queryClient.invalidateQueries({ queryKey: ['compliance-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
    onError: () => {
      toast.error('Failed to trigger audit');
    },
  });

  const handleRunAudit = useCallback(() => {
    auditMutation.mutate();
  }, [auditMutation]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Resource tagging governance for your cloud infrastructure
            </p>
          </div>
          <Button
            onClick={handleRunAudit}
            disabled={auditMutation.isPending || !orgId}
            className="gap-2"
            data-testid="run-audit-btn"
          >
            <RefreshCw className={`h-4 w-4 ${auditMutation.isPending ? 'animate-spin' : ''}`} />
            Run Audit Now
          </Button>
        </div>

        {/* Summary cards */}
        {summaryPending ? (
          <SummaryCardsSkeleton />
        ) : summary ? (
          <SummaryCards summary={summary} />
        ) : null}

        {/* Breakdown tables */}
        {summaryPending ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><TableSkeleton rows={3} /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><TableSkeleton rows={3} /></CardContent>
            </Card>
          </div>
        ) : summary ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <ProviderTable byProvider={summary.byProvider} />
            <ResourceTypeTable byResourceType={summary.byResourceType} />
          </div>
        ) : null}

        {/* Violations */}
        {orgId && (
          <ViolationsTable orgId={orgId} isAuthenticated={isAuthenticated} />
        )}
      </div>
    </ErrorBoundary>
  );
}
