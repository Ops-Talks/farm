"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchTeams = useCallback(() => {
    teams
      .list()
      .then((res) => setAllTeams(res.data))
      .catch(() => setAllTeams([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {search || activeTab !== "all"
            ? "No teams match your filters."
            : "No teams registered yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {team.displayName}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={teamTypeBadgeColor(team.type)}
                    >
                      {team.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {team.name}
                  </p>
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
  );
}
