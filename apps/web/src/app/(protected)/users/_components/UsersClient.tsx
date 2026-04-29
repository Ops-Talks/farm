"use client";

// Phase 37 — User Management Dashboard (FARM-S362 / T417 frontend).
//
// Context-aware: platform admins see ALL users, org admins see only members
// of orgs where they hold ADMIN+. The select control at the top lets a
// platform admin scope the list to a single org.

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pause,
  Play,
  Search,
  Trash2,
  UserCog,
  UserMinus,
  Users as UsersIcon,
  Eye,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError, userManagement } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { OrgRole, type ManagedUser } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return (
    name
      .split(/[\s._-]+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Detail / audit-trail modal
// ---------------------------------------------------------------------------

function describeAuditAction(action: string): string {
  const map: Record<string, string> = {
    "invitation.created": "Was invited to an organisation",
    "invitation.accepted": "Accepted an invitation",
    "user.role_changed": "Role changed",
    "user.suspended": "Account suspended",
    "user.activated": "Account activated",
    "user.password_reset": "Password reset by admin",
    "user.created": "Account created",
    "user.deleted": "Account deleted",
  };
  return map[action] ?? action;
}

function UserDetailDialog({
  user,
  open,
  onOpenChange,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const auditQuery = useQuery({
    queryKey: ["user-audit", user?.id],
    queryFn: () => userManagement.auditTrail(user!.id),
    enabled: !!user && open,
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.displayName || user.username}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Memberships
            </h4>
            {user.orgMemberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memberships.</p>
            ) : (
              <ul className="space-y-1">
                {user.orgMemberships.map((m) => (
                  <li
                    key={m.orgId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{m.orgName}</span>
                    <Badge variant="secondary" className="uppercase">
                      {m.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Audit trail
            </h4>
            {auditQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : auditQuery.data && auditQuery.data.length > 0 ? (
              <ol className="space-y-2 max-h-64 overflow-y-auto">
                {auditQuery.data.map((event) => {
                  const actor =
                    event.performer?.username ??
                    event.actorUsername ??
                    event.actorUserId ??
                    "system";
                  return (
                    <li
                      key={event.id}
                      className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {describeAuditAction(event.action)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(event.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {actor}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Change-role modal
// ---------------------------------------------------------------------------

function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const memberships = user?.orgMemberships ?? [];
  const [orgId, setOrgId] = useState(memberships[0]?.orgId ?? "");
  const [role, setRole] = useState<OrgRole>(
    memberships[0]?.role ?? OrgRole.MEMBER,
  );
  const [error, setError] = useState<string | null>(null);
  // Track the last user we initialised state for so reopening with a new
  // user resets the form without using setState inside useMemo (which would
  // fail react-hooks/set-state-in-render).
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null);

  if (open && user && initialisedFor !== user.id) {
    // Allowed: setState during render to derive props-driven state.
    setInitialisedFor(user.id);
    setOrgId(memberships[0]?.orgId ?? "");
    setRole(memberships[0]?.role ?? OrgRole.MEMBER);
    setError(null);
  }
  if (!open && initialisedFor !== null) {
    setInitialisedFor(null);
  }

  const updateRole = useMutation({
    mutationFn: () =>
      userManagement.updateRole(user!.id, { orgId, role }),
    onSuccess: () => {
      toast.success("Role updated.");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError ? err.message : "Failed to update role.",
      );
    },
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {user.username}</DialogTitle>
          <DialogDescription>
            Pick the org and the new role to assign.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="ch-org" className="text-sm font-medium">
              Organisation
            </label>
            <select
              id="ch-org"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {memberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>
                  {m.orgName}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium mb-1">Role</legend>
            {[OrgRole.MEMBER, OrgRole.ADMIN, OrgRole.OWNER].map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="ch-role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="h-4 w-4"
                />
                <span className="uppercase">{r}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={updateRole.isPending || !orgId}
            onClick={() => updateRole.mutate()}
          >
            {updateRole.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Reset-password modal — handles fallback temp-password display
// ---------------------------------------------------------------------------

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [result, setResult] = useState<
    { tempPassword?: string; tempPasswordExpiresAt: string; fallback?: boolean } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => userManagement.resetPassword(user!.id),
    onSuccess: (res) => setResult(res),
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError ? err.message : "Failed to reset password.",
      );
    },
  });

  const close = () => {
    onOpenChange(false);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Generate a temporary password for{" "}
            <strong>{user?.username}</strong>. The user must log in and change
            it immediately.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              Temporary password{" "}
              {result.fallback
                ? "generated. SMTP is disabled so please share it manually:"
                : "was emailed to the user. They must use it within 24h."}
            </p>
            {result.fallback && result.tempPassword && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
                <code className="flex-1 font-mono text-sm break-all">
                  {result.tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.tempPassword!);
                      toast.success("Copied.");
                    } catch {
                      toast.error("Could not copy.");
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Expires {formatRelative(result.tempPasswordExpiresAt)}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The user&apos;s current password will
            be invalidated.
          </p>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Resetting..." : "Reset password"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete-user modal — typing pattern for global delete
// ---------------------------------------------------------------------------

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirmed,
}: {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmed: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ok = typed === "DELETE";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user globally</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong>{user?.username}</strong> from
            Farm and removes them from every organisation they belong to. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="del-confirm" className="text-sm">
            Type <code className="font-mono font-semibold">DELETE</code> to
            confirm:
          </label>
          <Input
            id="del-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTyped("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!ok}
            onClick={() => {
              setTyped("");
              onConfirmed();
            }}
          >
            Delete user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function UsersClient() {
  const { user: currentUser, hasRole } = useAuth();
  const { organizations: myOrgs } = useOrganization();
  const isPlatformAdmin = hasRole("admin");

  // Org admin scope — orgs where the current user is ADMIN or OWNER.
  // We don't have role info from /v1/organizations, so we expose all orgs the
  // user belongs to as scope candidates; the backend enforces the real ACL.
  const scopedOrgs = myOrgs;

  const [orgScope, setOrgScope] = useState<string | "all">(
    isPlatformAdmin ? "all" : scopedOrgs[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">(
    "all",
  );
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Detail / action modal state
  const [detailUser, setDetailUser] = useState<ManagedUser | null>(null);
  const [roleUser, setRoleUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<ManagedUser | null>(null);
  const [removeFromOrg, setRemoveFromOrg] = useState<{
    user: ManagedUser;
    orgId: string;
    orgName: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      orgId: orgScope === "all" ? undefined : orgScope || undefined,
      search: search.trim() || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      pageSize,
    }),
    [orgScope, search, roleFilter, statusFilter, page],
  );

  const usersQuery = useQuery({
    queryKey: ["users", queryParams],
    queryFn: () => userManagement.list(queryParams),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      userManagement.suspend(id, suspended),
    onSuccess: () => {
      toast.success("User updated.");
      refresh();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Failed."),
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId?: string }) =>
      userManagement.remove(id, orgId),
    onSuccess: () => {
      toast.success("User removed.");
      refresh();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof ApiError ? err.message : "Failed."),
  });

  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const users = usersQuery.data?.users ?? [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" /> Users
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} user${total === 1 ? "" : "s"}` : "Manage user accounts and roles"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="scope" className="text-sm text-muted-foreground">
            Scope:
          </label>
          <select
            id="scope"
            value={orgScope}
            onChange={(e) => {
              setPage(1);
              setOrgScope(e.target.value);
            }}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {isPlatformAdmin && <option value="all">All users</option>}
            {scopedOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                Org: {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow the list by name, role, or status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search username, email, name…"
                aria-label="Search users"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <select
              aria-label="Role filter"
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Any role</option>
              <option value={OrgRole.MEMBER}>Member</option>
              <option value={OrgRole.ADMIN}>Admin</option>
              <option value={OrgRole.OWNER}>Owner</option>
            </select>
            <select
              aria-label="Status filter"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as typeof statusFilter);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {usersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6 text-muted-foreground" />}
              title="No users found"
              description="Try adjusting your filters or invite new users from the org settings."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Memberships</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last login</th>
                    <th className="px-3 py-2 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(u.displayName || u.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {u.displayName || u.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.orgMemberships.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              none
                            </span>
                          ) : (
                            u.orgMemberships.map((m) => (
                              <Badge
                                key={m.orgId}
                                variant="secondary"
                                className="text-xs"
                              >
                                {m.orgName}: {m.role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {u.suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatRelative(u.lastLogin)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Actions for ${u.username}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            ⋮
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailUser(u)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                            {u.orgMemberships.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => setRoleUser(u)}
                              >
                                <UserCog className="mr-2 h-4 w-4" /> Change role
                              </DropdownMenuItem>
                            )}
                            {isPlatformAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setResetUser(u)}
                                >
                                  <KeyRound className="mr-2 h-4 w-4" /> Reset
                                  password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={u.id === currentUser?.id}
                                  onClick={() => setSuspendUser(u)}
                                >
                                  {u.suspended ? (
                                    <>
                                      <Play className="mr-2 h-4 w-4" /> Activate
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="mr-2 h-4 w-4" /> Suspend
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                            {u.orgMemberships.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                {u.orgMemberships.map((m) => (
                                  <DropdownMenuItem
                                    key={m.orgId}
                                    onClick={() =>
                                      setRemoveFromOrg({
                                        user: u,
                                        orgId: m.orgId,
                                        orgName: m.orgName,
                                      })
                                    }
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Remove from {m.orgName}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                            {isPlatformAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={u.id === currentUser?.id}
                                  onClick={() => setDeleteUser(u)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  user
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserDetailDialog
        user={detailUser}
        open={!!detailUser}
        onOpenChange={(v) => !v && setDetailUser(null)}
      />
      <ChangeRoleDialog
        user={roleUser}
        open={!!roleUser}
        onOpenChange={(v) => !v && setRoleUser(null)}
        onSuccess={refresh}
      />
      <ResetPasswordDialog
        user={resetUser}
        open={!!resetUser}
        onOpenChange={(v) => !v && setResetUser(null)}
      />
      <DeleteUserDialog
        user={deleteUser}
        open={!!deleteUser}
        onOpenChange={(v) => !v && setDeleteUser(null)}
        onConfirmed={() => {
          if (deleteUser) removeMutation.mutate({ id: deleteUser.id });
          setDeleteUser(null);
        }}
      />
      <ConfirmDialog
        open={!!suspendUser}
        onOpenChange={(v) => !v && setSuspendUser(null)}
        title={suspendUser?.suspended ? "Activate user?" : "Suspend user?"}
        description={
          suspendUser?.suspended
            ? `${suspendUser?.username} will be able to log in again.`
            : `${suspendUser?.username} will no longer be able to log in.`
        }
        confirmLabel={suspendUser?.suspended ? "Activate" : "Suspend"}
        variant={suspendUser?.suspended ? "default" : "destructive"}
        onConfirm={() => {
          if (suspendUser) {
            suspendMutation.mutate({
              id: suspendUser.id,
              suspended: !suspendUser.suspended,
            });
          }
          setSuspendUser(null);
        }}
      />
      <ConfirmDialog
        open={!!removeFromOrg}
        onOpenChange={(v) => !v && setRemoveFromOrg(null)}
        title="Remove user from organisation?"
        description={
          removeFromOrg
            ? `${removeFromOrg.user.username} will no longer be a member of ${removeFromOrg.orgName}.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeFromOrg) {
            removeMutation.mutate({
              id: removeFromOrg.user.id,
              orgId: removeFromOrg.orgId,
            });
          }
          setRemoveFromOrg(null);
        }}
      />
    </div>
  );
}
