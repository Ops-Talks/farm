/**
 * Utility for building deterministic, tenant-scoped cache keys.
 *
 * All keys follow the pattern:
 *   org:<orgId>:<namespace>:<...parts>
 *
 * Using scoped keys prevents cross-tenant cache pollution and enables
 * targeted invalidation without clearing the entire cache.
 */
export class CacheKeyBuilder {
  /**
   * Builds a fully qualified cache key for a specific resource inside an
   * organization namespace.
   *
   * @param orgId     - The organization UUID.
   * @param namespace - A logical grouping label (e.g. "catalog", "pipelines").
   * @param parts     - Additional path segments (e.g. resource ID, filter hash).
   * @returns A colon-delimited cache key string.
   *
   * @example
   * CacheKeyBuilder.org("org-123", "catalog", "components", "all")
   * // => "org:org-123:catalog:components:all"
   */
  static org(orgId: string, namespace: string, ...parts: string[]): string {
    const segments = [`org:${orgId}:${namespace}`, ...parts];
    return segments.join(":");
  }

  /**
   * Builds the prefix used to match all keys in an organization namespace.
   * Pass this to TenantCacheService.invalidateByPrefix() to invalidate all
   * keys under the given namespace for a tenant.
   *
   * @param orgId     - The organization UUID.
   * @param namespace - A logical grouping label (e.g. "catalog", "pipelines").
   * @returns A colon-delimited prefix string ending with ":".
   *
   * @example
   * CacheKeyBuilder.orgPrefix("org-123", "catalog")
   * // => "org:org-123:catalog:"
   */
  static orgPrefix(orgId: string, namespace: string): string {
    return `org:${orgId}:${namespace}:`;
  }
}
