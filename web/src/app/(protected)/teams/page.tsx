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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

const TYPE_FILTERS: { label: string; value: TeamType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Dev", value: TeamType.DEV },
  { label: "Infra", value: TeamType.INFRA },
  { label: "Security", value: TeamType.SECURITY },
  { label: "Data", value: TeamType.DATA },
  { label: "Platform", value: TeamType.PLATFORM },
  { label: "Other", value: TeamType.OTHER },
];

export default function TeamsPage() {
  const { hasRole } = useAuth();
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TeamType | "all">("all");

  const fetchTeams = useCallback(() => {
    teams
      .list()
      .then(setAllTeams)
      .catch(() => setAllTeams([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filtered = allTeams.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            {allTeams.length} team{allTeams.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        {hasRole("admin") && (
          <Link href="/teams/new">
            <Button>Create Team</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-1 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:ml-auto sm:max-w-xs"
        />
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
          {search || typeFilter !== "all"
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

