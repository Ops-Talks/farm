import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DashboardWidget,
  WidgetType,
} from "./entities/dashboard-widget.entity";
import { Dashboard } from "./entities/dashboard.entity";
import { CreateWidgetDto } from "./dto/create-widget.dto";
import { UpdateWidgetDto } from "./dto/update-widget.dto";

/**
 * Response shape returned by getWidgetData.
 */
export interface WidgetDataResponse {
  type: WidgetType;
  data: unknown;
  updatedAt: string;
}

/**
 * Service responsible for managing individual dashboard widgets and
 * retrieving their data.
 */
@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
  ) {}

  /**
   * Creates a new widget on the specified dashboard.
   * @param dashboardId - The UUID of the parent dashboard
   * @param createWidgetDto - Data for the new widget
   * @returns The created widget
   * @throws NotFoundException if the dashboard does not exist
   */
  async create(
    dashboardId: string,
    createWidgetDto: CreateWidgetDto,
  ): Promise<DashboardWidget> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
    });
    if (!dashboard) {
      throw new NotFoundException(
        `Dashboard with ID "${dashboardId}" not found`,
      );
    }

    const widget = this.widgetRepository.create({
      ...createWidgetDto,
      dashboardId,
    });
    this.logger.log(
      `Creating widget "${createWidgetDto.title}" on dashboard ${dashboardId}`,
    );
    return await this.widgetRepository.save(widget);
  }

  /**
   * Retrieves a single widget by ID.
   * @param id - The UUID of the widget
   * @returns The widget with the specified ID
   * @throws NotFoundException if no widget with the given ID exists
   */
  async findOne(id: string): Promise<DashboardWidget> {
    const widget = await this.widgetRepository.findOne({ where: { id } });
    if (!widget) {
      throw new NotFoundException(`Dashboard widget with ID "${id}" not found`);
    }
    return widget;
  }

  /**
   * Updates an existing widget.
   * @param id - The UUID of the widget to update
   * @param updateWidgetDto - Fields to update
   * @returns The updated widget
   * @throws NotFoundException if no widget with the given ID exists
   */
  async update(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
  ): Promise<DashboardWidget> {
    const widget = await this.findOne(id);
    const updated = this.widgetRepository.merge(widget, updateWidgetDto);
    this.logger.log(`Updating widget: ${widget.title}`);
    return await this.widgetRepository.save(updated);
  }

  /**
   * Removes a widget.
   * @param id - The UUID of the widget to remove
   * @throws NotFoundException if no widget with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const widget = await this.findOne(id);
    await this.widgetRepository.remove(widget);
    this.logger.log(`Removed widget: ${widget.title}`);
  }

  /**
   * Returns mock data for a widget based on its type and configuration.
   * Real data-source integration will be wired in a future iteration.
   * @param id - The UUID of the widget
   * @returns A generic data envelope with type-specific mock payload
   * @throws NotFoundException if no widget with the given ID exists
   */
  async getWidgetData(id: string): Promise<WidgetDataResponse> {
    const widget = await this.findOne(id);
    const data = this.generateMockData(widget.type, widget.config);

    return {
      type: widget.type,
      data,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates mock data for the given widget type.
   * This is a placeholder until real data sources are connected.
   */
  private generateMockData(
    type: WidgetType,
    config: Record<string, unknown> | null,
  ): unknown {
    switch (type) {
      case WidgetType.METRIC_GRAPH:
        return {
          series: [
            { timestamp: "2024-01-01T00:00:00Z", value: 42 },
            { timestamp: "2024-01-01T01:00:00Z", value: 55 },
            { timestamp: "2024-01-01T02:00:00Z", value: 38 },
          ],
          metricName: config?.metricName ?? "unknown_metric",
        };

      case WidgetType.COMPONENT_HEALTH:
        return {
          components: [
            { name: "api-gateway", status: "healthy" },
            { name: "auth-service", status: "healthy" },
            { name: "worker", status: "degraded" },
          ],
        };

      case WidgetType.DEPLOYMENT_FEED:
        return {
          deployments: [
            {
              id: "deploy-001",
              component: "api",
              version: "1.5.0",
              status: "succeeded",
              timestamp: "2024-01-01T10:00:00Z",
            },
          ],
        };

      case WidgetType.QUEUE_STATUS:
        return {
          queues: [
            { name: "email-queue", depth: 12, consumers: 3 },
            { name: "event-queue", depth: 0, consumers: 5 },
          ],
        };

      case WidgetType.SLO_GAUGE:
        return {
          sloName: config?.sloName ?? "availability",
          current: 99.95,
          target: 99.9,
          budget_remaining: 0.05,
        };

      case WidgetType.ALERT_SUMMARY:
        return {
          total: 7,
          critical: 1,
          warning: 4,
          info: 2,
        };

      case WidgetType.TEAM_ACTIVITY:
        return {
          events: [
            {
              user: "alice",
              action: "deployed api v1.5.0",
              timestamp: "2024-01-01T10:00:00Z",
            },
            {
              user: "bob",
              action: "resolved alert high-cpu",
              timestamp: "2024-01-01T09:30:00Z",
            },
          ],
        };

      case WidgetType.UPTIME_CHART:
        return {
          days: [
            { date: "2024-01-01", uptimePercent: 100 },
            { date: "2024-01-02", uptimePercent: 99.9 },
            { date: "2024-01-03", uptimePercent: 99.95 },
          ],
        };

      default:
        return {};
    }
  }
}
