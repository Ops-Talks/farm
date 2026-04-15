"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { iacModules } from "@/lib/api-client";
import type { CatalogComponent, IacModule, IacProvider } from "@/types/api";
import { ExternalLink, Link2, Unlink, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Provider badge
// ---------------------------------------------------------------------------

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

const SectionSkeleton = memo(function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Link module dialog
// ---------------------------------------------------------------------------

interface LinkModuleDialogProps {
  componentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LinkModuleDialog({ componentId, open, onOpenChange }: LinkModuleDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: available = [], isLoading } = useQuery({
    queryKey: ["iac-modules-available", search],
    queryFn: () => iacModules.list({ search: search || undefined }),
    enabled: open,
  });

  const { mutate: link, isPending } = useMutation({
    mutationFn: (moduleId: string) => iacModules.linkComponent(moduleId, componentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["component-iac-modules", componentId] });
      onOpenChange(false);
      setSelected(null);
      setSearch("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link IaC Module</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading ? (
            <SectionSkeleton />
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {available.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  className={`w-full flex items-center justify-between rounded-md border p-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                    selected === mod.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelected(mod.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mod.name}</span>
                    <Badge
                      variant="secondary"
                      className={providerBadgeClass(mod.provider)}
                    >
                      {mod.provider}
                    </Badge>
                  </div>
                  {mod.latestVersion && (
                    <Badge variant="outline">{mod.latestVersion}</Badge>
                  )}
                </button>
              ))}
              {!isLoading && available.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No modules found.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || isPending}
            onClick={() => selected && link(selected)}
          >
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

interface IacModulesTabProps {
  component: CatalogComponent;
}

export function IacModulesTab({ component }: IacModulesTabProps) {
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["component-iac-modules", component.id],
    queryFn: () => iacModules.getComponentModules(component.id),
  });

  const { mutate: unlink, isPending: unlinking } = useMutation({
    mutationFn: (moduleId: string) => iacModules.unlinkComponent(moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["component-iac-modules", component.id] });
    },
  });

  if (isLoading) {
    return <SectionSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked IaC Modules
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Link Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="py-8 text-center border rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No IaC modules are linked to this component.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Link a module
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {modules.map((mod: IacModule) => (
            <div
              key={mod.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/iac-modules/${mod.id}`}
                      className="font-medium hover:underline"
                    >
                      {mod.name}
                    </Link>
                    <Badge
                      variant="secondary"
                      className={providerBadgeClass(mod.provider)}
                    >
                      {mod.provider}
                    </Badge>
                    {mod.latestVersion && (
                      <Badge variant="outline">{mod.latestVersion}</Badge>
                    )}
                  </div>
                  {mod.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {mod.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={mod.sourceRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open source repository"
                  className={buttonVariants({ size: "icon", variant: "ghost", className: "h-7 w-7" })}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={unlinking}
                  onClick={() => unlink(mod.id)}
                  aria-label="Unlink module"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LinkModuleDialog
        componentId={component.id}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
    </div>
  );
}
