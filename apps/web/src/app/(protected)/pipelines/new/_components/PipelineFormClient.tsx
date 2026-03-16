"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { pipelines as pipelinesApi, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StageBuilder } from "@/app/(protected)/pipelines/_components/stage-builder";
import type { PipelineStage } from "@/types/api";

export function PipelineFormClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Pipeline name is required.");
      return;
    }

    setSaving(true);
    pipelinesApi
      .create({
        name: name.trim(),
        description: description.trim() || undefined,
        stages,
      })
      .then((created) => {
        toast.success(`Pipeline "${created.name}" created`);
        router.push(`/pipelines/${created.id}`);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          setError(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          setError("An unexpected error occurred.");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Define a new CI/CD pipeline with stages
          </p>
        </div>
        <Link href="/pipelines">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Details</CardTitle>
            <CardDescription>
              Provide a name and optional description for this pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="pipeline-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="pipeline-name"
                placeholder="e.g. deploy-production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pipeline-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="pipeline-description"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                placeholder="Brief description of what this pipeline does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stages</CardTitle>
            <CardDescription>
              Add and order the stages for this pipeline. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StageBuilder stages={stages} onChange={setStages} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/pipelines">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create Pipeline"}
          </Button>
        </div>
      </form>
    </div>
  );
}
