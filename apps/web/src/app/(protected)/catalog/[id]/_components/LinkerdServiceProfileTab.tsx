'use client';

// LinkerdServiceProfileTab — shows Linkerd ServiceProfile resources with
// per-route rules (path, method, retry, timeout) for a catalog component.
// Phase 20 — FARM-S2xx

import { useQuery } from '@tanstack/react-query';
import { Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { linkerd as linkerdApi } from '@/lib/api-client';
import type { CatalogComponent, LinkerdServiceProfile } from '@/types/api';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LinkerdProfileSkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="linkerd-profile-skeleton">
      {[1, 2].map((n) => (
        <div key={n} className="animate-pulse rounded-lg border p-4 space-y-3">
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
          {[1, 2, 3].map((m) => (
            <div key={m} className="flex items-center gap-3">
              <div className="h-3 w-1/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/4 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ServiceProfileCardProps {
  profile: LinkerdServiceProfile;
}

function ServiceProfileCard({ profile }: ServiceProfileCardProps) {
  return (
    <Card data-testid={`service-profile-${profile.name}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium font-mono flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          {profile.name}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{profile.namespace}</p>
        {profile.retryBudget && (
          <p className="text-xs text-muted-foreground">
            Retry budget: {Math.round(profile.retryBudget.retryRatio * 100)}% ratio,{' '}
            {profile.retryBudget.minRetriesPerSecond} min/s, TTL {profile.retryBudget.ttl}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {profile.routes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No routes defined.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground uppercase tracking-wider">
                    Route
                  </th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground uppercase tracking-wider">
                    Path
                  </th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground uppercase tracking-wider">
                    Retry
                  </th>
                  <th className="text-right py-2 font-medium text-muted-foreground uppercase tracking-wider">
                    Timeout
                  </th>
                </tr>
              </thead>
              <tbody>
                {profile.routes.map((route) => (
                  <tr
                    key={route.name}
                    className="border-b last:border-0"
                    data-testid={`route-row-${route.name}`}
                  >
                    <td className="py-2 pr-3 font-medium">{route.name}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">
                      {route.condition?.pathRegex ?? '\u2014'}
                    </td>
                    <td className="py-2 pr-3">
                      {route.condition?.method ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {route.condition.method}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">any</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {route.isRetryable ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px] font-bold">
                          YES
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          NO
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {route.timeout ?? '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LinkerdServiceProfileTabProps {
  component: CatalogComponent;
}

export function LinkerdServiceProfileTab({ component }: LinkerdServiceProfileTabProps) {
  const namespace = component.namespace ?? 'default';

  const profilesQuery = useQuery({
    queryKey: ['linkerd-service-profiles', namespace],
    queryFn: () => linkerdApi.listServiceProfiles({ namespace }),
    retry: false,
  });

  if (profilesQuery.isLoading) {
    return <LinkerdProfileSkeleton />;
  }

  const profiles = profilesQuery.data ?? [];

  if (profiles.length === 0) {
    return (
      <EmptyState
        title="No ServiceProfiles found"
        description="There are no Linkerd ServiceProfile resources in this namespace."
        icon={<Route className="h-6 w-6 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {profiles.map((profile) => (
        <ServiceProfileCard key={`${profile.namespace}/${profile.name}`} profile={profile} />
      ))}
    </div>
  );
}
