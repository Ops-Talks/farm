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
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import {
  FarmEvent,
  PipelineStageUpdatedPayload,
} from "../../common/events/events.interfaces";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun, PipelineRunStatus } from "./entities/pipeline-run.entity";
import { CreatePipelineDto } from "./dto/create-pipeline.dto";
import { UpdatePipelineDto } from "./dto/update-pipeline.dto";
import { ListRunsQueryDto } from "./dto/list-runs-query.dto";

/**
 * Snapshot of a pipeline run used for side-by-side comparison.
 */
export interface CompareRunSnapshot {
  id: string;
  status: PipelineRunStatus;
  triggeredBy: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
}

/**
 * Describes the diff for a single stage between two pipeline runs.
 */
export interface StageDiffEntry {
  stageId: string;
  statusA: string | null;
  statusB: string | null;
  durationMsA: number | null;
  durationMsB: number | null;
  /** durationMsB - durationMsA; null if either value is unavailable. */
  durationDeltaMs: number | null;
  /** True when statusA and statusB differ. */
  changed: boolean;
}

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
    @Optional()
    @InjectMetric("pipeline_executions_total")
    private readonly pipelineExecutionsTotal?: Counter<string>,
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
   * Retrieves all pipelines, optionally scoped to an organization and/or component.
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @param organizationId - Optional organization UUID filter
   * @param componentId - Optional component UUID filter
   * @returns A tuple of [pipelines, total count]
   */
  async findAll(
    skip = 0,
    take = 20,
    organizationId?: string,
    componentId?: string,
  ): Promise<[Pipeline[], number]> {
    const where: Record<string, unknown> = {};
    if (organizationId) where["organizationId"] = organizationId;
    if (componentId) where["componentId"] = componentId;
    return this.pipelineRepository.findAndCount({
      where,
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
   * Returns a paginated list of runs for a given pipeline, ordered newest first.
   * Optionally filtered by status.
   *
   * @param pipelineId - Pipeline UUID
   * @param query - Pagination and optional status filter
   * @returns A tuple of [runs, total count]
   */
  async findRuns(
    pipelineId: string,
    query: ListRunsQueryDto,
  ): Promise<[PipelineRun[], number]> {
    const { skip = 0, take = 20, status } = query;
    return this.runRepository.findAndCount({
      where: { pipelineId, ...(status && { status }) },
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Returns a paginated list of pipelines bound to the given component.
   *
   * @param componentId - Component UUID
   * @param organizationId - Optional organization UUID to narrow the scope
   * @param skip - Number of records to skip (default 0)
   * @param take - Number of records to return (default 20)
   * @returns A tuple of [pipelines, total count]
   */
  async findByComponent(
    componentId: string,
    organizationId?: string,
    skip = 0,
    take = 20,
  ): Promise<[Pipeline[], number]> {
    const where: Record<string, unknown> = { componentId };
    if (organizationId) where["organizationId"] = organizationId;
    return this.pipelineRepository.findAndCount({
      where,
      order: { name: "ASC" },
      skip,
      take,
    });
  }

  /**
   * Updates the first stage result matching the given externalRunId,
   * setting its status to the mapped pipeline status and persisting.
   * Called when a CI_BUILD_UPDATED event arrives from a webhook.
   *
   * @param externalRunId - The external CI run ID (e.g. GitHub Actions run ID)
   * @param ciStatus - The CI status string (e.g. "completed")
   * @param ciConclusion - The CI conclusion (e.g. "success", "failure")
   * @param externalRunUrl - Link back to the run
   */
  async updateStageFromExternalEvent(
    externalRunId: string,
    ciStatus: string,
    ciConclusion: string | null,
    externalRunUrl: string | null,
  ): Promise<void> {
    // Find all runs with a stageResult matching this externalRunId.
    // stageResults is simple-json, so we must load all running runs and filter in memory.
    const runs = await this.runRepository.find({
      where: { status: PipelineRunStatus.RUNNING },
    });

    for (const run of runs) {
      const stageResults = run.stageResults ?? [];
      const idx = stageResults.findIndex(
        (sr) => sr.externalRunId === externalRunId,
      );
      if (idx === -1) continue;

      const mapped = this.mapCIStatus(ciStatus, ciConclusion);
      // Always overwrite finishedAt when the stage transitions to a terminal
      // status so the timestamp reflects the actual completion time.
      const finishedAt =
        mapped !== "running" ? new Date().toISOString() : null;
      const updated = {
        ...stageResults[idx],
        status: mapped,
        externalRunUrl:
          externalRunUrl ?? stageResults[idx].externalRunUrl ?? null,
        finishedAt,
      };
      run.stageResults = [
        ...stageResults.slice(0, idx),
        updated,
        ...stageResults.slice(idx + 1),
      ];

      if (mapped === "failed") {
        run.status = PipelineRunStatus.FAILED;
        run.finishedAt = new Date();
        run.durationMs = run.startedAt
          ? run.finishedAt.getTime() - run.startedAt.getTime()
          : null;
      } else if (mapped === "succeeded") {
        // Check if all stages are done.
        const allDone = run.stageResults.every(
          (sr) => sr.status === "succeeded" || sr.status === "approved",
        );
        if (allDone) {
          run.status = PipelineRunStatus.SUCCEEDED;
          run.finishedAt = new Date();
          run.durationMs = run.startedAt
            ? run.finishedAt.getTime() - run.startedAt.getTime()
            : null;
        }
      }

      await this.runRepository.save(run);

      // Emit per-stage update so clients can react without polling.
      const stagePayload: PipelineStageUpdatedPayload = {
        runId: run.id,
        pipelineId: run.pipelineId,
        stageId: updated.stageId,
        status: updated.status,
        externalRunId: updated.externalRunId ?? null,
        externalRunUrl: updated.externalRunUrl ?? null,
        startedAt: updated.startedAt,
        finishedAt: updated.finishedAt,
        timestamp: new Date().toISOString(),
      };
      this.eventsGateway?.server?.emit(
        FarmEvent.PIPELINE_STAGE_UPDATED,
        stagePayload,
      );

      this.eventsGateway?.emitPipelineRunUpdated({
        id: run.id,
        pipelineId: run.pipelineId,
        status: run.status,
        triggeredBy: run.triggeredBy,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Updated stage ${stageResults[idx].stageId} in run ${run.id} via external event (externalRunId=${externalRunId})`,
      );
      break;
    }
  }

  /**
   * Maps a CI provider status/conclusion pair to an internal pipeline stage status.
   *
   * @param status - Provider-level status (e.g. "completed", "in_progress")
   * @param conclusion - Provider-level conclusion (e.g. "success", "failure")
   * @returns Internal status string
   */
  private mapCIStatus(status: string, conclusion: string | null): string {
    if (status === "completed") {
      if (conclusion === "success") return "succeeded";
      if (conclusion === "failure" || conclusion === "timed_out")
        return "failed";
      // cancelled, skipped, neutral, etc.
      return "failed";
    }
    if (status === "in_progress") return "running";
    return "running";
  }

  /**
   * Returns run statistics for a specific pipeline.
   *
   * @param pipelineId - Pipeline UUID
   * @returns Stats object containing totals, per-status counts, success rate,
   *   average duration of succeeded runs, and the timestamp of the most recent run
   */
  async getRunStats(pipelineId: string): Promise<{
    total: number;
    byStatus: Record<PipelineRunStatus, number>;
    successRate: number;
    avgDurationMs: number | null;
    lastRunAt: Date | null;
  }> {
    const runs = await this.runRepository.find({
      where: { pipelineId },
      select: ["status", "durationMs", "createdAt"],
      order: { createdAt: "DESC" },
    });

    const total = runs.length;

    const byStatus = Object.values(PipelineRunStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<PipelineRunStatus, number>,
    );

    for (const run of runs) {
      byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    }

    const succeededCount = byStatus[PipelineRunStatus.SUCCEEDED];
    const successRate =
      total === 0 ? 0 : Math.round((succeededCount / total) * 1000) / 10;

    const succeededDurations = runs
      .filter(
        (r) =>
          r.status === PipelineRunStatus.SUCCEEDED && r.durationMs !== null,
      )
      .map((r) => r.durationMs as number);

    const avgDurationMs =
      succeededDurations.length === 0
        ? null
        : succeededDurations.reduce((sum, d) => sum + d, 0) /
          succeededDurations.length;

    const lastRunAt = total === 0 ? null : runs[0].createdAt;

    return { total, byStatus, successRate, avgDurationMs, lastRunAt };
  }

  /**
   * Compares two pipeline runs side-by-side, producing per-stage diff entries.
   *
   * @param pipelineId - Pipeline UUID
   * @param runIdA - UUID of the first run (baseline)
   * @param runIdB - UUID of the second run (comparison target)
   * @returns Snapshots of both runs and a list of per-stage diff entries
   * @throws NotFoundException if either run does not belong to the pipeline
   */
  async compareRuns(
    pipelineId: string,
    runIdA: string,
    runIdB: string,
  ): Promise<{
    runA: CompareRunSnapshot;
    runB: CompareRunSnapshot;
    stageDiff: StageDiffEntry[];
  }> {
    const [runA, runB] = await Promise.all([
      this.findRun(pipelineId, runIdA),
      this.findRun(pipelineId, runIdB),
    ]);

    const toSnapshot = (run: PipelineRun): CompareRunSnapshot => ({
      id: run.id,
      status: run.status,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
    });

    const stagesA = runA.stageResults ?? [];
    const stagesB = runB.stageResults ?? [];

    const stageMapA = new Map(stagesA.map((s) => [s.stageId, s]));
    const stageMapB = new Map(stagesB.map((s) => [s.stageId, s]));

    const allStageIds = Array.from(
      new Set([...stageMapA.keys(), ...stageMapB.keys()]),
    );

    const computeStageDuration = (
      stage: import("./entities/pipeline-run.entity").StageResult | undefined,
    ): number | null => {
      if (!stage?.startedAt || !stage.finishedAt) return null;
      const start = new Date(stage.startedAt).getTime();
      const end = new Date(stage.finishedAt).getTime();
      if (isNaN(start) || isNaN(end)) return null;
      return end - start;
    };

    const stageDiff: StageDiffEntry[] = allStageIds.map((stageId) => {
      const a = stageMapA.get(stageId);
      const b = stageMapB.get(stageId);
      const statusA = a?.status ?? null;
      const statusB = b?.status ?? null;
      const durationMsA = computeStageDuration(a);
      const durationMsB = computeStageDuration(b);
      const durationDeltaMs =
        durationMsA !== null && durationMsB !== null
          ? durationMsB - durationMsA
          : null;

      return {
        stageId,
        statusA,
        statusB,
        durationMsA,
        durationMsB,
        durationDeltaMs,
        changed: statusA !== statusB,
      };
    });

    return {
      runA: toSnapshot(runA),
      runB: toSnapshot(runB),
      stageDiff,
    };
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
    this.pipelineExecutionsTotal?.inc({
      status: "failure",
      pipeline_id: pipelineId,
    });
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
    this.pipelineExecutionsTotal?.inc({
      status: "cancelled",
      pipeline_id: pipelineId,
    });
    return savedRun;
  }
}
