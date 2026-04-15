"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { iacModules } from "@/lib/api-client";
import type { IacProvider } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ExternalLink, Search } from "lucide-react";

const PROVIDER_OPTIONS = [
  { value: "all", label: "All providers" },
  { value: "aws", label: "AWS" },
  { value: "gcp", label: "GCP" },
  { value: "azure", label: "Azure" },
  { value: "kubernetes", label: "Kubernetes" },
  { value: "mongodb", label: "MongoDB" },
  { value: "postgres", label: "Postgres" },
  { value: "mysql", label: "MySQL" },
  { value: "github", label: "GitHub" },
  { value: "cloudflare", label: "Cloudflare" },
  { value: "generic", label: "Generic" },
];

function providerBadgeClass(provider: IacProvider): string {
  switch (provider) {
    case "aws":
      return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
    case "gcp":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    case "azure":
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400";
    case "kubernetes":
      return "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400";
    case "mongodb":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "postgres":
      return "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400";
    case "mysql":
      return "bg-teal-500/20 text-teal-700 dark:text-teal-400";
    case "github":
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    case "cloudflare":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    default:
      return "bg-slate-500/20 text-slate-700 dark:text-slate-400";
  }
}

const CardSkeleton = () => (
  <div className="rounded-xl border p-4 space-y-2">
    <Skeleton className="h-5 w-48" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-4 w-64" />
  </div>
);

export function IacModulesBrowserClient() {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["iac-modules", search, provider],
    queryFn: () =>
      iacModules.list({
        search: search || undefined,
        provider: provider !== "all" ? provider : undefined,
      }),
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="IaC Modules"
        description="Browse infrastructure modules for AWS, GCP, Azure, Kubernetes, and more."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="py-16 text-center border rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">No modules found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.id}
              href={`/iac-modules/${mod.id}`}
              className="group rounded-xl border p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors block"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{mod.name}</span>
                    <Badge
                      variant="secondary"
                      className={providerBadgeClass(mod.provider)}
                    >
                      {mod.provider}
                    </Badge>
                    {mod.engine && (
                      <Badge variant="outline" className="text-xs">
                        {mod.engine}
                      </Badge>
                    )}
                    {mod.latestVersion && (
                      <Badge variant="outline">{mod.latestVersion}</Badge>
                    )}
                  </div>
                  {mod.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {mod.description}
                    </p>
                  )}
                </div>
                <a
                  href={mod.sourceRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open source repository"
                  className={buttonVariants({ size: "icon", variant: "ghost", className: "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" })}
                  onClick={(e) => e.preventDefault()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
