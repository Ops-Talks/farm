import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Gauge } from "prom-client";
import { Interval } from "@nestjs/schedule";

/**
 * Service that periodically samples the TypeORM connection pool and exposes
 * the metrics via Prometheus gauges.
 *
 * Pool stats are sourced from the node-postgres driver's `master` pool object
 * when available. On non-Postgres databases (e.g. SQLite used in unit tests)
 * the driver does not expose a pool and collection is silently skipped.
 *
 * Collection runs every 15 seconds and once immediately at startup.
 */
@Injectable()
export class DatabaseMetricsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseMetricsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectMetric("db_pool_size") private readonly poolSizeGauge: Gauge<string>,
    @InjectMetric("db_pool_waiting")
    private readonly poolWaitingGauge: Gauge<string>,
  ) {}

  onApplicationBootstrap(): void {
    this.collectPoolMetrics();
  }

  /**
   * Reads active and waiting connection counts from the node-postgres pool and
   * updates the corresponding gauges. Errors are caught and logged as warn to
   * prevent a monitoring failure from disrupting the application.
   */
  @Interval(15_000)
  collectPoolMetrics(): void {
    try {
      // node-postgres exposes pool stats on the underlying driver
      const driver = this.dataSource.driver as unknown as {
        master?: {
          totalCount: number;
          idleCount: number;
          waitingCount: number;
        };
      };
      const pool = driver?.master;
      if (!pool) return;
      const active = (pool.totalCount ?? 0) - (pool.idleCount ?? 0);
      this.poolSizeGauge.set(active);
      this.poolWaitingGauge.set(pool.waitingCount ?? 0);
    } catch (err) {
      this.logger.warn("Failed to collect DB pool metrics", err);
    }
  }
}
