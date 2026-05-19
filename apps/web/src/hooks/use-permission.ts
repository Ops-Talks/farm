import { OrgRole, Permission, RolePermissions } from "@farm/types";
import { useOrganization } from "@/contexts/organization-context";

/**
 * Returns true if the current user's organization role grants the specified
 * fine-grained permission.
 *
 * Returns false while the org context is still loading (orgRole is null), so
 * permission-gated UI elements remain hidden until the membership is resolved.
 *
 * @param permission - The permission to check against the current org role
 * @returns boolean indicating whether the caller has the required permission
 *
 * @example
 * const canWrite = usePermission(Permission.CATALOG_WRITE);
 * return canWrite ? <RegisterButton /> : null;
 */
export function usePermission(permission: Permission): boolean {
  const { orgRole } = useOrganization();

  if (!orgRole) {
    return false;
  }

  const granted: Permission[] = RolePermissions[orgRole as OrgRole] ?? [];
  return granted.includes(permission);
}
