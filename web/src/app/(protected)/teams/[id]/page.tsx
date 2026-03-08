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
import { toast } from "sonner";

const TEAM_TYPES = Object.values(TeamType);

export default function TeamDetailPage() {
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">{error ?? "Team not found"}</p>
        <Link href="/teams">
          <Button variant="outline">Back to Teams</Button>
        </Link>
      </div>
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{team.displayName}</h1>
            <Badge variant="secondary">{team.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{team.name}</p>
          {team.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {team.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/teams">
            <Button variant="outline" size="sm">
              Back
            </Button>
          </Link>
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
        </div>
      </div>

      {/* Contact info */}
      {(team.contactEmail ?? team.slackChannel) && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          {team.contactEmail && <span>Email: {team.contactEmail}</span>}
          {team.slackChannel && <span>Slack: #{team.slackChannel}</span>}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Team</CardTitle>
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
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </CardDescription>
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
          </CardHeader>
          <CardContent>
            {showAddMember && (
              <div className="mb-4 space-y-2 rounded-md border p-3">
                <Input
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      No users available
                    </p>
                  ) : (
                    availableUsers.slice(0, 10).map((u) => (
                      <button
                        key={u.id}
                        className="w-full flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
                        onClick={() => handleAddMember(u.id)}
                      >
                        <span>
                          {u.displayName}{" "}
                          <span className="text-muted-foreground">
                            ({u.username})
                          </span>
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Add
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Roles</TableHead>
                    {isAdmin && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.displayName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {m.roles.map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs">
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
                            className="text-destructive hover:text-destructive"
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
            <CardTitle>Owned Components</CardTitle>
            <CardDescription>
              {components.length} component{components.length !== 1 ? "s" : ""}{" "}
              owned by this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No components owned by this team
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
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
                        <Badge variant="secondary">{c.kind}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.lifecycle}</Badge>
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
