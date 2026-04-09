"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterTabs } from "@/components/shared/filter-tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  KedaInstallStatus,
  KedaScaledObject,
  KedaScaledJob,
  KedaScaledObjectTrigger,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Status card
// ---------------------------------------------------------------------------

function KedaStatusCard({ status }: { status: KedaInstallStatus }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>KEDA Autoscaling</CardTitle>
          <div className="flex items-center gap-2">
            {status.version && (
              <span className="text-sm text-muted-foreground">
                v{status.version}
              </span>
            )}
            {status.installed ? (
              <Badge variant="default">Installed</Badge>
            ) : (
              <Badge variant="secondary">Not Installed</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {status.installed ? (
          <p className="text-sm text-muted-foreground">
            KEDA is running in this cluster and managing autoscaling resources.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            KEDA is not detected in this cluster.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active-state badge for ScaledObjects
// ---------------------------------------------------------------------------

function scaledObjectStateBadge(obj: KedaScaledObject) {
  if (obj.paused) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-400">
        Paused
      </Badge>
    );
  }
  if (obj.active) {
    return <Badge variant="default">Active</Badge>;
  }
  return <Badge variant="secondary">Idle</Badge>;
}

// ---------------------------------------------------------------------------
// Trigger detail row rendered inside the detail Sheet
// ---------------------------------------------------------------------------

function TriggerRow({ trigger }: { trigger: KedaScaledObjectTrigger }) {
  const entries = Object.entries(trigger.metadata);
  return (
    <div className="rounded-md border px-3 py-2 text-sm space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{trigger.type}</Badge>
        <span className="text-muted-foreground text-xs">trigger</span>
      </div>
      {entries.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs pt-1">
          {entries.map(([key, value]) => (
            <Fragment key={key}>
              <dt className="text-muted-foreground font-medium">{key}</dt>
              <dd className="font-mono break-all">{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScaledObjects card list
// ---------------------------------------------------------------------------

function ScaledObjectsTable({
  items,
  onRowClick,
}: {
  items: KedaScaledObject[];
  onRowClick: (obj: KedaScaledObject) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No ScaledObjects found in this cluster.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((obj) => (
        <button
          key={`${obj.namespace}/${obj.name}`}
          onClick={() => onRowClick(obj)}
          className="w-full text-left rounded-md border px-4 py-3 text-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="scaled-object-row"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{obj.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {obj.namespace}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {obj.triggers[0] && (
                <Badge variant="outline" className="text-xs">
                  {obj.triggers[0].type}
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {obj.minReplicaCount}&ndash;{obj.maxReplicaCount}
              </span>
              <span className="text-muted-foreground text-xs">{obj.targetDeployment ?? ""}</span>
              {scaledObjectStateBadge(obj)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScaledJobs card list
// ---------------------------------------------------------------------------

function ScaledJobsTable({ items }: { items: KedaScaledJob[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No ScaledJobs found in this cluster.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((job) => (
        <div
          key={`${job.namespace}/${job.name}`}
          className="rounded-md border px-4 py-3 text-sm"
          data-testid="scaled-job-row"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium truncate">{job.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {job.namespace}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground text-xs">
                {job.minReplicaCount}&ndash;{job.maxReplicaCount}
              </span>
              {job.ready ? (
                <Badge variant="default">Ready</Badge>
              ) : (
                <Badge variant="destructive">Not Ready</Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab type
// ---------------------------------------------------------------------------

type SubTabId = "scaled-objects" | "scaled-jobs";

const SUB_TABS: { id: SubTabId; label: string }[] = [
  { id: "scaled-objects", label: "ScaledObjects" },
  { id: "scaled-jobs", label: "ScaledJobs" },
];

// ---------------------------------------------------------------------------
// KedaTab — main export
// ---------------------------------------------------------------------------

export function KedaTab({
  status,
  scaledObjects,
  scaledJobs,
}: {
  status: KedaInstallStatus | null;
  scaledObjects: KedaScaledObject[];
  scaledJobs: KedaScaledJob[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("scaled-objects");
  const [selectedObject, setSelectedObject] = useState<KedaScaledObject | null>(
    null,
  );

  // Render skeleton placeholders while status is not yet available.
  if (!status) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <KedaStatusCard status={status} />

      <div className="flex flex-col gap-4">
        <FilterTabs
          tabs={SUB_TABS}
          activeTab={activeSubTab}
          onChange={(id) => setActiveSubTab(id as SubTabId)}
        />

        {activeSubTab === "scaled-objects" && (
          <ScaledObjectsTable
            items={scaledObjects}
            onRowClick={setSelectedObject}
          />
        )}
        {activeSubTab === "scaled-jobs" && (
          <ScaledJobsTable items={scaledJobs} />
        )}
      </div>

      {/* Detail sheet — opens when a ScaledObject row is clicked. */}
      <Sheet
        open={selectedObject !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedObject(null);
        }}
      >
        <SheetContent>
          {selectedObject && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedObject.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedObject.namespace}
                  {selectedObject.targetKind && selectedObject.targetDeployment
                    ? ` \u2013 ${selectedObject.targetKind} ${selectedObject.targetDeployment}`
                    : selectedObject.targetDeployment
                      ? ` \u2013 ${selectedObject.targetDeployment}`
                      : ""}
                </p>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-3 overflow-y-auto">
                <h4 className="text-sm font-semibold">Triggers</h4>
                {selectedObject.triggers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No triggers defined.
                  </p>
                ) : (
                  selectedObject.triggers.map((trigger, index) => (
                    <TriggerRow
                      key={`${trigger.type}-${index}`}
                      trigger={trigger}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
