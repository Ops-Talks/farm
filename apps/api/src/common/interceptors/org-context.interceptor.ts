import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observable } from "rxjs";
import type { Request } from "express";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { RequestWithOrg } from "../interfaces/request-with-org.interface";

type OrgRequest = Request & RequestWithOrg;

/**
 * Global interceptor that enforces organization context from the X-Organization-Id header.
 *
 * Behavior:
 * - If the header is absent or the user is unauthenticated, `request.organizationId`
 *   is left as `undefined` and processing continues normally (backward compatible).
 * - If the header is present AND the user is authenticated, the interceptor verifies
 *   that the user holds a membership record in the requested organization.
 *   - Found: sets `request.organizationId` so downstream controllers can scope queries.
 *   - Not found: throws `ForbiddenException` to prevent unauthorized cross-org access.
 */
@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<OrgRequest>();
    const orgId = req.headers["x-organization-id"] as string | undefined;

    if (orgId && req.user) {
      const membership = await this.userOrganizationRepository.findOne({
        where: {
          userId: req.user.userId,
          organizationId: orgId,
        },
      });

      if (!membership) {
        throw new ForbiddenException("Not a member of this organization");
      }

      req.organizationId = orgId;
    } else {
      req.organizationId = undefined;
    }

    return next.handle();
  }
}
