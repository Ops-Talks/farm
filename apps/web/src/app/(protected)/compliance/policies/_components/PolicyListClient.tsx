'use client';

// PolicyListClient — CRUD UI for tag policies (FARM-E39).
// - Lists policies as cards.
// - Admin-only create / edit / delete via modal form (RHF + Zod).
// - Uses Base UI Dialog for modals (consistent with ConfirmDialog).

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { tagPolicies as tagPoliciesApi } from '@/lib/api-client';
import type { CreateTagPolicyInput } from '@/lib/api-client';
import type { TagPolicy } from '@/types/api';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

// Keep requiredKeys as a string in the schema (no transform) — we split manually
// in the submit handler so React Hook Form's defaultValues/reset stay type-safe.
const policySchema = z.object({
  resourceType: z.string().min(1, 'Resource type is required'),
  requiredKeys: z.string().min(1, 'At least one key is required'),
  severity: z.enum(['warning', 'error']),
});

type PolicyFormValues = z.infer<typeof policySchema>;

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function PolicyCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Policy card
// ---------------------------------------------------------------------------

interface PolicyCardProps {
  policy: TagPolicy;
  isAdmin: boolean;
  onEdit: (policy: TagPolicy) => void;
  onDelete: (policy: TagPolicy) => void;
  onExport: (policy: TagPolicy) => void;
  isExporting: boolean;
}

function PolicyCard({ policy, isAdmin, onEdit, onDelete, onExport, isExporting }: PolicyCardProps) {
  return (
    <Card data-testid={`policy-card-${policy.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="font-mono text-xs w-fit">
              {policy.resourceType}
            </Badge>
          </div>
          <Badge
            variant={policy.severity === 'error' ? 'destructive' : 'secondary'}
            className="shrink-0 text-[10px] uppercase font-bold"
            data-testid={`severity-badge-${policy.id}`}
          >
            {policy.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            Required Keys
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {policy.requiredKeys.map((k) => (
              <span
                key={k}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Created {new Date(policy.createdAt).toLocaleDateString()}
        </p>

        {isAdmin && (
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onEdit(policy)}
              data-testid={`edit-btn-${policy.id}`}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1"
              onClick={() => onDelete(policy)}
              data-testid={`delete-btn-${policy.id}`}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onExport(policy)}
              disabled={isExporting}
              data-testid={`export-yaml-btn-${policy.id}`}
            >
              <Download className="h-3 w-3" />
              Export YAML
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Policy form modal
// ---------------------------------------------------------------------------

interface PolicyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  editing: TagPolicy | null;
  onSuccess: () => void;
}

function PolicyFormModal({
  open,
  onOpenChange,
  orgId,
  editing,
  onSuccess,
}: PolicyFormModalProps) {
  const queryClient = useQueryClient();

  const defaultValues: PolicyFormValues = editing
    ? {
        resourceType: editing.resourceType,
        requiredKeys: editing.requiredKeys.join(', '),
        severity: editing.severity,
      }
    : { resourceType: '', requiredKeys: '', severity: 'warning' };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTagPolicyInput) => tagPoliciesApi.create(data),
    onSuccess: () => {
      toast.success('Policy created');
      void queryClient.invalidateQueries({ queryKey: ['tag-policies'] });
      onSuccess();
      reset();
    },
    onError: () => toast.error('Failed to create policy'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTagPolicyInput> }) =>
      tagPoliciesApi.update(id, data),
    onSuccess: () => {
      toast.success('Policy updated');
      void queryClient.invalidateQueries({ queryKey: ['tag-policies'] });
      onSuccess();
      reset();
    },
    onError: () => toast.error('Failed to update policy'),
  });

  const onSubmit = handleSubmit((values) => {
    // Split comma-separated keys string into an array
    const keys = values.requiredKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      orgId,
      resourceType: values.resourceType.trim(),
      requiredKeys: keys,
      severity: values.severity,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    reset(defaultValues);
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/10 duration-100',
            'data-ending-style:opacity-0 data-starting-style:opacity-0',
            'supports-backdrop-filter:backdrop-blur-xs',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            'duration-150',
          )}
        >
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground mb-4">
              {editing ? 'Edit Tag Policy' : 'Create Tag Policy'}
            </DialogPrimitive.Title>

            <form onSubmit={onSubmit} className="space-y-4" data-testid="policy-form">
              {/* Resource type */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="resourceType">
                  Resource Type
                </label>
                <Input
                  id="resourceType"
                  placeholder="e.g. ecs-service, * (all)"
                  {...register('resourceType')}
                  aria-invalid={!!errors.resourceType}
                />
                <p className="text-[11px] text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">*</code> to match all resource types
                </p>
                {errors.resourceType && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.resourceType.message}
                  </p>
                )}
              </div>

              {/* Required keys */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="requiredKeys">
                  Required Keys
                </label>
                <Input
                  id="requiredKeys"
                  placeholder="farm:component, farm:team, farm:environment"
                  {...register('requiredKeys')}
                  aria-invalid={!!errors.requiredKeys}
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma-separated list of required tag keys
                </p>
                {errors.requiredKeys && (
                  <p className="text-xs text-destructive" role="alert">
                    {String(errors.requiredKeys.message)}
                  </p>
                )}
              </div>

              {/* Severity */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="severity">
                  Severity
                </label>
                <select
                  id="severity"
                  {...register('severity')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-invalid={!!errors.severity}
                >
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                {errors.severity && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.severity.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogPrimitive.Close
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isBusy}
                    />
                  }
                >
                  Cancel
                </DialogPrimitive.Close>
                <Button type="submit" disabled={isBusy} data-testid="submit-policy-btn">
                  {isBusy ? 'Saving…' : editing ? 'Save Changes' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function PolicyListClient() {
  const { isAuthenticated, hasRole } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id ?? '';
  const queryClient = useQueryClient();
  const isAdmin = hasRole('admin');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<TagPolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagPolicy | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: policies = [], isLoading: isPending } = useQuery({
    queryKey: ['tag-policies', orgId],
    queryFn: () => tagPoliciesApi.list(orgId),
    enabled: isAuthenticated && !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagPoliciesApi.remove(id),
    onSuccess: () => {
      toast.success('Policy deleted');
      void queryClient.invalidateQueries({ queryKey: ['tag-policies'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete policy'),
  });

  const exportMutation = useMutation({
    mutationFn: (id: string) => tagPoliciesApi.exportKyverno(id),
    onSuccess: (result) => {
      // Trigger browser download
      const blob = new Blob([result.yaml], { type: 'application/x-yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportingId(null);
    },
    onError: () => {
      toast.error('Failed to export ClusterPolicy YAML');
      setExportingId(null);
    },
  });

  function openCreate() {
    setEditingPolicy(null);
    setModalOpen(true);
  }

  function openEdit(p: TagPolicy) {
    setEditingPolicy(p);
    setModalOpen(true);
  }

  function openDelete(p: TagPolicy) {
    setDeleteTarget(p);
  }

  function handleExport(p: TagPolicy) {
    setExportingId(p.id);
    exportMutation.mutate(p.id);
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tag Policies</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Define which tag keys are required on cloud resources
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openCreate} className="gap-2" data-testid="add-policy-btn">
              <Plus className="h-4 w-4" />
              Add Policy
            </Button>
          )}
        </div>

        {/* Policy list */}
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="policies-skeleton">
            {[1, 2, 3].map((n) => (
              <PolicyCardSkeleton key={n} />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            data-testid="policies-empty"
          >
            <p className="text-base font-medium">No tag policies defined</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? 'Create your first policy to start enforcing tag governance.'
                : 'No tag policies have been configured for this organisation.'}
            </p>
            {isAdmin && (
              <Button onClick={openCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Policy
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {policies.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDelete={openDelete}
                onExport={handleExport}
                isExporting={exportingId === p.id && exportMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Create / edit modal */}
        <PolicyFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          orgId={orgId}
          editing={editingPolicy}
          onSuccess={() => setModalOpen(false)}
        />

        {/* Delete confirm dialog */}
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Tag Policy"
          description={
            deleteTarget
              ? `Are you sure you want to delete the policy for "${deleteTarget.resourceType}"? This cannot be undone.`
              : ''
          }
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </ErrorBoundary>
  );
}
