"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { iacModules } from "@/lib/api-client";
import type { IacModule, IacModuleVersion, IacModuleVariable, IacModuleOutput } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { providerBadgeClass } from "@/lib/iac-utils";
import { ChevronLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Usage snippet
// ---------------------------------------------------------------------------

function buildUsageSnippet(mod: IacModule, version: IacModuleVersion | null): string {
  const tag = version?.version ?? mod.latestVersion ?? "latest";
  const src = `${mod.sourceRepoUrl}?ref=${tag}`;
  return `module "${mod.name.replace(/-/g, "_")}" {\n  source  = "${src}"\n}`;
}

// ---------------------------------------------------------------------------
// Variables table
// ---------------------------------------------------------------------------

function VariablesTable({ variables }: { variables: IacModuleVariable[] }) {
  if (variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No variables declared in this version.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Default</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Required</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variables.map((v) => (
          <TableRow key={v.name}>
            <TableCell className="font-mono text-xs font-medium">{v.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {v.type ?? "any"}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {v.default ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs">
              {v.description ?? "—"}
            </TableCell>
            <TableCell>
              {v.required ? (
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">
                  required
                </Badge>
              ) : (
                <Badge variant="outline">optional</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Outputs table
// ---------------------------------------------------------------------------

function OutputsTable({ outputs }: { outputs: IacModuleOutput[] }) {
  if (outputs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No outputs declared in this version.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {outputs.map((o) => (
          <TableRow key={o.name}>
            <TableCell className="font-mono text-xs font-medium">{o.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {o.description ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IacModuleDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: module, isLoading: moduleLoading } = useQuery<IacModule>({
    queryKey: ["iac-module", params.id],
    queryFn: () => iacModules.get(params.id),
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery<IacModuleVersion[]>({
    queryKey: ["iac-module-versions", params.id],
    queryFn: () => iacModules.getVersions(params.id),
    enabled: !!params.id,
  });

  const { mutate: sync, isPending: syncing } = useMutation({
    mutationFn: () => iacModules.sync(params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["iac-module", params.id] });
      void queryClient.invalidateQueries({ queryKey: ["iac-module-versions", params.id] });
    },
  });

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ??
    versions.find((v) => v.isLatest) ??
    versions[0] ??
    null;

  const handleCopy = () => {
    if (!module) return;
    void navigator.clipboard.writeText(buildUsageSnippet(module, selectedVersion));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (moduleLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Module not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/iac-modules")}
        >
          Back to modules
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/iac-modules")}
        >
          <ChevronLeft className="h-4 w-4" />
          IaC Modules
        </Button>
      </div>

      <PageHeader
        title={module.name}
        description={module.description ?? undefined}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={providerBadgeClass(module.provider)}>
            {module.provider}
          </Badge>
          {module.latestVersion && (
            <Badge variant="outline">{module.latestVersion}</Badge>
          )}
          <a
            href={module.sourceRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Source
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync()}
            disabled={syncing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        </div>
      </PageHeader>

      {/* Usage snippet */}
      <section className="rounded-xl border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Usage
          </h3>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">
          {buildUsageSnippet(module, selectedVersion)}
        </pre>
      </section>

      {/* Version selector + metadata */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Variables & Outputs
          </h3>
          {!versionsLoading && versions.length > 0 && (
            <select
              value={selectedVersion?.id ?? ""}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version}
                  {v.isLatest ? " (latest)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {versionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !selectedVersion ? (
          <div className="py-8 text-center border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground">
              No versions synced yet. Click Sync to fetch from the source repository.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Input Variables</h4>
              <VariablesTable variables={selectedVersion.variablesMeta} />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Outputs</h4>
              <OutputsTable outputs={selectedVersion.outputsMeta} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
