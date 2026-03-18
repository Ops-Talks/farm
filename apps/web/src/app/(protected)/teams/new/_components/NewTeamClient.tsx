"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { teams, ApiError } from "@/lib/api-client";
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
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const newTeamSchema = z.object({
  name: z.string().min(1, "Name (slug) is required"),
  displayName: z.string().min(1, "Display Name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(TeamType),
  // Refine keeps a plain string type — empty string is allowed (becomes undefined
  // in the API payload), non-empty strings must be valid email addresses.
  contactEmail: z.string().refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: "Invalid email address" },
  ),
  slackChannel: z.string().optional(),
});

type NewTeamFormValues = z.infer<typeof newTeamSchema>;

const TEAM_TYPES = Object.values(TeamType);

export function NewTeamClient() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewTeamFormValues>({
    resolver: zodResolver(newTeamSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      type: TeamType.DEV,
      contactEmail: "",
      slackChannel: "",
    },
  });

  const onSubmit = async (values: NewTeamFormValues) => {
    try {
      const created = await teams.create({
        name: values.name.trim(),
        displayName: values.displayName.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        contactEmail: values.contactEmail?.trim() || undefined,
        slackChannel: values.slackChannel?.trim() || undefined,
      });
      toast.success(`Team "${created.displayName}" created`);
      router.push(`/teams/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body.message;
        setError("root", { message: Array.isArray(msg) ? msg.join(", ") : msg });
      } else {
        setError("root", { message: "An unexpected error occurred." });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Team</h1>
          <p className="text-sm text-muted-foreground">
            Register a new team in the portal
          </p>
        </div>
        <Link href="/teams">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
          <CardDescription>
            Provide the team identifier (slug), display name, and optional
            contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root?.message && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="team-name" className="text-sm font-medium">
                  Name (slug) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="team-name"
                  placeholder="e.g. platform-core"
                  {...register("name")}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier, lowercase with hyphens
                </p>
                {errors.name?.message && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="team-display-name" className="text-sm font-medium">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="team-display-name"
                  placeholder="e.g. Platform Core Team"
                  {...register("displayName")}
                />
                {errors.displayName?.message && (
                  <p className="text-xs text-destructive">{errors.displayName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="team-type" className="text-sm font-medium">Type</label>
              <select
                id="team-type"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                {...register("type")}
              >
                {TEAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="team-description" className="text-sm font-medium">Description</label>
              <textarea
                id="team-description"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                placeholder="Brief description of the team's responsibilities"
                {...register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="team-contact-email" className="text-sm font-medium">Contact Email</label>
                {/* type="text" — Zod .refine() validates the email format; avoids
                    jsdom/userEvent quirks specific to type="email" inputs */}
                <Input
                  id="team-contact-email"
                  type="text"
                  placeholder="team@company.com"
                  {...register("contactEmail")}
                />
                {errors.contactEmail?.message && (
                  <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="team-slack" className="text-sm font-medium">Slack Channel</label>
                <Input
                  id="team-slack"
                  placeholder="team-channel"
                  {...register("slackChannel")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/teams">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
