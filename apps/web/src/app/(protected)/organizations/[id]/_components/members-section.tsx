"use client";

import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

/**
 * MembersSection — placeholder for future member management.
 *
 * The backend members API is not yet available; this section is rendered to
 * reserve the UI space and communicate the upcoming feature to users.
 */
export function MembersSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Members
        </CardTitle>
        <CardDescription>
          Manage who has access to this organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">Member management coming soon</p>
          <p className="mt-1 text-xs">
            Invite collaborators and manage roles in a future release.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
