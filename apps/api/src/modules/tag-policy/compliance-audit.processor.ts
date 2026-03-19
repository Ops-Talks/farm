import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";
import { CloudResourceService } from "../cloud/cloud-resource.service";
import { TagPolicyService } from "./tag-policy.service";
import { ComplianceAuditJobData } from "./compliance-audit.service";
import { TagPolicy } from "./entities/tag-policy.entity";

/**
 * Summary returned from a completed compliance audit job.
 */
export interface AuditJobResult {
  orgId: string;
  total: number;
  violations: number;
  resolvedAt: Date;
}

/**
 * BullMQ processor that executes compliance audit jobs.
 *
 * For each job it:
 * 1. Loads all TagPolicies for the organization.
 * 2. Discovers cloud resources via CloudResourceService (optional).
 * 3. Checks each resource's tags against matching policies.
 * 4. Upserts violations for non-compliant resources.
 * 5. Resolves violations for resources that are now compliant.
 * 6. Emits a WebSocket event when the audit completes.
 */
@Processor(QUEUE_NAMES.COMPLIANCE_AUDIT)
export class ComplianceAuditProcessor extends WorkerHost {
  private readonly logger = new Logger(ComplianceAuditProcessor.name);

  constructor(
    private readonly tagPolicyService: TagPolicyService,
    @Optional() private readonly cloudResourceService?: CloudResourceService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {
    super();
  }

  /**
   * Processes a single compliance audit job.
   * @param job - BullMQ job carrying an orgId
   * @returns Audit summary with total resources scanned and violation count
   */
  async process(job: Job<ComplianceAuditJobData>): Promise<AuditJobResult> {
    const { orgId } = job.data;
    this.logger.log(`Starting compliance audit for org ${orgId}`);

    // Step 1 — load policies.
    const policies = await this.tagPolicyService.findAll(orgId);
    if (policies.length === 0) {
      this.logger.warn(`No tag policies for org ${orgId} — skipping audit`);
      return { orgId, total: 0, violations: 0, resolvedAt: new Date() };
    }

    // Step 2 — discover resources (graceful when CloudModule is not imported).
    const resources = this.cloudResourceService
      ? await this.cloudResourceService.discoverAll(orgId)
      : [];

    let violationCount = 0;

    // Step 3-5 — evaluate each resource against applicable policies.
    for (const resource of resources) {
      const applicablePolicies = this.matchPolicies(
        resource.resourceType,
        policies,
      );
      if (applicablePolicies.length === 0) {
        continue;
      }

      // Collect all required keys from applicable policies.
      const requiredKeys = Array.from(
        new Set(applicablePolicies.flatMap((p) => p.requiredKeys)),
      );

      const presentKeys = Object.keys(resource.tags ?? {});
      const missingKeys = requiredKeys.filter((k) => !presentKeys.includes(k));

      await this.tagPolicyService.upsertViolation({
        orgId,
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        provider: resource.provider,
        missingKeys,
        linkedComponentId: resource.linkedComponentId,
      });

      if (missingKeys.length > 0) {
        violationCount += 1;
      }
    }

    const result: AuditJobResult = {
      orgId,
      total: resources.length,
      violations: violationCount,
      resolvedAt: new Date(),
    };

    // Step 6 — emit WebSocket notification.
    this.eventsGateway?.server?.emit(
      FarmEvent.COMPLIANCE_AUDIT_COMPLETED,
      result,
    );

    this.logger.log(
      `Compliance audit completed for org ${orgId}: ` +
        `${resources.length} resource(s) scanned, ${violationCount} violation(s) found`,
    );

    return result;
  }

  /**
   * Returns the subset of policies that apply to the given resource type.
   * A policy matches when its resourceType equals the target type or is "*".
   *
   * @param resourceType - The resource type to match
   * @param policies - All policies for the organization
   */
  private matchPolicies(
    resourceType: string,
    policies: TagPolicy[],
  ): TagPolicy[] {
    return policies.filter(
      (p) => p.resourceType === resourceType || p.resourceType === "*",
    );
  }
}
