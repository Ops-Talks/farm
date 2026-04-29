"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useScrollToError } from "@/hooks/use-scroll-to-error";

// ---------------------------------------------------------------------------
// Schema — stages are managed via StageBuilder (not a form field)
// ---------------------------------------------------------------------------
const pipelineFormSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
});

type PipelineFormValues = z.infer<typeof pipelineFormSchema>;

export function PipelineFormClient() {
  const router = useRouter();
  // stages are controlled outside RHF because StageBuilder has its own
  // drag-and-drop logic; they are passed directly to the API on submit.
  const [stages, setStages] = useState<PipelineStage[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineFormSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "" },
  });

  const { registerRef, scrollToFirstError } = useScrollToError();

  const onSubmit = async (values: PipelineFormValues) => {
    try {
      const created = await pipelinesApi.create({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        stages,
      });
      toast.success(`Pipeline "${created.name}" created`);
      router.push(`/pipelines/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body.message;
        setError("root", { message: Array.isArray(msg) ? msg.join(", ") : msg });
      } else {
        setError("root", { message: "An unexpected error occurred." });
      }
    }
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

      <form onSubmit={handleSubmit(onSubmit, (errs) => scrollToFirstError(errs))} className="flex flex-col gap-4">
        {errors.root?.message && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errors.root.message}
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
                {...register("name")}
                ref={(el) => { register("name").ref(el); registerRef("name", el); }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "pipeline-name-error" : undefined}
              />
              {errors.name?.message && (
                <p id="pipeline-name-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="pipeline-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="pipeline-description"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                placeholder="Brief description of what this pipeline does"
                {...register("description")}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Pipeline"}
          </Button>
        </div>
      </form>
    </div>
  );
}
