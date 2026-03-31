"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { kubernetes } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { OperatorInfo } from "@/types/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { FilterTabs } from "@/components/shared/filter-tabs";

// Phase badge colour mapping based on OLM operator phase.
function phaseBadgeClass(phase: string): string {
  switch (phase.toLowerCase()) {
    case "succeeded":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "failed":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "pending":
    case "installing":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  }
}

const PHASE_FILTERS = [
  { label: "All", id: "all" },
  { label: "Succeeded", id: "succeeded" },
  { label: "Failed", id: "failed" },
  { label: "Pending", id: "pending" },
];

export function OperatorsClient() {
  useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => kubernetes.listOperators(),
  });

  const filtered = operators.filter((op: OperatorInfo) => {
    if (activeTab !== "all" && op.phase.toLowerCase() !== activeTab)
      return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        op.displayName.toLowerCase().includes(q) ||
        op.name.toLowerCase().includes(q) ||
        (op.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Operators"
          description={`${operators.length} operator${operators.length !== 1 ? "s" : ""} discovered`}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <FilterTabs
            tabs={PHASE_FILTERS}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="flex-1"
          />
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search operators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
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
              ? "No operators match your filters."
              : "No operators discovered. Ensure OLM is installed in your cluster."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((op: OperatorInfo) => (
              <Link
                key={op.name}
                href={`/operators/${encodeURIComponent(op.name)}`}
              >
                <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {op.displayName}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={phaseBadgeClass(op.phase)}
                      >
                        {op.phase}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {op.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {op.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>v{op.version}</span>
                      {op.provider && <span>{op.provider}</span>}
                      <span>
                        {op.customResourceDefinitions.length} CRD
                        {op.customResourceDefinitions.length !== 1 ? "s" : ""}
                      </span>
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
