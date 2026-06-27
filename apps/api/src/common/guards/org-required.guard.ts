import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ORG_REQUIRED_KEY } from "../decorators/org-required.decorator";
import type { RequestWithOrg } from "../interfaces/request-with-org.interface";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import type { Request } from "express";

type OrgRequest = Request & RequestWithOrg & { user?: { userId: string } };

/**
 * Guard that enforces organization context for routes decorated with @OrgRequired().
 *
 * Must be placed after JwtAuthGuard in @UseGuards so req.user is already populated.
 *
 * Because global APP_INTERCEPTORs run after guards, this guard is responsible
 * for the full org resolution pipeline on required routes:
 *  1. Extracts X-Organization-Id from the request header.
 *  2. Verifies the authenticated user holds a membership in that organization.
 *  3. Sets req.organizationId so downstream handlers can scope queries.
 *
 *
 * Throws ForbiddenException when:
 *  - The @OrgRequired() metadata is present AND the header is absent.
 *  - The authenticated user is not a member of the specified organization.
 */
@Injectable()
export class OrgRequiredGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      ORG_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const req = context.switchToHttp().getRequest<OrgRequest>();
    const orgId = req.headers["x-organization-id"] as string | undefined;

    if (!orgId) {
      throw new ForbiddenException(
        "X-Organization-Id header is required for this endpoint",
      );
    }

    if (!req.user?.userId) {
      throw new ForbiddenException("Authentication required for this endpoint");
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
