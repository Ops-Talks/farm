import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Req,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { Component } from "../catalog/entities/component.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { OpenCostService } from "./open-cost.service";
import { Team } from "../teams/entities/team.entity";

/**
 * REST endpoints for FinOps cost data: OpenCost actuals, history, and summaries.
 */
@ApiTags("FinOps")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard)
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description:
    "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
@Controller("cost")
export class CostController {
  constructor(
    private readonly httpService: HttpService,
    private readonly openCostService: OpenCostService,
    private readonly configService: ConfigService,
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(ActualCost)
    private readonly actualCostRepo: Repository<ActualCost>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
  ) {}

  /**
   * Returns 7-day and 30-day actual cost breakdowns from OpenCost for a component.
   *
   * @param id - Component UUID
   */
  @Get("components/:id/actual")
  @ApiOperation({
    summary: "Get actual 7d and 30d cost breakdown from OpenCost",
  })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiResponse({ status: 200, description: "Cost allocation data" })
  @ApiResponse({ status: 404, description: "Component not found" })
  async getActualCost(@Param("id") id: string, @Req() req: RequestWithOrg) {
    const where: Record<string, unknown> = { id };
    if (req.organizationId) where["organizationId"] = req.organizationId;
    const component = await this.componentRepo.findOne({ where });
    if (!component) throw new NotFoundException(`Component ${id} not found`);
    const [sevenDay, thirtyDay] = await Promise.all([
      this.openCostService.getAllocation(component.name, "7d"),
      this.openCostService.getAllocation(component.name, "30d"),
    ]);
    return { componentId: id, sevenDay, thirtyDay };
  }

  /**
   * Returns the last 30 actual cost records for a component (for sparkline rendering).
   * Numeric fields are cast from Postgres decimal strings to numbers.
   *
   * @param id - Component UUID
   */
  @Get("components/:id/history")
  @ApiOperation({
    summary: "Get last 30 actual cost records for sparkline rendering",
  })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiResponse({ status: 200, description: "Array of ActualCost records" })
  async getCostHistory(@Param("id") id: string, @Req() req: RequestWithOrg) {
    const where: Record<string, unknown> = { id };
    if (req.organizationId) where["organizationId"] = req.organizationId;
    const component = await this.componentRepo.findOne({ where });
    if (!component) throw new NotFoundException(`Component ${id} not found`);
    const records = await this.actualCostRepo.find({
      where: { componentId: id },
      order: { syncedAt: "DESC" },
      take: 30,
    });
    return records.map((r) => ({
      id: r.id,
      componentId: r.componentId,
      window: r.window,
      cpuCost: Number(r.cpuCost),
      memoryCost: Number(r.memoryCost),
      pvCost: Number(r.pvCost),
      networkCost: Number(r.networkCost),
      totalCost: Number(r.totalCost),
      currency: r.currency,
      syncedAt: r.syncedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Returns an aggregated cost summary for all components that belong to a team.
   * Uses a subquery to fetch only the latest cost per component at the DB level.
   *
   * @param id - Team UUID
   */
  @Get("teams/:id/summary")
  @ApiOperation({ summary: "Get aggregated cost summary for a team" })
  @ApiParam({ name: "id", description: "Team UUID" })
  @ApiResponse({ status: 200, description: "Team cost summary" })
  @ApiResponse({ status: 404, description: "Team not found" })
  async getTeamCostSummary(@Param("id") id: string) {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) throw new NotFoundException(`Team ${id} not found`);

    // Resolve component IDs via the teamId FK on Component.
    const components = await this.componentRepo.find({
      where: { teamId: id },
      select: { id: true },
    });
    const componentIds = components.map((c) => c.id);

    const latestCosts =
      componentIds.length > 0
        ? await this.actualCostRepo
            .createQueryBuilder("ac")
            .innerJoin(
              (qb) =>
                qb
                  .subQuery()
                  .select("latest.component_id", "component_id")
                  .addSelect("MAX(latest.synced_at)", "latest_synced_at")
                  .from(ActualCost, "latest")
                  .where("latest.component_id IN (:...ids)", {
                    ids: componentIds,
                  })
                  .groupBy("latest.component_id"),
              "latest_per_component",
              'latest_per_component."component_id" = ac."component_id" AND latest_per_component."latest_synced_at" = ac."synced_at"',
            )
            .getMany()
        : [];

    // Keep a single latest row per component in case multiple rows share
    // the same latest syncedAt timestamp.
    const latestByComponent = new Map<string, ActualCost>();
    for (const cost of latestCosts) {
      if (!latestByComponent.has(cost.componentId)) {
        latestByComponent.set(cost.componentId, cost);
      }
    }

    const latestRecords = Array.from(latestByComponent.values());
    const totalCost = latestRecords.reduce(
      (sum, c) => sum + Number(c.totalCost),
      0,
    );

    return {
      teamId: id,
      totalCost,
      currency: latestRecords[0]?.currency ?? "USD",
      components: latestRecords.map((c) => ({
        componentId: c.componentId,
        totalCost: Number(c.totalCost),
        window: c.window,
      })),
    };
  }

  /**
   * Returns the top-N most expensive components across the platform.
   * Uses a subquery to fetch only the latest record per component in a single
   * query, avoiding N+1. Joins the component table to include budget info.
   *
   * @param limit - Maximum number of results to return (default 10, max 100)
   */
  @Get("summary")
  @ApiOperation({
    summary: "Get top-N most expensive components platform-wide",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of results (default 10, max 100)",
  })
  @ApiResponse({ status: 200, description: "Array of top-cost components" })
  async getPlatformCostSummary(@Query("limit") limit = 10) {
    const n = Math.min(Number(limit) || 10, 100);

    const results = await this.actualCostRepo
      .createQueryBuilder("ac")
      .innerJoin(
        (qb) =>
          qb
            .subQuery()
            .select("latest.component_id", "component_id")
            .addSelect("MAX(latest.synced_at)", "latest_sync")
            .from(ActualCost, "latest")
            .groupBy("latest.component_id"),
        "latest_per_component",
        'latest_per_component."component_id" = ac."component_id" AND latest_per_component."latest_sync" = ac."synced_at"',
      )
      .orderBy("ac.totalCost", "DESC")
      .limit(n)
      .getMany();

    // Collect budget data from components in a single query.
    const componentIds = results.map((r) => r.componentId);
    const budgetMap = new Map<string, number | null>();
    if (componentIds.length > 0) {
      const comps = await this.componentRepo
        .createQueryBuilder("c")
        .select(["c.id", "c.costBudgetUsd"])
        .where("c.id IN (:...ids)", { ids: componentIds })
        .getMany();
      for (const c of comps) {
        budgetMap.set(
          c.id,
          c.costBudgetUsd != null ? Number(c.costBudgetUsd) : null,
        );
      }
    }

    return results.map((r) => ({
      componentId: r.componentId,
      totalCost: Number(r.totalCost),
      currency: r.currency,
      syncedAt: r.syncedAt,
      budgetUsd: budgetMap.get(r.componentId) ?? null,
    }));
  }

  /**
   * Returns whether OpenCost is reachable at the configured URL.
   */
  @Get("available")
  @ApiOperation({ summary: "Check if OpenCost is reachable" })
  @ApiResponse({ status: 200, description: "Availability status" })
  async getAvailability(): Promise<{ available: boolean; reason?: string }> {
    const url = this.configService.get<string>(
      "OPENCOST_URL",
      "http://localhost:9090",
    );
    try {
      const res = await firstValueFrom(
        this.httpService.head(`${url}/healthz`, {
          timeout: 3000,
          validateStatus: () => true,
        }),
      );
      if (res.status >= 200 && res.status < 400) return { available: true };
      return {
        available: false,
        reason: `OpenCost returned status ${res.status} at ${url}`,
      };
    } catch {
      return { available: false, reason: `OpenCost unreachable at ${url}` };
    }
  }
}
