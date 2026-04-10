import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import { Component } from "../catalog/entities/component.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { OpenCostService } from "./open-cost.service";
import {
  Deployment,
  DeploymentStatus,
} from "../environments/entities/deployment.entity";

/**
 * BullMQ processor that syncs actual cost data from OpenCost for all
 * components that have at least one active deployment.
 *
 * Emits a cost:actual-budget-exceeded WebSocket event when a component's
 * total cost exceeds its configured monthly budget.
 */
@Processor(QUEUE_NAMES.COST_SYNC)
export class ActualCostSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ActualCostSyncProcessor.name);

  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(ActualCost)
    private readonly actualCostRepo: Repository<ActualCost>,
    @InjectRepository(Deployment)
    private readonly deploymentRepo: Repository<Deployment>,
    private readonly openCostService: OpenCostService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  /**
   * Processes the cost-sync job: fetches OpenCost allocation data for each
   * component with an active deployment and persists the result.
   */
  async process(): Promise<void> {
    this.logger.log("Starting ActualCost sync");

    const deployments = await this.deploymentRepo.find({
      where: { status: DeploymentStatus.SUCCEEDED },
    });
    const componentIds = [...new Set(deployments.map((d) => d.componentId))];

    for (const componentId of componentIds) {
      try {
        const component = await this.componentRepo.findOne({
          where: { id: componentId },
        });
        if (!component) continue;

        const allocation = await this.openCostService.getAllocation(
          component.name,
          "30d",
        );
        if (!allocation) continue;

        const record = this.actualCostRepo.create({
          componentId,
          window: "30d",
          cpuCost: allocation.cpuCost,
          memoryCost: allocation.memoryCost,
          pvCost: allocation.pvCost,
          networkCost: allocation.networkCost,
          totalCost: allocation.totalCost,
          currency: allocation.currency,
          syncedAt: new Date(),
        });
        await this.actualCostRepo.save(record);

        // Budget check — emit WebSocket event when budget is exceeded.
        if (
          component.costBudgetUsd != null &&
          allocation.totalCost > Number(component.costBudgetUsd)
        ) {
          this.eventsGateway.emitCostActualBudgetExceeded({
            componentId,
            totalCost: allocation.totalCost,
            budgetUsd: Number(component.costBudgetUsd),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        this.logger.error(
          `Cost sync failed for component ${componentId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `ActualCost sync complete for ${componentIds.length} components`,
    );
  }
}
