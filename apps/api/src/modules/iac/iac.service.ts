import { timingSafeEqual } from "crypto";
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere, IsNull } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { IacStack } from "./entities/iac-stack.entity";
import { IacRun, IacRunStatus } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";
import { IngestRunDto } from "./dto/ingest-run.dto";
import { ImportStacksDto } from "./dto/import-stacks.dto";
import { IngestModuleDriftDto } from "./dto/ingest-module-drift.dto";
import { DashboardDto, StackSummaryDto } from "./dto/dashboard.dto";
import { StackListQueryDto } from "./dto/stack-list-query.dto";
import { StackDetailDto } from "./dto/stack-detail.dto";

/**
 * Parses a version tag of the form "vX.Y.Z" or "X.Y.Z" and returns the
 * numeric components as a tuple, or null when the string is not semver.
 */
function parseSemver(ref: string): [number, number, number] | null {
  const clean = ref.startsWith("v") ? ref.slice(1) : ref;
  const parts = clean.split(".");
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return nums as [number, number, number];
}

/**
 * Computes how many semver releases are between two version strings.
 * Priority: major difference first, then minor, then patch.
 * Returns 1 as the default when either ref cannot be parsed.
 */
function computeVersionsBehind(current: string, latest: string): number {
  const a = parseSemver(current);
  const b = parseSemver(latest);
  if (!a || !b) return 1;

  const [aMajor, aMinor, aPatch] = a;
  const [bMajor, bMinor, bPatch] = b;

  // If the latest is not actually newer, return 0
  if (
    bMajor < aMajor ||
    (bMajor === aMajor && bMinor < aMinor) ||
    (bMajor === aMajor && bMinor === aMinor && bPatch <= aPatch)
  ) {
    return 0;
  }

  // Use the most significant changed component as the "versions behind" count
  if (bMajor !== aMajor) return bMajor - aMajor;
  if (bMinor !== aMinor) return bMinor - aMinor;
  return bPatch - aPatch;
}

/**
 * Service responsible for IaC stack management, run ingestion, and module
 * drift tracking.
 */
@Injectable()
export class IacService {
  private readonly logger = new Logger(IacService.name);

  constructor(
    @InjectRepository(IacStack)
    private readonly stackRepository: Repository<IacStack>,
    @InjectRepository(IacRun)
    private readonly runRepository: Repository<IacRun>,
    @InjectRepository(IacModuleDrift)
    private readonly driftRepository: Repository<IacModuleDrift>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates the static bearer token used by machine-to-machine ingest endpoints.
   * Uses constant-time comparison to prevent timing attacks.
   * @throws UnauthorizedException when the provided token does not match.
   */
  private validateIngestToken(token: string): void {
    const expected =
      this.configService.get<string>("iac.ingestToken") ||
      this.configService.get<string>("IAC_INGEST_TOKEN");
    if (!expected || expected.length === 0) {
      throw new UnauthorizedException("Invalid ingest token");
    }
    if (!token || token.length === 0 || token.length !== expected.length) {
      throw new UnauthorizedException("Invalid ingest token");
    }
    const tokenBuffer = Buffer.from(token, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (!timingSafeEqual(tokenBuffer, expectedBuffer)) {
      throw new UnauthorizedException("Invalid ingest token");
    }
  }

  /**
   * Records a completed IaC plan or apply run.
   * Automatically creates the parent IacStack when it does not yet exist.
   *
   * @param dto - Run payload from Cultivator or a CI agent
   * @param token - Static bearer token to authenticate the request
   * @returns The persisted IacRun record
   * @throws UnauthorizedException when token is invalid
   */
  async ingestRun(
    dto: IngestRunDto,
    token: string,
    organizationId?: string,
  ): Promise<IacRun> {
    this.validateIngestToken(token);

    // Find or create the stack, scoped to the organization when provided
    let stack = await this.stackRepository.findOne({
      where: {
        name: dto.stackName,
        environment: dto.environment,
        organizationId: organizationId ?? IsNull(),
      },
    });

    if (!stack) {
      stack = this.stackRepository.create({
        name: dto.stackName,
        environment: dto.environment,
        provider: dto.provider ?? "terraform",
        autoImported: true,
        organizationId: organizationId ?? null,
      });
      stack = await this.stackRepository.save(stack);
      this.logger.log(
        `Auto-created IacStack "${dto.stackName}" in env "${dto.environment}"`,
      );
    }

    const startedAt = dto.startedAt
      ? new Date(dto.startedAt)
      : dto.finishedAt
        ? new Date(dto.finishedAt)
        : new Date();

    const run = this.runRepository.create({
      stackId: stack.id,
      type: dto.type,
      status: dto.status,
      environment: dto.environment,
      provider: dto.provider ?? null,
      resourceChanges: dto.resourceChanges ?? null,
      triggeredBy: dto.triggeredBy ?? null,
      pipelineUrl: dto.pipelineUrl ?? null,
      startedAt,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
      durationMs: dto.durationMs ?? null,
    });

    const saved = await this.runRepository.save(run);
    this.logger.log(`Ingested IaC run ${saved.id} for stack ${stack.name}`);
    return saved;
  }

  /**
   * Bulk-imports or updates IaC stack records from Cultivator discovery output.
   * Existing stacks are updated but their componentId and externalToolUrl are preserved.
   *
   * @param dto - Array of stack definitions
   * @param token - Static bearer token
   * @returns Counts of created and updated records
   * @throws UnauthorizedException when token is invalid
   */
  async importStacks(
    dto: ImportStacksDto,
    token: string,
    organizationId?: string,
  ): Promise<{ created: number; updated: number }> {
    this.validateIngestToken(token);

    let created = 0;
    let updated = 0;

    for (const item of dto.stacks) {
      const existing = await this.stackRepository.findOne({
        where: {
          name: item.name,
          environment: item.environment,
          organizationId: organizationId ?? IsNull(),
        },
      });

      if (existing) {
        // Update fields from the import but preserve componentId and externalToolUrl
        existing.provider = item.provider ?? existing.provider;
        existing.repositoryUrl = item.repositoryUrl ?? existing.repositoryUrl;
        existing.basePath = item.basePath ?? existing.basePath;
        // Only overwrite externalToolUrl if explicitly provided; preserve existing value
        if (item.externalToolUrl !== undefined) {
          existing.externalToolUrl = item.externalToolUrl;
        }
        await this.stackRepository.save(existing);
        updated++;
      } else {
        const stack = this.stackRepository.create({
          name: item.name,
          environment: item.environment,
          provider: item.provider ?? "terraform",
          repositoryUrl: item.repositoryUrl ?? null,
          basePath: item.basePath ?? null,
          externalToolUrl: item.externalToolUrl ?? null,
          autoImported: true,
          organizationId: organizationId ?? null,
        });
        await this.stackRepository.save(stack);
        created++;
      }
    }

    this.logger.log(`importStacks: created=${created} updated=${updated}`);
    return { created, updated };
  }

  /**
   * Ingests module drift data from an Agronomist scan, creating a drift record
   * for each reported module.
   * The versionsBehind value is computed from the semver distance between
   * currentRef and latestRef; defaults to 1 for non-semver refs.
   *
   * @param dto - Array of module drift items
   * @param token - Static bearer token
   * @throws UnauthorizedException when token is invalid
   */
  async ingestModuleDrift(
    dto: IngestModuleDriftDto,
    token: string,
  ): Promise<void> {
    this.validateIngestToken(token);

    const now = new Date();

    for (const item of dto.modules) {
      const versionsBehind = computeVersionsBehind(
        item.currentRef,
        item.latestRef,
      );
      const drift = this.driftRepository.create({
        stackPath: item.stackPath,
        moduleName: item.moduleName,
        sourceUrl: item.sourceUrl,
        currentRef: item.currentRef,
        latestRef: item.latestRef,
        versionsBehind,
        detectedAt: now,
      });
      await this.driftRepository.save(drift);
    }

    this.logger.log(`Ingested ${dto.modules.length} module drift records`);
  }

  /**
   * Returns a paginated list of runs for a stack, sorted by startedAt DESC.
   *
   * @param stackId - IacStack UUID
   * @param page - 1-based page number
   * @param limit - Page size
   * @returns Paginated run list with total count
   */
  async getStackRuns(
    stackId: string,
    page: number,
    limit: number,
  ): Promise<{ data: IacRun[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.runRepository.findAndCount({
      where: { stackId },
      order: { startedAt: "DESC" },
      skip,
      take: limit,
    });
    return { data, total };
  }

  /**
   * Builds the IaC dashboard response by loading all stacks with their most
   * recent run, grouping by environment, and surfacing failed stacks first.
   *
   * @returns Dashboard DTO with environment tabs and per-stack summaries
   */
  async getDashboard(): Promise<DashboardDto> {
    const stacks = await this.stackRepository.find({
      order: { environment: "ASC", name: "ASC" },
    });

    const environments = Array.from(
      new Set(stacks.map((s) => s.environment)),
    ).sort();

    const stacksByEnvironment: Record<string, StackSummaryDto[]> = {};
    let failedLastRun = 0;

    // Fetch only the latest run per stack in a single query to avoid
    // loading the full run history for the dashboard.
    const stackIds = stacks.map((s) => s.id);
    const lastRunMap = new Map<string, IacRun>();
    if (stackIds.length > 0) {
      const latestRuns = await this.runRepository
        .createQueryBuilder("run")
        .innerJoin(
          (qb) =>
            qb
              .subQuery()
              .select("latest.stackId", "stackId")
              .addSelect("MAX(latest.startedAt)", "startedAt")
              .from(IacRun, "latest")
              .where("latest.stackId IN (:...stackIds)", { stackIds })
              .groupBy("latest.stackId"),
          "latest_run",
          'latest_run."stackId" = run."stackId" AND latest_run."startedAt" = run."startedAt"',
        )
        .where('run."stackId" IN (:...stackIds)', { stackIds })
        .getMany();

      for (const run of latestRuns) {
        lastRunMap.set(run.stackId, run);
      }
    }

    for (const stack of stacks) {
      const lastRun = lastRunMap.get(stack.id);

      const summary: StackSummaryDto = {
        stackId: stack.id,
        name: stack.name,
        lastRunStatus: lastRun?.status ?? null,
        lastRunAt: lastRun?.startedAt ?? null,
        lastRunType: lastRun?.type ?? null,
        resourceChanges: lastRun?.resourceChanges ?? null,
        autoImported: stack.autoImported,
        provider: stack.provider,
        externalToolUrl: stack.externalToolUrl,
      };

      if (lastRun?.status === IacRunStatus.FAILED) {
        failedLastRun++;
      }

      if (!stacksByEnvironment[stack.environment]) {
        stacksByEnvironment[stack.environment] = [];
      }
      stacksByEnvironment[stack.environment].push(summary);
    }

    // Surface failed stacks first within each environment group
    for (const env of environments) {
      stacksByEnvironment[env] = (stacksByEnvironment[env] ?? []).sort(
        (a, b) => {
          const aFailed = a.lastRunStatus === IacRunStatus.FAILED ? -1 : 0;
          const bFailed = b.lastRunStatus === IacRunStatus.FAILED ? -1 : 0;
          return aFailed - bFailed;
        },
      );
    }

    return {
      totalStacks: stacks.length,
      failedLastRun,
      environments,
      stacksByEnvironment,
    };
  }

  // ---------------------------------------------------------------------------
  // Read-only stack query (FARM-S277)
  // ---------------------------------------------------------------------------

  /**
   * Returns all stacks ordered by environment then name, with optional
   * filtering by environment and/or componentId.
   * Each result includes the most recent run summary.
   *
   * @param query - Optional environment and componentId filters
   * @param organizationId - Optional organization UUID to scope results
   * @returns Array of StackDetailDto
   */
  async listStacks(
    query: StackListQueryDto,
    organizationId?: string,
  ): Promise<StackDetailDto[]> {
    const where: FindOptionsWhere<IacStack> = {};
    if (query.environment) where.environment = query.environment;
    if (query.componentId) where.componentId = query.componentId;
    if (organizationId) where.organizationId = organizationId;

    const stacks = await this.stackRepository.find({
      where,
      order: { environment: "ASC", name: "ASC" },
    });

    if (stacks.length === 0) return [];

    const stackIds = stacks.map((s) => s.id);
    const lastRunMap = await this.fetchLastRunMap(stackIds);
    return stacks.map((stack) =>
      this.toStackDetail(stack, lastRunMap.get(stack.id) ?? null),
    );
  }

  /**
   * Returns a single stack by UUID with its most recent run summary.
   *
   * @param id - IacStack UUID
   * @param organizationId - Optional organization UUID to scope the lookup
   * @returns StackDetailDto
   * @throws NotFoundException when no stack with that id exists (or belongs to another org)
   */
  async getStack(id: string, organizationId?: string): Promise<StackDetailDto> {
    const where: FindOptionsWhere<IacStack> = { id };
    if (organizationId) where.organizationId = organizationId;
    const stack = await this.stackRepository.findOne({ where });
    if (!stack) {
      throw new NotFoundException(`IacStack ${id} not found`);
    }
    const lastRunMap = await this.fetchLastRunMap([id]);
    return this.toStackDetail(stack, lastRunMap.get(id) ?? null);
  }

  /**
   * Fetches the most recent run for each of the given stack IDs in a single
   * query using a correlated subquery, and returns the results as a Map keyed
   * by stackId.
   *
   * @param stackIds - List of IacStack UUIDs to look up
   * @returns Map from stackId to the latest IacRun for that stack
   */
  private async fetchLastRunMap(
    stackIds: string[],
  ): Promise<Map<string, IacRun>> {
    if (stackIds.length === 0) return new Map();

    const latestRuns = await this.runRepository
      .createQueryBuilder("run")
      .innerJoin(
        (qb) =>
          qb
            .subQuery()
            .select("latest.stackId", "stackId")
            .addSelect(
              "MAX(COALESCE(latest.startedAt, latest.createdAt))",
              "effectiveStartedAt",
            )
            .from(IacRun, "latest")
            .where("latest.stackId IN (:...stackIds)", { stackIds })
            .groupBy("latest.stackId"),
        "latest_run",
        'latest_run."stackId" = run."stackId" AND latest_run."effectiveStartedAt" = COALESCE(run."startedAt", run."createdAt")',
      )
      .where('run."stackId" IN (:...stackIds)', { stackIds })
      .getMany();

    const map = new Map<string, IacRun>();
    for (const run of latestRuns) {
      map.set(run.stackId, run);
    }
    return map;
  }

  /**
   * Maps an IacStack entity and an optional last run to a StackDetailDto.
   */
  private toStackDetail(
    stack: IacStack,
    lastRun: IacRun | null,
  ): StackDetailDto {
    return {
      id: stack.id,
      name: stack.name,
      environment: stack.environment,
      provider: stack.provider,
      repositoryUrl: stack.repositoryUrl,
      basePath: stack.basePath,
      externalToolUrl: stack.externalToolUrl,
      componentId: stack.componentId,
      autoImported: stack.autoImported,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            type: lastRun.type,
            startedAt: lastRun.startedAt,
          }
        : null,
      createdAt: stack.createdAt,
      updatedAt: stack.updatedAt,
    };
  }

  /**
   * Returns all module drift records ordered by detectedAt DESC.
   *
   * @returns Array of IacModuleDrift records
   */
  async getModuleDrift(): Promise<IacModuleDrift[]> {
    return this.driftRepository.find({
      order: { detectedAt: "DESC" },
    });
  }
}
