import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { WidgetService } from "./widget.service";
import { Dashboard, DashboardVisibility } from "./entities/dashboard.entity";
import {
  DashboardWidget,
  WidgetType,
} from "./entities/dashboard-widget.entity";
import { PaginatedResponseDto } from "../../common/dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";

const mockDashboardService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateLayout: jest.fn(),
  remove: jest.fn(),
};

const mockWidgetService = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getWidgetData: jest.fn(),
};

describe("DashboardController", () => {
  let controller: DashboardController;

  const mockDashboard: Dashboard = {
    id: "dash-uuid-1",
    name: "Production Overview",
    description: "High-level production health metrics",
    ownerId: "user-uuid-1",
    visibility: DashboardVisibility.PRIVATE,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    widgets: [],
  };

  const mockWidget: DashboardWidget = {
    id: "widget-uuid-1",
    dashboardId: "dash-uuid-1",
    type: WidgetType.METRIC_GRAPH,
    title: "Request Latency P99",
    gridX: 0,
    gridY: 0,
    gridW: 4,
    gridH: 3,
    config: { metricName: "http_request_duration_seconds" },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    dashboard: {} as Dashboard,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: WidgetService, useValue: mockWidgetService },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a dashboard with ownerId from req.user.userId and organizationId", async () => {
      const createDto = {
        name: "Production Overview",
        description: "High-level production health metrics",
      };
      const req = {
        user: { userId: "user-uuid-1" },
        organizationId: "org-uuid-1",
      } as never;

      mockDashboardService.create.mockResolvedValue(mockDashboard);

      const result = await controller.create(req, createDto);

      expect(result).toEqual(mockDashboard);
      expect(mockDashboardService.create).toHaveBeenCalledWith(
        createDto,
        "user-uuid-1",
        "org-uuid-1",
      );
    });
  });

  describe("findAll", () => {
    it("should list dashboards with pagination", async () => {
      const dashboards = [mockDashboard];
      mockDashboardService.findAll.mockResolvedValue([dashboards, 1]);

      const result = await controller.findAll({ skip: 0, take: 20 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual(dashboards);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should default skip to 0 and take to 20 when query values are undefined", async () => {
      const dashboards = [mockDashboard];
      mockDashboardService.findAll.mockResolvedValue([dashboards, 1]);

      const result = await controller.findAll({
        skip: undefined,
        take: undefined,
      });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("findOne", () => {
    it("should get dashboard by ID", async () => {
      mockDashboardService.findOne.mockResolvedValue(mockDashboard);
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

      const result = await controller.findOne("dash-uuid-1", mockReq);

      expect(result).toEqual(mockDashboard);
      expect(mockDashboardService.findOne).toHaveBeenCalledWith(
        "dash-uuid-1",
        "org-uuid",
      );
    });
  });

  describe("update", () => {
    it("should update a dashboard", async () => {
      const updateDto = { name: "Updated Dashboard" };
      const updatedDashboard = { ...mockDashboard, name: "Updated Dashboard" };
      mockDashboardService.update.mockResolvedValue(updatedDashboard);
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

      const result = await controller.update("dash-uuid-1", updateDto, mockReq);

      expect(result).toEqual(updatedDashboard);
      expect(mockDashboardService.update).toHaveBeenCalledWith(
        "dash-uuid-1",
        updateDto,
        "org-uuid",
      );
    });
  });

  describe("updateLayout", () => {
    it("should update layout", async () => {
      const layoutDto = {
        widgets: [{ widgetId: "widget-uuid-1", x: 2, y: 3, w: 6, h: 4 }],
      };
      const updatedDashboard = {
        ...mockDashboard,
        widgets: [{ ...mockWidget, gridX: 2, gridY: 3, gridW: 6, gridH: 4 }],
      };
      mockDashboardService.updateLayout.mockResolvedValue(updatedDashboard);

      const result = await controller.updateLayout("dash-uuid-1", layoutDto);

      expect(result).toEqual(updatedDashboard);
      expect(mockDashboardService.updateLayout).toHaveBeenCalledWith(
        "dash-uuid-1",
        layoutDto,
      );
    });
  });

  describe("remove", () => {
    it("should delete a dashboard", async () => {
      mockDashboardService.remove.mockResolvedValue(undefined);
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

      const result = await controller.remove("dash-uuid-1", mockReq);

      expect(result).toBeUndefined();
      expect(mockDashboardService.remove).toHaveBeenCalledWith(
        "dash-uuid-1",
        "org-uuid",
      );
    });
  });

  describe("createWidget", () => {
    it("should create a widget", async () => {
      const createWidgetDto = {
        type: WidgetType.METRIC_GRAPH,
        title: "Request Latency P99",
        config: { metricName: "http_request_duration_seconds" },
      };
      mockWidgetService.create.mockResolvedValue(mockWidget);

      const result = await controller.createWidget(
        "dash-uuid-1",
        createWidgetDto,
      );

      expect(result).toEqual(mockWidget);
      expect(mockWidgetService.create).toHaveBeenCalledWith(
        "dash-uuid-1",
        createWidgetDto,
      );
    });
  });

  describe("updateWidget", () => {
    it("should update a widget", async () => {
      const updateWidgetDto = { title: "Updated Widget" };
      const updatedWidget = { ...mockWidget, title: "Updated Widget" };
      mockWidgetService.update.mockResolvedValue(updatedWidget);

      const result = await controller.updateWidget(
        "widget-uuid-1",
        updateWidgetDto,
      );

      expect(result).toEqual(updatedWidget);
      expect(mockWidgetService.update).toHaveBeenCalledWith(
        "widget-uuid-1",
        updateWidgetDto,
      );
    });
  });

  describe("removeWidget", () => {
    it("should delete a widget", async () => {
      mockWidgetService.remove.mockResolvedValue(undefined);

      const result = await controller.removeWidget("widget-uuid-1");

      expect(result).toBeUndefined();
      expect(mockWidgetService.remove).toHaveBeenCalledWith("widget-uuid-1");
    });
  });

  describe("getWidgetData", () => {
    it("should get widget data", async () => {
      const widgetData = {
        type: WidgetType.METRIC_GRAPH,
        data: {
          series: [{ timestamp: "2024-01-01T00:00:00Z", value: 42 }],
          metricName: "http_request_duration_seconds",
        },
        updatedAt: "2024-01-01T00:00:00.000Z",
      };
      mockWidgetService.getWidgetData.mockResolvedValue(widgetData);

      const result = await controller.getWidgetData("widget-uuid-1");

      expect(result).toEqual(widgetData);
      expect(mockWidgetService.getWidgetData).toHaveBeenCalledWith(
        "widget-uuid-1",
      );
    });
  });
});
