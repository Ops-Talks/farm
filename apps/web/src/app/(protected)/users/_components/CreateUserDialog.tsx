"use client";

// Phase 56 — Admin User Registration (FARM-S655)
// Allows platform admins and org admins/owners to create user accounts
// directly from the dashboard without sending an invitation.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, userManagement } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { OrgRole, type AdminCreateUserInput } from "@/types/api";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { hasRole } = useAuth();
  const { organizations: myOrgs } = useOrganization();
  const queryClient = useQueryClient();
  const isPlatformAdmin = hasRole("admin");

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>(OrgRole.MEMBER);
  const [platformAdmin, setPlatformAdmin] = useState(false);

  // Result state (after successful creation)
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const dto: AdminCreateUserInput = {
        username: username.trim(),
        email: email.trim(),
        displayName: displayName.trim(),
        ...(password ? { password } : {}),
        ...(orgId ? { orgId, orgRole } : {}),
        ...(isPlatformAdmin && platformAdmin ? { platformAdmin: true } : {}),
      };
      return userManagement.create(dto);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (res.tempPassword) {
        setTempPassword(res.tempPassword);
      } else {
        toast.success("User created successfully.");
        handleClose();
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : "Failed to create user.");
    },
  });

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setDisplayName("");
    setPassword("");
    setOrgId("");
    setOrgRole(OrgRole.MEMBER);
    setPlatformAdmin(false);
    setTempPassword(null);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>
            Register a new user account. If no password is set, a temporary one
            will be generated and shown here or emailed if SMTP is configured.
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

        {tempPassword ? (
          // Credentials panel — shown after creation when no email delivery
          <div className="space-y-3">
            <p className="text-sm">
              User created. SMTP is disabled, so share this temporary password
              manually:
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
              <code className="flex-1 break-all font-mono text-sm">
                {tempPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tempPassword);
                    toast.success("Copied.");
                  } catch {
                    toast.error("Could not copy.");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The user must log in and change this password immediately.
            </p>
          </div>
        ) : (
          // Creation form
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="cu-username">
                Username <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <Input
                id="cu-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jsmith"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="cu-email">
                Email <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <Input
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.smith@example.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="cu-display">
                Display name <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <Input
                id="cu-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Smith"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="cu-password">
                Password{" "}
                <span className="text-muted-foreground font-normal">(optional — auto-generated if blank)</span>
              </label>
              <Input
                id="cu-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {myOrgs.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cu-org">
                  Enroll in organization{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <select
                  id="cu-org"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">None</option>
                  {myOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {orgId && (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cu-orgrole">
                  Organization role
                </label>
                <select
                  id="cu-orgrole"
                  value={orgRole}
                  onChange={(e) => setOrgRole(e.target.value as OrgRole)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {Object.values(OrgRole).map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isPlatformAdmin && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  id="cu-admin"
                  checked={platformAdmin}
                  onChange={(e) => setPlatformAdmin(e.target.checked)}
                />
                <span>Grant platform admin role</span>
              </label>
            )}
          </div>
        )}

        <DialogFooter>
          {tempPassword ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={
                  mutation.isPending ||
                  !username.trim() ||
                  !email.trim() ||
                  !displayName.trim()
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Creating..." : "Create user"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
