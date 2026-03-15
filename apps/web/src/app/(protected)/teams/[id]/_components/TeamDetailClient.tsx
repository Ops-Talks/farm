"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { teams, auth, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type { Team, User, CatalogComponent } from "@/types/api";
import { TeamType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { ChevronLeft, Mail, MessageSquare, Users, FolderKanban } from "lucide-react";

const TEAM_TYPES = Object.values(TeamType);

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

  const handleSave = () => {
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
  };

  const handleDelete = () => {
    if (!id || !confirm("Are you sure you want to delete this team?")) return;
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
      });
  };

  const handleAddMember = (userId: string) => {
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
  };

  const handleRemoveMember = (userId: string, username: string) => {
    if (!id || !confirm(`Remove ${username} from the team?`)) return;
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
  };

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

  const memberIds = new Set(members.map((m) => m.id));
  const availableUsers = allUsers.filter((u) => {
    if (memberIds.has(u.id)) return false;
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

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
              <Button variant="destructive" size="sm" onClick={handleDelete}>
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

      {/* Contact and ID Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 px-4 py-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase bg-background px-1.5 py-0.5 rounded border">ID: {team.name}</span>
        </div>
        {(team.contactEmail || team.slackChannel) && (
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {team.contactEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${team.contactEmail}`} className="hover:text-primary transition-colors">{team.contactEmail}</a>
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

      {/* Edit form */}
      {editing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Edit Team Details</CardTitle>
            <CardDescription>Update name, type and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      type: e.target.value as TeamType,
                    })
                  }
                >
                  {TEAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Slack Channel</label>
                <Input
                  value={editForm.slackChannel}
                  onChange={(e) =>
                    setEditForm({ ...editForm, slackChannel: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Members</CardTitle>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMember(!showAddMember)}
                >
                  {showAddMember ? "Cancel" : "Add Member"}
                </Button>
              )}
            </div>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} currently in this team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showAddMember && (
              <div className="mb-6 space-y-3 rounded-lg border bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-300">
                <Input
                  placeholder="Search users by name, username or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center italic">
                      No matching users found to add.
                    </p>
                  ) : (
                    availableUsers.slice(0, 10).map((u) => (
                      <button
                        key={u.id}
                        className="w-full flex items-center justify-between rounded-md p-2 text-sm hover:bg-background border border-transparent hover:border-border transition-all"
                        onClick={() => handleAddMember(u.id)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-foreground">{u.displayName}</span>
                          <span className="text-[10px] text-muted-foreground">{u.email || u.username}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          Add to team
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <div className="py-10">
                <p className="text-sm text-muted-foreground text-center italic">
                  No members assigned to this team yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-wider">
                    <TableHead>Member</TableHead>
                    <TableHead>Roles</TableHead>
                    {isAdmin && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.displayName}</span>
                          <span className="text-xs text-muted-foreground">@{m.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.roles.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[10px] uppercase h-5 px-1.5">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() =>
                              handleRemoveMember(m.id, m.username)
                            }
                          >
                            Remove
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Components section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Owned Components</CardTitle>
            </div>
            <CardDescription>
              {components.length} component{components.length !== 1 ? "s" : ""} registered to this team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <div className="py-10">
                <p className="text-sm text-muted-foreground text-center italic">
                  This team doesn&apos;t own any components yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-wider">
                    <TableHead>Component</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Lifecycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/catalog/${c.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">{c.kind}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{c.lifecycle}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
