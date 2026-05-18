import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { DataSource, FindOptionsWhere, Repository } from "typeorm";
import { Dashboard } from "./entities/dashboard.entity";
import { DashboardWidget } from "./entities/dashboard-widget.entity";
import { CreateDashboardDto } from "./dto/create-dashboard.dto";
import { UpdateDashboardDto } from "./dto/update-dashboard.dto";
import { UpdateLayoutDto } from "./dto/update-layout.dto";
import { ListDashboardsQueryDto } from "./dto/list-dashboards-query.dto";

/**
 * Service responsible for managing custom dashboards and their layouts.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new dashboard.
   * @param createDashboardDto - Data for the new dashboard
   * @param ownerId - UUID of the user creating the dashboard
   * @returns The created dashboard
   */
  async create(
    createDashboardDto: CreateDashboardDto,
    ownerId: string,
    organizationId?: string,
  ): Promise<Dashboard> {
    const dashboard = this.dashboardRepository.create({
      ...createDashboardDto,
      ownerId,
      organizationId: organizationId ?? createDashboardDto.organizationId,
    });
    this.logger.log(
      `Creating dashboard "${createDashboardDto.name}" for owner ${ownerId}`,
    );
    const saved = await this.dashboardRepository.save(dashboard);
    return this.findOne(saved.id);
  }

  /**
   * Retrieves dashboards with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A tuple of [dashboards, total count]
   */
  async findAll(query: ListDashboardsQueryDto): Promise<[Dashboard[], number]> {
    const { ownerId, visibility, organizationId, skip = 0, take = 20 } = query;

    const where: FindOptionsWhere<Dashboard> = {};

    if (ownerId !== undefined) where.ownerId = ownerId;
    if (visibility !== undefined) where.visibility = visibility;
    if (organizationId !== undefined) where.organizationId = organizationId;

    return await this.dashboardRepository.findAndCount({
      where,
      relations: ["widgets"],
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single dashboard by ID with its widgets.
   * When orgId is provided the result is additionally scoped to that
   * organization — a mismatch returns 404 to avoid leaking resource existence.
   * @param id - The UUID of the dashboard
   * @param orgId - Optional organization UUID to scope the lookup
   * @returns The dashboard with the specified ID
   * @throws NotFoundException if no dashboard with the given ID exists (or org does not match)
   */
  async findOne(id: string, orgId?: string): Promise<Dashboard> {
    const where: FindOptionsWhere<Dashboard> = { id };
    if (orgId) where.organizationId = orgId;
    const dashboard = await this.dashboardRepository.findOne({
      where,
      relations: ["widgets"],
    });
    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID "${id}" not found`);
    }
    return dashboard;
  }

  /**
   * Updates an existing dashboard.
   * @param id - The UUID of the dashboard to update
   * @param updateDashboardDto - Fields to update
   * @param orgId - Optional organization UUID to scope the lookup
   * @returns The updated dashboard
   * @throws NotFoundException if no dashboard with the given ID exists (or org does not match)
   */
  async update(
    id: string,
    updateDashboardDto: UpdateDashboardDto,
    orgId?: string,
  ): Promise<Dashboard> {
    const dashboard = await this.findOne(id, orgId);
    const updated = this.dashboardRepository.merge(
      dashboard,
      updateDashboardDto,
    );
    this.logger.log(`Updating dashboard: ${dashboard.name}`);
    await this.dashboardRepository.save(updated);
    return this.findOne(id);
  }

  /**
   * Bulk-updates widget positions and sizes on a dashboard within a
   * transaction. All widget IDs must belong to the specified dashboard.
   * @param id - The UUID of the dashboard
   * @param layoutDto - Array of widget positions to apply
   * @returns The updated dashboard with repositioned widgets
   * @throws NotFoundException if the dashboard does not exist
   * @throws BadRequestException if any widget ID does not belong to the dashboard
   */
  async updateLayout(
    id: string,
    layoutDto: UpdateLayoutDto,
  ): Promise<Dashboard> {
    const dashboard = await this.findOne(id);

    const dashboardWidgetIds = new Set(dashboard.widgets.map((w) => w.id));
    const incomingWidgetIds = layoutDto.widgets.map((w) => w.widgetId);

    const invalidIds = incomingWidgetIds.filter(
      (wid) => !dashboardWidgetIds.has(wid),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Widget IDs do not belong to dashboard "${id}": ${invalidIds.join(", ")}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const pos of layoutDto.widgets) {
        await manager.update(DashboardWidget, pos.widgetId, {
          gridX: pos.x,
          gridY: pos.y,
          gridW: pos.w,
          gridH: pos.h,
        });
      }
    });

    this.logger.log(
      `Updated layout for dashboard "${dashboard.name}" (${incomingWidgetIds.length} widgets)`,
    );
    return this.findOne(id);
  }

  /**
   * Removes a dashboard and its widgets (cascade).
   * @param id - The UUID of the dashboard to remove
   * @param orgId - Optional organization UUID to scope the lookup
   * @throws NotFoundException if no dashboard with the given ID exists (or org does not match)
   */
  async remove(id: string, orgId?: string): Promise<void> {
    const dashboard = await this.findOne(id, orgId);
    await this.dashboardRepository.remove(dashboard);
    this.logger.log(`Removed dashboard: ${dashboard.name}`);
  }
}
