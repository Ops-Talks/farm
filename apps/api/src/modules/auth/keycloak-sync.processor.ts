import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import {
  KeycloakSyncService,
  KeycloakSyncJobData,
  KeycloakSyncResult,
} from "./keycloak-sync.service";

/**
 * BullMQ processor that executes Keycloak group synchronization jobs.
 *
 * Each job carries an orgId and delegates to KeycloakSyncService.syncOrgGroups.
 * Jobs are enqueued either manually via the API endpoint or automatically by
 * the hourly cron inside KeycloakSyncService.scheduleAllOrgs.
 */
@Processor(QUEUE_NAMES.KEYCLOAK_SYNC)
export class KeycloakSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(KeycloakSyncProcessor.name);

  constructor(private readonly keycloakSyncService: KeycloakSyncService) {
    super();
  }

  /**
   * Processes a single keycloak-sync job.
   * @param job - BullMQ job carrying the orgId to synchronize
   * @returns Sync result with the number of groups synced and errors encountered
   */
  async process(job: Job<KeycloakSyncJobData>): Promise<KeycloakSyncResult> {
    const { orgId } = job.data;
    this.logger.log(`Processing Keycloak sync job for org ${orgId}`);

    const result = await this.keycloakSyncService.syncOrgGroups(orgId);

    this.logger.log(
      `Keycloak sync job complete for org ${orgId}: ` +
        `synced=${result.synced} errors=${result.errors}`,
    );

    return result;
  }
}
