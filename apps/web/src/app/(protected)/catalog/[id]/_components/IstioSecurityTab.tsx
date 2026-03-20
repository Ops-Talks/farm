'use client';

// IstioSecurityTab — shows Istio mTLS (PeerAuthentication) and
// AuthorizationPolicy resources for a catalog component. (FARM-S158)

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { istio as istioApi } from '@/lib/api-client';
import type {
  CatalogComponent,
  IstioPeerAuthentication,
  IstioAuthorizationPolicy,
} from '@/types/api';

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

type MtlsMode = IstioPeerAuthentication['mtlsMode'];
type AuthAction = IstioAuthorizationPolicy['action'];

function mtlsBadgeVariant(mode: MtlsMode): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (mode) {
    case 'STRICT':
      return 'default'; // green-ish (default = primary)
    case 'PERMISSIVE':
      return 'secondary'; // yellow
    case 'DISABLE':
    case 'UNSET':
      return 'destructive'; // red
    default:
      return 'outline';
  }
}

function mtlsBadgeClass(mode: MtlsMode): string {
  switch (mode) {
    case 'STRICT':
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200';
    case 'PERMISSIVE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200';
    case 'DISABLE':
    case 'UNSET':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200';
    default:
      return '';
  }
}

function actionBadgeVariant(action: AuthAction): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'ALLOW':
      return 'default';
    case 'DENY':
      return 'destructive';
    case 'AUDIT':
      return 'secondary';
    case 'CUSTOM':
      return 'outline';
    default:
      return 'outline';
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function IstioSecuritySkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="istio-security-skeleton">
      {[1, 2].map((n) => (
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
// Main component
// ---------------------------------------------------------------------------

interface IstioSecurityTabProps {
  component: CatalogComponent;
}

export function IstioSecurityTab({ component }: IstioSecurityTabProps) {
  const namespace = component.namespace ?? 'default';

  const peerAuthQuery = useQuery({
    queryKey: ['istio-peer-authentications', namespace],
    queryFn: () => istioApi.listPeerAuthentications({ namespace }),
    retry: false,
  });

  const authPolicyQuery = useQuery({
    queryKey: ['istio-authorization-policies', namespace],
    queryFn: () => istioApi.listAuthorizationPolicies({ namespace }),
    retry: false,
  });

  const isLoading = peerAuthQuery.isLoading || authPolicyQuery.isLoading;

  if (isLoading) {
    return <IstioSecuritySkeleton />;
  }

  const peerAuths = peerAuthQuery.data ?? [];
  const authPolicies = authPolicyQuery.data ?? [];

  const hasNoRulesPolicy = authPolicies.some((p) => p.hasNoRules);
  const hasAnyPolicy = peerAuths.length > 0 || authPolicies.length > 0;

  if (!hasAnyPolicy) {
    return (
      <EmptyState
        title="No Istio security policies found in this namespace"
        description="There are no PeerAuthentication or AuthorizationPolicy resources in this namespace."
        icon={<ShieldCheck className="h-6 w-6 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* ── Security warning banner ────────────────────────────────────── */}
      {hasNoRulesPolicy && (
        <Alert variant="destructive" data-testid="istio-security-warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            One or more AuthorizationPolicies have no rules defined. This may result in
            unintended access behaviour — policies with no rules deny all traffic by default.
          </AlertDescription>
        </Alert>
      )}

      {/* ── mTLS / PeerAuthentication ──────────────────────────────────── */}
      <Card data-testid="istio-peer-auth-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            mTLS — Peer Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          {peerAuths.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No PeerAuthentication policies in this namespace.
            </p>
          ) : (
            <div className="space-y-2">
              {peerAuths.map((pa) => (
                <div
                  key={`${pa.namespace}/${pa.name}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  data-testid={`peer-auth-row-${pa.name}`}
                >
                  <div>
                    <p className="text-sm font-medium">{pa.name}</p>
                    <p className="text-xs text-muted-foreground">{pa.namespace}</p>
                  </div>
                  <Badge
                    className={`text-[10px] uppercase font-bold px-2 ${mtlsBadgeClass(pa.mtlsMode)}`}
                    data-testid={`mtls-badge-${pa.name}`}
                  >
                    {pa.mtlsMode}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Authorization Policies ─────────────────────────────────────── */}
      <Card data-testid="istio-auth-policy-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Authorization Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authPolicies.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No AuthorizationPolicy resources in this namespace.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Rules
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {authPolicies.map((policy) => (
                    <tr
                      key={`${policy.namespace}/${policy.name}`}
                      className="border-b last:border-0"
                      data-testid={`auth-policy-row-${policy.name}`}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{policy.name}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={actionBadgeVariant(policy.action)}
                          className="text-[10px] uppercase font-bold"
                          data-testid={`auth-action-badge-${policy.name}`}
                        >
                          {policy.action}
                        </Badge>
                        {policy.hasNoRules && (
                          <Badge
                            variant="destructive"
                            className="ml-2 text-[10px] font-bold"
                            data-testid={`no-rules-badge-${policy.name}`}
                          >
                            NO RULES
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {policy.rules.length}
                      </td>
                    </tr>
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
