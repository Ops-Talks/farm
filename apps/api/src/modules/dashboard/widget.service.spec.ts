import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { WidgetService } from "./widget.service";
import {
  DashboardWidget,
  WidgetType,
} from "./entities/dashboard-widget.entity";
import { Dashboard } from "./entities/dashboard.entity";

describe("WidgetService", () => {
  let service: WidgetService;

  const mockWidget: DashboardWidget = {
    id: "widget-uuid-1",
    dashboardId: "dash-uuid-1",
    type: WidgetType.METRIC_GRAPH,
    title: "Request Latency P99",
    gridX: 0,
    gridY: 0,
    gridW: 4,
    gridH: 3,
    config: { metricName: "http_request_duration_seconds", range: "1h" },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    dashboard: {} as Dashboard,
  };

  const mockWidgetRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  const mockDashboardRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WidgetService,
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: mockWidgetRepository,
        },
        {
          provide: getRepositoryToken(Dashboard),
          useValue: mockDashboardRepository,
        },
      ],
    }).compile();

    service = module.get<WidgetService>(WidgetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a widget for a dashboard", async () => {
      const createDto = {
        type: WidgetType.METRIC_GRAPH,
        title: "Request Latency P99",
        config: { metricName: "http_request_duration_seconds" },
      };
      const dashboardId = "dash-uuid-1";

      mockDashboardRepository.findOne.mockResolvedValue({
        id: dashboardId,
        name: "Test Dashboard",
      });
      mockWidgetRepository.create.mockReturnValue({
        ...createDto,
        dashboardId,
      });
      mockWidgetRepository.save.mockResolvedValue({
        id: "widget-uuid-1",
        ...createDto,
        dashboardId,
      });

      const result = await service.create(dashboardId, createDto);

      expect(mockDashboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: dashboardId },
      });
      expect(mockWidgetRepository.create).toHaveBeenCalledWith({
        ...createDto,
        dashboardId,
      });
      expect(mockWidgetRepository.save).toHaveBeenCalled();
      expect(result.id).toBe("widget-uuid-1");
      expect(result.dashboardId).toBe(dashboardId);
    });

    it("should throw NotFoundException when dashboard does not exist", async () => {
      mockDashboardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create("nonexistent-dash", {
          type: WidgetType.METRIC_GRAPH,
          title: "Test Widget",
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create("nonexistent-dash", {
          type: WidgetType.METRIC_GRAPH,
          title: "Test Widget",
        }),
      ).rejects.toThrow('Dashboard with ID "nonexistent-dash" not found');
    });
  });

  describe("findOne", () => {
    it("should findOne", async () => {
      mockWidgetRepository.findOne.mockResolvedValue(mockWidget);

      const result = await service.findOne("widget-uuid-1");

      expect(result).toEqual(mockWidget);
      expect(mockWidgetRepository.findOne).toHaveBeenCalledWith({
        where: { id: "widget-uuid-1" },
      });
    });

    it("should throw NotFoundException when widget not found", async () => {
      mockWidgetRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        'Dashboard widget with ID "nonexistent-id" not found',
      );
    });
  });

  describe("update", () => {
    it("should update a widget", async () => {
      const updateDto = { title: "Updated Widget Title" };
      const mergedWidget = { ...mockWidget, title: "Updated Widget Title" };

      mockWidgetRepository.findOne.mockResolvedValue(mockWidget);
      mockWidgetRepository.merge.mockReturnValue(mergedWidget);
      mockWidgetRepository.save.mockResolvedValue(mergedWidget);

      const result = await service.update("widget-uuid-1", updateDto);

      expect(mockWidgetRepository.merge).toHaveBeenCalledWith(
        mockWidget,
        updateDto,
      );
      expect(mockWidgetRepository.save).toHaveBeenCalledWith(mergedWidget);
      expect(result.title).toBe("Updated Widget Title");
    });
  });

  describe("remove", () => {
    it("should remove a widget", async () => {
      mockWidgetRepository.findOne.mockResolvedValue(mockWidget);
      mockWidgetRepository.remove.mockResolvedValue(mockWidget);

      await service.remove("widget-uuid-1");

      expect(mockWidgetRepository.findOne).toHaveBeenCalledWith({
        where: { id: "widget-uuid-1" },
      });
      expect(mockWidgetRepository.remove).toHaveBeenCalledWith(mockWidget);
    });
  });

  describe("getWidgetData", () => {
    it("should return widget data", async () => {
      mockWidgetRepository.findOne.mockResolvedValue(mockWidget);

      const result = await service.getWidgetData("widget-uuid-1");

      expect(result.type).toBe(WidgetType.METRIC_GRAPH);
      expect(result.data).toHaveProperty("series");
      expect(result.data).toHaveProperty("metricName");
      expect((result.data as { metricName: string }).metricName).toBe(
        "http_request_duration_seconds",
      );
      expect(result.updatedAt).toBeDefined();
    });

    it("should return component health data for COMPONENT_HEALTH type", async () => {
      const healthWidget = {
        ...mockWidget,
        type: WidgetType.COMPONENT_HEALTH,
        config: null,
      };
      mockWidgetRepository.findOne.mockResolvedValue(healthWidget);

      const result = await service.getWidgetData("widget-uuid-1");

      expect(result.type).toBe(WidgetType.COMPONENT_HEALTH);
      expect(result.data).toHaveProperty("components");
    });

    it("should return deployment feed data for DEPLOYMENT_FEED type", async () => {
      const deployWidget = {
        ...mockWidget,
        type: WidgetType.DEPLOYMENT_FEED,
        config: null,
      };
      mockWidgetRepository.findOne.mockResolvedValue(deployWidget);

      const result = await service.getWidgetData("widget-uuid-1");

      expect(result.type).toBe(WidgetType.DEPLOYMENT_FEED);
      expect(result.data).toHaveProperty("deployments");
    });

    it("should return SLO gauge data with config values", async () => {
      const sloWidget = {
        ...mockWidget,
        type: WidgetType.SLO_GAUGE,
        config: { sloName: "latency" },
      };
      mockWidgetRepository.findOne.mockResolvedValue(sloWidget);

      const result = await service.getWidgetData("widget-uuid-1");

      expect(result.type).toBe(WidgetType.SLO_GAUGE);
      expect((result.data as { sloName: string }).sloName).toBe("latency");
    });

    it("should return empty object for unknown widget type", async () => {
      const unknownWidget = {
        ...mockWidget,
        type: "unknown_type" as WidgetType,
        config: null,
      };
      mockWidgetRepository.findOne.mockResolvedValue(unknownWidget);

      const result = await service.getWidgetData("widget-uuid-1");

      expect(result.data).toEqual({});
    });

    it("should throw NotFoundException when widget not found for getWidgetData", async () => {
      mockWidgetRepository.findOne.mockResolvedValue(null);

      await expect(service.getWidgetData("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
