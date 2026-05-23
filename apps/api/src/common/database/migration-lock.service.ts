import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";

/**
 * Service that coordinates TypeORM migrations across multiple replicas using a
 * PostgreSQL advisory lock to ensure only one instance runs migrations at a
 * time during startup.
 *
 * Uses OnModuleInit (not OnApplicationBootstrap) so migrations complete before
 * any other module's onModuleInit hook (e.g. ServiceTemplateModule seed) tries
 * to query tables that the migrations create. DatabaseModule is declared before
 * plugin modules in AppModule.imports, guaranteeing initialization order.
 *
 * In non-PostgreSQL environments (e.g. SQLite in tests) this service is a
 * no-op; TypeORM synchronize:true handles schema creation there.
 *
 * The advisory lock key (4218428) is unique to this application and must not
 * be reused by other advisory lock users in the same database.
 */
@Injectable()
export class MigrationLockService implements OnModuleInit {
  private readonly logger = new Logger(MigrationLockService.name);
  private static readonly LOCK_KEY = 4218428;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const dbType = this.configService.get<string>("database.type");

    if (dbType !== "postgres") {
      return;
    }

    this.logger.log("Acquiring advisory lock for migration run...");
    await this.dataSource.query(
      `SELECT pg_advisory_lock(${MigrationLockService.LOCK_KEY})`,
    );
    try {
      const hasPending = await this.dataSource.showMigrations();
      if (hasPending) {
        this.logger.log("Running pending migrations...");
        await this.dataSource.runMigrations({ transaction: "each" });
        this.logger.log("Migrations complete.");
      } else {
        this.logger.log("No pending migrations.");
      }
    } finally {
      await this.dataSource.query(
        `SELECT pg_advisory_unlock(${MigrationLockService.LOCK_KEY})`,
      );
      this.logger.log("Advisory lock released.");
    }
  }
}
