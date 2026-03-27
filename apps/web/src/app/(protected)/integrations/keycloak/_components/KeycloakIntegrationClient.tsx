'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ShieldCheck, Copy, Check, RefreshCw, Trash2, Settings } from 'lucide-react';
import { auth as authApi, keycloakCredentials as keycloakApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { KeycloakCredential } from '@/types/api';

// ---------------------------------------------------------------------------
// Zod schema for the Keycloak configuration form
// ---------------------------------------------------------------------------

const keycloakSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  keycloakUrl: z
    .string()
    .min(1, 'Keycloak URL is required')
    .url('Must be a valid URL (e.g. https://auth.example.com)'),
  realm: z.string().min(1, 'Realm is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
});

type KeycloakFormValues = z.infer<typeof keycloakSchema>;

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

const QUERY_KEYS = {
  credentials: (orgId: string) => ['keycloak-credentials', orgId] as const,
};

// ---------------------------------------------------------------------------
// Configuration Card — shows existing credential or setup form (admin only)
// ---------------------------------------------------------------------------

function ConfigurationCard({
  orgId,
  isAdmin,
  credential,
  isLoading,
}: {
  orgId: string;
  isAdmin: boolean;
  credential: KeycloakCredential | undefined;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<KeycloakFormValues>({ resolver: zodResolver(keycloakSchema) });

  const createMutation = useMutation({
    mutationFn: (values: KeycloakFormValues) =>
      keycloakApi.create({ orgId, ...values }),
    onSuccess: () => {
      toast.success('Keycloak SSO configured successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.credentials(orgId) });
      reset();
      setShowForm(false);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to save Keycloak configuration';
      setError('root', { message });
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => keycloakApi.remove(id),
    onSuccess: () => {
      toast.success('Keycloak configuration removed');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.credentials(orgId) });
    },
    onError: () => {
      toast.error('Failed to remove Keycloak configuration');
    },
  });

  const onSubmit = (values: KeycloakFormValues) => {
    createMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Keycloak Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Keycloak Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {credential ? (
            /* ── Configured state ── */
            <div className="space-y-3">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm font-medium">{credential.name}</p>
                <p className="text-xs text-muted-foreground">
                  Configured on{' '}
                  {new Date(credential.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForm((p) => !p)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {showForm ? 'Cancel' : 'Reconfigure'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="gap-2"
                    aria-label="Delete Keycloak configuration"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No Keycloak SSO configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure Keycloak OIDC to allow enterprise users to sign in with
                  their organisation credentials.
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configure Keycloak
                </Button>
              )}
            </div>
          )}

          {/* ── Configure form (admin only) ── */}
          {isAdmin && showForm && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 rounded-lg border p-4"
              aria-label="Keycloak configuration form"
            >
              <h3 className="text-sm font-semibold">
                {credential ? 'Reconfigure Keycloak' : 'Configure Keycloak'}
              </h3>

              {errors.root?.message && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.root.message}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="kc-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="kc-name"
                  placeholder="Production Keycloak"
                  {...register('name')}
                />
                {errors.name?.message && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="kc-url" className="text-sm font-medium">
                  Keycloak URL <span className="text-destructive">*</span>
                </label>
                <Input
                  id="kc-url"
                  placeholder="https://auth.example.com"
                  {...register('keycloakUrl')}
                />
                {errors.keycloakUrl?.message && (
                  <p className="text-xs text-destructive">{errors.keycloakUrl.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="kc-realm" className="text-sm font-medium">
                  Realm <span className="text-destructive">*</span>
                </label>
                <Input id="kc-realm" placeholder="master" {...register('realm')} />
                {errors.realm?.message && (
                  <p className="text-xs text-destructive">{errors.realm.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="kc-client-id" className="text-sm font-medium">
                  Client ID <span className="text-destructive">*</span>
                </label>
                <Input
                  id="kc-client-id"
                  placeholder="farm-app"
                  {...register('clientId')}
                />
                {errors.clientId?.message && (
                  <p className="text-xs text-destructive">{errors.clientId.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="kc-client-secret" className="text-sm font-medium">
                  Client Secret <span className="text-destructive">*</span>
                </label>
                <Input
                  id="kc-client-secret"
                  type="password"
                  placeholder="••••••••••••••••"
                  {...register('clientSecret')}
                />
                {errors.clientSecret?.message && (
                  <p className="text-xs text-destructive">{errors.clientSecret.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    reset();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove Keycloak Configuration"
        description="This will remove the Keycloak SSO configuration. Users will no longer be able to sign in via Keycloak until it is reconfigured. Are you sure?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (credential) {
            deleteMutation.mutate(credential.id);
          }
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Group Sync Card
// ---------------------------------------------------------------------------

const GroupSyncCard = memo(function GroupSyncCard({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const syncMutation = useMutation({
    mutationFn: () => authApi.keycloakSync(orgId),
    onSuccess: (data) => {
      if (data.queued) {
        toast.success('Group sync job queued successfully');
      } else {
        toast.error('Sync job was not queued — check server logs');
      }
    },
    onError: () => {
      toast.error('Failed to trigger Keycloak group sync');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Group Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sync Keycloak groups to Farm teams. Last sync:{' '}
          <span className="font-medium text-foreground">manual trigger only</span>.
        </p>

        {isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
            aria-label="Sync Keycloak groups now"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
            />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Admin access required to trigger a group sync.
          </p>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Login URL Info Card
// ---------------------------------------------------------------------------

const LoginUrlCard = memo(function LoginUrlCard({ orgId }: { orgId: string }) {
  const [copied, setCopied] = useState(false);

  const loginUrl = useMemo(
    () =>
      typeof window !== 'undefined'
        ? `${window.location.origin}/login?keycloakOrgId=${encodeURIComponent(orgId)}`
        : `/login?keycloakOrgId=${encodeURIComponent(orgId)}`,
    [orgId],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      toast.success('Login URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  }, [loginUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Enterprise Login URL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Share this deep-link with your organisation members. It pre-fills the
          Organisation ID so they can sign in directly via Keycloak SSO.
        </p>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <code className="flex-1 break-all text-xs" aria-label="Enterprise login URL">
            {loginUrl}
          </code>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            aria-label="Copy login URL"
            className="h-7 w-7 shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function KeycloakIntegrationClientInner() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const isAdmin = user?.roles?.includes('admin') ?? false;

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.credentials(orgId),
    queryFn: () => keycloakApi.list(orgId),
    enabled: !!orgId,
  });

  const credential = credentials[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Keycloak SSO</h1>
        <p className="text-muted-foreground mt-1">
          Configure OpenID Connect (OIDC) single sign-on for your organisation using
          Keycloak.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <div className="space-y-6">
          <ConfigurationCard
            orgId={orgId}
            isAdmin={isAdmin}
            credential={credential}
            isLoading={isLoading}
          />
          <GroupSyncCard orgId={orgId} isAdmin={isAdmin} />
        </div>
        <div>
          <LoginUrlCard orgId={orgId} />
        </div>
      </div>
    </div>
  );
}

export function KeycloakIntegrationClient() {
  return (
    <ErrorBoundary>
      <KeycloakIntegrationClientInner />
    </ErrorBoundary>
  );
}
