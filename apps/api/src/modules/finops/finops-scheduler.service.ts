import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

/**
 * Scheduler that enqueues a periodic cost-sync job via BullMQ.
 * The cron expression is configurable via the COST_SYNC_CRON environment
 * variable and defaults to 03:00 UTC daily.
 */
@Injectable()
export class FinOpsScheduler {
  constructor(
    @InjectQueue(QUEUE_NAMES.COST_SYNC)
    private readonly costSyncQueue: Queue,
  ) {}

  /**
   * Enqueues a cost-sync job on the configured schedule.
   */
  @Cron(process.env.COST_SYNC_CRON ?? "0 3 * * *")
  async scheduleCostSync(): Promise<void> {
    await this.costSyncQueue.add("sync", {});
  }
}
