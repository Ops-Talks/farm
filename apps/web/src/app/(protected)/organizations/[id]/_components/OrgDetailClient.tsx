"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { organizations as orgsApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { Organization } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { OrgSettingsForm } from "./org-settings-form";
import { MembersSection } from "./members-section";
import { DangerZone } from "./danger-zone";
import { toast } from "sonner";

export function OrgDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchOrg = useCallback(() => {
    if (!id) return;
    orgsApi
      .get(id)
      .then(setOrg)
      .catch(() => {
        setNotFound(true);
        toast.error("Organization not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <EmptyState
        title="Organization Not Found"
        description="The organization you are looking for does not exist or has been deleted."
      >
        <Button variant="outline" onClick={() => router.push("/organizations")}>
          Back to Organizations
        </Button>
      </EmptyState>
    );
  }

  const isOwner = !!user && user.id === org.ownerId;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title={org.name}
        description={org.description ?? "No description provided."}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/organizations")}
        >
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      {/* Slug / metadata bar */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-mono text-[10px] uppercase bg-background px-1.5 py-0.5 rounded border">
          slug: {org.slug}
        </span>
        <span className="text-xs">
          Created{" "}
          {new Date(org.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General settings form */}
        <OrgSettingsForm org={org} onUpdated={setOrg} />

        {/* Members section (placeholder) */}
        <MembersSection />
      </div>

      {/* Danger zone — only for the organization owner */}
      <DangerZone org={org} isOwner={isOwner} />
    </div>
  );
}
