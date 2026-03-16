import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
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

/**
 * Job payload for a pipeline execution task.
 */
export interface PipelineExecutionJobData {
  pipelineId: string;
  runId: string;
  triggeredBy: string;
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
  ) {
    super();
  }

  /**
   * Processes a pipeline execution job.
   * Iterates through each stage in order, emits live log events, and
   * persists the final run status.
   */
  async process(job: Job<PipelineExecutionJobData>): Promise<void> {
    const { pipelineId, runId } = job.data;
    this.logger.log(
      `Processing pipeline run ${runId} for pipeline ${pipelineId}`,
    );

    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) {
      this.logger.error(`Run ${runId} not found — aborting job`);
      return;
    }

    run.status = PipelineRunStatus.RUNNING;
    run.startedAt = new Date();
    run.stageResults = [];
    await this.runRepository.save(run);

    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      await this.failRun(run, "Pipeline definition not found");
      return;
    }

    const stages = [...pipeline.stages].sort((a, b) => a.order - b.order);

    try {
      for (const stage of stages) {
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

        // Simulate work
        await new Promise<void>((resolve) => setTimeout(resolve, 500));

        if (stage.type === "approval") {
          stageResult.status = "waiting_approval";
          stageResult.finishedAt = new Date().toISOString();
          run.stageResults = [...(run.stageResults ?? []), stageResult];
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

        stageResult.status = "succeeded";
        stageResult.finishedAt = new Date().toISOString();
        stageResult.output = `Stage "${stage.name}" completed successfully`;

        run.stageResults = [...(run.stageResults ?? []), stageResult];

        this.emitLog(runId, stage.name, `Stage "${stage.name}" succeeded`);
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
