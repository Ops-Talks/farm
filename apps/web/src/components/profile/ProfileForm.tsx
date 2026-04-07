"use client";

// ProfileForm — lets the authenticated user view and update their personal
// information (first name, last name, email, gender).
//
// Uses react-hook-form + zod for validation and sonner for toast feedback,
// matching the patterns used in NewComponentClient and CRDResourcesTab.

import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { auth, ApiError } from "@/lib/api-client";
import type { UpdateProfileData } from "@/lib/api-client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  // Email is required and must be a valid address.
  email: z.string().min(1, "Email is required").email("Must be a valid email address"),
  // Gender is a plain string from the <select> — empty string means "not set".
  gender: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      gender: "",
    },
  });

  // Fetch the current user's profile on mount and populate the form fields.
  useEffect(() => {
    auth
      .getProfile()
      .then((profile) => {
        form.reset({
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          email: profile.email,
          gender: profile.gender ?? "",
        });
      })
      .catch(() => {
        toast.error("Failed to load profile");
      })
      .finally(() => {
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: ProfileFormValues) {
    setSubmitting(true);
    try {
      const payload: UpdateProfileData = {
        email: values.email,
      };
      if (values.firstName !== undefined) payload.firstName = values.firstName;
      if (values.lastName !== undefined) payload.lastName = values.lastName;
      // Only send gender when a non-empty value is selected.
      if (values.gender) {
        payload.gender = values.gender as "male" | "female" | "non_binary";
      }

      await auth.updateProfile(payload);
      toast.success("Profile updated successfully");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to update profile";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading skeleton — shown while the initial GET /auth/profile is in-flight
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name, email and gender.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" data-testid="skeleton" />
            <Skeleton className="h-10 w-full" data-testid="skeleton" />
          </div>
          <Skeleton className="h-10 w-full" data-testid="skeleton" />
          <Skeleton className="h-10 w-full" data-testid="skeleton" />
          <Skeleton className="h-10 w-32 ml-auto" data-testid="skeleton" />
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your name, email and gender.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          aria-label="Personal information form"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* First Name */}
            <div className="space-y-1">
              <label htmlFor="profile-firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="profile-firstName"
                placeholder="First name"
                {...form.register("firstName")}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1">
              <label htmlFor="profile-lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="profile-lastName"
                placeholder="Last name"
                {...form.register("lastName")}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="profile-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              placeholder="Email address"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive" role="alert" id="profile-email-error">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Gender — native <select> styled with Tailwind (no select.tsx in ui/) */}
          <div className="space-y-1">
            <label htmlFor="profile-gender" className="text-sm font-medium">
              Gender
            </label>
            <select
              id="profile-gender"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              {...form.register("gender")}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
