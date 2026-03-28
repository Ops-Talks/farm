import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { GatewayService } from "./gateway.service";
import { IGatewayAdapter } from "./interfaces/gateway-adapter.interface";
import { GATEWAY_ADAPTERS } from "./gateway.constants";

/**
 * Scheduler that periodically triggers gateway route synchronization and
 * API health checks.
 *
 * Both jobs are skipped when no adapters are enabled (i.e., when neither
 * Kong nor AWS integration is configured).
 */
@Injectable()
export class GatewayScheduler {
  private readonly logger = new Logger(GatewayScheduler.name);

  constructor(
    private readonly gatewayService: GatewayService,
    @Inject(GATEWAY_ADAPTERS)
    private readonly adapters: IGatewayAdapter[],
  ) {}

  /**
   * Synchronizes gateway routes every 15 minutes.
   * Skipped when no adapters are configured.
   */
  @Cron("0 */15 * * * *")
  async handleRoutesSync(): Promise<void> {
    if (this.adapters.length === 0) {
      return;
    }
    this.logger.log("Scheduled gateway route sync starting");
    await this.gatewayService.syncRoutes();
  }

  /**
   * Runs API health checks every 5 minutes.
   * Skipped when no adapters are configured.
   */
  @Cron("0 */5 * * * *")
  async handleHealthCheck(): Promise<void> {
    if (this.adapters.length === 0) {
      return;
    }
    this.logger.log("Scheduled API health check starting");
    await this.gatewayService.triggerHealthCheck();
  }
}
