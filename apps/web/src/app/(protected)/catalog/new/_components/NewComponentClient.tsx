"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { catalog } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import {
  ComponentKind,
  ComponentLifecycle,
} from "@/types/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { useScrollToError } from "@/hooks/use-scroll-to-error";
// S603: Server Actions — run mutations on the server when API_INTERNAL_URL is
// configured; __clientFallback signals to use the browser api-client instead.
import { createComponentAction, registerComponentYamlAction } from "../actions";

type FormTab = "form" | "yaml";

const KIND_OPTIONS = Object.values(ComponentKind);
const LIFECYCLE_OPTIONS = Object.values(ComponentLifecycle);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  owner: z.string().min(1, "Owner is required"),
  kind: z.nativeEnum(ComponentKind),
  lifecycle: z.nativeEnum(ComponentLifecycle),
  description: z.string().optional(),
  // Refine keeps a plain string type — empty value is allowed, non-empty must
  // be a valid URL.  Avoids ZodUnion edge-cases with @hookform/resolvers.
  repositoryUrl: z.string().refine(
    (v) => !v || (() => { try { new URL(v); return true; } catch { return false; } })(),
    { message: "Must be a valid URL" },
  ),
  tagsInput: z.string().optional(),
  // Optional Helm chart configuration (FARM-E36).
  // All sub-fields are optional; the entire block is omitted when repo is empty.
  helmChart: z.object({
    repo: z.string().optional(),
    chart: z.string().optional(),
    version: z.string().optional(),
    valuesRef: z.string().optional(),
  }).optional(),
});

const yamlFormSchema = z.object({
  yaml: z.string().min(1, "YAML content is required"),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;
type YamlFormValues = z.infer<typeof yamlFormSchema>;

export function NewComponentClient() {
  const router = useRouter();
  const [tab, setTab] = useState<FormTab>("form");

  // --- Interactive form ---
  const {
    register: registerForm,
    handleSubmit: handleFormSubmit,
    control,
    setError: setFormError,
    formState: { errors: formErrors, isSubmitting: formSubmitting },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      owner: "",
      kind: ComponentKind.SERVICE,
      lifecycle: ComponentLifecycle.EXPERIMENTAL,
      description: "",
      repositoryUrl: "",
      tagsInput: "",
      helmChart: {
        repo: "",
        chart: "",
        version: "",
        valuesRef: "",
      },
    },
  });

  // Watch tagsInput to render live badge preview
  const tagsInputValue = useWatch({ control, name: "tagsInput" }) ?? "";
  // Pre-compute the parsed tags array to avoid splitting on every render
  const tagsPreview = useMemo(
    () => tagsInputValue.split(",").map((t) => t.trim()).filter(Boolean),
    [tagsInputValue],
  );

  // --- YAML form ---
  const {
    register: registerYaml,
    handleSubmit: handleYamlSubmit,
    setError: setYamlError,
    formState: { errors: yamlErrors, isSubmitting: yamlSubmitting },
  } = useForm<YamlFormValues>({
    resolver: zodResolver(yamlFormSchema),
    mode: "onChange",
    defaultValues: { yaml: "" },
  });

  const onFormSubmit = async (values: ComponentFormValues) => {
    try {
      const tags = (values.tagsInput ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Only include helmChart when at least the repo is provided.
      const helmChart =
        values.helmChart?.repo?.trim()
          ? {
              repo: values.helmChart.repo.trim(),
              chart: values.helmChart.chart?.trim() || "",
              version: values.helmChart.version?.trim() || undefined,
              valuesRef: values.helmChart.valuesRef?.trim() || undefined,
            }
          : undefined;

      // S603: Try server action first; fall back to browser api-client.
      const input = {
        name: values.name,
        kind: values.kind,
        description: values.description || undefined,
        owner: values.owner,
        lifecycle: values.lifecycle,
        tags: tags.length > 0 ? tags : undefined,
        repositoryUrl: values.repositoryUrl?.trim() || undefined,
        helmChart,
      };
      const result = await createComponentAction(input);

      if ("__clientFallback" in result) {
        const created = await catalog.createComponent(input);
        toast.success(`Component "${created.name}" registered`);
        router.push(`/catalog/${created.id}`);
        return;
      }

      if ("error" in result) {
        setFormError("root", { message: result.error });
        return;
      }

      toast.success(`Component "${result.component.name}" registered`);
      router.push(`/catalog/${result.component.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError("root", {
          message: Array.isArray(err.body.message)
            ? err.body.message.join(", ")
            : err.body.message,
        });
      } else {
        setFormError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  const onYamlSubmit = async (values: YamlFormValues) => {
    try {
      // S603: Try server action first; fall back to browser api-client.
      const result = await registerComponentYamlAction(values.yaml);

      if ("__clientFallback" in result) {
        const created = await catalog.registerYaml(values.yaml);
        toast.success(`Component "${created.name}" registered from YAML`);
        router.push(`/catalog/${created.id}`);
        return;
      }

      if ("error" in result) {
        setYamlError("root", { message: result.error });
        return;
      }

      toast.success(`Component "${result.component.name}" registered from YAML`);
      router.push(`/catalog/${result.component.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setYamlError("root", {
          message: Array.isArray(err.body.message)
            ? err.body.message.join(", ")
            : err.body.message,
        });
      } else {
        setYamlError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  // Unified loading / error for the currently visible tab
  const loading = tab === "form" ? formSubmitting : yamlSubmitting;
  const rootError = tab === "form" ? formErrors.root?.message : yamlErrors.root?.message;

  const { registerRef, scrollToFirstError } = useScrollToError();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title="Register Component"
        description="Add a new component to the software catalog by using the form or importing a YAML definition."
      >
        <Button variant="outline" size="sm" onClick={() => router.push("/catalog")}>
          Back
        </Button>
      </PageHeader>

      {/* Tab toggle */}
      <div className="flex p-1 w-fit rounded-lg bg-muted/50 border">
        <Button
          variant={tab === "form" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setTab("form")}
        >
          Interactive Form
        </Button>
        <Button
          variant={tab === "yaml" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setTab("yaml")}
        >
          YAML Import
        </Button>
      </div>

      {rootError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <span className="font-bold">Error:</span> {rootError}
        </div>
      )}

      {tab === "form" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Component Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit(onFormSubmit, (errors) => scrollToFirstError(errors))} className="flex flex-col gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="comp-name" className="text-sm font-semibold">
                    Name <span className="text-destructive">*</span>
                  </label>
                  {(() => {
                    const nameField = registerForm("name");
                    return (
                      <Input
                        id="comp-name"
                        placeholder="e.g. user-service"
                        aria-invalid={!!formErrors.name}
                        aria-describedby={formErrors.name ? "name-error" : undefined}
                        name={nameField.name}
                        onBlur={nameField.onBlur}
                        onChange={nameField.onChange}
                        ref={(el) => {
                          nameField.ref(el);
                          registerRef("name", el);
                        }}
                      />
                    );
                  })()}
                  {formErrors.name?.message && (
                    <p id="name-error" role="alert" aria-live="polite" className="text-xs text-destructive">{formErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="comp-owner" className="text-sm font-semibold">
                    Owner <span className="text-destructive">*</span>
                  </label>
                  {(() => {
                    const ownerField = registerForm("owner");
                    return (
                      <Input
                        id="comp-owner"
                        placeholder="e.g. platform-team"
                        aria-invalid={!!formErrors.owner}
                        aria-describedby={formErrors.owner ? "owner-error" : undefined}
                        name={ownerField.name}
                        onBlur={ownerField.onBlur}
                        onChange={ownerField.onChange}
                        ref={(el) => {
                          ownerField.ref(el);
                          registerRef("owner", el);
                        }}
                      />
                    );
                  })()}
                  {formErrors.owner?.message && (
                    <p id="owner-error" role="alert" aria-live="polite" className="text-xs text-destructive">{formErrors.owner.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="comp-kind" className="text-sm font-semibold">
                    Kind
                  </label>
                  <select
                    id="comp-kind"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...registerForm("kind")}
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="comp-lifecycle" className="text-sm font-semibold">
                    Lifecycle
                  </label>
                  <select
                    id="comp-lifecycle"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...registerForm("lifecycle")}
                  >
                    {LIFECYCLE_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="comp-description" className="text-sm font-semibold">
                  Description
                </label>
                <Input
                  id="comp-description"
                  placeholder="Brief description of the component's purpose"
                  {...registerForm("description")}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="comp-repo-url" className="text-sm font-semibold">
                  Repository URL
                </label>
                {/* type="text" — Zod .refine() validates the URL; avoids jsdom/userEvent
                    quirks specific to type="url" inputs in tests */}
                <Input
                  id="comp-repo-url"
                  type="text"
                  placeholder="e.g. https://github.com/org/repo"
                  aria-invalid={!!formErrors.repositoryUrl}
                  aria-describedby={formErrors.repositoryUrl ? "repositoryUrl-error" : undefined}
                  {...registerForm("repositoryUrl")}
                  ref={(el) => {
                    registerForm("repositoryUrl").ref(el);
                    registerRef("repositoryUrl", el);
                  }}
                />
                {formErrors.repositoryUrl?.message && (
                  <p id="repositoryUrl-error" role="alert" aria-live="polite" className="text-xs text-destructive">{formErrors.repositoryUrl.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional. Must be a valid URL (GitHub, GitLab, etc.).
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="comp-tags" className="text-sm font-semibold">
                  Tags
                </label>
                <Input
                  id="comp-tags"
                  placeholder="Comma-separated values, e.g. production, critical, internal"
                  {...registerForm("tagsInput")}
                />
                {tagsPreview.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagsPreview.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] uppercase font-bold"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* ── Helm Chart section (optional, FARM-E36) ─────────────── */}
              <div className="pt-4 border-t space-y-4">
                <div>
                  <p className="text-sm font-semibold">Helm Chart</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optional. Fill in Repo and Chart to attach a Helm chart configuration.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="helm-repo" className="text-sm font-medium">
                      Helm Repo URL
                    </label>
                    <Input
                      id="helm-repo"
                      placeholder="e.g. https://charts.bitnami.com/bitnami"
                      {...registerForm("helmChart.repo")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="helm-chart" className="text-sm font-medium">
                      Chart Name
                    </label>
                    <Input
                      id="helm-chart"
                      placeholder="e.g. nginx"
                      {...registerForm("helmChart.chart")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="helm-version" className="text-sm font-medium">
                      Chart Version
                    </label>
                    <Input
                      id="helm-version"
                      placeholder="e.g. 15.1.0"
                      {...registerForm("helmChart.version")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="helm-values-ref" className="text-sm font-medium">
                      Values Ref
                    </label>
                    <Input
                      id="helm-values-ref"
                      placeholder="e.g. configmap/nginx-values"
                      {...registerForm("helmChart.valuesRef")}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                  {loading ? "Registering..." : "Register Component"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              YAML definition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleYamlSubmit(onYamlSubmit)} className="flex flex-col gap-6">
              <div className="space-y-2">
                <label htmlFor="comp-yaml" className="text-sm font-semibold">
                  Catalog YAML <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="comp-yaml"
                  rows={14}
                  className="flex w-full rounded-md border border-input bg-muted/30 px-3 py-3 font-mono text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-invalid={!!yamlErrors.yaml}
                  aria-describedby={yamlErrors.yaml ? "yaml-error" : undefined}
                  placeholder={`apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: user-service
  description: Handles user authentication
  tags:
    - auth
    - microservice
spec:
  type: service
  owner: platform-team
  lifecycle: production`}
                  {...registerYaml("yaml")}
                />
                {yamlErrors.yaml?.message && (
                  <p id="yaml-error" role="alert" aria-live="polite" className="text-xs text-destructive">{yamlErrors.yaml.message}</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                  {loading ? "Importing..." : "Import from YAML"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
