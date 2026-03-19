"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown, Check, PlusCircle } from "lucide-react";
import { useOrganization } from "@/contexts/organization-context";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { recordSpan } from "@/lib/otel-spans";
import { setUserContext } from "@/lib/otel-context";

/**
 * OrgSwitcher — sidebar widget that shows the current organization and
 * opens a dropdown to let the user switch between orgs or create a new one.
 *
 * Uses the project-standard DropdownMenu (built on @base-ui/react/menu)
 * instead of Radix Popover + Command (which are not installed).
 */
export function OrgSwitcher() {
  const router = useRouter();
  const { organizations, currentOrg, isLoading, switchOrg } =
    useOrganization();
  const { user } = useAuth();

  // Local search state — filters the visible org list inside the dropdown
  const [search, setSearch] = useState("");

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="px-2 py-1">
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    );
  }

  const label = currentOrg?.name ?? "Personal";

  return (
    <DropdownMenu
      // Reset search when the menu closes
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="w-full justify-between px-2 font-normal"
            aria-label={`Current organization: ${label}. Click to switch.`}
          />
        }
      >
        <span className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{label}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" side="bottom" align="start">
        {/* Inline search — prevents keyboard events from propagating to the
            menu so typing in the input does not trigger menu item selection */}
        <div
          className="px-2 py-1.5"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search organizations"
          />
        </div>

        <DropdownMenuSeparator />

        {/* Org list */}
        {filtered.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            No organizations found.
          </div>
        ) : (
          <>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {filtered.map((org) => {
              const isActive = currentOrg?.id === org.id;
              return (
                <DropdownMenuItem
                  key={org.id}
                  className="gap-2"
                  onClick={() => {
                    // Record the org switch as an OTel span and update the
                    // user context so subsequent spans carry the new org id.
                    void recordSpan(
                      "org.switch",
                      () => {
                        switchOrg(org);
                        if (user) {
                          setUserContext(user.id, user.username, org.id);
                        }
                      },
                      { "org.id": org.id, "org.name": org.name },
                    );
                  }}
                >
                  <Building2
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{org.name}</span>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Create new org action */}
        <DropdownMenuItem
          className="gap-2 text-muted-foreground"
          onClick={() => router.push("/organizations/new")}
        >
          <PlusCircle className="h-4 w-4 shrink-0" />
          <span>Create organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
