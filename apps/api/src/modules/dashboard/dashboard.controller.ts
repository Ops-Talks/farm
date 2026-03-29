import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { DashboardService } from "./dashboard.service";
import { WidgetService, WidgetDataResponse } from "./widget.service";
import { CreateDashboardDto } from "./dto/create-dashboard.dto";
import { UpdateDashboardDto } from "./dto/update-dashboard.dto";
import { UpdateLayoutDto } from "./dto/update-layout.dto";
import { ListDashboardsQueryDto } from "./dto/list-dashboards-query.dto";
import { CreateWidgetDto } from "./dto/create-widget.dto";
import { UpdateWidgetDto } from "./dto/update-widget.dto";
import { Dashboard } from "./entities/dashboard.entity";
import { DashboardWidget } from "./entities/dashboard-widget.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";

/**
 * Controller for managing custom dashboards and their widgets.
 */
@ApiTags("Dashboards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboards")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - User does not have sufficient permissions.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly widgetService: WidgetService,
  ) {}

  // ----------------------------------------------------------------
  // Dashboard CRUD
  // ----------------------------------------------------------------

  /**
   * Creates a new dashboard owned by the authenticated user.
   * @param req - The incoming request containing the JWT user payload
   * @param createDashboardDto - The data for the new dashboard
   * @returns The created dashboard
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new dashboard" })
  @ApiCreatedResponse({
    description: "The dashboard has been successfully created.",
    type: Dashboard,
  })
  async create(
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() createDashboardDto: CreateDashboardDto,
  ): Promise<Dashboard> {
    return await this.dashboardService.create(
      createDashboardDto,
      req.user.userId,
      req.organizationId,
    );
  }

  /**
   * Retrieves all dashboards with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of dashboards
   */
  @Get()
  @ApiOperation({ summary: "List all dashboards" })
  @ApiOkResponse({
    description: "Successfully retrieved dashboards list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListDashboardsQueryDto,
  ): Promise<PaginatedResponseDto<Dashboard>> {
    const [data, total] = await this.dashboardService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single dashboard by ID with its widgets.
   * @param id - The UUID of the dashboard
   * @returns The dashboard with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get dashboard by ID" })
  @ApiParam({ name: "id", description: "The UUID of the dashboard" })
  @ApiOkResponse({
    description: "The dashboard was found.",
    type: Dashboard,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Dashboard> {
    return await this.dashboardService.findOne(id);
  }

  /**
   * Updates an existing dashboard.
   * @param id - The UUID of the dashboard to update
   * @param updateDashboardDto - Fields to update
   * @returns The updated dashboard
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update a dashboard" })
  @ApiParam({
    name: "id",
    description: "The UUID of the dashboard to update",
  })
  @ApiOkResponse({
    description: "The dashboard has been successfully updated.",
    type: Dashboard,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDashboardDto: UpdateDashboardDto,
  ): Promise<Dashboard> {
    return await this.dashboardService.update(id, updateDashboardDto);
  }

  /**
   * Bulk-updates widget positions and sizes on a dashboard.
   * @param id - The UUID of the dashboard
   * @param updateLayoutDto - Array of widget positions
   * @returns The updated dashboard with repositioned widgets
   */
  @Patch(":id/layout")
  @ApiOperation({ summary: "Bulk update widget positions on a dashboard" })
  @ApiParam({
    name: "id",
    description: "The UUID of the dashboard whose layout to update",
  })
  @ApiOkResponse({
    description: "The dashboard layout has been successfully updated.",
    type: Dashboard,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async updateLayout(
    @Param("id") id: string,
    @Body() updateLayoutDto: UpdateLayoutDto,
  ): Promise<Dashboard> {
    return await this.dashboardService.updateLayout(id, updateLayoutDto);
  }

  /**
   * Removes a dashboard and all of its widgets.
   * @param id - The UUID of the dashboard to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a dashboard" })
  @ApiParam({
    name: "id",
    description: "The UUID of the dashboard to remove",
  })
  @ApiNoContentResponse({ description: "Dashboard successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.dashboardService.remove(id);
  }

  // ----------------------------------------------------------------
  // Widget operations
  // ----------------------------------------------------------------

  /**
   * Adds a new widget to a dashboard.
   * @param id - The UUID of the parent dashboard
   * @param createWidgetDto - Data for the new widget
   * @returns The created widget
   */
  @Post(":id/widgets")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a widget to a dashboard" })
  @ApiParam({
    name: "id",
    description: "The UUID of the dashboard to add the widget to",
  })
  @ApiCreatedResponse({
    description: "The widget has been successfully created.",
    type: DashboardWidget,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Dashboard not found.",
    type: ErrorResponseDto,
  })
  async createWidget(
    @Param("id") id: string,
    @Body() createWidgetDto: CreateWidgetDto,
  ): Promise<DashboardWidget> {
    return await this.widgetService.create(id, createWidgetDto);
  }

  /**
   * Retrieves data for a specific widget.
   * @param dashboardId - The UUID of the parent dashboard (for URL context)
   * @param widgetId - The UUID of the widget
   * @returns Widget data envelope with type-specific payload
   */
  @Get(":dashboardId/widgets/:widgetId/data")
  @ApiOperation({ summary: "Get widget data" })
  @ApiParam({
    name: "dashboardId",
    description: "The UUID of the parent dashboard",
  })
  @ApiParam({
    name: "widgetId",
    description: "The UUID of the widget",
  })
  @ApiOkResponse({
    description: "Successfully retrieved widget data.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Widget not found.",
    type: ErrorResponseDto,
  })
  async getWidgetData(
    @Param("widgetId") widgetId: string,
  ): Promise<WidgetDataResponse> {
    return await this.widgetService.getWidgetData(widgetId);
  }

  /**
   * Updates an existing widget on a dashboard.
   * @param dashboardId - The UUID of the parent dashboard (for URL context)
   * @param widgetId - The UUID of the widget to update
   * @param updateWidgetDto - Fields to update
   * @returns The updated widget
   */
  @Patch(":dashboardId/widgets/:widgetId")
  @ApiOperation({ summary: "Update a widget" })
  @ApiParam({
    name: "dashboardId",
    description: "The UUID of the parent dashboard",
  })
  @ApiParam({
    name: "widgetId",
    description: "The UUID of the widget to update",
  })
  @ApiOkResponse({
    description: "The widget has been successfully updated.",
    type: DashboardWidget,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Widget not found.",
    type: ErrorResponseDto,
  })
  async updateWidget(
    @Param("widgetId") widgetId: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
  ): Promise<DashboardWidget> {
    return await this.widgetService.update(widgetId, updateWidgetDto);
  }

  /**
   * Removes a widget from a dashboard.
   * @param dashboardId - The UUID of the parent dashboard (for URL context)
   * @param widgetId - The UUID of the widget to remove
   */
  @Delete(":dashboardId/widgets/:widgetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a widget from a dashboard" })
  @ApiParam({
    name: "dashboardId",
    description: "The UUID of the parent dashboard",
  })
  @ApiParam({
    name: "widgetId",
    description: "The UUID of the widget to remove",
  })
  @ApiNoContentResponse({ description: "Widget successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Widget not found.",
    type: ErrorResponseDto,
  })
  async removeWidget(@Param("widgetId") widgetId: string): Promise<void> {
    await this.widgetService.remove(widgetId);
  }
}
