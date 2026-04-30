"use client";

import { useState } from "react";
import { TeamType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const TEAM_TYPES = Object.values(TeamType);

interface TeamEditFormProps {
  form: {
    displayName: string;
    description: string;
    type: TeamType;
    contactEmail: string;
    slackChannel: string;
  };
  saving: boolean;
  onFormChange: (updates: Partial<TeamEditFormProps["form"]>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TeamEditForm({
  form,
  saving,
  onFormChange,
  onSave,
  onCancel,
}: TeamEditFormProps) {
  // Capture initial values once (lazy initializer runs only on first render)
  const [initialValues] = useState<TeamEditFormProps["form"]>(() => form);

  const isDirty =
    form.displayName !== initialValues.displayName ||
    form.description !== initialValues.description ||
    form.type !== initialValues.type ||
    form.contactEmail !== initialValues.contactEmail ||
    form.slackChannel !== initialValues.slackChannel;

  const { showBadge } = useUnsavedChanges(isDirty);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Edit Team Details</CardTitle>
        <CardDescription>Update name, type and contact information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={form.displayName}
              onChange={(e) => onFormChange({ displayName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={form.type}
              onChange={(e) => onFormChange({ type: e.target.value as TeamType })}
            >
              {TEAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contact Email</label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => onFormChange({ contactEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Slack Channel</label>
            <Input
              value={form.slackChannel}
              onChange={(e) => onFormChange({ slackChannel: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
            value={form.description}
            onChange={(e) => onFormChange({ description: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          {showBadge && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
