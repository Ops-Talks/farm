"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { PipelineStage } from "@/types/api";

const STAGE_TYPES = ["script", "approval", "deploy", "notify"] as const;
type StageType = (typeof STAGE_TYPES)[number];

const CONFIG_FIELD: Record<StageType, { key: string; label: string; placeholder: string }> = {
  script: { key: "command", label: "Command", placeholder: "e.g. npm run build" },
  approval: { key: "message", label: "Message", placeholder: "Approval required" },
  deploy: { key: "componentId", label: "Component ID", placeholder: "UUID of component" },
  notify: { key: "channel", label: "Channel", placeholder: "e.g. #deployments" },
};

const TYPE_BADGE_VARIANT: Record<
  StageType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  script: "secondary",
  approval: "outline",
  deploy: "default",
  notify: "secondary",
};

function getConfigSummary(stage: PipelineStage): string {
  const field = CONFIG_FIELD[stage.type as StageType];
  if (!field) return "";
  const value = stage.config[field.key];
  return value ? String(value) : "";
}

// ---------------------------------------------------------------------------
// Schema for the inline "add stage" form
// ---------------------------------------------------------------------------
const addStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  type: z.enum(STAGE_TYPES),
  configValue: z.string().optional(),
});

type AddStageFormValues = z.infer<typeof addStageSchema>;

interface StageBuilderProps {
  stages: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
  readOnly?: boolean;
}

export function StageBuilder({ stages, onChange, readOnly = false }: StageBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddStageFormValues>({
    resolver: zodResolver(addStageSchema),
    defaultValues: { name: "", type: "script", configValue: "" },
  });

  // Watch type to derive the correct config field label/placeholder
  const currentType = watch("type");
  const configField = CONFIG_FIELD[currentType];

  // HTML5 Drag-and-Drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const reordered = [...stages];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(dropIndex, 0, moved);
    // Reassign order fields to match new positions
    const updated = reordered.map((s, i) => ({ ...s, order: i }));
    onChange(updated);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  const onAddStage = (values: AddStageFormValues) => {
    const field = CONFIG_FIELD[values.type];
    const newStage: PipelineStage = {
      id: crypto.randomUUID(),
      name: values.name.trim(),
      type: values.type,
      order: stages.length,
      config: values.configValue ? { [field.key]: values.configValue } : {},
    };
    onChange([...stages, newStage]);
    // Reset the form and close the panel
    reset({ name: "", type: "script", configValue: "" });
    setShowAddForm(false);
  };

  function handleRemoveStage(id: string) {
    const filtered = stages.filter((s) => s.id !== id);
    const updated = filtered.map((s, i) => ({ ...s, order: i }));
    onChange(updated);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stage list */}
      {stages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No stages defined. {!readOnly && "Add a stage below."}
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {stages.map((stage, index) => {
            const isDragTarget = dragOverIndex === index;
            return (
              <li
                key={stage.id}
                draggable={!readOnly}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  isDragTarget
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-muted/30"
                } ${!readOnly ? "cursor-grab active:cursor-grabbing" : ""}`}
                aria-label={`Stage ${index + 1}: ${stage.name}`}
              >
                {/* Drag handle */}
                {!readOnly && (
                  <span
                    className="text-muted-foreground select-none text-base leading-none"
                    aria-hidden="true"
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                )}

                {/* Order indicator */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>

                {/* Stage name */}
                <span className="flex-1 font-medium truncate">{stage.name}</span>

                {/* Type badge */}
                <Badge
                  variant={TYPE_BADGE_VARIANT[stage.type as StageType] ?? "outline"}
                  className="capitalize"
                >
                  {stage.type}
                </Badge>

                {/* Config summary */}
                {getConfigSummary(stage) && (
                  <span className="hidden sm:block max-w-[160px] truncate text-xs text-muted-foreground">
                    {getConfigSummary(stage)}
                  </span>
                )}

                {/* Delete button */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStage(stage.id)}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove stage ${stage.name}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Add stage form */}
      {!readOnly && (
        <>
          {showAddForm ? (
            <form
              onSubmit={handleSubmit(onAddStage)}
              className="rounded-lg border p-4 flex flex-col gap-3 bg-muted/20"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="stage-name" className="text-sm font-medium">
                    Stage Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="stage-name"
                    placeholder="e.g. Build"
                    {...register("name")}
                  />
                  {errors.name?.message && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="stage-type" className="text-sm font-medium">
                    Type
                  </label>
                  <select
                    id="stage-type"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    {...register("type", {
                      onChange: () => {
                        // Reset the config value when the type changes
                        setValue("configValue", "");
                      },
                    })}
                  >
                    {STAGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="stage-config" className="text-sm font-medium">
                  {configField.label}
                </label>
                <Input
                  id="stage-config"
                  placeholder={configField.placeholder}
                  {...register("configValue")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    reset({ name: "", type: "script", configValue: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Add Stage
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setShowAddForm(true)}
            >
              + Add Stage
            </Button>
          )}
        </>
      )}
    </div>
  );
}
