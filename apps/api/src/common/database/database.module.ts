import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MigrationLockService } from "./migration-lock.service";

/**
 * Module that provides advisory-lock-based migration coordination for
 * production PostgreSQL deployments. Ensures only one replica runs pending
 * migrations at application startup.
 */
@Module({
  imports: [TypeOrmModule],
  providers: [MigrationLockService],
  exports: [MigrationLockService],
})
export class DatabaseModule {}
