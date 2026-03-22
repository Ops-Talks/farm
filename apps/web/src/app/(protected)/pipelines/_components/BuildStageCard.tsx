"use client";

// BuildStageCard — form card for configuring a "build" pipeline stage.
// Handles: engine, dockerfile, context, tag (required), push toggle, registry.

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const buildStageSchema = z.object({
  engine: z.enum(["docker", "buildah", "podman"]),
  dockerfile: z.string().min(1),
  context: z.string().min(1),
  tag: z.string().min(1, "Image tag is required"),
  push: z.boolean(),
  registry: z
    .string()
    .url("Registry must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type BuildStageFormValues = z.infer<typeof buildStageSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BuildStageCardProps {
  /** Called when the form is submitted successfully. */
  onSave: (values: BuildStageFormValues) => void;
  /** Called when the user clicks Cancel. */
  onCancel?: () => void;
  /** Optional initial values for edit scenarios. */
  defaultValues?: Partial<BuildStageFormValues>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BuildStageCard({
  onSave,
  onCancel,
  defaultValues,
}: BuildStageCardProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BuildStageFormValues>({
    resolver: zodResolver(buildStageSchema),
    defaultValues: {
      engine: "docker",
      dockerfile: "Dockerfile",
      context: ".",
      tag: "",
      push: false,
      registry: "",
      ...defaultValues,
    },
  });

  // Reset to provided defaultValues when they change (edit use-case)
  useEffect(() => {
    if (defaultValues) {
      reset({
        engine: "docker",
        dockerfile: "Dockerfile",
        context: ".",
        tag: "",
        push: false,
        registry: "",
        ...defaultValues,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showPush = useWatch({ control, name: "push" });

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-4 bg-muted/10">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Build Configuration
      </h3>
      <form
        onSubmit={handleSubmit(onSave)}
        className="flex flex-col gap-4"
        data-testid="build-stage-form"
      >
        {/* Engine */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="build-engine" className="text-sm font-medium">
              Engine
            </label>
            <select
              id="build-engine"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              {...register("engine")}
            >
              <option value="docker">docker</option>
              <option value="buildah">buildah</option>
              <option value="podman">podman</option>
            </select>
            {errors.engine?.message && (
              <p className="text-xs text-destructive">{errors.engine.message}</p>
            )}
          </div>

          {/* Tag (required) */}
          <div className="space-y-1">
            <label htmlFor="build-tag" className="text-sm font-medium">
              Image Tag <span className="text-destructive">*</span>
            </label>
            <Input
              id="build-tag"
              placeholder="e.g. {{version}} or {{commitSha}}"
              {...register("tag")}
            />
            {errors.tag?.message && (
              <p className="text-xs text-destructive">{errors.tag.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Supports{" "}
              <code className="rounded bg-muted px-1">{"{{version}}"}</code> and{" "}
              <code className="rounded bg-muted px-1">{"{{commitSha}}"}</code>{" "}
              template variables.
            </p>
          </div>
        </div>

        {/* Dockerfile + Context */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="build-dockerfile" className="text-sm font-medium">
              Dockerfile
            </label>
            <Input
              id="build-dockerfile"
              placeholder="Dockerfile"
              {...register("dockerfile")}
            />
            {errors.dockerfile?.message && (
              <p className="text-xs text-destructive">{errors.dockerfile.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="build-context" className="text-sm font-medium">
              Build Context
            </label>
            <Input
              id="build-context"
              placeholder="."
              {...register("context")}
            />
            {errors.context?.message && (
              <p className="text-xs text-destructive">{errors.context.message}</p>
            )}
          </div>
        </div>

        {/* Push toggle */}
        <div className="flex items-center gap-3">
          <input
            id="build-push"
            type="checkbox"
            className="h-4 w-4 rounded border accent-primary"
            {...register("push")}
          />
          <label htmlFor="build-push" className="text-sm font-medium select-none cursor-pointer">
            Push image to registry after build
          </label>
        </div>

        {/* Registry — only visible when push=true */}
        {showPush && (
          <div className="space-y-1">
            <label htmlFor="build-registry" className="text-sm font-medium">
              Registry URL{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="build-registry"
              placeholder="https://registry.example.com"
              {...register("registry")}
            />
            {errors.registry?.message && (
              <p className="text-xs text-destructive">{errors.registry.message}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm">
            Add Build Stage
          </Button>
        </div>
      </form>
    </div>
  );
}
