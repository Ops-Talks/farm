"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { catalog } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import {
  ComponentKind,
  ComponentLifecycle,
} from "@/types/api";
import { toast } from "sonner";

type FormTab = "form" | "yaml";

const KIND_OPTIONS = Object.values(ComponentKind);
const LIFECYCLE_OPTIONS = Object.values(ComponentLifecycle);

export default function NewComponentPage() {
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Register Component</h1>
          <p className="text-sm text-muted-foreground">
            Add a new component to the software catalog
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/catalog")}>
          Cancel
        </Button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "form" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("form")}
        >
          Form
        </Button>
        <Button
          variant={tab === "yaml" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("yaml")}
        >
          YAML Import
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {tab === "form" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Component Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name *
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. user-service"
                    required
                  />
                </div>

                {/* Owner */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="owner" className="text-sm font-medium">
                    Owner *
                  </label>
                  <Input
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. platform-team"
                    required
                  />
                </div>

                {/* Kind */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kind" className="text-sm font-medium">
                    Kind
                  </label>
                  <select
                    id="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ComponentKind)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lifecycle */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lifecycle" className="text-sm font-medium">
                    Lifecycle
                  </label>
                  <select
                    id="lifecycle"
                    value={lifecycle}
                    onChange={(e) =>
                      setLifecycle(e.target.value as ComponentLifecycle)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {LIFECYCLE_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the component"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tags" className="text-sm font-medium">
                  Tags
                </label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated, e.g. java, microservice, auth"
                />
                {tagsInput && (
                  <div className="flex flex-wrap gap-1">
                    {tagsInput
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              <Separator />

              <Button type="submit" disabled={loading}>
                {loading ? "Registering..." : "Register Component"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YAML Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleYamlSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="yaml" className="text-sm font-medium">
                  Catalog YAML *
                </label>
                <textarea
                  id="yaml"
                  value={yaml}
                  onChange={(e) => setYaml(e.target.value)}
                  required
                  rows={14}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={`apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: user-service
  description: Handles user authentication
  tags:
    - java
    - microservice
spec:
  type: service
  owner: platform-team
  lifecycle: production`}
                />
              </div>

              <Separator />

              <Button type="submit" disabled={loading || !yaml.trim()}>
                {loading ? "Importing..." : "Import from YAML"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}