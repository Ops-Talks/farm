'use client';

// ContainerSecurityTab — container vulnerability view for a catalog component.
// Displays CVE scan results, summary counts, and a sync trigger. (FARM-T168)

import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useOrganization } from '@/contexts/organization-context';
import { registry } from '@/lib/api-client';
import type { CatalogComponent, ContainerVulnerability, VulnerabilitySeverity } from '@/types/api';

// ---------------------------------------------------------------------------
// Severity badge helper
// ---------------------------------------------------------------------------

function severityBadgeVariant(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
  }
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  count: number;
  colorClass: string;
}

function SummaryCard({ label, count, colorClass }: SummaryCardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${colorClass}`}
      data-testid={`summary-${label.toLowerCase()}`}
    >
      <span className="text-2xl font-bold" data-testid={`summary-count-${label.toLowerCase()}`}>
        {count}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ContainerSecuritySkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="container-security-skeleton">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-20 rounded-lg" />
        ))}
      </div>
      {/* Table */}
      <div className="space-y-2">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CVE table row
// ---------------------------------------------------------------------------

interface CveRowProps {
  vuln: ContainerVulnerability;
}

function CveRow({ vuln }: CveRowProps) {
  return (
    <tr
      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
      data-testid={`cve-row-${vuln.id}`}
    >
      {/* Severity */}
      <td className="px-3 py-2 text-xs">
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${severityBadgeVariant(vuln.severity)}`}
          data-testid={`severity-badge-${vuln.id}`}
        >
          {vuln.severity}
        </span>
      </td>
      {/* CVE ID */}
      <td className="px-3 py-2 text-xs font-mono text-foreground" data-testid={`cve-id-${vuln.id}`}>
        {vuln.cveId}
      </td>
      {/* Package */}
      <td className="px-3 py-2 text-xs text-muted-foreground" data-testid={`package-${vuln.id}`}>
        {vuln.packageName}
      </td>
      {/* Installed version */}
      <td className="px-3 py-2 text-xs font-mono text-muted-foreground" data-testid={`installed-${vuln.id}`}>
        {vuln.installedVersion ?? '—'}
      </td>
      {/* Fixed version */}
      <td className="px-3 py-2 text-xs font-mono" data-testid={`fixed-${vuln.id}`}>
        {vuln.fixedVersion ? (
          <span className="text-green-700 dark:text-green-400">{vuln.fixedVersion}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      {/* Scanned at */}
      <td className="px-3 py-2 text-xs text-muted-foreground" data-testid={`scanned-${vuln.id}`}>
        {new Date(vuln.scannedAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Severity filter options
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
] as const;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface ContainerSecurityTabProps {
  component: CatalogComponent;
}

export function ContainerSecurityTab({ component }: ContainerSecurityTabProps) {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const queryClient = useQueryClient();

  const [severityFilter, setSeverityFilter] = useState('');

  // Return early when there is no container image configured
  if (!component.containerImage) {
    return (
      <div className="py-16" data-testid="no-container-image">
        <EmptyState
          title="No container image configured"
          description="Set a container image on this component to enable vulnerability scanning."
          icon={<ShieldAlert className="h-10 w-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  const componentId = component.id;

  return (
    <ContainerSecurityContent
      componentId={componentId}
      orgId={orgId}
      severityFilter={severityFilter}
      onSeverityChange={setSeverityFilter}
      queryClient={queryClient}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner content component (split to allow early return above)
// ---------------------------------------------------------------------------

interface ContainerSecurityContentProps {
  componentId: string;
  orgId: string;
  severityFilter: string;
  onSeverityChange: (v: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

function ContainerSecurityContent({
  componentId,
  orgId,
  severityFilter,
  onSeverityChange,
  queryClient,
}: ContainerSecurityContentProps) {
  // Summary query
  const {
    data: summary,
    isLoading: summaryLoading,
  } = useQuery({
    queryKey: ['vulnerabilities-summary', componentId, orgId],
    queryFn: () => registry.getVulnerabilitySummary(componentId),
    enabled: !!componentId,
  });

  // List query — re-runs when severityFilter changes
  const {
    data: vulnerabilities,
    isLoading: listLoading,
  } = useQuery({
    queryKey: ['vulnerabilities', componentId, severityFilter, orgId],
    queryFn: () =>
      registry.listVulnerabilities(componentId, severityFilter || undefined),
    enabled: !!componentId,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => registry.syncVulnerabilities(componentId),
    onSuccess: (result) => {
      if (result.queued) {
        toast.success('Vulnerability scan queued successfully');
      } else {
        toast.success('Vulnerability scan triggered');
      }
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities', componentId] });
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities-summary', componentId] });
    },
    onError: () => toast.error('Failed to trigger vulnerability sync'),
  });

  const isLoading = summaryLoading || listLoading;

  if (isLoading) {
    return <ContainerSecuritySkeleton />;
  }

  return (
    <div className="space-y-4 pt-4">
      {/* ── Header: title + sync button ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Container Vulnerabilities
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="sync-now-btn"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </div>

      {/* ── Summary cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="summary-cards">
        <SummaryCard
          label="CRITICAL"
          count={summary?.critical ?? 0}
          colorClass="border-red-200 bg-red-50/50 text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
        />
        <SummaryCard
          label="HIGH"
          count={summary?.high ?? 0}
          colorClass="border-orange-200 bg-orange-50/50 text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-400"
        />
        <SummaryCard
          label="MEDIUM"
          count={summary?.medium ?? 0}
          colorClass="border-yellow-200 bg-yellow-50/50 text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-900/10 dark:text-yellow-400"
        />
        <SummaryCard
          label="LOW"
          count={summary?.low ?? 0}
          colorClass="border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-400"
        />
      </div>

      {/* ── Filter + table ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">CVE Details</CardTitle>
            {/* Severity filter */}
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={severityFilter}
              onChange={(e) => onSeverityChange(e.target.value)}
              data-testid="severity-filter"
              aria-label="Filter by severity"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!vulnerabilities || vulnerabilities.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="vulnerabilities-empty"
            >
              <ShieldAlert className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-sm font-medium">No vulnerabilities found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {severityFilter
                  ? `No ${severityFilter} severity vulnerabilities detected.`
                  : 'No vulnerabilities detected for this component.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" data-testid="vulnerabilities-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      CVE ID
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Package
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Installed
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Fixed
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Scanned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vulnerabilities.map((vuln) => (
                    <CveRow key={vuln.id} vuln={vuln} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
