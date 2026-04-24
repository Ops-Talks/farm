"use client";

import { useState, useEffect, useCallback } from "react";
import { finops, teams } from "@/lib/api-client";
import type {
  PlatformCostSummaryItem,
  TeamCostSummary,
} from "@/lib/api-client";
import type { Team } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CostBudgetBar } from "@/components/finops/CostBudgetBar";
import { ArrowUpDown, DollarSign } from "lucide-react";

type SortOrder = "asc" | "desc";
type ActiveTab = "by-component" | "by-team";

function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CostDashboardClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("by-component");

  // By Component state
  const [componentItems, setComponentItems] = useState<PlatformCostSummaryItem[]>([]);
  const [componentLoading, setComponentLoading] = useState(true);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // By Team state
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [teamCosts, setTeamCosts] = useState<Record<string, TeamCostSummary>>({});
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  // Load platform cost summary on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComponentLoading(true);
    finops
      .getPlatformCostSummary(50)
      .then((items) => {
        setComponentItems(items);
        setComponentError(null);
      })
      .catch(() => {
        setComponentError("Failed to load cost summary.");
      })
      .finally(() => {
        setComponentLoading(false);
      });
  }, []);

  // Load team data when the "By Team" tab is first activated
  const loadTeamData = useCallback(async () => {
    if (teamsLoaded) return;
    setTeamsLoading(true);
    try {
      const result = await teams.list();
      const teamList = result.data;
      setTeamsList(teamList);

      // Load each team's cost summary in parallel; failures are swallowed so
      // a single missing team doesn't block the rest.
      const costResults = await Promise.allSettled(
        teamList.map((t) => finops.getTeamCostSummary(t.id)),
      );
      const costsMap: Record<string, TeamCostSummary> = {};
      costResults.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const team = teamList[i];
          if (team) {
            costsMap[team.id] = r.value;
          }
        }
      });
      setTeamCosts(costsMap);
    } catch {
      // Teams list error — team list stays empty which triggers empty state
    } finally {
      setTeamsLoading(false);
      setTeamsLoaded(true);
    }
  }, [teamsLoaded]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "by-team") {
      void loadTeamData();
    }
  };

  // Sorted component items
  const sortedItems = [...componentItems].sort((a, b) =>
    sortOrder === "desc" ? b.totalCost - a.totalCost : a.totalCost - b.totalCost,
  );

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cost Dashboard"
        description="Monitor infrastructure costs across components and teams."
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleTabChange("by-component")}
          className={[
            "rounded-none border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "by-component"
              ? "border-b-primary text-primary"
              : "border-b-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-selected={activeTab === "by-component"}
          role="tab"
        >
          By Component
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleTabChange("by-team")}
          className={[
            "rounded-none border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "by-team"
              ? "border-b-primary text-primary"
              : "border-b-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-selected={activeTab === "by-team"}
          role="tab"
        >
          By Team
        </Button>
      </div>

      {/* By Component tab */}
      {activeTab === "by-component" && (
        <div>
          {componentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : componentError ? (
            <EmptyState
              title="Failed to Load Costs"
              description={componentError}
            />
          ) : sortedItems.length === 0 ? (
            <EmptyState
              title="No Cost Data"
              description="No cost data is available yet. Cost estimates are generated during pipeline runs."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component ID</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleSort}
                          className="flex items-center gap-1 p-0 h-auto font-semibold hover:bg-transparent"
                        >
                          Monthly Cost
                          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Last Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((item) => (
                      <TableRow key={item.componentId}>
                        <TableCell className="font-mono text-xs">
                          {item.componentId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCost(item.totalCost, item.currency)}
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          {item.budgetUsd != null && item.budgetUsd > 0 ? (
                            <CostBudgetBar
                              totalCost={item.totalCost}
                              budgetUsd={item.budgetUsd}
                              currency={item.currency}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No budget set
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.syncedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* By Team tab */}
      {activeTab === "by-team" && (
        <div>
          {teamsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : teamsList.length === 0 ? (
            <EmptyState
              title="No Teams Found"
              description="No teams are configured. Create a team to see cost breakdowns."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamsList.map((team) => {
                const cost = teamCosts[team.id];
                return (
                  <Card key={team.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {team.displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cost ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">Total Monthly</span>
                            <span className="text-base font-bold">
                              {formatCost(cost.totalCost, cost.currency)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cost.components.length} component
                            {cost.components.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No cost data available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
