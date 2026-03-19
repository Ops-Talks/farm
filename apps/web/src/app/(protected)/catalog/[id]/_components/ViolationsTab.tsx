'use client';

// ViolationsTab — tag-policy violation view for a specific catalog component.
// Shown as a tab inside ComponentDetailClient (FARM-E39).
// Filters violations by linkedComponentId === component.id and groups them
// with remediation hint suggestions.

import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { tagPolicies as tagPoliciesApi } from '@/lib/api-client';
import type { CatalogComponent, ResourceViolation } from '@/types/api';

// ---------------------------------------------------------------------------
// Remediation hints panel
// ---------------------------------------------------------------------------

interface RemediationHintsProps {
  component: CatalogComponent;
}

function RemediationHints({ component }: RemediationHintsProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Suggested Tag Values
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Apply these tags to your cloud resources to resolve violations:
        </p>
        <div className="space-y-1.5">
          {[
            { key: 'farm:component', value: component.name },
            { key: 'farm:team', value: component.owner },
            { key: 'farm:environment', value: '(see environments)' },
          ].map(({ key, value }) => (
            <div key={key} className="flex items-center gap-2 text-xs font-mono">
              <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">{key}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single violation card
// ---------------------------------------------------------------------------

interface ViolationCardProps {
  violation: ResourceViolation;
  onResolve: (id: string) => void;
  isResolving: boolean;
}

function ViolationCard({ violation, onResolve, isResolving }: ViolationCardProps) {
  return (
    <Card data-testid={`violation-card-${violation.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-mono text-muted-foreground break-all">
              {violation.resourceId}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {violation.provider.toUpperCase()} · {violation.resourceType}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={() => onResolve(violation.id)}
            disabled={isResolving}
            data-testid={`resolve-btn-${violation.id}`}
          >
            Resolve
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            Missing Keys
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {violation.missingKeys.map((k) => (
              <span
                key={k}
                className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium"
                data-testid={`missing-key-${k}`}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Detected {new Date(violation.detectedAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ViolationsSkeletons() {
  return (
    <div className="space-y-3 pt-4" data-testid="violations-skeleton">
      {[1, 2].map((n) => (
        <Card key={n}>
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-7 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface ViolationsTabProps {
  component: CatalogComponent;
}

export function ViolationsTab({ component }: ViolationsTabProps) {
  const { isAuthenticated } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const queryClient = useQueryClient();

  const { data, isLoading: isPending } = useQuery({
    queryKey: ['violations', orgId, 'component', component.id],
    queryFn: async () => {
      // Fetch unresolved violations for the org, then filter client-side
      const result = await tagPoliciesApi.listViolations({
        orgId,
        resolved: false,
        take: 100,
      });
      return result.data.filter((v) => v.linkedComponentId === component.id);
    },
    enabled: isAuthenticated && !!orgId,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => tagPoliciesApi.resolveViolation(id),
    onSuccess: () => {
      toast.success('Violation resolved');
      void queryClient.invalidateQueries({
        queryKey: ['violations', orgId, 'component', component.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['compliance-summary'] });
    },
    onError: () => toast.error('Failed to resolve violation'),
  });

  if (isPending) {
    return <ViolationsSkeletons />;
  }

  const violations = data ?? [];

  if (violations.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-testid="violations-empty"
      >
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-base font-medium">No tag violations</p>
        <p className="text-sm text-muted-foreground mt-1">
          All resources linked to this component are compliant with tag policies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Remediation hints */}
      <RemediationHints component={component} />

      {/* Violation cards */}
      <div className="space-y-3">
        {violations.map((v) => (
          <ViolationCard
            key={v.id}
            violation={v}
            onResolve={(id) => resolveMutation.mutate(id)}
            isResolving={resolveMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
