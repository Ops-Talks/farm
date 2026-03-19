"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { pipelines as pipelinesApi, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FilterTabs } from "@/components/shared/filter-tabs";
import dynamic from "next/dynamic";
import { StageBuilder } from "@/app/(protected)/pipelines/_components/stage-builder";
import { RunList } from "./run-list";
import { RunDetail } from "./run-detail";

// --- Dynamically imported heavy sub-components ---
// RunStatsPanel and RunComparison are only rendered inside the "Runs" tab,
// and both contain significant rendering logic (134 and 262 lines respectively).
// Deferring them keeps the initial pipeline-detail bundle lighter.

/** RunStatsPanel: 134 lines — aggregate run metrics cards */
const RunStatsPanel = dynamic(
  () => import("./run-stats").then((m) => ({ default: m.RunStatsPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-24 bg-muted rounded-md" />
    ),
  },
);

/** RunComparison: 262 lines — wide Sheet with stage-diff table */
const RunComparison = dynamic(
  () =>
    import("./run-comparison").then((m) => ({ default: m.RunComparison })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-32 bg-muted rounded-md" />
    ),
  },
);
import type { Pipeline, PipelineStage } from "@/types/api";
import { ChevronLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { recordSpan } from "@/lib/otel-spans";

type TabId = "definition" | "runs";

const TABS: { id: TabId; label: string }[] = [
  { id: "definition", label: "Definition" },
  { id: "runs", label: "Runs" },
];

export function PipelineDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("definition");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // RunList uses this key to force a refetch (e.g. after triggering a new run)
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);

  // Run comparison state — set when the user picks two runs to compare
  const [compareRunA, setCompareRunA] = useState<string | null>(null);
  const [compareRunB, setCompareRunB] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStages, setEditStages] = useState<PipelineStage[]>([]);

  const fetchPipeline = useCallback(() => {
    if (!id) return;
    pipelinesApi
      .get(id)
      .then((p) => {
        setPipeline(p);
        setEditName(p.name);
        setEditDescription(p.description ?? "");
        setEditStages(p.stages ?? []);
      })
      .catch(() => setError("Pipeline not found"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleTrigger = () => {
    if (!id) return;
    setTriggering(true);

    // Wrap the trigger API call in an OTel span so we can observe pipeline
    // run trigger rates, latencies, and failures in Tempo.
    void recordSpan(
      "pipeline.run.trigger",
      () => pipelinesApi.trigger(id),
      { "pipeline.id": id },
    )
      .then((run) => {
        toast.success(`Pipeline triggered — Run ${run.id.slice(0, 8)}`);
        // Switch to the Runs tab and bump the refresh key so RunList re-fetches
        setActiveTab("runs");
        setRunsRefreshKey((k) => k + 1);
        setSelectedRunId(run.id);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to trigger pipeline");
        }
      })
      .finally(() => setTriggering(false));
  };

  const handleSave = () => {
    if (!id || !pipeline) return;
    setSaving(true);
    pipelinesApi
      .update(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        stages: editStages,
      })
      .then((updated) => {
        setPipeline(updated);
        setEditing(false);
        toast.success("Pipeline updated");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to update pipeline");
        }
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!id) return;
    pipelinesApi
      .remove(id)
      .then(() => {
        toast.success("Pipeline deleted");
        router.push("/pipelines");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to delete pipeline");
        }
      });
  };

  const handleSelectRun = (runId: string) => {
    setSelectedRunId((prev) => (prev === runId ? null : runId));
  };

  const handleCompare = (runIdA: string, runIdB: string) => {
    setCompareRunA(runIdA);
    setCompareRunB(runIdB);
    setShowComparison(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <EmptyState
        title="Pipeline Not Found"
        description={error ?? "The pipeline you are looking for does not exist or has been deleted."}
      >
        <Button variant="outline" onClick={() => router.push("/pipelines")}>
          Back to Pipelines
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title={pipeline.name}
        description={pipeline.description ?? "No description provided."}
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleTrigger}
            disabled={triggering}
            aria-label="Trigger pipeline run"
          >
            {triggering ? "Triggering…" : "Trigger Run"}
          </Button>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setEditName(pipeline.name);
                setEditDescription(pipeline.description ?? "");
                setEditStages(pipeline.stages ?? []);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/pipelines")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <FilterTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Definition Tab */}
      {activeTab === "definition" && (
        <div className="flex flex-col gap-4">
          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Pipeline</CardTitle>
                <CardDescription>
                  Update the pipeline name, description, and stages.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-1">
                  <label htmlFor="edit-pipeline-name" className="text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="edit-pipeline-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-pipeline-description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="edit-pipeline-description"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Stages</h3>
                  <StageBuilder stages={editStages} onChange={setEditStages} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditName(pipeline.name);
                      setEditDescription(pipeline.description ?? "");
                      setEditStages(pipeline.stages ?? []);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Definition</CardTitle>
                {pipeline.description && (
                  <CardDescription>{pipeline.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>
                    Created by:{" "}
                    <span className="text-foreground font-medium">{pipeline.createdBy}</span>
                  </span>
                  <span>
                    Created:{" "}
                    <span className="text-foreground">
                      {new Date(pipeline.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Updated:{" "}
                    <span className="text-foreground">
                      {new Date(pipeline.updatedAt).toLocaleString()}
                    </span>
                  </span>
                  <Badge variant="outline">
                    {pipeline.stages?.length ?? 0} stage
                    {(pipeline.stages?.length ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Stages</h3>
                  <StageBuilder
                    stages={pipeline.stages ?? []}
                    onChange={() => {}}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === "runs" && (
        <div className="flex flex-col gap-4">
          {/* Stats panel — aggregate metrics above the run table */}
          <RunStatsPanel pipelineId={pipeline.id} />

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Run History
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRunsRefreshKey((k) => k + 1)}
            >
              Refresh
            </Button>
          </div>

          {/* RunList is self-contained: it fetches and paginates its own data */}
          <RunList
            pipelineId={pipeline.id}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
            onCompare={handleCompare}
            refreshKey={runsRefreshKey}
          />

          {selectedRunId && id && (
            <RunDetail
              pipelineId={id}
              runId={selectedRunId}
              pipeline={pipeline ?? undefined}
            />
          )}

          {/* Run comparison sheet — rendered when IDs are selected.
              The `open` prop drives both Sheet visibility and useQuery
              `enabled`, so no unnecessary network request is made until
              the user actually opens the comparison panel. */}
          {compareRunA && compareRunB && (
            <RunComparison
              pipelineId={pipeline.id}
              runIdA={compareRunA}
              runIdB={compareRunB}
              open={showComparison}
              onClose={() => setShowComparison(false)}
            />
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete pipeline"
        description={`Are you sure you want to delete "${pipeline.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
