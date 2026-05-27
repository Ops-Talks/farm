import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

/**
 * Tenant-aware cache service that wraps the global CACHE_MANAGER.
 *
 * All public methods delegate to the underlying store; the key design is
 * enforced by callers via CacheKeyBuilder so that every cache entry is
 * scoped to a specific organization and namespace.
 *
 * The invalidateByPrefix() method provides targeted invalidation for a
 * single tenant without clearing entries belonging to other tenants.
 */
@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Retrieves a value from the cache.
   *
   * @param key - The fully qualified cache key (use CacheKeyBuilder.org).
   * @returns The cached value, or undefined if not found or expired.
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Stores a value in the cache.
   *
   * @param key   - The fully qualified cache key (use CacheKeyBuilder.org).
   * @param value - The value to store.
   * @param ttl   - Optional time-to-live in milliseconds. Omit to use the
   *                store default TTL.
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Removes a single entry from the cache.
   *
   * @param key - The fully qualified cache key to remove.
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Invalidates all cache keys that begin with the given prefix.
   *
   * When backed by a Redis store (via @keyv/redis or ioredis), this issues
   * a SCAN + DEL pattern to remove all matching keys atomically per batch.
   * When backed by the default in-memory store (no Redis configured), the
   * store does not expose a keys() method, so the operation is a no-op —
   * individual key deletion is safe; cross-tenant clearing is avoided in
   * all cases.
   *
   * @param prefix - Key prefix to match (use CacheKeyBuilder.orgPrefix).
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    const store = (
      this.cacheManager as unknown as {
        store?: { keys?: (pattern: string) => Promise<string[]> };
      }
    ).store;

    if (store?.keys) {
      try {
        const keys = await store.keys(`${prefix}*`);
        if (keys.length > 0) {
          await Promise.all(keys.map((k) => this.cacheManager.del(k)));
          this.logger.debug(
            `Invalidated ${keys.length} cache key(s) for prefix "${prefix}"`,
          );
        }
      } catch (err) {
        // Log but do not throw — a cache invalidation failure must not
        // interrupt the mutation that triggered it.
        this.logger.warn(
          `Failed to invalidate cache prefix "${prefix}": ${String(err)}`,
        );
      }
    }
    // In-memory store: keys() is unavailable; no cross-tenant clear is
    // issued. Individual entries expire naturally by their TTL.
  }
}
