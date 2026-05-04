import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  ScorecardResult,
  ScorecardLevel,
} from "./entities/scorecard-result.entity";
import { ScorecardEvaluatorService } from "./scorecard-evaluator.service";
import { Team } from "../teams/entities/team.entity";

/**
 * Extends ScorecardResult with component metadata fields populated by the
 * findAll QueryBuilder JOIN. These extra columns are not stored on the entity
 * itself — they are mapped from the joined Component row.
 */
export type ScorecardResultWithComponent = ScorecardResult & {
  componentName: string;
  componentKind: string;
  componentLifecycle: string;
  teamId?: string;
};

/**
 * Aggregated overview data returned by the getOverview method.
 */
export interface ScorecardOverviewData {
  totalComponents: number;
  averageScore: number;
  levelDistribution: Record<ScorecardLevel, number>;
  byTeam: Array<{
    teamId: string;
    teamName: string;
    averageScore: number;
    componentCount: number;
  }>;
}

/**
 * Core CRUD service for ScorecardResult records.
 *
 * Provides evaluate-and-save, lookup by component, and filtered listing
 * of scorecard results.
 */
@Injectable()
export class ScorecardsService {
  protected readonly logger = new Logger(ScorecardsService.name);

  constructor(
    @InjectRepository(ScorecardResult)
    protected readonly scorecardResultRepository: Repository<ScorecardResult>,

    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,

    private readonly evaluatorService: ScorecardEvaluatorService,
  ) {}

  /**
   * Runs the full evaluation for the given component and upserts the result.
   * Uses a database-level upsert (INSERT … ON CONFLICT DO UPDATE) so that
   * concurrent calls — e.g. a manual refresh racing with the hourly cron —
   * cannot produce duplicate rows.
   *
   * @param componentId - UUID of the component to evaluate.
   * @param organizationId - Optional organization UUID for scoping.
   * @returns The persisted ScorecardResult after save.
   */
  async evaluateAndSave(
    componentId: string,
    organizationId?: string,
  ): Promise<ScorecardResult> {
    const evaluated = await this.evaluatorService.evaluate(
      componentId,
      organizationId,
    );

    await this.scorecardResultRepository.upsert(
      { ...evaluated, componentId },
      { conflictPaths: ["componentId"], skipUpdateIfNoValuesChanged: false },
    );

    const saved = await this.scorecardResultRepository.findOne({
      where: { componentId },
    });

    if (!saved) {
      throw new Error(
        `Scorecard upsert for component ${componentId} succeeded but the persisted row could not be retrieved.`,
      );
    }

    return saved;
  }

  /**
   * Returns the most recent scorecard result for a component, or null when
   * no result has been recorded yet.
   *
   * When `organizationId` is supplied the result is only returned when the
   * scorecard belongs to that organization, preventing cross-tenant leakage.
   *
   * @param componentId - UUID of the component to look up.
   * @param organizationId - Optional organization UUID for scoping.
   */
  async findByComponent(
    componentId: string,
    organizationId?: string,
  ): Promise<ScorecardResult | null> {
    return this.scorecardResultRepository.findOne({
      where: {
        componentId,
        ...(organizationId !== undefined ? { organizationId } : {}),
      },
    });
  }

  /**
   * Returns all scorecard results matching the supplied filters, enriched with
   * component metadata via a LEFT JOIN on the catalog component table.
   *
   * Results are ordered by overallScore descending.
   *
   * @param filters.organizationId - Restrict results to a specific organization.
   * @param filters.level - Restrict results to components at a specific level.
   * @param filters.kind - Restrict results to components of a specific kind.
   * @param filters.teamId - Restrict results to components owned by a specific team.
   */
  async findAll(filters: {
    organizationId?: string;
    level?: ScorecardLevel;
    kind?: string;
    teamId?: string;
  }): Promise<ScorecardResultWithComponent[]> {
    const qb = this.scorecardResultRepository
      .createQueryBuilder("sr")
      .leftJoinAndSelect("sr.component", "c");

    if (filters.organizationId !== undefined) {
      qb.andWhere("sr.organizationId = :organizationId", {
        organizationId: filters.organizationId,
      });
    }

    if (filters.level !== undefined) {
      qb.andWhere("sr.level = :level", { level: filters.level });
    }

    if (filters.kind !== undefined) {
      qb.andWhere("c.kind = :kind", { kind: filters.kind });
    }

    if (filters.teamId !== undefined) {
      qb.andWhere("c.teamId = :teamId", { teamId: filters.teamId });
    }

    qb.orderBy("sr.overallScore", "DESC");

    const rows = await qb.getMany();

    return rows.map((row) => {
      const enriched = row as ScorecardResultWithComponent;
      if (row.component) {
        enriched.componentName = row.component.name;
        enriched.componentKind = row.component.kind;
        enriched.componentLifecycle = row.component.lifecycle;
        enriched.teamId = row.component.teamId ?? undefined;
      }
      return enriched;
    });
  }

  /**
   * Returns an aggregated overview of scorecard health across all components
   * that match the optional organization filter.
   *
   * @param organizationId - Optional organization UUID for scoping.
   */
  async getOverview(organizationId?: string): Promise<ScorecardOverviewData> {
    const results = await this.findAll({ organizationId });

    const totalComponents = results.length;
    const averageScore =
      totalComponents > 0
        ? results.reduce((sum, r) => sum + Number(r.overallScore), 0) /
          totalComponents
        : 0;

    // Build level distribution using all ScorecardLevel values as keys.
    const levelDistribution = Object.values(ScorecardLevel).reduce(
      (acc, lvl) => {
        acc[lvl] = 0;
        return acc;
      },
      {} as Record<ScorecardLevel, number>,
    );

    for (const r of results) {
      levelDistribution[r.level] = (levelDistribution[r.level] ?? 0) + 1;
    }

    // Aggregate per-team stats from results that carry a teamId.
    const teamMap = new Map<
      string,
      { totalScore: number; componentCount: number }
    >();

    for (const r of results) {
      if (!r.teamId) continue;
      const entry = teamMap.get(r.teamId) ?? {
        totalScore: 0,
        componentCount: 0,
      };
      entry.totalScore += Number(r.overallScore);
      entry.componentCount += 1;
      teamMap.set(r.teamId, entry);
    }

    // Fetch team display names for all collected team IDs.
    const teamIds = Array.from(teamMap.keys());
    const teams =
      teamIds.length > 0
        ? await this.teamRepository.findBy({ id: In(teamIds) })
        : [];

    const teamNameMap = new Map<string, string>(
      teams.map((t) => [t.id, t.displayName]),
    );

    const byTeam = teamIds.map((teamId) => {
      const { totalScore, componentCount } = teamMap.get(teamId)!;
      return {
        teamId,
        teamName: teamNameMap.get(teamId) ?? teamId,
        averageScore: componentCount > 0 ? totalScore / componentCount : 0,
        componentCount,
      };
    });

    return { totalComponents, averageScore, levelDistribution, byTeam };
  }
}
