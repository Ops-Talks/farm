import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import type { RequestWithOrg } from "../interfaces/request-with-org.interface";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import type { Request } from "express";

type OrgRequest = Request & RequestWithOrg & { user?: { userId: string } };

/**
 * Guard that optionally resolves organization context from the
 * X-Organization-Id header.
 *
 * Must be placed after JwtAuthGuard in @UseGuards so req.user is already
 * populated.
 *
 * Behavior:
 *  - If the header is absent, req.organizationId is left undefined and
 *    the request proceeds normally.
 *  - If the header is present AND the user is authenticated, the guard
 *    verifies membership and sets req.organizationId and req.orgRole.
 *  - If the header is present but the user is not a member of the
 *    specified organization, a ForbiddenException is thrown.
 *
 * Use this guard on routes where the org header is accepted but not
 * mandatory (e.g. admin-level views that can optionally scope by org).
 * Use OrgRequiredGuard instead when the header is always required.
 */
@Injectable()
export class OptionalOrgGuard implements CanActivate {
  private readonly userOrgRepo: Repository<UserOrganization>;

  constructor(@Inject(getDataSourceToken()) dataSource: DataSource) {
    this.userOrgRepo = dataSource.getRepository(UserOrganization);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<OrgRequest>();
    const orgId = req.headers["x-organization-id"] as string | undefined;

    if (!orgId || !req.user?.userId) {
      req.organizationId = undefined;
      return true;
    }

    const membership = await this.userOrgRepo.findOne({
      where: { userId: req.user.userId, organizationId: orgId },
    });

    if (!membership) {
      throw new ForbiddenException({
        message: "Not a member of this organization",
        errorCode: "ORG_STALE_MEMBERSHIP",
      });
    }

    req.organizationId = orgId;
    req.orgRole = membership.role;
    return true;
  }
}
