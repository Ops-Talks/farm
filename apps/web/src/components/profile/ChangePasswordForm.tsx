"use client";

// ChangePasswordForm — lets the authenticated user change their password.
//
// Validates that new password is ≥ 8 characters and that the confirmation
// matches before calling PATCH /auth/profile/password (204 No Content).
// On success the form is cleared and a sonner toast is shown.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { showBadge } = useUnsavedChanges(form.formState.isDirty);

  async function onSubmit(values: ChangePasswordFormValues) {
    setSubmitting(true);
    try {
      await auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      // The API returns 204 No Content — no body to read.
      form.reset();
      toast.success("Password changed successfully");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Change your password. You will need your current password to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          aria-label="Change password form"
        >
          {/* Current Password */}
          <div className="space-y-1">
            <label
              htmlFor="cp-currentPassword"
              className="text-sm font-medium"
            >
              Current Password
            </label>
            <Input
              id="cp-currentPassword"
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
              aria-invalid={!!form.formState.errors.currentPassword}
              aria-describedby={form.formState.errors.currentPassword ? "cp-currentPassword-error" : undefined}
            />
            {form.formState.errors.currentPassword && (
              <p id="cp-currentPassword-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label htmlFor="cp-newPassword" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="cp-newPassword"
              type="password"
              placeholder="New password (min. 8 characters)"
              autoComplete="new-password"
              {...form.register("newPassword")}
              aria-invalid={!!form.formState.errors.newPassword}
              aria-describedby={form.formState.errors.newPassword ? "cp-newPassword-error" : undefined}
            />
            {form.formState.errors.newPassword && (
              <p id="cp-newPassword-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label
              htmlFor="cp-confirmPassword"
              className="text-sm font-medium"
            >
              Confirm New Password
            </label>
            <Input
              id="cp-confirmPassword"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={!!form.formState.errors.confirmPassword}
              aria-describedby={form.formState.errors.confirmPassword ? "cp-confirmPassword-error" : undefined}
            />
            {form.formState.errors.confirmPassword && (
              <p id="cp-confirmPassword-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            {showBadge && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
