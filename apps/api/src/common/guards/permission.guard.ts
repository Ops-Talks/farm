import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, RolePermissions } from "@farm/types";
import { REQUIRES_PERMISSION_KEY } from "../decorators/requires-permission.decorator";
import type { RequestWithOrg } from "../interfaces/request-with-org.interface";
import type { Request } from "express";

type OrgRequest = Request & RequestWithOrg;

/**
 * Guard that enforces fine-grained permission checks based on the organization
 * role resolved by a preceding guard (OrgRequiredGuard or OrgRolesGuard).
 *
 * Prerequisites:
 *  - JwtAuthGuard must have run before this guard so req.user is populated.
 *  - OrgRequiredGuard or OrgRolesGuard must have run so req.orgRole is populated.
 *
 * Behavior:
 *  - If no @RequiresPermission() metadata is present on the handler or class,
 *    access is allowed without any permission check.
 *  - If req.orgRole is not set (no org context was resolved), the request is
 *    rejected with a ForbiddenException.
 *  - The guard consults RolePermissions[orgRole] to determine whether the
 *    resolved role grants the required permission.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRES_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission requirement on this route — allow
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OrgRequest>();
    const orgRole = request.orgRole;

    if (!orgRole) {
      throw new ForbiddenException({
        message: "Organization context is required for this endpoint",
        errorCode: "ORG_CONTEXT_MISSING",
      });
    }

    const granted = RolePermissions[orgRole] ?? [];

    if (!granted.includes(required)) {
      throw new ForbiddenException({
        message: "Insufficient permissions",
        errorCode: "INSUFFICIENT_PERMISSIONS",
      });
    }

    return true;
  }
}
