"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizations as orgsApi, ApiError } from "@/lib/api-client";
import { useOrganization } from "@/contexts/organization-context";
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const newOrgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type NewOrgFormValues = z.infer<typeof newOrgSchema>;

/** Converts a free-text name into a URL-safe slug (lowercase, hyphenated). */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewOrgClient() {
  const router = useRouter();
  const { refreshOrgs, switchOrg } = useOrganization();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewOrgFormValues>({
    resolver: zodResolver(newOrgSchema),
    defaultValues: { name: "", description: "" },
  });

  // Derive the slug preview from the watched name field
  const nameValue = watch("name");
  const slug = toSlug(nameValue ?? "");

  const onSubmit = async (values: NewOrgFormValues) => {
    try {
      const created = await orgsApi.create({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      toast.success(`Organization "${created.name}" created`);
      // Refresh the org list in context and switch to the newly created org
      await refreshOrgs();
      switchOrg(created);
      router.push(`/organizations/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body.message;
        setError("root", { message: Array.isArray(msg) ? msg.join(", ") : msg });
      } else {
        setError("root", { message: "An unexpected error occurred. Please try again." });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Organization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up a new organization to collaborate with your team.
          </p>
        </div>
        <Link href="/organizations">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Choose a name that identifies your organization. A URL-friendly slug
            is generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root?.message && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-name"
                className="text-sm font-medium leading-none"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="org-name"
                placeholder="e.g. Acme Engineering"
                autoFocus
                {...register("name")}
              />
              {errors.name?.message && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Slug preview (read-only, derived from name) */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-slug"
                className="text-sm font-medium leading-none"
              >
                Slug{" "}
                <span className="font-normal text-muted-foreground">
                  (auto-generated)
                </span>
              </label>
              <Input
                id="org-slug"
                value={slug}
                readOnly
                disabled
                className="font-mono text-sm"
                aria-describedby="slug-hint"
              />
              <p id="slug-hint" className="text-xs text-muted-foreground">
                Used in URLs — derived from the name above.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-description"
                className="text-sm font-medium leading-none"
              >
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <textarea
                id="org-description"
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Brief description of what this organization does"
                {...register("description")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/organizations">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              {/* isSubmitting disables the button while the API call is in flight */}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
