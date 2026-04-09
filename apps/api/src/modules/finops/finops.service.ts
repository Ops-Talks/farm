import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CostEstimate } from "./entities/cost-estimate.entity";

/**
 * Service responsible for managing infracost estimates and related FinOps data.
 */
@Injectable()
export class FinOpsService {
  constructor(
    @InjectRepository(CostEstimate)
    private readonly costEstimateRepository: Repository<CostEstimate>,
  ) {}

  /**
   * Inserts a new cost estimate or updates the existing one for a component.
   *
   * @param componentId - The UUID of the component
   * @param data        - Cost data to store
   * @returns The saved CostEstimate entity
   */
  async upsertCostEstimate(
    componentId: string,
    data: {
      estimatedMonthlyCost: number;
      diffMonthlyCost: number;
      currency?: string;
      pipelineRunId?: string | null;
      breakdown?: Record<string, unknown> | null;
      measuredAt?: Date;
    },
  ): Promise<CostEstimate> {
    let estimate = await this.costEstimateRepository.findOne({
      where: { componentId },
    });
    if (!estimate) {
      estimate = this.costEstimateRepository.create({ componentId });
    }
    estimate.estimatedMonthlyCost = data.estimatedMonthlyCost;
    estimate.diffMonthlyCost = data.diffMonthlyCost;
    estimate.currency = data.currency ?? "USD";
    estimate.pipelineRunId = data.pipelineRunId ?? null;
    estimate.breakdown = data.breakdown ?? null;
    estimate.measuredAt = data.measuredAt ?? new Date();
    return this.costEstimateRepository.save(estimate);
  }

  /**
   * Returns the latest cost estimate for a component, or null when not found.
   *
   * @param componentId - The UUID of the component
   * @returns CostEstimate or null
   */
  async getCostEstimate(componentId: string): Promise<CostEstimate | null> {
    return this.costEstimateRepository.findOne({ where: { componentId } });
  }
}
