import { SetMetadata } from "@nestjs/common";

/**
 * Key used for roles metadata.
 */
export const ROLES_KEY = "roles";

/**
 * Decorator to define roles required for an endpoint.
 * @param roles - The roles that are allowed to access the endpoint
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
