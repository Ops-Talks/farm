import { SetMetadata } from "@nestjs/common";
import { OrgRole } from "@farm/types";

/**
 * Metadata key used for organization-level role requirements.
 */
export const ORG_ROLES_KEY = "orgRoles";

/**
 * Decorator that defines the minimum organization role required to access an endpoint.
 * @param roles - The organization roles allowed to access the endpoint
 */
export const OrgRoles = (...roles: (OrgRole | string)[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);
