import { Injectable, ForbiddenException } from "@nestjs/common";
import { Scope } from "@nestjs/common";

/**
 * REQUEST-scoped service that carries the resolved organization ID for the
 * duration of a single HTTP request.
 *
 * OrgRequiredGuard calls setOrgId() after verifying the caller's org
 * membership. Downstream services can inject OrgContextService to read the
 * organization ID without coupling themselves to the HTTP layer.
 *
 * Because this service is REQUEST-scoped, each request gets its own instance.
 * Never store per-request state in a singleton service.
 */
@Injectable({ scope: Scope.REQUEST })
export class OrgContextService {
  private orgId: string | undefined;

  /**
   * Sets the resolved organization ID. Called once per request by OrgRequiredGuard.
   */
  setOrgId(orgId: string): void {
    this.orgId = orgId;
  }

  /**
   * Returns the organization ID for the current request, or undefined when no
   * org context has been established (e.g. requests without X-Organization-Id).
   */
  getOrgId(): string | undefined {
    return this.orgId;
  }

  /**
   * Returns the organization ID and throws ForbiddenException when it has not
   * been set. Use this in services that require an org context.
   */
  getOrgIdOrFail(): string {
    if (!this.orgId) {
      throw new ForbiddenException("Organization context is required");
    }
    return this.orgId;
  }
}
