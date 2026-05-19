import type { OrgRole } from "@farm/types";

/**
 * Subset of the Express request object that carries the resolved organization
 * ID and role injected by OrgRequiredGuard / OrgRolesGuard alongside the
 * authenticated user payload.
 *
 * Does not extend Express.Request directly to avoid TS1272 in controllers that
 * use decorators with isolatedModules + emitDecoratorMetadata enabled.
 *
 * - `organizationId` is populated only when the X-Organization-Id header is
 *   present and the user has been verified as a member of that organization.
 * - `orgRole` is set by OrgRequiredGuard and OrgRolesGuard after the membership
 *   lookup so PermissionGuard can enforce fine-grained permission checks without
 *   performing a second database round-trip.
 * - `user` reflects the JWT payload attached by JwtAuthGuard.
 */
export interface RequestWithOrg {
  organizationId?: string;
  orgRole?: OrgRole;
  user?: {
    userId: string;
    username: string;
    roles: string[];
  };
}
