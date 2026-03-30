"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { serviceTemplates } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  ServiceTemplate,
  TemplateVariable,
  ScaffoldRequest,
  CreateServiceTemplateDto,
  UpdateServiceTemplateDto,
  CreateScaffoldRequestDto,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
] as const;

const PAGE_SIZE = 20;

const SCAFFOLD_STEPS = [
  "Template Info",
  "Variables",
  "Target Repository",
  "Review",
] as const;

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function languageBadgeClass(language: string): string {
  switch (language) {
    case "typescript":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "go":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "python":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "java":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "rust":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function scaffoldStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "in_progress":
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatLanguage(language: string): string {
  const match = SUPPORTED_LANGUAGES.find((l) => l.value === language);
  return match ? match.label : language;
}

// ---------------------------------------------------------------------------
// TemplatesClient
// ---------------------------------------------------------------------------

export function TemplatesClient() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  // -- List state -----------------------------------------------------------
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  // -- Create/Edit dialog state ---------------------------------------------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ServiceTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // -- Form fields ----------------------------------------------------------
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLanguage, setFormLanguage] = useState("typescript");
  const [formFramework, setFormFramework] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formRepositoryUrl, setFormRepositoryUrl] = useState("");

  // -- Delete state ---------------------------------------------------------
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null,
  );

  // -- Scaffold dialog state ------------------------------------------------
  const [scaffoldOpen, setScaffoldOpen] = useState(false);
  const [scaffoldTemplate, setScaffoldTemplate] =
    useState<ServiceTemplate | null>(null);
  const [scaffoldStep, setScaffoldStep] = useState(0);
  const [scaffoldVariables, setScaffoldVariables] = useState<
    Record<string, string>
  >({});
  const [scaffoldTargetRepo, setScaffoldTargetRepo] = useState("");
  const [scaffoldSubmitting, setScaffoldSubmitting] = useState(false);
  const [scaffoldResult, setScaffoldResult] = useState<ScaffoldRequest | null>(
    null,
  );
  const [dryRunResult, setDryRunResult] = useState<ScaffoldRequest | null>(
    null,
  );
  const [dryRunLoading, setDryRunLoading] = useState(false);

  // -- Data fetching --------------------------------------------------------

  const fetchTemplates = useCallback(
    async (newSkip: number = skip) => {
      setLoading(true);
      try {
        const res = await serviceTemplates.list({
          skip: newSkip,
          take: PAGE_SIZE,
        });
        setTemplates(res.data);
        setTotal(res.total);
        setSkip(newSkip);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load service templates";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [skip],
  );

  useEffect(() => {
    fetchTemplates(0);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Pagination -----------------------------------------------------------

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  function handleNextPage() {
    if (hasNextPage) {
      fetchTemplates(skip + PAGE_SIZE);
    }
  }

  function handlePrevPage() {
    if (hasPrevPage) {
      fetchTemplates(Math.max(0, skip - PAGE_SIZE));
    }
  }

  // -- Create/Edit dialog helpers -------------------------------------------

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormLanguage("typescript");
    setFormFramework("");
    setFormTags("");
    setFormRepositoryUrl("");
  }

  function openCreateDialog() {
    setEditingTemplate(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(template: ServiceTemplate) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description ?? "");
    setFormLanguage(template.language);
    setFormFramework(template.framework);
    setFormTags(template.tags?.join(", ") ?? "");
    setFormRepositoryUrl(template.repositoryUrl);
    setDialogOpen(true);
  }

  function isFormValid(): boolean {
    const name = formName.trim();
    return (
      name.length >= 2 &&
      name.length <= 100 &&
      formLanguage.trim().length > 0 &&
      formFramework.trim().length > 0 &&
      formRepositoryUrl.trim().length > 0
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid()) return;

    setSubmitting(true);
    try {
      const tags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingTemplate) {
        const dto: UpdateServiceTemplateDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          language: formLanguage,
          framework: formFramework.trim(),
          tags: tags.length > 0 ? tags : undefined,
          repositoryUrl: formRepositoryUrl.trim(),
        };
        const updated = await serviceTemplates.update(editingTemplate.id, dto);
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
        toast.success(`Template "${updated.name}" updated`);
      } else {
        const dto: CreateServiceTemplateDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          language: formLanguage,
          framework: formFramework.trim(),
          tags: tags.length > 0 ? tags : undefined,
          repositoryUrl: formRepositoryUrl.trim(),
        };
        const created = await serviceTemplates.create(dto);
        setTemplates((prev) => [...prev, created]);
        setTotal((prev) => prev + 1);
        toast.success(`Template "${created.name}" created`);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : editingTemplate
            ? "Failed to update template"
            : "Failed to create template";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // -- Delete handler -------------------------------------------------------

  async function handleDelete() {
    if (!deletingTemplateId) return;
    const target = templates.find((t) => t.id === deletingTemplateId);
    try {
      await serviceTemplates.remove(deletingTemplateId);
      setTemplates((prev) =>
        prev.filter((t) => t.id !== deletingTemplateId),
      );
      setTotal((prev) => prev - 1);
      toast.success(`Template "${target?.name}" deleted`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete template";
      toast.error(message);
    } finally {
      setDeletingTemplateId(null);
    }
  }

  // -- Scaffold dialog helpers ----------------------------------------------

  function openScaffoldDialog(template: ServiceTemplate) {
    setScaffoldTemplate(template);
    setScaffoldStep(0);
    setScaffoldTargetRepo("");
    setScaffoldResult(null);
    setDryRunResult(null);
    setDryRunLoading(false);

    // Initialize variables with defaults from template
    const initialVars: Record<string, string> = {};
    if (template.variables) {
      for (const v of template.variables) {
        initialVars[v.key] = v.default ?? "";
      }
    }
    setScaffoldVariables(initialVars);
    setScaffoldOpen(true);
  }

  function closeScaffoldDialog() {
    setScaffoldOpen(false);
    setScaffoldTemplate(null);
    setScaffoldResult(null);
    setDryRunResult(null);
  }

  function handleScaffoldVariableChange(key: string, value: string) {
    setScaffoldVariables((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvanceStep(): boolean {
    if (!scaffoldTemplate) return false;

    switch (scaffoldStep) {
      case 0:
        // Template info step, always valid
        return true;
      case 1: {
        // Variables step: all required variables must have values
        const vars = scaffoldTemplate.variables ?? [];
        return vars
          .filter((v) => v.required)
          .every((v) => (scaffoldVariables[v.key] ?? "").trim().length > 0);
      }
      case 2:
        // Target repository must be provided
        return scaffoldTargetRepo.trim().length > 0;
      case 3:
        // Review step, always valid
        return true;
      default:
        return false;
    }
  }

  function buildScaffoldDto(): CreateScaffoldRequestDto {
    const variableEntries = Object.entries(scaffoldVariables).filter(
      ([, v]) => v.trim().length > 0,
    );
    return {
      targetRepository: scaffoldTargetRepo.trim(),
      variables:
        variableEntries.length > 0
          ? Object.fromEntries(variableEntries)
          : undefined,
    };
  }

  async function handleDryRun() {
    if (!scaffoldTemplate) return;
    setDryRunLoading(true);
    setDryRunResult(null);
    try {
      const dto = buildScaffoldDto();
      const result = await serviceTemplates.scaffoldDryRun(
        scaffoldTemplate.id,
        dto,
      );
      setDryRunResult(result);
      toast.success("Dry run completed");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Dry run failed";
      toast.error(message);
    } finally {
      setDryRunLoading(false);
    }
  }

  async function handleScaffold() {
    if (!scaffoldTemplate) return;
    setScaffoldSubmitting(true);
    try {
      const dto = buildScaffoldDto();
      const result = await serviceTemplates.scaffold(
        scaffoldTemplate.id,
        dto,
      );
      setScaffoldResult(result);
      toast.success(
        `Scaffolding "${scaffoldTemplate.name}" started successfully`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Scaffolding failed";
      toast.error(message);
    } finally {
      setScaffoldSubmitting(false);
    }
  }

  // -- Render ---------------------------------------------------------------

  const deletingName = templates.find(
    (t) => t.id === deletingTemplateId,
  )?.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Service Templates"
        description="Curated templates for scaffolding new services."
      >
        {isAdmin && (
          <Button onClick={openCreateDialog}>Create Template</Button>
        )}
      </PageHeader>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <EmptyState
          title="No service templates"
          description="Create your first service template to enable golden-path scaffolding for your organization."
        >
          {isAdmin && (
            <Button className="mt-4" onClick={openCreateDialog}>
              Create Template
            </Button>
          )}
        </EmptyState>
      )}

      {/* Templates table */}
      {!loading && templates.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Built-in</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{template.name}</span>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${languageBadgeClass(template.language)}`}
                    >
                      {formatLanguage(template.language)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {template.framework}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.tags && template.tags.length > 0 ? (
                        template.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          --
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isBuiltIn ? "default" : "secondary"}
                    >
                      {template.isBuiltIn ? "Built-in" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openScaffoldDialog(template)}
                      >
                        Scaffold
                      </Button>
                      {isAdmin && !template.isBuiltIn && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(template)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeletingTemplateId(template.id)
                            }
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && templates.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {skip + 1}--{Math.min(skip + templates.length, total)} of{" "}
            {total} template{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPrevPage}
              onClick={handlePrevPage}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasNextPage}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Create / Edit template dialog                                     */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the details for this service template."
                : "Define a new service template for your organization."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="tpl-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="tpl-name"
                  placeholder="my-service-template"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Between 2 and 100 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="tpl-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="tpl-description"
                  placeholder="Optional description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="tpl-language"
                  className="text-sm font-medium"
                >
                  Language <span className="text-destructive">*</span>
                </label>
                <select
                  id="tpl-language"
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tpl-framework"
                  className="text-sm font-medium"
                >
                  Framework <span className="text-destructive">*</span>
                </label>
                <Input
                  id="tpl-framework"
                  placeholder="e.g. nestjs, express, gin, fastapi"
                  value={formFramework}
                  onChange={(e) => setFormFramework(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="tpl-tags" className="text-sm font-medium">
                  Tags
                </label>
                <Input
                  id="tpl-tags"
                  placeholder="api, microservice, grpc (comma-separated)"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple tags with commas.
                </p>
              </div>

              <div>
                <label
                  htmlFor="tpl-repository"
                  className="text-sm font-medium"
                >
                  Repository URL <span className="text-destructive">*</span>
                </label>
                <Input
                  id="tpl-repository"
                  placeholder="https://github.com/org/template-repo"
                  value={formRepositoryUrl}
                  onChange={(e) => setFormRepositoryUrl(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !isFormValid()}>
                {submitting
                  ? editingTemplate
                    ? "Updating..."
                    : "Creating..."
                  : editingTemplate
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete confirmation dialog                                        */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        open={!!deletingTemplateId}
        onOpenChange={(open) => !open && setDeletingTemplateId(null)}
        title="Delete Template"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Scaffold wizard dialog                                            */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={scaffoldOpen}
        onOpenChange={(open) => {
          if (!open) closeScaffoldDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scaffold New Service</DialogTitle>
            <DialogDescription>
              Create a new service from the &quot;{scaffoldTemplate?.name}&quot;
              template.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-2">
            {SCAFFOLD_STEPS.map((stepLabel, idx) => (
              <div key={stepLabel} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    idx === scaffoldStep
                      ? "bg-primary text-primary-foreground"
                      : idx < scaffoldStep
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </span>
                <span
                  className={`text-xs ${
                    idx === scaffoldStep
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {stepLabel}
                </span>
                {idx < SCAFFOLD_STEPS.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Scaffold result (shown after successful scaffold) */}
          {scaffoldResult ? (
            <Card>
              <CardHeader>
                <CardTitle>Scaffold Request Created</CardTitle>
                <CardDescription>
                  Your service is being scaffolded. Track the progress below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Request ID</dt>
                  <dd className="font-mono text-xs">{scaffoldResult.id}</dd>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${scaffoldStatusBadgeClass(scaffoldResult.status)}`}
                    >
                      {scaffoldResult.status}
                    </span>
                  </dd>
                  <dt className="text-muted-foreground">Target Repository</dt>
                  <dd className="font-mono text-xs">
                    {scaffoldResult.targetRepository}
                  </dd>
                  {scaffoldResult.statusMessage && (
                    <>
                      <dt className="text-muted-foreground">Message</dt>
                      <dd>{scaffoldResult.statusMessage}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Step 0: Template Info */}
              {scaffoldStep === 0 && scaffoldTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle>{scaffoldTemplate.name}</CardTitle>
                    {scaffoldTemplate.description && (
                      <CardDescription>
                        {scaffoldTemplate.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Language</dt>
                      <dd>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${languageBadgeClass(scaffoldTemplate.language)}`}
                        >
                          {formatLanguage(scaffoldTemplate.language)}
                        </span>
                      </dd>
                      <dt className="text-muted-foreground">Framework</dt>
                      <dd>{scaffoldTemplate.framework}</dd>
                      {scaffoldTemplate.tags &&
                        scaffoldTemplate.tags.length > 0 && (
                          <>
                            <dt className="text-muted-foreground">Tags</dt>
                            <dd className="flex flex-wrap gap-1">
                              {scaffoldTemplate.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </dd>
                          </>
                        )}
                      <dt className="text-muted-foreground">Repository</dt>
                      <dd className="font-mono text-xs break-all">
                        {scaffoldTemplate.repositoryUrl}
                      </dd>
                      <dt className="text-muted-foreground">Variables</dt>
                      <dd>
                        {scaffoldTemplate.variables?.length ?? 0} defined
                      </dd>
                    </dl>
                  </CardContent>
                </Card>
              )}

              {/* Step 1: Variables */}
              {scaffoldStep === 1 && scaffoldTemplate && (
                <div className="space-y-4">
                  {!scaffoldTemplate.variables ||
                  scaffoldTemplate.variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This template has no configurable variables. Continue to
                      the next step.
                    </p>
                  ) : (
                    scaffoldTemplate.variables.map(
                      (variable: TemplateVariable) => (
                        <div key={variable.key}>
                          <label
                            htmlFor={`scaffold-var-${variable.key}`}
                            className="text-sm font-medium"
                          >
                            {variable.label}
                            {variable.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </label>
                          <Input
                            id={`scaffold-var-${variable.key}`}
                            placeholder={variable.default ?? ""}
                            value={scaffoldVariables[variable.key] ?? ""}
                            onChange={(e) =>
                              handleScaffoldVariableChange(
                                variable.key,
                                e.target.value,
                              )
                            }
                            required={variable.required}
                          />
                          {variable.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {variable.description}
                            </p>
                          )}
                          {variable.pattern && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Pattern: {variable.pattern}
                            </p>
                          )}
                        </div>
                      ),
                    )
                  )}
                </div>
              )}

              {/* Step 2: Target Repository */}
              {scaffoldStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="scaffold-target-repo"
                      className="text-sm font-medium"
                    >
                      Target Repository{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="scaffold-target-repo"
                      placeholder="org/new-service-name"
                      value={scaffoldTargetRepo}
                      onChange={(e) => setScaffoldTargetRepo(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The repository where the scaffolded service will be
                      created (e.g. org/new-service-name).
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {scaffoldStep === 3 && scaffoldTemplate && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Summary</CardTitle>
                      <CardDescription>
                        Verify the details below before scaffolding.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Template</dt>
                        <dd className="font-medium">
                          {scaffoldTemplate.name}
                        </dd>
                        <dt className="text-muted-foreground">Language</dt>
                        <dd>{formatLanguage(scaffoldTemplate.language)}</dd>
                        <dt className="text-muted-foreground">Framework</dt>
                        <dd>{scaffoldTemplate.framework}</dd>
                        <dt className="text-muted-foreground">
                          Target Repository
                        </dt>
                        <dd className="font-mono text-xs">
                          {scaffoldTargetRepo}
                        </dd>
                        {scaffoldTemplate.variables &&
                          scaffoldTemplate.variables.length > 0 && (
                            <>
                              <dt className="text-muted-foreground col-span-2 mt-2 font-semibold">
                                Variables
                              </dt>
                              {scaffoldTemplate.variables.map((v) => (
                                <React.Fragment key={v.key}>
                                  <dt className="text-muted-foreground pl-2">
                                    {v.label}
                                  </dt>
                                  <dd className="font-mono text-xs">
                                    {scaffoldVariables[v.key] || (
                                      <span className="text-muted-foreground italic">
                                        (empty)
                                      </span>
                                    )}
                                  </dd>
                                </React.Fragment>
                              ))}
                            </>
                          )}
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Dry run result */}
                  {dryRunResult && dryRunResult.renderedFiles && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Dry Run: Rendered Files</CardTitle>
                        <CardDescription>
                          Preview of files that will be generated.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-60">
                          {dryRunResult.renderedFiles.join("\n")}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {dryRunResult &&
                    dryRunResult.status === "failed" &&
                    dryRunResult.statusMessage && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Dry Run Failed</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-destructive">
                            {dryRunResult.statusMessage}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                </div>
              )}
            </>
          )}

          {/* Footer navigation */}
          <DialogFooter>
            {scaffoldResult ? (
              <Button variant="outline" onClick={closeScaffoldDialog}>
                Close
              </Button>
            ) : (
              <>
                {scaffoldStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScaffoldStep((s) => s - 1)}
                    disabled={scaffoldSubmitting}
                  >
                    Back
                  </Button>
                )}

                {scaffoldStep === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeScaffoldDialog}
                  >
                    Cancel
                  </Button>
                )}

                {/* Spacer pushes action buttons to the right */}
                <div className="flex-1" />

                {scaffoldStep < SCAFFOLD_STEPS.length - 1 && (
                  <Button
                    type="button"
                    onClick={() => setScaffoldStep((s) => s + 1)}
                    disabled={!canAdvanceStep()}
                  >
                    Next
                  </Button>
                )}

                {scaffoldStep === SCAFFOLD_STEPS.length - 1 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDryRun}
                      disabled={dryRunLoading || scaffoldSubmitting}
                    >
                      {dryRunLoading ? "Running..." : "Dry Run"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleScaffold}
                      disabled={scaffoldSubmitting}
                    >
                      {scaffoldSubmitting ? "Scaffolding..." : "Scaffold"}
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
