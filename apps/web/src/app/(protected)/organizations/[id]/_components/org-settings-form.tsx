"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePermission } from "@/hooks/use-permission";
import { Permission } from "@farm/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const orgSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>;

interface OrgSettingsFormProps {
  org: Organization;
  onUpdated: (updated: Organization) => void;
}

export function OrgSettingsForm({ org, onUpdated }: OrgSettingsFormProps) {
  const { refreshOrgs } = useOrganization();
  const canManageOrg = usePermission(Permission.ORG_MANAGE);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrgSettingsFormValues>({
    resolver: zodResolver(orgSettingsSchema),
    mode: "onChange",
    // defaultValues drives RHF's isDirty tracking
    defaultValues: {
      name: org.name,
      description: org.description ?? "",
    },
  });

  const { showBadge } = useUnsavedChanges(isDirty);

  const onSubmit = async (values: OrgSettingsFormValues) => {
    try {
      const updated = await orgsApi.update(org.id, {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      toast.success("Organization updated.");
      onUpdated(updated);
      await refreshOrgs();
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body.message;
        toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
      } else {
        toast.error("Failed to update organization.");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Update the organization name and description.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "settings-name-error" : undefined}
            />
            {errors.name?.message && (
              <p id="settings-name-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.name.message}</p>
            )}
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
              {...register("description")}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {showBadge && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            {/* isDirty from RHF replaces the manual isDirty calculation */}
            <Button type="submit" disabled={isSubmitting || !isDirty || !canManageOrg}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
