"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { organizations as orgsApi, ApiError } from "@/lib/api-client";
import { useOrganization } from "@/contexts/organization-context";
import type { Organization } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";

interface DangerZoneProps {
  org: Organization;
  /** Only rendered when the current user is the org owner */
  isOwner: boolean;
}

export function DangerZone({ org, isOwner }: DangerZoneProps) {
  const router = useRouter();
  const { refreshOrgs, currentOrg, switchOrg, organizations } =
    useOrganization();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // isPending state for delete ConfirmDialog
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOwner) return null;

  const handleDelete = () => {
    setIsDeleting(true);
    orgsApi
      .delete(org.id)
      .then(async () => {
        toast.success(`Organization "${org.name}" deleted.`);
        await refreshOrgs();
        // If the deleted org was the active one, clear the selection
        if (currentOrg?.id === org.id) {
          const next = organizations.find((o) => o.id !== org.id) ?? null;
          if (next) {
            switchOrg(next);
          } else {
            // No orgs left — clear the sessionStorage key manually
            sessionStorage.removeItem("farm_current_org");
          }
        }
        router.push("/organizations");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } else {
          toast.error("Failed to delete organization.");
        }
      })
      .finally(() => setIsDeleting(false));
  };

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium">Delete this organization</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Once deleted, this organization and all its data will be
                permanently removed. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="ml-4 shrink-0"
              onClick={() => setConfirmOpen(true)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${org.name}"?`}
        description="This will permanently delete the organization and all its data. This action cannot be undone."
        confirmLabel="Delete Organization"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  );
}
