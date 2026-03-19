import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not, FindOptionsWhere } from "typeorm";
import { TagPolicy } from "./entities/tag-policy.entity";
import { ResourceViolation } from "./entities/resource-violation.entity";
import { CreateTagPolicyDto } from "./dto/create-tag-policy.dto";
import { UpdateTagPolicyDto } from "./dto/update-tag-policy.dto";
import { ListViolationsDto } from "./dto/list-violations.dto";
import { ComplianceSummaryDto } from "./dto/compliance-summary.dto";

/**
 * Data shape accepted by upsertViolation.
 * When missingKeys is empty the resource is compliant and resolvedAt is set.
 */
export interface UpsertViolationData {
  orgId: string;
  resourceId: string;
  resourceType: string;
  provider: string;
  missingKeys: string[];
  linkedComponentId?: string;
}

/**
 * Service responsible for managing tag governance policies and resource
 * compliance violations.
 */
@Injectable()
export class TagPolicyService {
  private readonly logger = new Logger(TagPolicyService.name);

  constructor(
    @InjectRepository(TagPolicy)
    private readonly policyRepository: Repository<TagPolicy>,
    @InjectRepository(ResourceViolation)
    private readonly violationRepository: Repository<ResourceViolation>,
  ) {}

  // ---------------------------------------------------------------------------
  // Policy CRUD
  // ---------------------------------------------------------------------------

  /**
   * Creates a new tag governance policy.
   * @param dto - Policy creation payload
   * @returns The persisted tag policy
   */
  async create(dto: CreateTagPolicyDto): Promise<TagPolicy> {
    const policy = this.policyRepository.create({
      ...dto,
      severity: dto.severity ?? "warning",
    });
    const saved = await this.policyRepository.save(policy);
    this.logger.log(
      `Created tag policy ${saved.id} for org ${saved.orgId} / type ${saved.resourceType}`,
    );
    return saved;
  }

  /**
   * Returns all tag policies belonging to an organization.
   * @param orgId - Organization UUID
   * @returns Array of tag policies
   */
  async findAll(orgId: string): Promise<TagPolicy[]> {
    return this.policyRepository.find({ where: { orgId } });
  }

  /**
   * Returns a single tag policy by its UUID.
   * @param id - Policy UUID
   * @throws NotFoundException when no policy is found
   */
  async findOne(id: string): Promise<TagPolicy> {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Tag policy ${id} not found`);
    }
    return policy;
  }

  /**
   * Partially updates an existing tag policy.
   * @param id - Policy UUID
   * @param dto - Fields to update
   * @returns The updated tag policy
   */
  async update(id: string, dto: UpdateTagPolicyDto): Promise<TagPolicy> {
    const policy = await this.findOne(id);
    Object.assign(policy, dto);
    const saved = await this.policyRepository.save(policy);
    this.logger.log(`Updated tag policy ${saved.id}`);
    return saved;
  }

  /**
   * Removes a tag policy.
   * @param id - Policy UUID
   * @throws NotFoundException when no policy is found
   */
  async remove(id: string): Promise<void> {
    const policy = await this.findOne(id);
    await this.policyRepository.remove(policy);
    this.logger.log(`Removed tag policy ${id}`);
  }

  // ---------------------------------------------------------------------------
  // Violations
  // ---------------------------------------------------------------------------

  /**
   * Returns a paginated list of resource violations with optional filters.
   * Passing resolved=false filters for active violations (resolvedAt IS NULL).
   * Passing resolved=true filters for resolved violations (resolvedAt IS NOT NULL).
   *
   * @param dto - Query parameters
   * @returns Tuple of [violations, total count]
   */
  async findViolations(
    dto: ListViolationsDto,
  ): Promise<[ResourceViolation[], number]> {
    const where: FindOptionsWhere<ResourceViolation> = { orgId: dto.orgId };

    if (dto.provider !== undefined) {
      where.provider = dto.provider;
    }
    if (dto.resourceType !== undefined) {
      where.resourceType = dto.resourceType;
    }
    if (dto.resolved === false) {
      where.resolvedAt = IsNull();
    } else if (dto.resolved === true) {
      where.resolvedAt = Not(IsNull());
    }

    return this.violationRepository.findAndCount({
      where,
      skip: dto.skip ?? 0,
      take: dto.take ?? 20,
      order: { detectedAt: "DESC" },
    });
  }

  /**
   * Returns a single resource violation by its UUID.
   * @param id - Violation UUID
   * @throws NotFoundException when no violation is found
   */
  async findViolation(id: string): Promise<ResourceViolation> {
    const violation = await this.violationRepository.findOne({ where: { id } });
    if (!violation) {
      throw new NotFoundException(`Resource violation ${id} not found`);
    }
    return violation;
  }

  /**
   * Marks a violation as resolved by setting resolvedAt to the current time.
   * @param id - Violation UUID
   * @returns The updated violation
   */
  async resolveViolation(id: string): Promise<ResourceViolation> {
    const violation = await this.findViolation(id);
    violation.resolvedAt = new Date();
    const saved = await this.violationRepository.save(violation);
    this.logger.log(`Resolved violation ${id}`);
    return saved;
  }

  /**
   * Inserts or updates a violation record for a resource.
   *
   * When missingKeys is non-empty a violation is upserted (detectedAt is
   * preserved from an existing record, or set to now for a new one).
   * When missingKeys is empty the resource is compliant and resolvedAt is
   * set to the current time on an existing violation; no new record is created.
   *
   * @param data - Violation data to upsert
   */
  async upsertViolation(data: UpsertViolationData): Promise<void> {
    const existing = await this.violationRepository.findOne({
      where: {
        orgId: data.orgId,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
      },
    });

    if (data.missingKeys.length === 0) {
      // Resource is compliant — resolve any existing open violation.
      if (existing && !existing.resolvedAt) {
        existing.resolvedAt = new Date();
        await this.violationRepository.save(existing);
        this.logger.debug(
          `Resolved violation for resource ${data.resourceId} (org ${data.orgId})`,
        );
      }
      return;
    }

    if (existing) {
      existing.missingKeys = data.missingKeys;
      existing.provider = data.provider;
      existing.resolvedAt = undefined;
      if (data.linkedComponentId !== undefined) {
        existing.linkedComponentId = data.linkedComponentId;
      }
      await this.violationRepository.save(existing);
    } else {
      const violation = this.violationRepository.create({
        orgId: data.orgId,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
        provider: data.provider,
        missingKeys: data.missingKeys,
        linkedComponentId: data.linkedComponentId,
        detectedAt: new Date(),
      });
      await this.violationRepository.save(violation);
      this.logger.debug(
        `Created violation for resource ${data.resourceId} (org ${data.orgId}): missing [${data.missingKeys.join(", ")}]`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Compliance summary
  // ---------------------------------------------------------------------------

  /**
   * Aggregates compliance statistics for an organization.
   *
   * "Total resources" is derived from distinct (resourceId, provider,
   * resourceType) combinations found across all violation records for the org.
   * Violations are counted as those with resolvedAt IS NULL.
   *
   * @param orgId - Organization UUID
   * @returns ComplianceSummaryDto
   */
  async getComplianceSummary(orgId: string): Promise<ComplianceSummaryDto> {
    const allViolations = await this.violationRepository.find({
      where: { orgId },
    });

    // Build a unique resource map keyed by resourceId.
    const resourceMap = new Map<
      string,
      { provider: string; resourceType: string; hasViolation: boolean }
    >();

    for (const v of allViolations) {
      const existing = resourceMap.get(v.resourceId);
      const hasViolation = !v.resolvedAt;
      if (!existing) {
        resourceMap.set(v.resourceId, {
          provider: v.provider,
          resourceType: v.resourceType,
          hasViolation,
        });
      } else if (hasViolation) {
        // Mark as violated if any violation record is open.
        existing.hasViolation = true;
      }
    }

    const resources = Array.from(resourceMap.values());
    const totalResources = resources.length;
    const totalViolations = resources.filter((r) => r.hasViolation).length;
    const complianceRate =
      totalResources === 0
        ? 100
        : Math.round(
            ((totalResources - totalViolations) / totalResources) * 10000,
          ) / 100;

    // Build byProvider aggregation.
    const byProvider: ComplianceSummaryDto["byProvider"] = {};
    for (const r of resources) {
      if (!byProvider[r.provider]) {
        byProvider[r.provider] = { total: 0, violations: 0 };
      }
      byProvider[r.provider].total += 1;
      if (r.hasViolation) {
        byProvider[r.provider].violations += 1;
      }
    }

    // Build byResourceType aggregation.
    const byResourceType: ComplianceSummaryDto["byResourceType"] = {};
    for (const r of resources) {
      if (!byResourceType[r.resourceType]) {
        byResourceType[r.resourceType] = { total: 0, violations: 0 };
      }
      byResourceType[r.resourceType].total += 1;
      if (r.hasViolation) {
        byResourceType[r.resourceType].violations += 1;
      }
    }

    return {
      totalResources,
      totalViolations,
      complianceRate,
      byProvider,
      byResourceType,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers used by the audit processor
  // ---------------------------------------------------------------------------

  /**
   * Returns all distinct orgIds that have at least one tag policy defined.
   * Used by the scheduled audit runner to discover which organizations to audit.
   */
  async findAllOrgIds(): Promise<string[]> {
    const rows = await this.policyRepository
      .createQueryBuilder("p")
      .select("DISTINCT p.orgId", "orgId")
      .getRawMany<{ orgId: string }>();
    return rows.map((r) => r.orgId);
  }
}
