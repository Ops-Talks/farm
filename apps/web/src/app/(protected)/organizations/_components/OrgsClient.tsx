"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Settings } from "lucide-react";
import { organizations as orgsApi } from "@/lib/api-client";
import { useOrganization } from "@/contexts/organization-context";
import type { Organization } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";

export function OrgsClient() {
  const { currentOrg, switchOrg } = useOrganization();
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(() => {
    orgsApi
      .list()
      .then(setAllOrgs)
      .catch(() => {
        toast.error("Failed to load organizations");
        setAllOrgs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizations"
        description={
          loading
            ? "Loading…"
            : `${allOrgs.length} organization${allOrgs.length !== 1 ? "s" : ""}`
        }
      >
        <Link href="/organizations/new">
          <Button>Create Organization</Button>
        </Link>
      </PageHeader>

      {loading ? (
        /* Skeleton grid while fetching */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-1 h-3 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allOrgs.length === 0 ? (
        /* Empty state */
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold">No organizations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first organization to get started.
          </p>
          <Link href="/organizations/new" className="mt-4 inline-block">
            <Button>Create Organization</Button>
          </Link>
        </div>
      ) : (
        /* Org card grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allOrgs.map((org) => {
            const isActive = currentOrg?.id === org.id;
            return (
              <Card
                key={org.id}
                className={
                  isActive
                    ? "border-primary/50 bg-primary/5"
                    : "transition-colors hover:bg-muted/50"
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <CardTitle className="truncate text-base">
                        {org.name}
                      </CardTitle>
                    </div>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {org.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {org.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {org.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchOrg(org)}
                      >
                        Switch
                      </Button>
                    )}
                    <Link
                      href={`/organizations/${org.id}`}
                      className={isActive ? "" : "ml-auto"}
                    >
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
