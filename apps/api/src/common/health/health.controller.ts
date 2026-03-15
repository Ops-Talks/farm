import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";

/**
 * Health controller providing advanced monitoring of system resources
 * and database connectivity using Terminus.
 */
@ApiTags("Health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Check application and database health status" })
  @ApiResponse({
    status: 200,
    description: "The application is healthy.",
  })
  @ApiResponse({
    status: 503,
    description: "One or more services are unhealthy.",
  })
  check(): Promise<HealthCheckResult> {
    const version = this.configService.get<string>("version") || "0.2.4";

    return this.health.check([
      // Check database connection
      () => this.db.pingCheck("database"),
      // Check heap memory usage (limit to 512MB)
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
      // Check RSS memory usage (limit to 1024MB)
      () => this.memory.checkRSS("memory_rss", 1024 * 1024 * 1024),
      // Check disk storage usage
      () =>
        this.disk.checkStorage("storage", {
          path: "/",
          thresholdPercent: 0.9,
        }),
      // Custom version indicator
      () => ({
        version: {
          status: "up",
          version,
        },
      }),
    ]);
  }
}
