import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Component } from "../catalog/entities/component.entity";
import { ScorecardsService } from "./scorecards.service";

/**
 * Scheduled job service that recomputes scorecard results for all components.
 *
 * The job runs once every hour and processes components in batches of 100 to
 * avoid loading the entire catalog into memory at once. Errors for individual
 * components are caught and logged without aborting the rest of the batch.
 */
@Injectable()
export class ScorecardSchedulerService {
  private readonly logger = new Logger(ScorecardSchedulerService.name);

  constructor(
    private readonly scorecardsService: ScorecardsService,

    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
  ) {}

  /**
   * Recomputes scorecard results for every component in the catalog.
   *
   * Components are fetched in batches of 100 using cursor-based pagination
   * keyed on the primary `id` column. This avoids the skip/offset problem
   * where concurrent inserts or deletes shift rows and cause pages to be
   * skipped or reprocessed. Each component is evaluated individually so that
   * a failure on one component does not prevent the remaining components from
   * being processed. A summary is logged at the end of each run.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recomputeAll(): Promise<void> {
    this.logger.log("Starting hourly scorecard recomputation");

    const batchSize = 100;
    let lastId = "";
    let successCount = 0;
    let errorCount = 0;

    while (true) {
      const where = lastId ? { id: MoreThan(lastId) } : {};
      const batch = await this.componentRepo.find({
        select: { id: true, organizationId: true },
        where,
        take: batchSize,
        order: { id: "ASC" },
      });

      if (batch.length === 0) {
        break;
      }

      for (const component of batch) {
        try {
          await this.scorecardsService.evaluateAndSave(
            component.id,
            component.organizationId ?? undefined,
          );
          successCount++;
        } catch (err) {
          errorCount++;
          this.logger.error(
            `Failed to recompute scorecard for component ${component.id}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }

      lastId = batch[batch.length - 1].id;

      // Stop when the last batch was smaller than the batch size — no more rows.
      if (batch.length < batchSize) {
        break;
      }
    }

    this.logger.log(
      `Hourly scorecard recomputation complete — ` +
        `success: ${successCount}, errors: ${errorCount}`,
    );
  }
}
