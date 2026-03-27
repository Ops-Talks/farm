'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cloud as cloudApi, integrations as integrationsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

type CloudProvider = 'aws' | 'gcp' | 'azure';

const PROVIDERS: { type: CloudProvider; label: string; description: string }[] = [
  {
    type: 'aws',
    label: 'Amazon Web Services',
    description: 'Connect via IAM role credentials to discover ECS, Lambda, RDS, and more.',
  },
  {
    type: 'gcp',
    label: 'Google Cloud Platform',
    description: 'Connect via service account to discover Cloud Run, Cloud SQL, and more.',
  },
  {
    type: 'azure',
    label: 'Microsoft Azure',
    description: 'Connect via service principal to discover Container Apps, and more.',
  },
];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const awsSchema = z.object({
  accessKeyId: z.string().min(1, 'Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
  region: z.string().min(1, 'Region is required'),
  accountId: z.string().optional().or(z.literal('')),
});

const gcpSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  serviceAccountJson: z
    .string()
    .min(1, 'Service Account JSON is required')
    .refine((v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, 'Must be valid JSON'),
});

const azureSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
});

type AwsFormValues = z.infer<typeof awsSchema>;
type GcpFormValues = z.infer<typeof gcpSchema>;
type AzureFormValues = z.infer<typeof azureSchema>;

// ---------------------------------------------------------------------------
// Per-provider connect forms
// ---------------------------------------------------------------------------

const AwsConnectForm = memo(function AwsConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AwsFormValues>({ resolver: zodResolver(awsSchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="aws-accessKeyId" className="text-sm font-medium">
          Access Key ID <span className="text-destructive">*</span>
        </label>
        <Input id="aws-accessKeyId" placeholder="AKIAIOSFODNN7EXAMPLE" {...register('accessKeyId')} />
        {errors.accessKeyId?.message && (
          <p className="text-xs text-destructive">{errors.accessKeyId.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="aws-secretAccessKey" className="text-sm font-medium">
          Secret Access Key <span className="text-destructive">*</span>
        </label>
        <Input
          id="aws-secretAccessKey"
          type="password"
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          {...register('secretAccessKey')}
        />
        {errors.secretAccessKey?.message && (
          <p className="text-xs text-destructive">{errors.secretAccessKey.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="aws-region" className="text-sm font-medium">
          Region <span className="text-destructive">*</span>
        </label>
        <Input id="aws-region" placeholder="us-east-1" {...register('region')} />
        {errors.region?.message && (
          <p className="text-xs text-destructive">{errors.region.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="aws-accountId" className="text-sm font-medium">
          Account ID{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="aws-accountId" placeholder="123456789012" {...register('accountId')} />
        {errors.accountId?.message && (
          <p className="text-xs text-destructive">{errors.accountId.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Connect'}
        </Button>
      </div>
    </form>
  );
});

const GcpConnectForm = memo(function GcpConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GcpFormValues>({ resolver: zodResolver(gcpSchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="gcp-projectId" className="text-sm font-medium">
          Project ID <span className="text-destructive">*</span>
        </label>
        <Input id="gcp-projectId" placeholder="my-gcp-project" {...register('projectId')} />
        {errors.projectId?.message && (
          <p className="text-xs text-destructive">{errors.projectId.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="gcp-serviceAccountJson" className="text-sm font-medium">
          Service Account JSON <span className="text-destructive">*</span>
        </label>
        <textarea
          id="gcp-serviceAccountJson"
          rows={6}
          placeholder='{"type":"service_account","project_id":"..."}'
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-y"
          {...register('serviceAccountJson')}
        />
        {errors.serviceAccountJson?.message && (
          <p className="text-xs text-destructive">{errors.serviceAccountJson.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Connect'}
        </Button>
      </div>
    </form>
  );
});

const AzureConnectForm = memo(function AzureConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AzureFormValues>({ resolver: zodResolver(azureSchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="azure-tenantId" className="text-sm font-medium">
          Tenant ID <span className="text-destructive">*</span>
        </label>
        <Input id="azure-tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...register('tenantId')} />
        {errors.tenantId?.message && (
          <p className="text-xs text-destructive">{errors.tenantId.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="azure-clientId" className="text-sm font-medium">
          Client ID <span className="text-destructive">*</span>
        </label>
        <Input id="azure-clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...register('clientId')} />
        {errors.clientId?.message && (
          <p className="text-xs text-destructive">{errors.clientId.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="azure-clientSecret" className="text-sm font-medium">
          Client Secret <span className="text-destructive">*</span>
        </label>
        <Input
          id="azure-clientSecret"
          type="password"
          placeholder="your-client-secret"
          {...register('clientSecret')}
        />
        {errors.clientSecret?.message && (
          <p className="text-xs text-destructive">{errors.clientSecret.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="azure-subscriptionId" className="text-sm font-medium">
          Subscription ID <span className="text-destructive">*</span>
        </label>
        <Input id="azure-subscriptionId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...register('subscriptionId')} />
        {errors.subscriptionId?.message && (
          <p className="text-xs text-destructive">{errors.subscriptionId.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Connect'}
        </Button>
      </div>
    </form>
  );
});

// ---------------------------------------------------------------------------
// Helper — build the credential payload per provider
// ---------------------------------------------------------------------------

function buildCredentialPayload(provider: CloudProvider, data: Record<string, unknown>) {
  switch (provider) {
    case 'aws': {
      const { accessKeyId, secretAccessKey, region, accountId } = data as AwsFormValues;
      return {
        type: 'aws-iam-role',
        name: `AWS — ${region}`,
        encryptedValue: JSON.stringify({ accessKeyId, secretAccessKey, region }),
        metadata: { region, ...(accountId ? { accountId } : {}) },
      };
    }
    case 'gcp': {
      const { projectId, serviceAccountJson } = data as GcpFormValues;
      return {
        type: 'gcp-service-account',
        name: `GCP — ${projectId}`,
        encryptedValue: JSON.stringify({ serviceAccountJson, projectId }),
        metadata: { projectId },
      };
    }
    case 'azure': {
      const { tenantId, clientId, clientSecret, subscriptionId } = data as AzureFormValues;
      return {
        type: 'azure-service-principal',
        name: `Azure — ${subscriptionId}`,
        encryptedValue: JSON.stringify({ tenantId, clientId, clientSecret, subscriptionId }),
        metadata: { subscriptionId, tenantId },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Connect modal
// ---------------------------------------------------------------------------

interface ConnectModalProps {
  provider: CloudProvider;
  label: string;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}

const ConnectModal = memo(function ConnectModal({ provider, label, onSave, onClose, isPending }: ConnectModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Connect ${label}`}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-background rounded-xl p-6 w-full max-w-md shadow-xl border mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Connect {label}</h2>
        {provider === 'aws' && (
          <AwsConnectForm onSave={onSave} onClose={onClose} isPending={isPending} />
        )}
        {provider === 'gcp' && (
          <GcpConnectForm onSave={onSave} onClose={onClose} isPending={isPending} />
        )}
        {provider === 'azure' && (
          <AzureConnectForm onSave={onSave} onClose={onClose} isPending={isPending} />
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Provider card
// ---------------------------------------------------------------------------

type ProviderStatus = { provider: string; connected: boolean; name: string };

interface ProviderCardProps {
  type: CloudProvider;
  label: string;
  description: string;
  status: ProviderStatus | undefined;
  credentialId: string | undefined;
  onConnect: (type: CloudProvider) => void;
  onDisconnect: (id: string) => void;
  isDisconnecting: boolean;
}

const ProviderCard = memo(function ProviderCard({
  type,
  label,
  description,
  status,
  credentialId,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: ProviderCardProps) {
  const isConnected = status?.connected ?? false;

  return (
    <Card data-testid={`cloud-provider-card-${type}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">{label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Connected as{' '}
              <span className="font-medium text-foreground">{status?.name ?? label}</span>
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => credentialId && onDisconnect(credentialId)}
              disabled={isDisconnecting || !credentialId}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => onConnect(type)}>
              Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const ProviderCardSkeleton = memo(function ProviderCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CloudProvidersClient() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const [modalProvider, setModalProvider] = useState<CloudProvider | null>(null);

  // Fetch current provider connection status
  const { data: providerStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['cloud-providers', orgId],
    queryFn: () => cloudApi.getProviders(orgId),
    enabled: isAuthenticated && !!orgId,
  });

  // Fetch existing credentials so we can resolve the ID for disconnect
  const { data: credentials = [] } = useQuery({
    queryKey: ['integration-credentials'],
    queryFn: () => integrationsApi.credentials.list(),
    enabled: isAuthenticated,
  });

  // Connect — creates credential via existing integrations endpoint
  const connectMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      integrationsApi.credentials.create(payload),
    onSuccess: (created) => {
      toast.success(`${created.name} connected successfully`);
      void queryClient.invalidateQueries({ queryKey: ['cloud-providers', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['integration-credentials'] });
      setModalProvider(null);
    },
    onError: () => {
      toast.error('Failed to save credential. Please try again.');
    },
  });

  // Disconnect — removes credential
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.credentials.remove(id),
    onSuccess: () => {
      toast.success('Cloud provider disconnected');
      void queryClient.invalidateQueries({ queryKey: ['cloud-providers', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['integration-credentials'] });
    },
    onError: () => {
      toast.error('Failed to disconnect. Please try again.');
    },
  });

  const getProviderStatus = useCallback(
    (type: CloudProvider): ProviderStatus | undefined =>
      providerStatuses.find((s) => s.provider === type),
    [providerStatuses],
  );

  const getCredentialId = useCallback(
    (type: CloudProvider): string | undefined => {
      const typeMap: Record<CloudProvider, string> = {
        aws: 'aws-iam-role',
        gcp: 'gcp-service-account',
        azure: 'azure-service-principal',
      };
      return credentials.find((c) => c.type === typeMap[type])?.id;
    },
    [credentials],
  );

  const handleConnect = useCallback((provider: CloudProvider) => {
    setModalProvider(provider);
  }, []);

  const handleDisconnect = useCallback((id: string) => {
    disconnectMutation.mutate(id);
  }, [disconnectMutation]);

  const handleSave = useCallback((data: Record<string, unknown>) => {
    if (!modalProvider) return;
    const payload = buildCredentialPayload(modalProvider, data);
    connectMutation.mutate(payload);
  }, [modalProvider, connectMutation]);

  const activeProviderMeta = useMemo(
    () => (modalProvider ? PROVIDERS.find((p) => p.type === modalProvider) : null),
    [modalProvider],
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cloud Providers</h1>
        <p className="text-muted-foreground mt-1">
          Connect AWS, GCP, or Azure to discover resources, monitor costs, and
          enable cloud deploy stages in pipelines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {isLoadingStatuses
          ? PROVIDERS.map((p) => <ProviderCardSkeleton key={p.type} />)
          : PROVIDERS.map((provider) => (
              <ErrorBoundary key={provider.type}>
                <ProviderCard
                  type={provider.type}
                  label={provider.label}
                  description={provider.description}
                  status={getProviderStatus(provider.type)}
                  credentialId={getCredentialId(provider.type)}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  isDisconnecting={disconnectMutation.isPending}
                />
              </ErrorBoundary>
            ))}
      </div>

      {/* Connect modal */}
      {modalProvider && activeProviderMeta && (
        <ConnectModal
          provider={modalProvider}
          label={activeProviderMeta.label}
          onSave={handleSave}
          onClose={() => setModalProvider(null)}
          isPending={connectMutation.isPending}
        />
      )}
    </div>
  );
}
