"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { Trash2, Users } from "lucide-react";
import { organizations as orgsApi, ApiError } from "@/lib/api-client";
import type { MemberResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrgRoleValue = "owner" | "admin" | "member" | "viewer";

interface MembersSectionProps {
  orgId: string;
  /** The authenticated user's id — used to disable actions on the own row. */
  currentUserId: string;
  /**
   * True when the authenticated user is known to be owner or admin before the
   * member list loads (derived from org.ownerId in the parent).  The section
   * also re-derives this from the loaded member list so that admins discovered
   * after fetch also get management UI.
   */
  canManage: boolean;
  /**
   * Optional callback invoked once after the member list is loaded, with the
   * current user's role.  Use this to avoid a duplicate members request in the
   * parent when the role is needed for other sections (e.g. InvitationsPanel).
   */
  onRoleLoaded?: (role: string) => void;
}

// ---------------------------------------------------------------------------
// Add-member schema
// ---------------------------------------------------------------------------
const addMemberSchema = z.object({
  username: z.string().min(1, "Username is required"),
  role: z.enum(["member", "admin"] as const),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps an org role to the appropriate Badge variant. */
const ROLE_BADGE_VARIANT: Record<OrgRoleValue, "secondary" | "default" | "outline"> = {
  owner: "secondary", // muted / gray
  admin: "default",   // primary / blue
  member: "outline",
  viewer: "outline",
};

/** Initials avatar built from Tailwind primitives (no external dependency). */
const InitialsAvatar = memo(function InitialsAvatar({ username }: { username: string }) {
  return (
    <div
      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0 select-none"
      aria-hidden
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
});

/** Skeleton placeholder for a single member row while the list is loading. */
const MemberRowSkeleton = memo(function MemberRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-14" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell />
    </TableRow>
  );
});

/**
 * Inline role <select> styled to match the rest of the form controls.
 * Rendered only for rows where the current user may change the role.
 */
const RoleSelect = memo(function RoleSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: string;
  disabled: boolean;
  ariaLabel: string;
  onChange: (role: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-input bg-background px-2 py-0.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MembersSection({
  orgId,
  currentUserId,
  canManage,
  onRoleLoaded,
}: MembersSectionProps) {
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // In-flight role-update tracker (keyed by userId)
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  // Pending removal confirmation
  const [pendingRemove, setPendingRemove] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  // isPending state for removal ConfirmDialog
  const [isRemoving, setIsRemoving] = useState(false);

  // ---------------------------------------------------------------------------
  // Add-member form (React Hook Form + Zod)
  // ---------------------------------------------------------------------------
  const {
    register,
    handleSubmit,
    reset: resetAddForm,
    setError: setAddError,
    formState: { errors: addErrors, isSubmitting: addPending },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    mode: "onChange",
    defaultValues: { username: "", role: "member" },
  });

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadMembers = useCallback(() => {
    orgsApi.members
      .list(orgId)
      .then((res) => setMembers(res.data))
      .catch(() => toast.error("Failed to load members."))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /**
   * Re-derive canManage after the member list loads so that admins who were
   * not identified as owner in the parent (org.ownerId check) also receive
   * the management UI once their role is confirmed from the API.
   */
  const currentMember = useMemo(
    () => members.find((m) => m.userId === currentUserId),
    [members, currentUserId],
  );
  const effectiveCanManage = useMemo(
    () => canManage || currentMember?.role === "admin" || currentMember?.role === "owner",
    [canManage, currentMember],
  );

  // Notify parent of the current user's role once the member list has loaded.
  useEffect(() => {
    if (currentMember?.role) {
      onRoleLoaded?.(currentMember.role);
    }
  }, [currentMember, onRoleLoaded]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddMember = useCallback(async (values: AddMemberFormValues) => {
    try {
      await orgsApi.members.add(orgId, {
        username: values.username.trim(),
        role: values.role,
      });
      toast.success(`${values.username.trim()} added to organization.`);
      resetAddForm();
      loadMembers();
    } catch (err: unknown) {
      setAddError("root", {
        message: err instanceof ApiError ? err.message : "Failed to add member.",
      });
    }
  }, [orgId, resetAddForm, loadMembers, setAddError]);

  const handleRoleChange = useCallback((userId: string, newRole: string) => {
    setUpdatingRoleFor(userId);
    orgsApi.members
      .updateRole(orgId, userId, { role: newRole })
      .then(() => {
        toast.success("Role updated.");
        loadMembers();
      })
      .catch(() => toast.error("Failed to update role."))
      .finally(() => setUpdatingRoleFor(null));
  }, [orgId, loadMembers]);

  const handleRemoveConfirm = useCallback(() => {
    if (!pendingRemove) return;
    const { userId, username } = pendingRemove;
    setPendingRemove(null);
    setIsRemoving(true);

    orgsApi.members
      .remove(orgId, userId)
      .then(() => {
        toast.success(`${username} removed from organization.`);
        loadMembers();
      })
      .catch(() => toast.error("Failed to remove member."))
      .finally(() => setIsRemoving(false));
  }, [pendingRemove, orgId, loadMembers]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderRoleCell(member: MemberResponse) {
    const isOwnerRole = member.role === "owner";
    const isSelf = member.userId === currentUserId;
    // Role changes are not permitted on owner entries or the current user's
    // own row — they see a read-only badge.
    const actionsFrozen = isOwnerRole || isSelf;

    if (effectiveCanManage && !actionsFrozen) {
      return (
        <RoleSelect
          value={member.role}
          disabled={updatingRoleFor === member.userId}
          ariaLabel={`Role for ${member.username}`}
          onChange={(role) => handleRoleChange(member.userId, role)}
        />
      );
    }

    return (
      <Badge variant={ROLE_BADGE_VARIANT[member.role as OrgRoleValue] ?? "outline"}>
        {member.role}
      </Badge>
    );
  }

  function renderActionsCell(member: MemberResponse) {
    if (!effectiveCanManage) return null;

    const isOwnerRole = member.role === "owner";
    const isSelf = member.userId === currentUserId;

    // Remove is not permitted on owner entries or the current user's own row.
    if (isOwnerRole || isSelf) {
      return <TableCell />;
    }

    return (
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={() =>
            setPendingRemove({ userId: member.userId, username: member.username })
          }
          aria-label={`Remove ${member.username}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    );
  }

  // ---------------------------------------------------------------------------
  // Table content
  // ---------------------------------------------------------------------------

  function renderTableContent() {
    if (loading) {
      return (
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            // Skeleton rows — key by index is fine for a static placeholder list
            <MemberRowSkeleton key={i} />
          ))}
        </TableBody>
      );
    }

    if (members.length === 0) {
      return null; // Caller renders the empty state div instead
    }

    return (
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.userId} className="group">
            <TableCell>
              <div className="flex items-center gap-3">
                <InitialsAvatar username={member.username} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {member.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </span>
                </div>
              </div>
            </TableCell>

            <TableCell>{renderRoleCell(member)}</TableCell>

            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(member.joinedAt).toLocaleDateString()}
            </TableCell>

            {renderActionsCell(member)}
          </TableRow>
        ))}
      </TableBody>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Members
          </CardTitle>
          <CardDescription>
            Manage who has access to this organization.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add Member form — only rendered for admin / owner */}
          {effectiveCanManage && (
            <form
              onSubmit={handleSubmit(handleAddMember)}
              className="rounded-lg border bg-muted/20 p-4 space-y-3 animate-in slide-in-from-top-2 duration-300"
              data-testid="add-member-form"
            >
              <p className="text-sm font-medium">Add Member</p>

              <div className="flex gap-2 flex-col sm:flex-row">
                {/* aria-label preserved so existing tests can query by role/name */}
                <Input
                  aria-label="Username"
                  placeholder="Username"
                  disabled={addPending}
                  className="flex-1"
                  autoComplete="off"
                  {...register("username")}
                  aria-invalid={!!addErrors.username}
                  aria-describedby={addErrors.username ? "add-member-username-error" : undefined}
                />

                {/* Native <select> — shadcn Select is not yet in the ui/ bundle. */}
                <select
                  aria-label="New member role"
                  disabled={addPending}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("role")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>

                <Button
                  type="submit"
                  size="sm"
                  disabled={addPending}
                >
                  Add Member
                </Button>
              </div>

              {addErrors.root?.message && (
                <p id="add-member-root-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                  {addErrors.root.message}
                </p>
              )}
              {addErrors.username?.message && (
                <p id="add-member-username-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                  {addErrors.username.message}
                </p>
              )}
            </form>
          )}

          {/* Member table — skeleton while loading, empty state if no members */}
          {!loading && members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Invite users to join this organization."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-wider">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {effectiveCanManage && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              {renderTableContent()}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Removal confirmation dialog */}
      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove member"
        description={`Are you sure you want to remove ${pendingRemove?.username ?? "this member"}?`}
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        isPending={isRemoving}
      />
    </>
  );
}
