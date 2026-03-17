import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun, PipelineRunStatus } from "./entities/pipeline-run.entity";
import { CreatePipelineDto } from "./dto/create-pipeline.dto";
import { UpdatePipelineDto } from "./dto/update-pipeline.dto";

/**
 * Service responsible for pipeline CRUD and execution management.
 */
@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @Optional()
    @InjectQueue(QUEUE_NAMES.PIPELINE_EXECUTION)
    private readonly executionQueue?: Queue,
    @Optional()
    private readonly eventsGateway?: EventsGateway,
  ) {}

  /**
   * Creates a new pipeline definition.
   * @param dto - Pipeline creation data
   * @param createdBy - UUID of the user creating the pipeline
   * @returns The newly created pipeline
   * @throws ConflictException if a pipeline with the same name already exists
   */
  async create(dto: CreatePipelineDto, createdBy: string): Promise<Pipeline> {
    const existing = await this.pipelineRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Pipeline with name "${dto.name}" already exists`,
      );
    }

    const pipeline = this.pipelineRepository.create({
      ...dto,
      stages: dto.stages ?? [],
      createdBy,
    });

    this.logger.log(`Creating pipeline: ${dto.name}`);
    return this.pipelineRepository.save(pipeline);
  }

  /**
   * Retrieves all pipelines, optionally scoped to an organization.
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @param organizationId - Optional organization UUID filter
   * @returns A tuple of [pipelines, total count]
   */
  async findAll(
    skip = 0,
    take = 20,
    organizationId?: string,
  ): Promise<[Pipeline[], number]> {
    return this.pipelineRepository.findAndCount({
      where: organizationId ? { organizationId } : {},
      order: { name: "ASC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single pipeline by ID.
   * @param id - Pipeline UUID
   * @returns The pipeline
   * @throws NotFoundException if the pipeline does not exist
   */
  async findOne(id: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID "${id}" not found`);
    }
    return pipeline;
  }

  /**
   * Updates an existing pipeline definition.
   * @param id - Pipeline UUID
   * @param dto - Fields to update
   * @returns The updated pipeline
   * @throws NotFoundException if the pipeline does not exist
   * @throws ConflictException if the new name conflicts with an existing pipeline
   */
  async update(id: string, dto: UpdatePipelineDto): Promise<Pipeline> {
    const pipeline = await this.findOne(id);

    if (dto.name && dto.name !== pipeline.name) {
      const conflict = await this.pipelineRepository.findOne({
        where: { name: dto.name },
      });
      if (conflict) {
        throw new ConflictException(
          `Pipeline with name "${dto.name}" already exists`,
        );
      }
    }

    const updated = this.pipelineRepository.merge(pipeline, dto);
    return this.pipelineRepository.save(updated);
  }

  /**
   * Removes a pipeline and its associated runs.
   * @param id - Pipeline UUID
   * @throws NotFoundException if the pipeline does not exist
   */
  async remove(id: string): Promise<void> {
    const pipeline = await this.findOne(id);
    await this.pipelineRepository.remove(pipeline);
    this.logger.log(`Removed pipeline: ${pipeline.name}`);
  }

  /**
   * Creates a PipelineRun record with status 'queued' and enqueues
   * the job on the PIPELINE_EXECUTION queue.
   * @param pipelineId - Pipeline UUID
   * @param triggeredBy - UUID of the user triggering the run
   * @returns The newly created PipelineRun
   * @throws NotFoundException if the pipeline does not exist
   */
  async triggerRun(
    pipelineId: string,
    triggeredBy: string,
  ): Promise<PipelineRun> {
    await this.findOne(pipelineId);

    const run = this.runRepository.create({
      pipelineId,
      triggeredBy,
      status: PipelineRunStatus.QUEUED,
    });

    const savedRun = await this.runRepository.save(run);

    await this.executionQueue?.add(QUEUE_NAMES.PIPELINE_EXECUTION, {
      pipelineId,
      runId: savedRun.id,
      triggeredBy,
    });

    this.logger.log(
      `Triggered pipeline run ${savedRun.id} for pipeline ${pipelineId}`,
    );
    return savedRun;
  }

  /**
   * Returns the last 50 runs for a given pipeline, ordered newest first.
   * @param pipelineId - Pipeline UUID
   * @returns Array of pipeline runs
   */
  async findRuns(pipelineId: string): Promise<PipelineRun[]> {
    return this.runRepository.find({
      where: { pipelineId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  /**
   * Returns a single pipeline run, validating it belongs to the pipeline.
   * @param pipelineId - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @returns The matching PipelineRun
   * @throws NotFoundException if not found or run does not belong to the pipeline
   */
  async findRun(pipelineId: string, runId: string): Promise<PipelineRun> {
    const run = await this.runRepository.findOne({
      where: { id: runId, pipelineId },
    });
    if (!run) {
      throw new NotFoundException(
        `Run "${runId}" not found for pipeline "${pipelineId}"`,
      );
    }
    return run;
  }

  /**
   * Approves a run that is waiting for manual approval, resumes processing
   * from the stage immediately after the approval stage.
   *
   * @param pipelineId - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param userId - UUID of the user granting approval
   * @returns The updated PipelineRun
   * @throws NotFoundException if the run does not belong to the pipeline
   * @throws BadRequestException if the run is not in WAITING_APPROVAL status
   */
  async approveRun(
    pipelineId: string,
    runId: string,
    userId: string,
  ): Promise<PipelineRun> {
    const run = await this.findRun(pipelineId, runId);

    if (run.status !== PipelineRunStatus.WAITING_APPROVAL) {
      throw new BadRequestException("Run is not waiting for approval");
    }

    // Determine which stage order to resume from.
    const approvalStageResult = run.stageResults?.find(
      (sr) => sr.status === "waiting_approval",
    );

    let resumeFromStageOrder = 0;

    if (approvalStageResult) {
      const pipeline = await this.pipelineRepository.findOne({
        where: { id: pipelineId },
      });
      const approvalStage = pipeline?.stages.find(
        (s) => s.id === approvalStageResult.stageId,
      );
      if (approvalStage !== undefined) {
        resumeFromStageOrder = approvalStage.order + 1;
      }

      // Mark the approval stage result as approved.
      run.stageResults = (run.stageResults ?? []).map((sr) =>
        sr.stageId === approvalStageResult.stageId
          ? { ...sr, status: "approved", finishedAt: new Date().toISOString() }
          : sr,
      );
    }

    run.status = PipelineRunStatus.RUNNING;
    const savedRun = await this.runRepository.save(run);

    this.eventsGateway?.emitPipelineRunUpdated({
      id: savedRun.id,
      pipelineId: savedRun.pipelineId,
      status: savedRun.status,
      triggeredBy: savedRun.triggeredBy,
      startedAt: savedRun.startedAt,
      finishedAt: savedRun.finishedAt,
      durationMs: savedRun.durationMs,
      timestamp: new Date().toISOString(),
    });

    await this.executionQueue?.add(QUEUE_NAMES.PIPELINE_EXECUTION, {
      pipelineId,
      runId,
      triggeredBy: run.triggeredBy,
      resumeFromStageOrder,
    });

    this.logger.log(
      `Run ${runId} approved by ${userId}, resuming from stage order ${resumeFromStageOrder}`,
    );
    return savedRun;
  }

  /**
   * Rejects a run that is waiting for manual approval, marking it as failed.
   *
   * @param pipelineId - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param userId - UUID of the user rejecting the run
   * @returns The updated PipelineRun
   * @throws NotFoundException if the run does not belong to the pipeline
   * @throws BadRequestException if the run is not in WAITING_APPROVAL status
   */
  async rejectRun(
    pipelineId: string,
    runId: string,
    userId: string,
  ): Promise<PipelineRun> {
    const run = await this.findRun(pipelineId, runId);

    if (run.status !== PipelineRunStatus.WAITING_APPROVAL) {
      throw new BadRequestException("Run is not waiting for approval");
    }

    run.status = PipelineRunStatus.FAILED;
    run.finishedAt = new Date();
    run.durationMs = run.startedAt
      ? run.finishedAt.getTime() - run.startedAt.getTime()
      : null;

    const savedRun = await this.runRepository.save(run);

    this.eventsGateway?.emitPipelineRunUpdated({
      id: savedRun.id,
      pipelineId: savedRun.pipelineId,
      status: savedRun.status,
      triggeredBy: savedRun.triggeredBy,
      startedAt: savedRun.startedAt,
      finishedAt: savedRun.finishedAt,
      durationMs: savedRun.durationMs,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Run ${runId} rejected by ${userId}`);
    return savedRun;
  }

  /**
   * Cancels a run that is QUEUED, RUNNING, or WAITING_APPROVAL.
   * Attempts to remove the BullMQ job if it is still queued; errors are
   * silently ignored since the job may already be processing.
   *
   * @param pipelineId - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param userId - UUID of the user requesting cancellation
   * @returns The updated PipelineRun
   * @throws NotFoundException if the run does not belong to the pipeline
   * @throws BadRequestException if the run is in a terminal status
   */
  async cancelRun(
    pipelineId: string,
    runId: string,
    userId: string,
  ): Promise<PipelineRun> {
    const run = await this.findRun(pipelineId, runId);

    const cancellableStatuses: PipelineRunStatus[] = [
      PipelineRunStatus.QUEUED,
      PipelineRunStatus.RUNNING,
      PipelineRunStatus.WAITING_APPROVAL,
    ];

    if (!cancellableStatuses.includes(run.status)) {
      throw new BadRequestException("Run cannot be cancelled");
    }

    run.status = PipelineRunStatus.CANCELLED;
    run.finishedAt = new Date();
    run.durationMs = run.startedAt
      ? run.finishedAt.getTime() - run.startedAt.getTime()
      : null;

    const savedRun = await this.runRepository.save(run);

    this.eventsGateway?.emitPipelineRunUpdated({
      id: savedRun.id,
      pipelineId: savedRun.pipelineId,
      status: savedRun.status,
      triggeredBy: savedRun.triggeredBy,
      startedAt: savedRun.startedAt,
      finishedAt: savedRun.finishedAt,
      durationMs: savedRun.durationMs,
      timestamp: new Date().toISOString(),
    });

    // Best-effort removal of the BullMQ job if it has not started yet.
    try {
      const job = await this.executionQueue?.getJob(runId);
      await job?.remove();
    } catch {
      // Ignore — the job may already be active or completed.
    }

    this.logger.log(`Run ${runId} cancelled by ${userId}`);
    return savedRun;
  }
}
