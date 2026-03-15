import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CatalogService } from "../catalog.service";

export const CATALOG_DISCOVERY_QUEUE = "catalog-discovery";

export interface CatalogDiscoveryJobData {
  url: string;
}

@Processor(CATALOG_DISCOVERY_QUEUE)
export class CatalogDiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(CatalogDiscoveryProcessor.name);

  constructor(private readonly catalogService: CatalogService) {
    super();
  }

  async process(job: Job<CatalogDiscoveryJobData>): Promise<number> {
    const { url } = job.data;
    this.logger.log(`Processing discovery job ${job.id} for ${url}`);

    try {
      const discovered = await this.catalogService.discoverFromLocation(url);
      this.logger.log(
        `Job ${job.id} completed: discovered ${discovered} components from ${url}`,
      );
      return discovered;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${job.id} failed for ${url}: ${message}`);
      throw error;
    }
  }
}
