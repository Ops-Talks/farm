import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { DatabaseMetricsService } from "./database-metrics.service";

/**
 * Module that registers the TypeORM connection pool Prometheus gauges and
 * the service that periodically populates them.
 */
@Module({
  imports: [TypeOrmModule],
  providers: [
    makeGaugeProvider({
      name: "db_pool_size",
      help: "Number of active connections in the TypeORM connection pool",
    }),
    makeGaugeProvider({
      name: "db_pool_waiting",
      help: "Number of requests waiting to acquire a connection from the pool",
    }),
    DatabaseMetricsService,
  ],
  exports: [DatabaseMetricsService],
})
export class DatabaseMetricsModule {}
