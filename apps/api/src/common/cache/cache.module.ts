import { Module } from "@nestjs/common";
import { TenantCacheService } from "./tenant-cache.service";

/**
 * Shared module that provides TenantCacheService for org-scoped cache
 * operations.
 *
 * Import this module into any feature module that needs to perform
 * tenant-scoped cache reads, writes, or prefix-based invalidation.
 * The underlying CACHE_MANAGER must already be registered globally
 * (CacheModule.registerAsync in AppModule); this module simply re-imports
 * it to satisfy the DI token inside TenantCacheService.
 */
@Module({
  providers: [TenantCacheService],
  exports: [TenantCacheService],
})
export class TenantCacheModule {}
