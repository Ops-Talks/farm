import { SetMetadata } from "@nestjs/common";

/**
 * Metadata key used by OrgRequiredGuard to detect org-scoped endpoints.
 */
export const ORG_REQUIRED_KEY = "orgRequired";

/**
 * Marks a controller or individual route handler as requiring a resolved
 * organizationId on the request (set by OrgContextInterceptor).
 *
 * Pair with OrgRequiredGuard to enforce the restriction.
 */
export const OrgRequired = () => SetMetadata(ORG_REQUIRED_KEY, true);
