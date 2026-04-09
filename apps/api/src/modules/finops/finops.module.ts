import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { CostEstimate } from "./entities/cost-estimate.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { Component } from "../catalog/entities/component.entity";
import { Deployment } from "../environments/entities/deployment.entity";
import { Team } from "../teams/entities/team.entity";
import { FinOpsService } from "./finops.service";
import { OpenCostService } from "./open-cost.service";
import { CostController } from "./cost.controller";
import { ActualCostSyncProcessor } from "./actual-cost-sync.processor";
import { FinOpsScheduler } from "./finops-scheduler.service";

const isTest = process.env.NODE_ENV === "test";

/**
 * FinOps feature module.
 *
 * Provides:
 * - CostEstimate management (infracost pipeline integration)
 * - ActualCost sync from OpenCost
 * - Cost API endpoints (component actuals, team summary, platform summary)
 * - Scheduled BullMQ cost-sync job (non-test environments only)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CostEstimate,
      ActualCost,
      Component,
      Deployment,
      Team,
    ]),
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: QUEUE_NAMES.COST_SYNC })]),
  ],
  providers: [
    FinOpsService,
    OpenCostService,
    ...(isTest ? [] : [ActualCostSyncProcessor, FinOpsScheduler]),
  ],
  controllers: [CostController],
  exports: [FinOpsService, OpenCostService],
})
export class FinOpsModule {}
