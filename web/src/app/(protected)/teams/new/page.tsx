"use client";

import { useState } from "react";
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

const TEAM_TYPES = Object.values(TeamType);

export default function NewTeamPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    displayName: "",
    description: "",
    type: TeamType.DEV as TeamType,
    contactEmail: "",
    slackChannel: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.displayName.trim()) {
      setError("Name and Display Name are required.");
      return;
    }

    setSaving(true);
    teams
      .create({
        name: form.name.trim(),
        displayName: form.displayName.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        contactEmail: form.contactEmail.trim() || undefined,
        slackChannel: form.slackChannel.trim() || undefined,
      })
      .then((created) => {
        toast.success(`Team "${created.displayName}" created`);
        router.push(`/teams/${created.id}`);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          setError(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          setError("An unexpected error occurred.");
        }
      })
      .finally(() => setSaving(false));
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Name (slug) <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. platform-core"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier, lowercase with hyphens
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Platform Core Team"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TeamType })
                }
              >
                {TEAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                placeholder="Brief description of the team's responsibilities"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  type="email"
                  placeholder="team@company.com"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm({ ...form, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Slack Channel</label>
                <Input
                  placeholder="team-channel"
                  value={form.slackChannel}
                  onChange={(e) =>
                    setForm({ ...form, slackChannel: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/teams">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
