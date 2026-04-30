"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { alertingRules } from "@/lib/api-client";
import type { AlertingRule } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const DURATIONS = ["1m", "5m", "10m", "30m", "1h", "6h"] as const;
const SEVERITIES: AlertingRule["severity"][] = ["critical", "warning", "info"];

interface AlertingRuleFormClientProps {
  rule?: AlertingRule; // If provided, we are in edit mode
}

export function AlertingRuleFormClient({ rule }: AlertingRuleFormClientProps) {
  const router = useRouter();
  const isEdit = !!rule;

  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [query, setQuery] = useState(rule?.query ?? "");
  const [duration, setDuration] = useState<string>(rule?.duration ?? "5m");
  const [severity, setSeverity] = useState<AlertingRule["severity"]>(
    rule?.severity ?? "warning",
  );
  const [componentId, setComponentId] = useState(rule?.componentId ?? "");
  const [environmentId, setEnvironmentId] = useState(
    rule?.environmentId ?? "",
  );
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);

  // isDirty: true when any field differs from the original rule values
  const isDirty =
    name !== (rule?.name ?? "") ||
    description !== (rule?.description ?? "") ||
    query !== (rule?.query ?? "") ||
    duration !== (rule?.duration ?? "5m") ||
    severity !== (rule?.severity ?? "warning") ||
    componentId !== (rule?.componentId ?? "") ||
    environmentId !== (rule?.environmentId ?? "");

  const { showBadge } = useUnsavedChanges(isDirty && isEdit);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !query.trim()) {
      toast.error("Name and Query are required");
      return;
    }

    setSubmitting(true);
    const payload: Partial<AlertingRule> = {
      name: name.trim(),
      description: description.trim() || undefined,
      query: query.trim(),
      duration,
      severity,
      componentId: componentId.trim() || undefined,
      environmentId: environmentId.trim() || undefined,
      enabled,
    };

    try {
      if (isEdit && rule) {
        await alertingRules.update(rule.id, payload);
        toast.success("Rule updated");
      } else {
        await alertingRules.create(
          payload as Omit<AlertingRule, "id" | "createdAt" | "updatedAt">,
        );
        toast.success("Rule created");
      }
      router.push("/alerting-rules");
    } catch {
      toast.error(`Failed to ${isEdit ? "update" : "create"} rule`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Alerting Rule" : "Create Alerting Rule"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HighMemoryUsage"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* PromQL Query */}
          <div className="space-y-1">
            <label className="text-sm font-medium">PromQL Query *</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="process_resident_memory_bytes > 500000000"
              className="font-mono text-xs"
              required
            />
            <p className="text-xs text-muted-foreground">
              Alert fires when this PromQL expression returns results.
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    duration === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Severity</label>
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as AlertingRule["severity"])
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Component ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Component ID (optional)</label>
            <Input
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              placeholder="Leave blank to apply globally"
            />
          </div>

          {/* Environment ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Environment ID (optional)
            </label>
            <Input
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              placeholder="Leave blank to apply to all environments"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                enabled ? "bg-primary" : "bg-input"
              }`}
              aria-label={enabled ? "Disable rule" : "Enable rule"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm">{enabled ? "Enabled" : "Disabled"}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {showBadge && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                ? "Save Changes"
                : "Create Rule"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/alerting-rules")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
