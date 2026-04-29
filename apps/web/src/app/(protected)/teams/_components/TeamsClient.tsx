"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { teams } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { Team } from "@/types/api";
import { TeamType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { EmptyState } from "@/components/shared/empty-state";

// Derive a 1-2 letter initial from a team displayName for the avatar.
function teamInitials(displayName: string): string {
  return displayName
    .split(/[\s._-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Background color for team avatar — cycles through a set of distinct hues.
function teamAvatarBg(name: string): string {
  const palette = [
    "bg-indigo-500",
    "bg-teal-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-emerald-500",
  ];
  // Simple hash: sum of char codes mod palette length for deterministic color
  const hash = name
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? "bg-indigo-500";
}

function teamTypeBadgeColor(type: TeamType): string {
  switch (type) {
    case TeamType.DEV:
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    case TeamType.INFRA:
      return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    case TeamType.SECURITY:
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case TeamType.DATA:
      return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
    case TeamType.PLATFORM:
      return "bg-teal-500/20 text-teal-700 dark:text-teal-400";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  }
}

const TYPE_FILTERS = [
  { label: "All", id: "all" },
  { label: "Dev", id: TeamType.DEV },
  { label: "Infra", id: TeamType.INFRA },
  { label: "Security", id: TeamType.SECURITY },
  { label: "Data", id: TeamType.DATA },
  { label: "Platform", id: TeamType.PLATFORM },
  { label: "Other", id: TeamType.OTHER },
];

export function TeamsClient() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // useQuery replaces the useCallback+useEffect fetch pattern.
  // TanStack Query handles deduplication, caching, and background revalidation.
  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => teams.list(),
  });

  const allTeams: Team[] = data?.data ?? [];

  const filtered = allTeams.filter((t) => {
    if (activeTab !== "all" && t.type !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.displayName.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description={`${allTeams.length} team${allTeams.length !== 1 ? "s" : ""} registered`}
      >
        {hasRole("admin") && (
          <Link href="/teams/new">
            <Button>Create Team</Button>
          </Link>
        )}
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <FilterTabs
          tabs={TYPE_FILTERS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="flex-1"
        />
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        // 5-row skeleton mirrors real card: avatar circle + name/slug + type badge + description
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar circle */}
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1">
                      {/* displayName */}
                      <Skeleton className="h-5 w-28" />
                      {/* /slug */}
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  {/* type badge */}
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* description */}
                <Skeleton className="h-4 w-full" />
                {/* contact / slack */}
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        search || activeTab !== "all" ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No teams match your filters.
          </div>
        ) : (
          <EmptyState
            title="No teams registered"
            description="Create your first team to start organizing members and components."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              {/* Card: hover shadow + primary border tint transition (FARM-S168) */}
              <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* Avatar initials with deterministic color (FARM-S168) */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${teamAvatarBg(team.name)}`}
                        aria-hidden="true"
                      >
                        {teamInitials(team.displayName)}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {team.displayName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">
                          {team.name}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={teamTypeBadgeColor(team.type)}
                    >
                      {team.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {team.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {team.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {team.contactEmail && <span>{team.contactEmail}</span>}
                    {team.slackChannel && <span>#{team.slackChannel}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
