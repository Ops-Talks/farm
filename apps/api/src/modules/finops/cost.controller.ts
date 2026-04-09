import {
  Controller,
  Get,
  Param,
  Query,
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
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Component } from "../catalog/entities/component.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { FinOpsService } from "./finops.service";
import { OpenCostService } from "./open-cost.service";
import { Team } from "../teams/entities/team.entity";

/**
 * REST endpoints for FinOps cost data: OpenCost actuals, history, and summaries.
 */
@ApiTags("cost")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cost")
export class CostController {
  constructor(
    private readonly finOpsService: FinOpsService,
    private readonly openCostService: OpenCostService,
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
  async getActualCost(@Param("id") id: string) {
    const component = await this.componentRepo.findOne({ where: { id } });
    if (!component) throw new NotFoundException(`Component ${id} not found`);
    const [sevenDay, thirtyDay] = await Promise.all([
      this.openCostService.getAllocation(component.name, "7d"),
      this.openCostService.getAllocation(component.name, "30d"),
    ]);
    return { componentId: id, sevenDay, thirtyDay };
  }

  /**
   * Returns the last 30 actual cost records for a component (for sparkline rendering).
   *
   * @param id - Component UUID
   */
  @Get("components/:id/history")
  @ApiOperation({
    summary: "Get last 30 actual cost records for sparkline rendering",
  })
  @ApiParam({ name: "id", description: "Component UUID" })
  @ApiResponse({ status: 200, description: "Array of ActualCost records" })
  async getCostHistory(@Param("id") id: string) {
    return this.actualCostRepo.find({
      where: { componentId: id },
      order: { syncedAt: "DESC" },
      take: 30,
    });
  }

  /**
   * Returns an aggregated cost summary for all components that belong to a team.
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
      select: ["id"],
    });
    const componentIds = components.map((c) => c.id);

    const costs =
      componentIds.length > 0
        ? await this.actualCostRepo
            .createQueryBuilder("ac")
            .where("ac.componentId IN (:...ids)", { ids: componentIds })
            .orderBy("ac.syncedAt", "DESC")
            .getMany()
        : [];

    // Latest record per component.
    const latestByComponent = new Map<string, ActualCost>();
    for (const c of costs) {
      if (!latestByComponent.has(c.componentId)) {
        latestByComponent.set(c.componentId, c);
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

    // Get the latest syncedAt per component.
    const rows = await this.actualCostRepo
      .createQueryBuilder("ac")
      .select("ac.componentId", "componentId")
      .addSelect("MAX(ac.syncedAt)", "latestSync")
      .groupBy("ac.componentId")
      .getRawMany<{ componentId: string; latestSync: Date }>();

    const results: ActualCost[] = [];
    for (const row of rows) {
      const record = await this.actualCostRepo.findOne({
        where: { componentId: row.componentId, syncedAt: row.latestSync },
      });
      if (record) results.push(record);
    }

    return results
      .sort((a, b) => Number(b.totalCost) - Number(a.totalCost))
      .slice(0, n)
      .map((r) => ({
        componentId: r.componentId,
        totalCost: Number(r.totalCost),
        currency: r.currency,
        syncedAt: r.syncedAt,
      }));
  }
}
