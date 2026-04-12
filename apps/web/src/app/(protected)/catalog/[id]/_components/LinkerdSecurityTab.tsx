'use client';

// LinkerdSecurityTab — shows Linkerd mTLS status (always on with Linkerd) and
// ServerAuthorization / AuthorizationPolicy resources for a catalog component.
// Phase 20 — FARM-S2xx

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { linkerd as linkerdApi } from '@/lib/api-client';
import type {
  CatalogComponent,
  LinkerdServerAuthorization,
  LinkerdAuthorizationPolicy,
} from '@/types/api';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LinkerdSecuritySkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="linkerd-security-skeleton">
      {[1, 2, 3].map((n) => (
        <div key={n} className="animate-pulse rounded-lg border p-4 space-y-3">
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
          {[1, 2].map((m) => (
            <div key={m} className="flex items-center gap-3">
              <div className="h-3 w-1/3 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
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

function ServerAuthorizationRow({ sa }: { sa: LinkerdServerAuthorization }) {
  return (
    <div
      className="flex items-start justify-between rounded-md border px-3 py-2"
      data-testid={`server-auth-row-${sa.name}`}
    >
      <div>
        <p className="text-sm font-medium font-mono">{sa.name}</p>
        <p className="text-xs text-muted-foreground">{sa.namespace}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Server: <span className="font-medium">{sa.server || '(selector)'}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {sa.clients.map((c) => (
          <Badge key={c} variant="secondary" className="text-[10px]">
            {c}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AuthorizationPolicyRow({ policy }: { policy: LinkerdAuthorizationPolicy }) {
  return (
    <tr
      className="border-b last:border-0"
      data-testid={`linkerd-auth-policy-row-${policy.name}`}
    >
      <td className="py-2 pr-4 font-mono text-xs">{policy.name}</td>
      <td className="py-2 pr-4 text-xs text-muted-foreground">
        {policy.targetRef.kind}/{policy.targetRef.name}
      </td>
      <td className="py-2 text-right text-xs text-muted-foreground">
        {policy.requiredAuthenticationRefs.length}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LinkerdSecurityTabProps {
  component: CatalogComponent;
}

export function LinkerdSecurityTab({ component }: LinkerdSecurityTabProps) {
  const namespace = component.namespace ?? 'default';

  const serverAuthQuery = useQuery({
    queryKey: ['linkerd-server-authorizations', namespace],
    queryFn: () => linkerdApi.listServerAuthorizations({ namespace }),
    retry: false,
  });

  const authPolicyQuery = useQuery({
    queryKey: ['linkerd-authorization-policies', namespace],
    queryFn: () => linkerdApi.listAuthorizationPolicies({ namespace }),
    retry: false,
  });

  const isLoading = serverAuthQuery.isLoading || authPolicyQuery.isLoading;

  if (isLoading) {
    return <LinkerdSecuritySkeleton />;
  }

  const serverAuths = serverAuthQuery.data ?? [];
  const authPolicies = authPolicyQuery.data ?? [];
  const hasAnyPolicy = serverAuths.length > 0 || authPolicies.length > 0;

  return (
    <div className="space-y-6 pt-4">
      {/* Linkerd auto-mTLS indicator */}
      <Card data-testid="linkerd-mtls-indicator">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Mutual TLS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 text-xs uppercase font-bold">
              AUTO-ENABLED
            </Badge>
            <p className="text-sm text-muted-foreground">
              Linkerd automatically encrypts and authenticates all meshed pod-to-pod
              communication with mTLS.
            </p>
          </div>
        </CardContent>
      </Card>

      {!hasAnyPolicy && (
        <EmptyState
          title="No Linkerd authorization policies found"
          description="There are no ServerAuthorization or AuthorizationPolicy resources in this namespace."
          icon={<ShieldAlert className="h-6 w-6 text-muted-foreground" />}
        />
      )}

      {/* ServerAuthorization resources */}
      {serverAuths.length > 0 && (
        <Card data-testid="linkerd-server-auth-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Server Authorizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {serverAuths.map((sa) => (
                <ServerAuthorizationRow key={`${sa.namespace}/${sa.name}`} sa={sa} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AuthorizationPolicy resources */}
      {authPolicies.length > 0 && (
        <Card data-testid="linkerd-auth-policy-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Authorization Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Target
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Auth Refs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {authPolicies.map((policy) => (
                    <AuthorizationPolicyRow
                      key={`${policy.namespace}/${policy.name}`}
                      policy={policy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
