import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Component,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";
import {
  Deployment,
  DeploymentStatus,
} from "../environments/entities/deployment.entity";
import { AuditLog } from "../audit-log/entities/audit-log.entity";
import {
  CatalogAnalyticsDto,
  KindCountDto,
  LifecycleCountDto,
  OwnershipCoverageDto,
  UnownedComponentDto,
} from "./dto/catalog-analytics.dto";
import {
  ChangeFailureRateDto,
  DeploymentFrequencyDto,
  DoraAnalyticsDto,
  LeadTimeForChangesDto,
  MeanTimeToRecoveryDto,
} from "./dto/dora-analytics.dto";
import {
  ActionBreakdownDto,
  ActiveUserDto,
  TopComponentDto,
  UsageAnalyticsDto,
} from "./dto/usage-analytics.dto";

/**
 * Service that computes analytics reports for catalog health, DORA metrics,
 * and platform usage.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Returns catalog health analytics including ownership coverage, lifecycle
   * distribution, kind distribution, and a list of unowned components.
   */
  async getCatalogAnalytics(): Promise<CatalogAnalyticsDto> {
    this.logger.log("Computing catalog analytics");

    // Ownership coverage
    const total = await this.componentRepository.count();

    const withOwner = await this.componentRepository
      .createQueryBuilder("c")
      .where("c.owner IS NOT NULL")
      .andWhere("c.owner != ''")
      .getCount();

    const withoutOwner = total - withOwner;
    const coveragePercent =
      total === 0 ? 0 : Math.round((withOwner / total) * 1000) / 10;

    const ownershipCoverage: OwnershipCoverageDto = {
      total,
      withOwner,
      withoutOwner,
      coveragePercent,
    };

    // Lifecycle distribution — include all lifecycle values even those with 0
    const lifecycleRows: { lifecycle: string; count: string }[] =
      await this.componentRepository
        .createQueryBuilder("c")
        .select("c.lifecycle", "lifecycle")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.lifecycle")
        .getRawMany();

    const lifecycleCountMap = new Map<string, number>(
      lifecycleRows.map((r) => [r.lifecycle, parseInt(r.count, 10)]),
    );

    const lifecycleDistribution: LifecycleCountDto[] = Object.values(
      ComponentLifecycle,
    ).map((lc) => ({
      lifecycle: lc,
      count: lifecycleCountMap.get(lc) ?? 0,
    }));

    // Kind distribution — only kinds with at least 1 component
    const kindRows: { kind: string; count: string }[] =
      await this.componentRepository
        .createQueryBuilder("c")
        .select("c.kind", "kind")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.kind")
        .having("COUNT(*) > 0")
        .getRawMany();

    const kindDistribution: KindCountDto[] = kindRows.map((r) => ({
      kind: r.kind,
      count: parseInt(r.count, 10),
    }));

    // Unowned components (limit 50)
    const unownedRaw = await this.componentRepository
      .createQueryBuilder("c")
      .select(["c.id", "c.name", "c.kind"])
      .where("c.owner IS NULL OR c.owner = ''")
      .limit(50)
      .getMany();

    const unownedComponents: UnownedComponentDto[] = unownedRaw.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
    }));

    return {
      ownershipCoverage,
      lifecycleDistribution,
      kindDistribution,
      unownedComponents,
    };
  }

  /**
   * Returns DORA metrics (deployment frequency, change failure rate,
   * mean time to recovery, lead time for changes) for a given period.
   *
   * @param days - Number of days to look back from now
   * @param componentId - Optional UUID to filter by component
   * @param environmentId - Optional UUID to filter by environment
   */
  async getDoraMetrics(
    days: number,
    componentId?: string,
    environmentId?: string,
  ): Promise<DoraAnalyticsDto> {
    this.logger.log(
      `Computing DORA metrics for last ${days} days` +
        (componentId ? `, componentId=${componentId}` : "") +
        (environmentId ? `, environmentId=${environmentId}` : ""),
    );

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Base query builder factory
    const base = () => {
      const qb = this.deploymentRepository
        .createQueryBuilder("d")
        .where("d.createdAt >= :since", { since });

      if (componentId) {
        qb.andWhere("d.componentId = :componentId", { componentId });
      }
      if (environmentId) {
        qb.andWhere("d.environmentId = :environmentId", { environmentId });
      }
      return qb;
    };

    // --- Deployment frequency ---
    const succeededCount = await base()
      .andWhere("d.status = :status", { status: DeploymentStatus.SUCCEEDED })
      .getCount();

    const deploymentFrequency: DeploymentFrequencyDto = {
      deploymentsPerDay: Math.round((succeededCount / days) * 100) / 100,
      total: succeededCount,
      periodDays: days,
    };

    // --- Change failure rate ---
    const failedCount = await base()
      .andWhere("d.status IN (:...statuses)", {
        statuses: [DeploymentStatus.FAILED, DeploymentStatus.ROLLED_BACK],
      })
      .getCount();

    const cfrTotal = succeededCount + failedCount;
    const cfrRate =
      cfrTotal === 0 ? 0 : Math.round((failedCount / cfrTotal) * 1000) / 10;

    const changeFailureRate: ChangeFailureRateDto = {
      rate: cfrRate,
      failed: failedCount,
      total: cfrTotal,
    };

    // --- Mean time to recovery ---
    // For each FAILED deployment, find the next SUCCEEDED deployment for the
    // same componentId + environmentId by createdAt.
    const failedDeployments = await base()
      .andWhere("d.status = :failStatus", {
        failStatus: DeploymentStatus.FAILED,
      })
      .select(["d.id", "d.componentId", "d.environmentId", "d.createdAt"])
      .orderBy("d.createdAt", "ASC")
      .getMany();

    let mttrTotalMs = 0;
    let mttrSamples = 0;

    for (const failed of failedDeployments) {
      const nextSucceeded = await this.deploymentRepository
        .createQueryBuilder("d")
        .where("d.componentId = :componentId", {
          componentId: failed.componentId,
        })
        .andWhere("d.environmentId = :environmentId", {
          environmentId: failed.environmentId,
        })
        .andWhere("d.status = :status", { status: DeploymentStatus.SUCCEEDED })
        .andWhere("d.createdAt > :failedAt", { failedAt: failed.createdAt })
        .orderBy("d.createdAt", "ASC")
        .getOne();

      if (nextSucceeded) {
        mttrTotalMs +=
          nextSucceeded.createdAt.getTime() - failed.createdAt.getTime();
        mttrSamples += 1;
      }
    }

    const mttrAvgHours =
      mttrSamples === 0
        ? 0
        : Math.round((mttrTotalMs / mttrSamples / 3_600_000) * 10) / 10;

    const meanTimeToRecovery: MeanTimeToRecoveryDto = {
      avgHours: mttrAvgHours,
      samples: mttrSamples,
    };

    // --- Lead time for changes ---
    const leadTimeRows = await base()
      .andWhere("d.status = :ltStatus", {
        ltStatus: DeploymentStatus.SUCCEEDED,
      })
      .andWhere("d.startedAt IS NOT NULL")
      .andWhere("d.finishedAt IS NOT NULL")
      .select(["d.startedAt", "d.finishedAt"])
      .getMany();

    let ltTotalMs = 0;
    let ltSamples = 0;

    for (const dep of leadTimeRows) {
      if (dep.startedAt && dep.finishedAt) {
        ltTotalMs += dep.finishedAt.getTime() - dep.startedAt.getTime();
        ltSamples += 1;
      }
    }

    const ltAvgHours =
      ltSamples === 0
        ? 0
        : Math.round((ltTotalMs / ltSamples / 3_600_000) * 10) / 10;

    const leadTimeForChanges: LeadTimeForChangesDto = {
      avgHours: ltAvgHours,
      samples: ltSamples,
    };

    return {
      periodDays: days,
      deploymentFrequency,
      changeFailureRate,
      meanTimeToRecovery,
      leadTimeForChanges,
    };
  }

  /**
   * Returns platform usage analytics from the audit log including total events,
   * top accessed components, most active users, and action breakdown.
   *
   * @param days - Number of days to look back from now
   */
  async getUsageAnalytics(days: number): Promise<UsageAnalyticsDto> {
    this.logger.log(`Computing usage analytics for last ${days} days`);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total audit events
    const totalAuditEvents = await this.auditLogRepository
      .createQueryBuilder("al")
      .where("al.createdAt >= :since", { since })
      .getCount();

    // Top components (resourceType = 'Component', GROUP BY resourceId)
    const topComponentRows: {
      componentId: string;
      accessCount: string;
    }[] = await this.auditLogRepository
      .createQueryBuilder("al")
      .select("al.resourceId", "componentId")
      .addSelect("COUNT(*)", "accessCount")
      .where("al.createdAt >= :since", { since })
      .andWhere("al.resourceType = :resourceType", {
        resourceType: "Component",
      })
      .groupBy("al.resourceId")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    const componentIds = topComponentRows.map((r) => r.componentId);
    const nameMap = new Map<string, string>();

    if (componentIds.length > 0) {
      const components = await this.componentRepository
        .createQueryBuilder("c")
        .select(["c.id", "c.name"])
        .where("c.id IN (:...ids)", { ids: componentIds })
        .getMany();

      for (const c of components) {
        nameMap.set(c.id, c.name);
      }
    }

    const topComponents: TopComponentDto[] = topComponentRows.map((r) => ({
      componentId: r.componentId,
      componentName: nameMap.get(r.componentId) ?? "",
      accessCount: parseInt(r.accessCount, 10),
    }));

    // Active users
    const activeUserRows: {
      actorId: string;
      actorUsername: string;
      actionCount: string;
    }[] = await this.auditLogRepository
      .createQueryBuilder("al")
      .select("al.actorId", "actorId")
      .addSelect("al.actorUsername", "actorUsername")
      .addSelect("COUNT(*)", "actionCount")
      .where("al.createdAt >= :since", { since })
      .groupBy("al.actorId")
      .addGroupBy("al.actorUsername")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    const activeUsers: ActiveUserDto[] = activeUserRows.map((r) => ({
      actorId: r.actorId,
      actorUsername: r.actorUsername,
      actionCount: parseInt(r.actionCount, 10),
    }));

    // Action breakdown
    const actionBreakdownRows: {
      action: string;
      count: string;
    }[] = await this.auditLogRepository
      .createQueryBuilder("al")
      .select("al.action", "action")
      .addSelect("COUNT(*)", "count")
      .where("al.createdAt >= :since", { since })
      .groupBy("al.action")
      .orderBy("COUNT(*)", "DESC")
      .getRawMany();

    const actionBreakdown: ActionBreakdownDto[] = actionBreakdownRows.map(
      (r) => ({
        action: r.action,
        count: parseInt(r.count, 10),
      }),
    );

    return {
      periodDays: days,
      totalAuditEvents,
      topComponents,
      activeUsers,
      actionBreakdown,
    };
  }
}
