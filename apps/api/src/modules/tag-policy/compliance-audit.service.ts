import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Cron } from "@nestjs/schedule";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { TagPolicyService } from "./tag-policy.service";

/**
 * Job data payload for a compliance audit job.
 */
export interface ComplianceAuditJobData {
  orgId: string;
}

/**
 * Service that schedules and triggers compliance audit jobs for organizations.
 *
 * Audits are enqueued onto the COMPLIANCE_AUDIT BullMQ queue and executed by
 * ComplianceAuditProcessor. A cron job ensures that every org that has at
 * least one tag policy is audited every six hours.
 *
 * The queue is injected as optional so the service can start in test
 * environments where BullMQ is not configured.
 */
@Injectable()
export class ComplianceAuditService {
  private readonly logger = new Logger(ComplianceAuditService.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.COMPLIANCE_AUDIT)
    private readonly auditQueue: Queue<ComplianceAuditJobData> | undefined,
    private readonly tagPolicyService: TagPolicyService,
  ) {}

  /**
   * Enqueues a standard-priority compliance audit job for the given org.
   * @param orgId - Organization UUID
   */
  async scheduleAudit(orgId: string): Promise<void> {
    await this.auditQueue?.add(
      "compliance-audit",
      { orgId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
    this.logger.log(`Scheduled compliance audit for org ${orgId}`);
  }

  /**
   * Enqueues a high-priority compliance audit job for the given org.
   * Useful for on-demand audits triggered by policy changes or user request.
   * @param orgId - Organization UUID
   */
  async triggerAudit(orgId: string): Promise<void> {
    await this.auditQueue?.add(
      "compliance-audit",
      { orgId },
      {
        priority: 1,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );
    this.logger.log(
      `Triggered high-priority compliance audit for org ${orgId}`,
    );
  }

  /**
   * Cron-driven scheduled audit runner.
   * Executes every six hours and enqueues an audit job for every organization
   * that has at least one tag policy defined.
   */
  @Cron("0 */6 * * *")
  async runScheduledAudits(): Promise<void> {
    this.logger.log("Running scheduled compliance audits");
    const orgIds = await this.tagPolicyService.findAllOrgIds();
    for (const orgId of orgIds) {
      await this.scheduleAudit(orgId);
    }
    this.logger.log(
      `Scheduled compliance audits for ${orgIds.length} organization(s)`,
    );
  }
}
