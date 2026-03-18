"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
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
    watch: watchForm,
    setError: setFormError,
    formState: { errors: formErrors, isSubmitting: formSubmitting },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: "",
      owner: "",
      kind: ComponentKind.SERVICE,
      lifecycle: ComponentLifecycle.EXPERIMENTAL,
      description: "",
      repositoryUrl: "",
      tagsInput: "",
    },
  });

  // Watch tagsInput to render live badge preview
  const tagsInputValue = watchForm("tagsInput") ?? "";

  // --- YAML form ---
  const {
    register: registerYaml,
    handleSubmit: handleYamlSubmit,
    setError: setYamlError,
    formState: { errors: yamlErrors, isSubmitting: yamlSubmitting },
  } = useForm<YamlFormValues>({
    resolver: zodResolver(yamlFormSchema),
    defaultValues: { yaml: "" },
  });

  const onFormSubmit = async (values: ComponentFormValues) => {
    try {
      const tags = (values.tagsInput ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await catalog.createComponent({
        name: values.name,
        kind: values.kind,
        description: values.description || undefined,
        owner: values.owner,
        lifecycle: values.lifecycle,
        tags: tags.length > 0 ? tags : undefined,
        repositoryUrl: values.repositoryUrl?.trim() || undefined,
      });

      toast.success(`Component "${created.name}" registered`);
      router.push(`/catalog/${created.id}`);
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
      const created = await catalog.registerYaml(values.yaml);
      toast.success(`Component "${created.name}" registered from YAML`);
      router.push(`/catalog/${created.id}`);
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
            <form onSubmit={handleFormSubmit(onFormSubmit)} className="flex flex-col gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="comp-name" className="text-sm font-semibold">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="comp-name"
                    placeholder="e.g. user-service"
                    {...registerForm("name")}
                  />
                  {formErrors.name?.message && (
                    <p className="text-xs text-destructive">{formErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="comp-owner" className="text-sm font-semibold">
                    Owner <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="comp-owner"
                    placeholder="e.g. platform-team"
                    {...registerForm("owner")}
                  />
                  {formErrors.owner?.message && (
                    <p className="text-xs text-destructive">{formErrors.owner.message}</p>
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
                  {...registerForm("repositoryUrl")}
                />
                {formErrors.repositoryUrl?.message && (
                  <p className="text-xs text-destructive">{formErrors.repositoryUrl.message}</p>
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
                {tagsInputValue && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagsInputValue
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
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
                  <p className="text-xs text-destructive">{yamlErrors.yaml.message}</p>
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
