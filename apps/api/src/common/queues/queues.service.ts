import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, JobType } from "bullmq";
import { QUEUE_NAMES } from "./queue-names";
import { QueueInfoDto, JobInfoDto } from "./dto/queue-info.dto";

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);
  private readonly queues: Map<string, Queue> = new Map();

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.CATALOG_DISCOVERY)
    catalogQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    notificationsQueue?: Queue,
  ) {
    if (catalogQueue) {
      this.queues.set(QUEUE_NAMES.CATALOG_DISCOVERY, catalogQueue);
    }
    if (notificationsQueue) {
      this.queues.set(QUEUE_NAMES.NOTIFICATIONS, notificationsQueue);
    }
  }

  private getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new NotFoundException(`Queue "${name}" not found`);
    }
    return queue;
  }

  private static readonly JOB_COUNT_TYPES = [
    "active",
    "completed",
    "failed",
    "delayed",
    "waiting",
    "paused",
    "prioritized",
  ] as const;

  private static readonly DEFAULT_JOB_TYPES: JobType[] = [
    "active",
    "completed",
    "failed",
    "delayed",
    "waiting",
  ];

  async listQueues(): Promise<QueueInfoDto[]> {
    const results: QueueInfoDto[] = [];

    for (const [name, queue] of this.queues) {
      try {
        const [counts, isPaused] = await Promise.all([
          queue.getJobCounts(...QueuesService.JOB_COUNT_TYPES),
          queue.isPaused(),
        ]);

        results.push({
          name,
          isPaused,
          jobCounts: {
            active: counts["active"] ?? 0,
            completed: counts["completed"] ?? 0,
            failed: counts["failed"] ?? 0,
            delayed: counts["delayed"] ?? 0,
            waiting: counts["waiting"] ?? 0,
            paused: counts["paused"] ?? 0,
            prioritized: counts["prioritized"] ?? 0,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to fetch stats for queue "${name}": ${error instanceof Error ? error.message : String(error)}`,
        );
        results.push({
          name,
          isPaused: false,
          jobCounts: {
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            waiting: 0,
            paused: 0,
            prioritized: 0,
          },
        });
      }
    }

    return results;
  }

  async getQueueInfo(name: string): Promise<QueueInfoDto> {
    const queue = this.getQueue(name);

    const [counts, isPaused] = await Promise.all([
      queue.getJobCounts(...QueuesService.JOB_COUNT_TYPES),
      queue.isPaused(),
    ]);

    return {
      name,
      isPaused,
      jobCounts: {
        active: counts["active"] ?? 0,
        completed: counts["completed"] ?? 0,
        failed: counts["failed"] ?? 0,
        delayed: counts["delayed"] ?? 0,
        waiting: counts["waiting"] ?? 0,
        paused: counts["paused"] ?? 0,
        prioritized: counts["prioritized"] ?? 0,
      },
    };
  }

  async listJobs(
    queueName: string,
    status?: string,
    start = 0,
    limit = 20,
  ): Promise<JobInfoDto[]> {
    const queue = this.getQueue(queueName);

    const types: JobType[] = status
      ? [status as JobType]
      : QueuesService.DEFAULT_JOB_TYPES;

    const jobs = await queue.getJobs(types, start, start + limit - 1);

    const results: JobInfoDto[] = [];
    for (const job of jobs) {
      const state = await job.getState().catch(() => "unknown");
      results.push({
        id: String(job.id),
        queueName,
        name: job.name,
        status: state,
        data: job.data as Record<string, unknown>,
        returnValue: job.returnvalue as unknown,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        progress: job.progress as number | object,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        stacktrace: job.stacktrace ?? undefined,
      });
    }

    return results;
  }

  async getJob(queueName: string, jobId: string): Promise<JobInfoDto> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Job "${jobId}" not found in queue "${queueName}"`,
      );
    }

    const state = await job.getState().catch(() => "unknown");

    return {
      id: String(job.id),
      queueName,
      name: job.name,
      status: state,
      data: job.data as Record<string, unknown>,
      returnValue: job.returnvalue as unknown,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      progress: job.progress as number | object,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      stacktrace: job.stacktrace ?? undefined,
    };
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Job "${jobId}" not found in queue "${queueName}"`,
      );
    }

    const state = await job.getState();
    if (state !== "failed") {
      throw new NotFoundException(
        `Job "${jobId}" is not in a failed state (current: ${state})`,
      );
    }

    await job.retry(state);
    this.logger.log(`Retried job "${jobId}" in queue "${queueName}"`);
  }
}
