"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { teams, auth, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { Team, User, CatalogComponent } from "@/types/api";
import { TeamType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TeamEditForm } from "./team-edit-form";
import { MembersSection } from "./members-section";
import { ComponentsSection } from "./components-section";
import { toast } from "sonner";
import { ChevronLeft, Mail, MessageSquare } from "lucide-react";

export function TeamDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // isPending state for delete ConfirmDialog
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: "",
    description: "",
    type: TeamType.OTHER as TeamType,
    contactEmail: "",
    slackChannel: "",
  });

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const fetchTeam = useCallback(() => {
    if (!id) return;
    Promise.all([
      teams.get(id),
      teams.getMembers(id),
      teams.getComponents(id),
    ])
      .then(([t, m, c]) => {
        setTeam(t);
        setMembers(m);
        setComponents(c);
        setEditForm({
          displayName: t.displayName,
          description: t.description ?? "",
          type: t.type,
          contactEmail: t.contactEmail ?? "",
          slackChannel: t.slackChannel ?? "",
        });
      })
      .catch(() => setError("Team not found"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (showAddMember && allUsers.length === 0) {
      auth.getUsers().then(setAllUsers).catch(() => setAllUsers([]));
    }
  }, [showAddMember, allUsers.length]);

  const handleSave = useCallback(() => {
    if (!id) return;
    setSaving(true);
    teams
      .update(id, {
        displayName: editForm.displayName,
        description: editForm.description || undefined,
        type: editForm.type,
        contactEmail: editForm.contactEmail || undefined,
        slackChannel: editForm.slackChannel || undefined,
      })
      .then((updated) => {
        setTeam(updated);
        setEditing(false);
        toast.success("Team updated");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          toast.error(
            Array.isArray(err.body.message)
              ? err.body.message.join(", ")
              : err.body.message,
          );
        }
      })
      .finally(() => setSaving(false));
  }, [id, editForm]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    setIsDeleting(true);
    teams
      .delete(id)
      .then(() => {
        toast.success("Team deleted");
        router.push("/teams");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          toast.error(
            Array.isArray(err.body.message)
              ? err.body.message.join(", ")
              : err.body.message,
          );
        }
      })
      .finally(() => setIsDeleting(false));
  }, [id, router]);

  const handleAddMember = useCallback((userId: string) => {
    if (!id) return;
    teams
      .addMember(id, userId)
      .then(() => {
        toast.success("Member added");
        setShowAddMember(false);
        setMemberSearch("");
        return teams.getMembers(id);
      })
      .then(setMembers)
      .catch((err) => {
        if (err instanceof ApiError) {
          toast.error(
            Array.isArray(err.body.message)
              ? err.body.message.join(", ")
              : err.body.message,
          );
        }
      });
  }, [id]);

  const handleRemoveMember = useCallback((userId: string) => {
    if (!id) return;
    teams
      .removeMember(id, userId)
      .then(() => {
        toast.success("Member removed");
        return teams.getMembers(id);
      })
      .then(setMembers)
      .catch((err) => {
        if (err instanceof ApiError) {
          toast.error(
            Array.isArray(err.body.message)
              ? err.body.message.join(", ")
              : err.body.message,
          );
        }
      });
  }, [id]);

  const handleFormChange = useCallback(
    (updates: Partial<typeof editForm>) => setEditForm((prev) => ({ ...prev, ...updates })),
    [],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <EmptyState
        title="Team Not Found"
        description={error || "The team you are looking for does not exist or has been deleted."}
      >
        <Button variant="outline" onClick={() => router.push("/teams")}>
          Back to Teams
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title={team.displayName}
        description={team.description || "No description provided for this team."}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="uppercase font-bold tracking-tight">
            {team.type}
          </Badge>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/teams")}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* Contact and ID bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 px-4 py-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase bg-background px-1.5 py-0.5 rounded border">
            ID: {team.name}
          </span>
        </div>
        {(team.contactEmail || team.slackChannel) && (
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {team.contactEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a
                  href={`mailto:${team.contactEmail}`}
                  className="hover:text-primary transition-colors"
                >
                  {team.contactEmail}
                </a>
              </div>
            )}
            {team.slackChannel && (
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>#{team.slackChannel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit form — shown when editing is active */}
      {editing && (
        <TeamEditForm
          form={editForm}
          saving={saving}
          onFormChange={handleFormChange}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <MembersSection
          members={members}
          allUsers={allUsers}
          isAdmin={isAdmin}
          showAddMember={showAddMember}
          memberSearch={memberSearch}
          onToggleAddMember={() => setShowAddMember(!showAddMember)}
          onMemberSearchChange={setMemberSearch}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
        />
        <ComponentsSection components={components} />
      </div>

      {/* Delete team confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete team"
        description="Are you sure you want to delete this team? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  );
}
