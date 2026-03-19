'use client';

// CloudResourcesTab — shows cloud resources linked to this component.
// Resources are matched by linkedComponentId or by the farm:component tag.
// Results are grouped by provider (AWS, GCP, Azure).

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cloud as cloudApi } from '@/lib/api-client';
import type { CloudResource } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
};

function groupByProvider(resources: CloudResource[]): Map<string, CloudResource[]> {
  const map = new Map<string, CloudResource[]>();
  for (const r of resources) {
    const key = r.provider;
    const existing = map.get(key) ?? [];
    existing.push(r);
    map.set(key, existing);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ResourceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Individual resource card
// ---------------------------------------------------------------------------

interface ResourceCardProps {
  resource: CloudResource;
}

function ResourceCard({ resource }: ResourceCardProps) {
  const tagEntries = Object.entries(resource.tags).filter(
    ([k]) => k !== 'farm:component',
  );

  return (
    <Card data-testid={`cloud-resource-${resource.resourceId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{resource.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
            {resource.resourceType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Region: <span className="font-medium text-foreground">{resource.region}</span>
        </p>
        {resource.resourceId && (
          <p className="text-xs text-muted-foreground font-mono break-all">
            ID: {resource.resourceId}
          </p>
        )}
        {tagEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tagEntries.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {k}={v}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Provider group
// ---------------------------------------------------------------------------

interface ProviderGroupProps {
  provider: string;
  resources: CloudResource[];
}

function ProviderGroup({ provider, resources }: ProviderGroupProps) {
  const label = PROVIDER_LABELS[provider] ?? provider.toUpperCase();

  return (
    <section aria-label={`${label} resources`}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {label}
        <span className="ml-2 font-normal text-xs">({resources.length})</span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {resources.map((r) => (
          <ResourceCard key={r.resourceId} resource={r} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CloudResourcesTabProps {
  componentId: string;
  componentName?: string;
}

export function CloudResourcesTab({ componentId, componentName }: CloudResourcesTabProps) {
  const { isAuthenticated } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';

  const { data: allResources = [], isPending } = useQuery({
    queryKey: ['cloud-resources', orgId, componentId],
    queryFn: () => cloudApi.discoverResources(orgId),
    enabled: isAuthenticated && !!orgId,
  });

  // Filter to resources linked to this component
  const resources = allResources.filter(
    (r) =>
      r.linkedComponentId === componentId ||
      r.tags['farm:component'] === componentName,
  );

  if (isPending) {
    return (
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((n) => (
          <ResourceCardSkeleton key={n} />
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-medium">No cloud resources discovered</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a cloud provider in{' '}
          <Link
            href="/integrations/cloud"
            className="text-primary hover:underline"
          >
            Settings &gt; Cloud Providers
          </Link>{' '}
          and tag resources with{' '}
          <span className="font-mono bg-muted px-1 rounded">farm:component</span>.
        </p>
      </div>
    );
  }

  const grouped = groupByProvider(resources);

  return (
    <div className="space-y-8 pt-4">
      {Array.from(grouped.entries()).map(([provider, providerResources]) => (
        <ProviderGroup
          key={provider}
          provider={provider}
          resources={providerResources}
        />
      ))}
    </div>
  );
}
