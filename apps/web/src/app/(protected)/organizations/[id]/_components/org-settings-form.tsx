"use client";

import { useState } from "react";
import { organizations as orgsApi, ApiError } from "@/lib/api-client";
import { useOrganization } from "@/contexts/organization-context";
import type { Organization } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";

interface OrgSettingsFormProps {
  org: Organization;
  onUpdated: (updated: Organization) => void;
}

export function OrgSettingsForm({ org, onUpdated }: OrgSettingsFormProps) {
  const { refreshOrgs } = useOrganization();

  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [saving, setSaving] = useState(false);

  const isDirty =
    name.trim() !== org.name || description.trim() !== (org.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    orgsApi
      .update(org.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      .then(async (updated) => {
        toast.success("Organization updated.");
        onUpdated(updated);
        await refreshOrgs();
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to update organization.");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Update the organization name and description.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="settings-name"
              className="text-sm font-medium leading-none"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-1.5">
            <label
              htmlFor="settings-slug"
              className="text-sm font-medium leading-none"
            >
              Slug{" "}
              <span className="font-normal text-muted-foreground">(read-only)</span>
            </label>
            <Input
              id="settings-slug"
              value={org.slug}
              readOnly
              disabled
              className="font-mono text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="settings-description"
              className="text-sm font-medium leading-none"
            >
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="settings-description"
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Brief description of the organization"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
