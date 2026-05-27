import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";

/**
 * Applies an organization ID filter to a TypeORM SelectQueryBuilder.
 *
 * When orgId is provided the function appends an AND condition on
 * `${alias}.organizationId = :orgId`. When orgId is absent the query builder
 * is returned unmodified, keeping queries global (admin-level).
 *
 * Usage:
 *   const qb = this.repo.createQueryBuilder("c");
 *   withOrgFilter(qb, "c", orgId);
 *
 * @param qb    - The query builder to extend.
 * @param alias - The entity alias used in the query.
 * @param orgId - The organization UUID to filter on, or undefined.
 * @returns The same query builder (mutated in-place for fluent chaining).
 */
export function withOrgFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  orgId: string | undefined,
): SelectQueryBuilder<T> {
  if (orgId) {
    // Guard against SQL injection via alias interpolation. All callers pass
    // hardcoded string literals, but this runtime check enforces the contract.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
      throw new Error(`Invalid query builder alias: "${alias}"`);
    }
    qb.andWhere(`${alias}.organizationId = :orgId`, { orgId });
  }
  return qb;
}
