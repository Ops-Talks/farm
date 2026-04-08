import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CatalogService } from '../catalog.service';
import {
  CONTAINER_IMAGE_SYNC_QUEUE,
  ContainerImageSyncJobData,
} from './container-image-sync.processor';

/**
 * Scheduler that periodically enqueues container image sync jobs
 * for all components that have a containerImage configured.
 */
@Injectable()
export class ContainerImageSyncScheduler {
  private readonly logger = new Logger(ContainerImageSyncScheduler.name);

  constructor(
    private readonly catalogService: CatalogService,
    @InjectQueue(CONTAINER_IMAGE_SYNC_QUEUE)
    private readonly syncQueue: Queue<ContainerImageSyncJobData>,
  ) {}

  @Cron('0 */15 * * * *')
  async scheduleContainerImageSync(): Promise<void> {
    const components = await this.catalogService.findAllWithContainerImage();
    if (components.length === 0) return;

    this.logger.log(
      `Scheduling container image sync for ${components.length} components`,
    );
    await Promise.all(
      components.map((c) =>
        this.syncQueue.add(
          'sync',
          { componentId: c.id },
          { removeOnComplete: 100, removeOnFail: 50 },
        ),
      ),
    );
  }
}
