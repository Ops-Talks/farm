"use client";

import { useState } from "react";
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = toSlug(name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    orgsApi
      .create({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      .then(async (created) => {
        toast.success(`Organization "${created.name}" created`);
        // Refresh the org list in context and switch to the newly created org
        await refreshOrgs();
        switchOrg(created);
        router.push(`/organizations/${created.id}`);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          setError(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      })
      .finally(() => setSaving(false));
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Slug preview (read-only) */}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/organizations">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? "Creating…" : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
