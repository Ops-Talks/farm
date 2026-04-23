"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ThanosOperatorComponent,
  ThanosLabelComponent,
  ThanosComponentType,
  ThanosResponse,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function readinessBadge(ready: boolean) {
  return ready ? (
    <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
      Ready
    </Badge>
  ) : (
    <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50">
      Degraded
    </Badge>
  );
}

function replicasBadge(readyReplicas: number, desiredReplicas: number) {
  const healthy = readyReplicas >= desiredReplicas && desiredReplicas > 0;
  const variant = healthy
    ? "border-green-600 text-green-700 bg-green-50"
    : readyReplicas > 0
      ? "border-yellow-500 text-yellow-700 bg-yellow-50"
      : "border-red-500 text-red-600 bg-red-50";
  return (
    <Badge variant="outline" className={variant}>
      {readyReplicas}/{desiredReplicas}
    </Badge>
  );
}

function componentTypeLabel(type: ThanosComponentType): string {
  const labels: Record<ThanosComponentType, string> = {
    querier: "Querier",
    "store-gateway": "Store Gateway",
    compactor: "Compactor",
    ruler: "Ruler",
    receiver: "Receiver",
    sidecar: "Sidecar",
  };
  return labels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Operator-managed section
// ---------------------------------------------------------------------------

function OperatorComponentsSection({
  components,
}: {
  components: ThanosOperatorComponent[];
}) {
  if (components.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No operator-managed Thanos components detected.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {components.map((c) => (
        <li
          key={`${c.namespace}/${c.name}`}
          className="flex items-center justify-between rounded border px-4 py-2 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">
              {c.namespace} · {componentTypeLabel(c.type)}
            </span>
          </div>
          {readinessBadge(c.ready)}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Helm / YAML section
// ---------------------------------------------------------------------------

function LabelComponentsSection({
  components,
}: {
  components: ThanosLabelComponent[];
}) {
  if (components.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No Helm or YAML-managed Thanos components detected.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {components.map((c) => (
        <li
          key={`${c.namespace}/${c.name}`}
          className="flex items-center justify-between rounded border px-4 py-2 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">
              {c.namespace} · {componentTypeLabel(c.type)}
            </span>
          </div>
          {replicasBadge(c.readyReplicas, c.desiredReplicas)}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ThanosTab — main export
// ---------------------------------------------------------------------------

export function ThanosTab({ data }: { data: ThanosResponse | null }) {
  // Render skeleton placeholders while data is not yet available.
  if (data === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const isEmpty = data.operator.length === 0 && data.inCluster.length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          No Thanos components detected. Install the Thanos operator, deploy via
          the bitnami/thanos Helm chart, or configure kube-prometheus-stack with
          a Thanos sidecar to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Operator-managed</CardTitle>
        </CardHeader>
        <CardContent>
          <OperatorComponentsSection components={data.operator} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Helm / YAML</CardTitle>
        </CardHeader>
        <CardContent>
          <LabelComponentsSection components={data.inCluster} />
        </CardContent>
      </Card>
    </div>
  );
}
