import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CatalogService } from '../catalog.service';

export const CONTAINER_IMAGE_SYNC_QUEUE = 'container-image-sync';

export interface ContainerImageSyncJobData {
  componentId: string;
}

/**
 * BullMQ processor that syncs container image metadata from the configured registry
 * for a single component job.
 */
@Processor(CONTAINER_IMAGE_SYNC_QUEUE)
export class ContainerImageSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ContainerImageSyncProcessor.name);

  constructor(private readonly catalogService: CatalogService) {
    super();
  }

  async process(job: Job<ContainerImageSyncJobData>): Promise<void> {
    const { componentId } = job.data;
    this.logger.log(`Syncing container image for component ${componentId}`);
    try {
      await this.catalogService.syncContainerImage(componentId);
      this.logger.log(`Container image synced for component ${componentId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync container image for ${componentId}: ${msg}`);
      throw error;
    }
  }
}
