"use client";

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

export function NewComponentClient() {
  const router = useRouter();
  const [tab, setTab] = useState<FormTab>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ComponentKind>(ComponentKind.SERVICE);
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [lifecycle, setLifecycle] = useState<ComponentLifecycle>(
    ComponentLifecycle.EXPERIMENTAL,
  );
  const [tagsInput, setTagsInput] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");

  // YAML field
  const [yaml, setYaml] = useState("");

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await catalog.createComponent({
        name,
        kind,
        description: description || undefined,
        owner,
        lifecycle,
        tags: tags.length > 0 ? tags : undefined,
        repositoryUrl: repositoryUrl.trim() || undefined,
      });

      toast.success(`Component "${created.name}" registered`);
      router.push(`/catalog/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          Array.isArray(err.body.message)
            ? err.body.message.join(", ")
            : err.body.message,
        );
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleYamlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const created = await catalog.registerYaml(yaml);
      toast.success(`Component "${created.name}" registered from YAML`);
      router.push(`/catalog/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          Array.isArray(err.body.message)
            ? err.body.message.join(", ")
            : err.body.message,
        );
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

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

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <span className="font-bold">Error:</span> {error}
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
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. user-service"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="owner" className="text-sm font-semibold">
                    Owner <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. platform-team"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="kind" className="text-sm font-semibold">
                    Kind
                  </label>
                  <select
                    id="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ComponentKind)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="lifecycle" className="text-sm font-semibold">
                    Lifecycle
                  </label>
                  <select
                    id="lifecycle"
                    value={lifecycle}
                    onChange={(e) =>
                      setLifecycle(e.target.value as ComponentLifecycle)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <label htmlFor="description" className="text-sm font-semibold">
                  Description
                </label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the component's purpose"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="repositoryUrl" className="text-sm font-semibold">
                  Repository URL
                </label>
                <Input
                  id="repositoryUrl"
                  type="url"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="e.g. https://github.com/org/repo"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Must be a valid URL (GitHub, GitLab, etc.).
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-semibold">
                  Tags
                </label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated values, e.g. production, critical, internal"
                />
                {tagsInput && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagsInput
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
            <form onSubmit={handleYamlSubmit} className="flex flex-col gap-6">
              <div className="space-y-2">
                <label htmlFor="yaml" className="text-sm font-semibold">
                  Catalog YAML <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="yaml"
                  value={yaml}
                  onChange={(e) => setYaml(e.target.value)}
                  required
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
                />
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto" disabled={loading || !yaml.trim()}>
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
