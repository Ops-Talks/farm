import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
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
    @InjectQueue(QUEUE_NAMES.PIPELINE_EXECUTION)
    private readonly executionQueue: Queue,
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

    await this.executionQueue.add(QUEUE_NAMES.PIPELINE_EXECUTION, {
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
}
