"use client";

// ApiSpecsTab — list, view, and manage API specs for a catalog component.
// Supports OpenAPI (rendered via SwaggerUI) and AsyncAPI (raw pre block).
// FARM-E47

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiSpecs as apiSpecsClient } from "@/lib/api-client";
import type {
  ApiSpec,
  ApiSpecFormat,
  ApiSpecStatus,
  CreateApiSpecDto,
  SpecDiffResult,
  SpecDiffEntry,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Dynamic SwaggerUI — SSR disabled (browser-only)
// ---------------------------------------------------------------------------

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function formatBadgeClass(format: ApiSpecFormat): string {
  return format === "openapi"
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-purple-100 text-purple-800 border-purple-200";
}

function statusBadgeVariant(
  status: ApiSpecStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "deprecated":
      return "secondary";
    case "sunset":
      return "destructive";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Try to parse a JSON or YAML spec string into an object for SwaggerUI.
// Falls back to null so the caller can render a <pre> block instead.
// ---------------------------------------------------------------------------

function tryParseSpec(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Not JSON — return null; caller renders raw <pre> block
    return null;
  }
}

// ---------------------------------------------------------------------------
// SpecListItem — pure sub-component, rendered in the specs list
// ---------------------------------------------------------------------------

interface SpecListItemProps {
  spec: ApiSpec;
  isSelected: boolean;
  onClick: (spec: ApiSpec) => void;
}

const SpecListItem = memo(function SpecListItem({
  spec,
  isSelected,
  onClick,
}: SpecListItemProps) {
  const handleClick = useCallback(() => onClick(spec), [spec, onClick]);

  return (
    <button
      type="button"
      data-testid={`spec-list-item-${spec.id}`}
      onClick={handleClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected ? "bg-muted border-primary/40" : "bg-background"
      }`}
    >
      <p className="text-sm font-medium truncate">{spec.name}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <span className="text-[10px] font-mono bg-muted border rounded px-1.5 py-0.5">
          v{spec.version}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase border rounded px-1.5 py-0.5 ${formatBadgeClass(spec.format)}`}
        >
          {spec.format}
        </span>
        <Badge
          variant={statusBadgeVariant(spec.status)}
          className="text-[10px] h-4 px-1.5 uppercase font-bold"
        >
          {spec.status}
        </Badge>
      </div>
    </button>
  );
});

// ---------------------------------------------------------------------------
// DiffTable — renders the diff results
// ---------------------------------------------------------------------------

interface DiffTableProps {
  result: SpecDiffResult;
}

const DiffTable = memo(function DiffTable({ result }: DiffTableProps) {
  return (
    <div data-testid="diff-table">
      <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
        <span>
          Total changes:{" "}
          <span className="font-semibold text-foreground">{result.totalChanges}</span>
        </span>
        <span>
          Breaking:{" "}
          <span className="font-semibold text-destructive">{result.breakingChanges}</span>
        </span>
      </div>
      <div className="overflow-auto rounded-md border max-h-64">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                Path
              </th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                Change Type
              </th>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                Breaking
              </th>
            </tr>
          </thead>
          <tbody>
            {result.entries.map((entry: SpecDiffEntry, i: number) => (
              <tr key={i} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-[11px] max-w-[240px] truncate">
                  {entry.path}
                </td>
                <td className="px-3 py-2 capitalize">{entry.type}</td>
                <td className="px-3 py-2">
                  {entry.breaking ? (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      No
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// AddSpecDialog — form to publish a new API spec
// ---------------------------------------------------------------------------

interface AddSpecDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateApiSpecDto) => Promise<void>;
}

const AddSpecDialog = memo(function AddSpecDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddSpecDialogProps) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<ApiSpecFormat>("openapi");
  const [version, setVersion] = useState("");
  const [spec, setSpec] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setFormat("openapi");
      setVersion("");
      setSpec("");
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !version.trim() || !spec.trim()) return;
      setSubmitting(true);
      try {
        await onSubmit({ name: name.trim(), format, version: version.trim(), spec: spec.trim() });
        onOpenChange(false);
      } finally {
        setSubmitting(false);
      }
    },
    [name, format, version, spec, onSubmit, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add API Spec</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} data-testid="add-spec-form">
          <div className="space-y-4">
            <div>
              <label htmlFor="spec-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="spec-name"
                data-testid="spec-name-input"
                placeholder="My API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="spec-format" className="text-sm font-medium">
                Format
              </label>
              <select
                id="spec-format"
                data-testid="spec-format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as ApiSpecFormat)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="openapi">OpenAPI</option>
                <option value="asyncapi">AsyncAPI</option>
              </select>
            </div>

            <div>
              <label htmlFor="spec-version" className="text-sm font-medium">
                Version
              </label>
              <Input
                id="spec-version"
                data-testid="spec-version-input"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="spec-content" className="text-sm font-medium">
                Spec Content (YAML or JSON)
              </label>
              <textarea
                id="spec-content"
                data-testid="spec-content-input"
                placeholder="Paste your OpenAPI or AsyncAPI spec here..."
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                required
                rows={10}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="add-spec-submit">
              {submitting ? "Publishing..." : "Publish Spec"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

// ---------------------------------------------------------------------------
// SpecViewer — right-panel content when a spec is selected
// ---------------------------------------------------------------------------

interface SpecViewerProps {
  spec: ApiSpec;
  otherSpecs: ApiSpec[];
  diffTarget: string;
  diffResult: SpecDiffResult | null;
  diffLoading: boolean;
  onDiffTargetChange: (id: string) => void;
  onDeprecate: () => void;
  onDelete: () => void;
}

const SpecViewer = memo(function SpecViewer({
  spec,
  otherSpecs,
  diffTarget,
  diffResult,
  diffLoading,
  onDiffTargetChange,
  onDeprecate,
  onDelete,
}: SpecViewerProps) {
  const parsed = useMemo(() => tryParseSpec(spec.spec), [spec.spec]);

  return (
    <div className="flex flex-col gap-4" data-testid="spec-viewer">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{spec.name}</h2>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-mono bg-muted border rounded px-1.5 py-0.5">
              v{spec.version}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase border rounded px-1.5 py-0.5 ${formatBadgeClass(spec.format)}`}
            >
              {spec.format}
            </span>
            <Badge
              variant={statusBadgeVariant(spec.status)}
              className="text-[10px] h-4 px-1.5 uppercase font-bold"
            >
              {spec.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {spec.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDeprecate}
              data-testid="deprecate-button"
            >
              Deprecate
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            data-testid="delete-button"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Spec content */}
      {spec.format === "openapi" ? (
        <div data-testid="swagger-ui-container" className="overflow-auto">
          {parsed ? (
            <SwaggerUI spec={parsed} />
          ) : (
            <pre
              data-testid="spec-raw-pre"
              className="text-xs overflow-auto bg-muted p-4 rounded-md max-h-[500px] font-mono"
            >
              {spec.spec}
            </pre>
          )}
        </div>
      ) : (
        <pre
          data-testid="asyncapi-pre"
          className="text-xs overflow-auto bg-muted p-4 rounded-md max-h-[500px] font-mono"
        >
          {spec.spec}
        </pre>
      )}

      {/* Diff panel */}
      <div className="border rounded-lg p-4 bg-muted/10" data-testid="diff-panel">
        <h3 className="text-sm font-semibold mb-3">Compare with version</h3>
        <select
          data-testid="diff-target-select"
          value={diffTarget}
          onChange={(e) => onDiffTargetChange(e.target.value)}
          className="block w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-3"
          disabled={otherSpecs.length === 0}
        >
          <option value="">Select a version to compare...</option>
          {otherSpecs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} v{s.version} ({s.format})
            </option>
          ))}
        </select>

        {diffLoading && (
          <p className="text-sm text-muted-foreground" data-testid="diff-loading">
            Loading diff...
          </p>
        )}

        {diffResult && !diffLoading && <DiffTable result={diffResult} />}

        {!diffLoading && !diffResult && diffTarget && (
          <p className="text-sm text-muted-foreground italic">No changes found.</p>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// ApiSpecsTab — main component
// ---------------------------------------------------------------------------

interface ApiSpecsTabProps {
  componentId: string;
}

export function ApiSpecsTab({ componentId }: ApiSpecsTabProps) {
  const [specs, setSpecs] = useState<ApiSpec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<ApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffTarget, setDiffTarget] = useState<string>("");
  const [diffResult, setDiffResult] = useState<SpecDiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeprecateDialog, setShowDeprecateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadSpecs = useCallback(() => {
    // setLoading(true) is the initial state; all setState calls happen inside
    // promise callbacks so they are async, satisfying react-hooks/set-state-in-effect.
    apiSpecsClient
      .listByComponent(componentId)
      .then((data) => {
        setSpecs(data);
        setLoading(false);
      })
      .catch(() => {
        setSpecs([]);
        setLoading(false);
      });
  }, [componentId]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Other specs available for diff comparison (all except currently selected)
  const otherSpecs = useMemo(
    () => specs.filter((s) => s.id !== selectedSpec?.id),
    [specs, selectedSpec],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectSpec = useCallback((spec: ApiSpec) => {
    setSelectedSpec(spec);
    setDiffTarget("");
    setDiffResult(null);
  }, []);

  const handleDiffTargetChange = useCallback(
    (targetId: string) => {
      setDiffTarget(targetId);
      setDiffResult(null);
      if (!targetId || !selectedSpec) return;
      setDiffLoading(true);
      apiSpecsClient
        .diff(selectedSpec.id, targetId)
        .then((result) => {
          setDiffResult(result);
        })
        .catch(() => {
          setDiffResult(null);
        })
        .finally(() => {
          setDiffLoading(false);
        });
    },
    [selectedSpec],
  );

  const handleAddSpec = useCallback(
    async (dto: CreateApiSpecDto) => {
      const created = await apiSpecsClient.create(componentId, dto);
      setSpecs((prev) => [...prev, created]);
    },
    [componentId],
  );

  const handleConfirmDeprecate = useCallback(() => {
    if (!selectedSpec) return;
    apiSpecsClient
      .update(selectedSpec.id, { status: "deprecated" })
      .then((updated) => {
        setSelectedSpec(updated);
        setSpecs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      })
      .catch(() => {});
  }, [selectedSpec]);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedSpec) return;
    const deletedId = selectedSpec.id;
    apiSpecsClient
      .remove(deletedId)
      .then(() => {
        setSpecs((prev) => prev.filter((s) => s.id !== deletedId));
        setSelectedSpec(null);
        setDiffTarget("");
        setDiffResult(null);
      })
      .catch(() => {});
  }, [selectedSpec]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pt-4" data-testid="api-specs-loading">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 pt-4" data-testid="api-specs-tab">
      {/* ── Left panel — spec list ─────────────────────────────────────── */}
      <div className="w-[30%] min-w-[200px] flex flex-col gap-2" data-testid="spec-list-panel">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            API Specs
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            data-testid="add-spec-button"
          >
            + Add Spec
          </Button>
        </div>

        {specs.length === 0 ? (
          <EmptyState
            title="No API Specs"
            description="Publish an API spec to get started."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {specs.map((spec) => (
              <SpecListItem
                key={spec.id}
                spec={spec}
                isSelected={selectedSpec?.id === spec.id}
                onClick={handleSelectSpec}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel — spec viewer ──────────────────────────────────── */}
      <div className="flex-1 min-w-0" data-testid="spec-viewer-panel">
        {selectedSpec ? (
          <SpecViewer
            spec={selectedSpec}
            otherSpecs={otherSpecs}
            diffTarget={diffTarget}
            diffResult={diffResult}
            diffLoading={diffLoading}
            onDiffTargetChange={handleDiffTargetChange}
            onDeprecate={() => setShowDeprecateDialog(true)}
            onDelete={() => setShowDeleteDialog(true)}
          />
        ) : (
          <div
            className="flex items-center justify-center h-48 rounded-lg border border-dashed text-sm text-muted-foreground"
            data-testid="spec-viewer-empty"
          >
            Select an API spec to view details.
          </div>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <AddSpecDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddSpec}
      />

      <ConfirmDialog
        open={showDeprecateDialog}
        onOpenChange={setShowDeprecateDialog}
        title="Deprecate API Spec"
        description={`Mark "${selectedSpec?.name ?? "this spec"}" as deprecated? Consumers will be notified that they should migrate away.`}
        confirmLabel="Deprecate"
        variant="destructive"
        onConfirm={handleConfirmDeprecate}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete API Spec"
        description={`Permanently delete "${selectedSpec?.name ?? "this spec"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
