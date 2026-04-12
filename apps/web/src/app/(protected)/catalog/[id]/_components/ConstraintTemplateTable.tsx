'use client';

// ConstraintTemplateTable — lists OPA Gatekeeper ConstraintTemplate resources
// and their violation counts for a catalog component. Shown as a tab in
// ComponentDetailClient when Gatekeeper is detected. (Phase 21 — FARM-T231)

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { gatekeeper as gatekeeperApi } from '@/lib/api-client';
import type { GatekeeperConstraintTemplate, GatekeeperViolation } from '@/types/api';

function enforcementVariant(action: string): 'destructive' | 'secondary' | 'outline' {
  if (action === 'deny') return 'destructive';
  if (action === 'warn') return 'secondary';
  return 'outline';
}

function ConstraintTemplateSkeleton() {
  return (
    <div className="space-y-3 pt-4" data-testid="constraint-template-skeleton">
      {[1, 2, 3].map((n) => (
        <div key={n} className="animate-pulse rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

interface ConstraintTemplateRowProps {
  template: GatekeeperConstraintTemplate;
  violations: GatekeeperViolation[];
}

function ConstraintTemplateRow({ template, violations }: ConstraintTemplateRowProps) {
  const [expanded, setExpanded] = useState(false);
  const templateViolations = violations.filter((v) => v.kind === template.name);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
            <Badge variant={enforcementVariant(template.enforcementAction)} className="text-xs">
              {template.enforcementAction}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {templateViolations.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {templateViolations.length} violation{templateViolations.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {templateViolations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((e) => !e)}
                data-testid={`expand-${template.name}`}
                aria-label={expanded ? 'Collapse violations' : 'Expand violations'}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
        )}
        <p className="text-xs text-muted-foreground">Group: {template.group}</p>
      </CardHeader>
      {expanded && templateViolations.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2" data-testid="violations-list">
            {templateViolations.map((v, i) => (
              <div key={i} className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.name}</span>
                  {v.namespace && (
                    <span className="text-muted-foreground">ns: {v.namespace}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{v.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function ConstraintTemplateTable() {
  const {
    data: templates,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ['gatekeeper-constraint-templates'],
    queryFn: () => gatekeeperApi.listConstraintTemplates(),
  });

  const { data: violations, isLoading: loadingViolations } = useQuery({
    queryKey: ['gatekeeper-violations'],
    queryFn: () => gatekeeperApi.listViolations(),
  });

  if (loadingTemplates || loadingViolations) return <ConstraintTemplateSkeleton />;
  if (templatesError || !templates) {
    return (
      <EmptyState
        title="Gatekeeper Unavailable"
        description="Could not fetch Gatekeeper constraint templates. Ensure Gatekeeper is installed in the cluster."
      />
    );
  }
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No Constraint Templates"
        description="No Gatekeeper ConstraintTemplates found in this cluster."
      />
    );
  }

  return (
    <div className="space-y-2 pt-4" data-testid="constraint-template-table">
      <p className="text-sm text-muted-foreground mb-4">
        {templates.length} ConstraintTemplate{templates.length !== 1 ? 's' : ''} found
        {violations && violations.length > 0 &&
          ` \u2014 ${violations.length} total violation${violations.length !== 1 ? 's' : ''}`}
      </p>
      {templates.map((template) => (
        <ConstraintTemplateRow
          key={template.name}
          template={template}
          violations={violations ?? []}
        />
      ))}
    </div>
  );
}
