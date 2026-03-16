"use client";

import { useState } from "react";
import type { User } from "@/types/api";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Users } from "lucide-react";

interface MembersSectionProps {
  members: User[];
  allUsers: User[];
  isAdmin: boolean;
  showAddMember: boolean;
  memberSearch: string;
  onToggleAddMember: () => void;
  onMemberSearchChange: (value: string) => void;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string, username: string) => void;
}

export function MembersSection({
  members,
  allUsers,
  isAdmin,
  showAddMember,
  memberSearch,
  onToggleAddMember,
  onMemberSearchChange,
  onAddMember,
  onRemoveMember,
}: MembersSectionProps) {
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    username: string;
  } | null>(null);

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
    <>
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
                onClick={onToggleAddMember}
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
                onChange={(e) => onMemberSearchChange(e.target.value)}
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
                      onClick={() => onAddMember(u.id)}
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
                          <Badge
                            key={r}
                            variant="secondary"
                            className="text-[10px] uppercase h-5 px-1.5"
                          >
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
                            setPendingRemove({ id: m.id, username: m.username })
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

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove member"
        description={`Remove ${pendingRemove?.username} from the team?`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingRemove) {
            onRemoveMember(pendingRemove.id, pendingRemove.username);
            setPendingRemove(null);
          }
        }}
      />
    </>
  );
}
