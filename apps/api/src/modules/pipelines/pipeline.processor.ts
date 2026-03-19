import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";
import {
  PipelineRun,
  PipelineRunStatus,
  StageResult,
} from "./entities/pipeline-run.entity";
import { Pipeline } from "./entities/pipeline.entity";
import {
  HelmDeployExecutor,
  HelmDeployConfig,
} from "../helm/helm-deploy.executor";
import { BuildStageExecutor } from "./build-stage.executor";

/**
 * Job payload for a pipeline execution task.
 */
export interface PipelineExecutionJobData {
  pipelineId: string;
  runId: string;
  triggeredBy: string;
  /**
   * When set, the processor skips all stages whose order is less than this
   * value. Used when resuming a run after an approval stage is approved.
   */
  resumeFromStageOrder?: number;
}

/**
 * BullMQ worker that executes pipeline runs stage by stage,
 * streaming log lines via WebSocket and persisting results to the database.
 */
@Processor(QUEUE_NAMES.PIPELINE_EXECUTION)
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    private readonly eventsGateway: EventsGateway,
    @Optional() private readonly helmDeployExecutor?: HelmDeployExecutor,
    @Optional() private readonly buildStageExecutor?: BuildStageExecutor,
  ) {
    super();
  }

  /**
   * Processes a pipeline execution job.
   * Iterates through each stage in order, emits live log events, and
   * persists the final run status.
   *
   * When `job.data.resumeFromStageOrder` is present the processor skips
   * the initial run-setup block (status reset, startedAt, stageResults
   * clear) and only executes stages whose order is >= the provided value.
   */
  async process(job: Job<PipelineExecutionJobData>): Promise<void> {
    const { pipelineId, runId, resumeFromStageOrder } = job.data;
    this.logger.log(
      `Processing pipeline run ${runId} for pipeline ${pipelineId}` +
        (resumeFromStageOrder !== undefined
          ? ` (resuming from stage order ${resumeFromStageOrder})`
          : ""),
    );

    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) {
      this.logger.error(`Run ${runId} not found — aborting job`);
      return;
    }

    // Guard against a cancellation that raced with the job being picked up.
    if (run.status === PipelineRunStatus.CANCELLED) {
      this.logger.warn(`Run ${runId} is already cancelled — aborting job`);
      return;
    }

    const isResume = resumeFromStageOrder !== undefined;

    if (!isResume) {
      run.status = PipelineRunStatus.RUNNING;
      run.startedAt = new Date();
      run.stageResults = [];
      await this.runRepository.save(run);
    }

    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      await this.failRun(run, "Pipeline definition not found");
      return;
    }

    const allStages = [...pipeline.stages].sort((a, b) => a.order - b.order);
    const stages = isResume
      ? allStages.filter((s) => s.order >= resumeFromStageOrder)
      : allStages;

    try {
      for (const stage of stages) {
        // Check for cancellation before starting each stage.
        const freshRun = await this.runRepository.findOne({
          where: { id: runId },
        });
        if (freshRun?.status === PipelineRunStatus.CANCELLED) {
          this.logger.warn(
            `Run ${runId} was cancelled — stopping before stage "${stage.name}"`,
          );
          return;
        }

        const stageResult: StageResult = {
          stageId: stage.id,
          status: "running",
          startedAt: new Date().toISOString(),
          finishedAt: null,
          output: null,
        };

        this.emitLog(
          runId,
          stage.name,
          `Starting stage "${stage.name}" (type: ${stage.type})`,
        );

        if (stage.type === "approval") {
          stageResult.status = "waiting_approval";
          stageResult.finishedAt = new Date().toISOString();
          run.stageResults = [...(run.stageResults ?? []), stageResult];
          run.status = PipelineRunStatus.WAITING_APPROVAL;
          await this.runRepository.save(run);

          this.emitLog(
            runId,
            stage.name,
            `Stage "${stage.name}" is waiting for approval`,
          );
          this.eventsGateway.server?.emit(
            FarmEvent.PIPELINE_RUN_UPDATED,
            this.buildRunSummary(run),
          );
          return;
        }

        // Dispatch deploy stages with engine=helm to the HelmDeployExecutor.
        if (
          stage.type === "deploy" &&
          stage.config?.engine === "helm" &&
          this.helmDeployExecutor
        ) {
          const helmConfig = stage.config as unknown as HelmDeployConfig;
          const result = await this.helmDeployExecutor.execute(
            helmConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (stage.type === "build" && this.buildStageExecutor) {
          // Dispatch build stages to BuildStageExecutor.
          const result = await this.buildStageExecutor.execute(
            stage,
            run,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else {
          // Simulate work for all other stage types.
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
          stageResult.status = "succeeded";
          stageResult.output = `Stage "${stage.name}" completed successfully`;
        }

        stageResult.finishedAt = new Date().toISOString();
        run.stageResults = [...(run.stageResults ?? []), stageResult];

        this.emitLog(
          runId,
          stage.name,
          `Stage "${stage.name}" ${stageResult.status}`,
        );

        // Abort the run immediately if any non-approval stage has failed.
        if (stageResult.status === "failed") {
          await this.failRun(
            run,
            `Stage "${stage.name}" failed: ${stageResult.output ?? "unknown error"}`,
          );
          return;
        }
      }

      run.status = PipelineRunStatus.SUCCEEDED;
      run.finishedAt = new Date();
      run.durationMs = run.startedAt
        ? run.finishedAt.getTime() - run.startedAt.getTime()
        : null;

      await this.runRepository.save(run);

      this.logger.log(`Pipeline run ${runId} succeeded`);
      this.eventsGateway.server?.emit(
        FarmEvent.PIPELINE_RUN_UPDATED,
        this.buildRunSummary(run),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.failRun(run, message);
    }
  }

  /**
   * Marks the run as failed, persists the record, and emits an update event.
   */
  private async failRun(run: PipelineRun, reason: string): Promise<void> {
    run.status = PipelineRunStatus.FAILED;
    run.finishedAt = new Date();
    run.durationMs = run.startedAt
      ? run.finishedAt.getTime() - run.startedAt.getTime()
      : null;

    await this.runRepository.save(run);

    this.logger.error(`Pipeline run ${run.id} failed: ${reason}`);
    this.eventsGateway.server?.emit(
      FarmEvent.PIPELINE_RUN_UPDATED,
      this.buildRunSummary(run),
    );
  }

  /**
   * Emits a single log line for a stage via the WebSocket gateway.
   */
  private emitLog(runId: string, stageName: string, message: string): void {
    this.eventsGateway.server?.emit(FarmEvent.PIPELINE_LOG, {
      runId,
      stage: stageName,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Builds a lightweight run summary object for event payloads.
   */
  private buildRunSummary(run: PipelineRun): Record<string, unknown> {
    return {
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
      timestamp: new Date().toISOString(),
    };
  }
}
