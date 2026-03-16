import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "express";
import { ORG_ROLES_KEY } from "../decorators/org-roles.decorator";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    username: string;
    roles: string[];
  };
  params: Record<string, string>;
  body: Record<string, unknown>;
}

/**
 * Hierarchy weight for each organization role.
 * Higher values represent greater permissions.
 */
const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  [OrgRole.OWNER]: 3,
  [OrgRole.ADMIN]: 2,
  [OrgRole.MEMBER]: 1,
};

/**
 * Guard that enforces organization-level role requirements.
 * Reads the organizationId from route params or request body,
 * looks up the user's membership, and verifies the role satisfies
 * the minimum required role defined via @OrgRoles().
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  /**
   * Determines whether the current user satisfies the required organization role.
   * @param context - The execution context
   * @returns True if access is allowed, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no org roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Resolve the organizationId from route params or request body
    const organizationId =
      request.params?.["id"] ??
      request.params?.["organizationId"] ??
      (request.body?.["organizationId"] as string | undefined);

    if (!organizationId) {
      throw new ForbiddenException(
        "Organization context is required for this operation",
      );
    }

    const membership = await this.userOrganizationRepository.findOne({
      where: { userId: user.userId, organizationId },
    });

    if (!membership) {
      throw new ForbiddenException("You are not a member of this organization");
    }

    // Check that the user's role satisfies at least one of the required roles
    const userRoleWeight = ORG_ROLE_HIERARCHY[membership.role] ?? 0;

    const satisfied = requiredRoles.some((required) => {
      const requiredWeight = ORG_ROLE_HIERARCHY[required as OrgRole] ?? 0;
      return userRoleWeight >= requiredWeight;
    });

    if (!satisfied) {
      throw new ForbiddenException(
        `Insufficient organization permissions. Required: ${requiredRoles.join(" or ")}`,
      );
    }

    return true;
  }
}
