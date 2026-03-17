/**
 * Subset of the Express request object that carries the resolved organization
 * ID injected by OrgContextInterceptor alongside the authenticated user payload.
 *
 * Does not extend Express.Request directly to avoid TS1272 in controllers that
 * use decorators with isolatedModules + emitDecoratorMetadata enabled.
 *
 * - `organizationId` is populated only when the X-Organization-Id header is
 *   present and the user has been verified as a member of that organization.
 * - `user` reflects the JWT payload attached by JwtAuthGuard.
 */
export interface RequestWithOrg {
  organizationId?: string;
  user?: {
    userId: string;
    username: string;
    roles: string[];
  };
}
