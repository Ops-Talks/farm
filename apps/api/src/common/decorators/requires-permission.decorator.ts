import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@farm/types";

/**
 * Metadata key used by PermissionGuard to read the required permission
 * from a route handler or controller class.
 */
export const REQUIRES_PERMISSION_KEY = "requiresPermission";

/**
 * Declares that a route handler requires the caller to hold a specific
 * fine-grained permission within the current organization context.
 *
 * Must be combined with OrgRequiredGuard or OrgRolesGuard (which sets
 * req.orgRole) followed by PermissionGuard in the @UseGuards chain.
 *
 * @example
 * \@Post()
 * \@RequiresPermission(Permission.CATALOG_WRITE)
 * async create(@Body() dto: CreateComponentDto) { ... }
 */
export const RequiresPermission = (permission: Permission) =>
  SetMetadata(REQUIRES_PERMISSION_KEY, permission);
