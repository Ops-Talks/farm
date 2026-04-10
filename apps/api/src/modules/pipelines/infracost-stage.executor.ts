import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { execFile } from "child_process";
import { promisify } from "util";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { EventsGateway } from "../../common/events/events.gateway";
import { Component } from "../catalog/entities/component.entity";
import { FinOpsService } from "../finops/finops.service";

const execFileAsync = promisify(execFile);

/**
 * Configuration options for an infracost pipeline stage.
 * Matches stage.config when stage.type === 'infracost'.
 */
export interface InfracostStageConfig {
  /** Path to the Terraform directory to analyse; defaults to '.' */
  terraformDir?: string;
  /** Optional cost threshold matching the component's costBudgetUsd */
  costThreshold?: number;
  /** Optional component ID used for budget alerting */
  componentId?: string;
}

/**
 * Cost breakdown for a single Terraform project as returned by infracost.
 */
export interface InfracostProject {
  name: string;
  pastBreakdown: { totalMonthlyCost: string };
  breakdown: { totalMonthlyCost: string };
  diff: { totalMonthlyCost: string };
}

/**
 * Top-level infracost JSON output structure (diff format).
 */
export interface InfracostResult {
  totalMonthlyCost: string;
  diffMonthlyCost: string;
  currency: string;
  projects: InfracostProject[];
}

/**
 * Result returned by InfracostStageExecutor.execute().
 */
export interface InfracostStageResult {
  success: boolean;
  output: string;
}

/**
 * Executes an infracost diff stage in a pipeline.
 *
 * Gracefully degrades when the infracost binary is not present in PATH,
 * returning a failed result with a descriptive message rather than throwing.
 *
 * On success the parsed JSON result is persisted to run.metadata.infracost
 * and, if a FinOpsService is available, the cost estimate is upserted.
 */
@Injectable()
export class InfracostStageExecutor {
  private readonly logger = new Logger(InfracostStageExecutor.name);

  constructor(
    @Optional()
    @InjectRepository(PipelineRun)
    private readonly runRepository?: Repository<PipelineRun>,
    @Optional()
    @InjectRepository(Component)
    private readonly componentRepository?: Repository<Component>,
    @Optional()
    private readonly eventsGateway?: EventsGateway,
    @Optional()
    private readonly finOpsService?: FinOpsService,
  ) {}

  /**
   * Checks whether the infracost binary is available in PATH.
   * @returns true when the binary can be found and executed
   */
  async isInfracostAvailable(): Promise<boolean> {
    try {
      await execFileAsync("infracost", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes the infracost diff stage.
   *
   * @param stage   - Pipeline stage definition containing InfracostStageConfig
   * @param run     - Current pipeline run record (mutated with metadata)
   * @param emitLog - Callback invoked with each log line as it is produced
   * @returns InfracostStageResult with success flag and JSON output
   */
  async execute(
    stage: PipelineStage,
    run: PipelineRun,
    emitLog: (msg: string) => void,
  ): Promise<InfracostStageResult> {
    try {
      const available = await this.isInfracostAvailable();
      if (!available) {
        const msg = "infracost binary not found in PATH";
        this.logger.warn(msg);
        emitLog(msg);
        return { success: false, output: msg };
      }

      const config = stage.config as InfracostStageConfig;
      const terraformDir = config.terraformDir ?? ".";

      emitLog(`Running: infracost diff --path ${terraformDir} --format json`);
      this.logger.log(
        `Infracost stage: analysing terraform dir "${terraformDir}"`,
      );

      const { stdout } = await execFileAsync(
        "infracost",
        ["diff", "--path", terraformDir, "--format", "json"],
        { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
      );

      stdout.split("\n").forEach((line) => line && emitLog(line));

      let result: InfracostResult;
      try {
        result = JSON.parse(stdout) as InfracostResult;
      } catch {
        const msg = "infracost: invalid JSON output";
        this.logger.error(msg);
        return { success: false, output: msg };
      }

      // Persist result to run metadata.
      run.metadata = { ...(run.metadata ?? {}), infracost: result };
      if (this.runRepository) {
        await this.runRepository.save(run);
      }

      // Persist cost estimate via FinOpsService.
      const componentId = config.componentId;
      if (componentId && this.finOpsService) {
        await this.finOpsService.upsertCostEstimate(componentId, {
          estimatedMonthlyCost: Number(result.totalMonthlyCost),
          diffMonthlyCost: Number(result.diffMonthlyCost),
          currency: result.currency,
          pipelineRunId: run.id,
          breakdown: result.projects as unknown as Record<string, unknown>,
          measuredAt: new Date(),
        });
      }

      // Budget check: compare estimated total monthly cost to budget threshold.
      if (componentId && this.componentRepository && this.eventsGateway) {
        const component = await this.componentRepository.findOne({
          where: { id: componentId },
        });
        if (component?.costBudgetUsd != null) {
          const estimatedTotal = Number(result.totalMonthlyCost);
          if (estimatedTotal > Number(component.costBudgetUsd)) {
            this.eventsGateway.emitCostBudgetExceeded({
              componentId,
              delta: estimatedTotal - Number(component.costBudgetUsd),
              pipelineRunId: run.id,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      this.logger.log(
        `Infracost stage succeeded: totalMonthlyCost=${result.totalMonthlyCost} ${result.currency}`,
      );
      return { success: true, output: JSON.stringify(result) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Infracost stage failed: ${msg}`);
      return { success: false, output: msg };
    }
  }
}
