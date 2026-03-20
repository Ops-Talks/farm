'use client';

// IstioCanaryTab — shows Istio VirtualService route weight splits and
// allows admin users to adjust canary traffic weights. (FARM-S159)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GitMerge, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/contexts/auth-context';
import { istio as istioApi } from '@/lib/api-client';
import type { CatalogComponent, IstioVirtualService } from '@/types/api';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const weightEntrySchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  weight: z
    .number({ error: 'Must be a number' })
    .int('Weight must be a whole number')
    .min(0, 'Weight must be >= 0')
    .max(100, 'Weight must be <= 100'),
});

const patchWeightsSchema = z
  .object({
    weights: z.array(weightEntrySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const total = data.weights.reduce((sum, w) => sum + w.weight, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Weights must sum to 100 (current: ${total})`,
        path: ['weights'],
      });
    }
  });

type PatchWeightsFormValues = z.infer<typeof patchWeightsSchema>;

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function IstioCanarySkeleton() {
  return (
    <div className="space-y-4 pt-4" data-testid="istio-canary-skeleton">
      {[1, 2].map((n) => (
        <div key={n} className="animate-pulse rounded-lg border p-4 space-y-3">
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
          {[1, 2].map((m) => (
            <div key={m} className="flex items-center justify-between">
              <div className="h-3 w-1/4 bg-gray-200 rounded" />
              <div className="h-5 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjust Weights Dialog
// ---------------------------------------------------------------------------

interface AdjustWeightsDialogProps {
  vs: IstioVirtualService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AdjustWeightsDialog({ vs, open, onOpenChange, onSuccess }: AdjustWeightsDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PatchWeightsFormValues>({
    resolver: zodResolver(patchWeightsSchema),
    defaultValues: {
      weights: vs.routes.map((r) => ({ destination: r.destination, weight: r.weight })),
    },
  });

  const { fields } = useFieldArray({ control, name: 'weights' });

  const mutation = useMutation({
    mutationFn: (values: PatchWeightsFormValues) =>
      istioApi.patchWeights(vs.namespace, vs.name, values.weights),
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: unknown) => {
      setApiError(err instanceof Error ? err.message : 'Failed to update weights');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="adjust-weights-dialog">
        <DialogHeader>
          <DialogTitle>Adjust Canary Weights — {vs.name}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => {
            setApiError(null);
            mutation.mutate(values);
          })}
          className="space-y-4"
        >
          <p className="text-xs text-muted-foreground">
            Weights must sum to 100. Each value represents the percentage of traffic routed to that
            destination.
          </p>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <label className="flex-1 text-sm font-mono text-foreground">{field.destination}</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-20 rounded-md border px-2 py-1 text-sm text-right"
                data-testid={`weight-input-${field.destination}`}
                {...register(`weights.${index}.weight`, { valueAsNumber: true })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}

          {errors.weights && (
            <p className="text-sm text-destructive" data-testid="weights-sum-error">
              {(errors.weights as { message?: string })?.message ?? 'Invalid weights'}
            </p>
          )}
          {apiError && (
            <p className="text-sm text-destructive" data-testid="weights-api-error">
              {apiError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="weights-submit">
              {isSubmitting ? 'Updating…' : 'Apply'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// VirtualService card
// ---------------------------------------------------------------------------

interface VirtualServiceCardProps {
  vs: IstioVirtualService;
  isAdmin: boolean;
  onEdit: (vs: IstioVirtualService) => void;
}

function VirtualServiceCard({ vs, isAdmin, onEdit }: VirtualServiceCardProps) {
  const totalWeight = vs.routes.reduce((sum, r) => sum + r.weight, 0);
  const isCanary = vs.routes.length > 1;

  return (
    <Card data-testid={`vs-card-${vs.name}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-muted-foreground" />
              {vs.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Hosts: {vs.hosts.join(', ')}
              {vs.gateways.length > 0 && ` — Gateways: ${vs.gateways.join(', ')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCanary && (
              <Badge variant="secondary" className="text-[10px] uppercase" data-testid={`canary-badge-${vs.name}`}>
                Canary
              </Badge>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(vs)}
                data-testid={`adjust-weights-btn-${vs.name}`}
              >
                Adjust Weights
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Destination
                </th>
                {vs.routes[0]?.port !== undefined && (
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Port
                  </th>
                )}
                <th className="text-right py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {vs.routes.map((route, i) => (
                <tr
                  key={`${route.destination}-${i}`}
                  className="border-b last:border-0"
                  data-testid={`route-row-${vs.name}-${route.destination}`}
                >
                  <td className="py-2 pr-4 font-mono text-xs">{route.destination}</td>
                  {route.port !== undefined && (
                    <td className="py-2 pr-4 text-muted-foreground text-xs">{route.port}</td>
                  )}
                  <td className="py-2 text-right">
                    <span
                      className="font-semibold text-sm"
                      data-testid={`route-weight-${vs.name}-${route.destination}`}
                    >
                      {route.weight}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {totalWeight !== 100 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={3}
                    className="py-1 text-right text-xs text-destructive"
                    data-testid={`weight-warning-${vs.name}`}
                  >
                    Warning: weights sum to {totalWeight}%, not 100%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface IstioCanaryTabProps {
  component: CatalogComponent;
}

export function IstioCanaryTab({ component }: IstioCanaryTabProps) {
  const namespace = component.namespace ?? 'default';
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();

  const [editingVs, setEditingVs] = useState<IstioVirtualService | null>(null);

  const vsQuery = useQuery({
    queryKey: ['istio-virtual-services', namespace],
    queryFn: () => istioApi.listVirtualServices({ namespace }),
    retry: false,
  });

  if (vsQuery.isLoading) {
    return <IstioCanarySkeleton />;
  }

  const virtualServices = vsQuery.data ?? [];

  if (vsQuery.isError || virtualServices.length === 0) {
    return (
      <EmptyState
        title="No VirtualServices found in this namespace"
        description="Istio VirtualService resources control traffic routing and canary deployments."
        icon={<GitMerge className="h-6 w-6 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {!isAdmin && (
        <Alert data-testid="canary-readonly-notice">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need admin permissions to adjust traffic weights.
          </AlertDescription>
        </Alert>
      )}

      {virtualServices.map((vs) => (
        <VirtualServiceCard
          key={`${vs.namespace}/${vs.name}`}
          vs={vs}
          isAdmin={isAdmin}
          onEdit={setEditingVs}
        />
      ))}

      {editingVs && (
        <AdjustWeightsDialog
          vs={editingVs}
          open={editingVs !== null}
          onOpenChange={(open) => { if (!open) setEditingVs(null); }}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['istio-virtual-services', namespace] });
          }}
        />
      )}
    </div>
  );
}
