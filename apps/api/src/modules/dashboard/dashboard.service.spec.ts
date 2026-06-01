import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken, getDataSourceToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Dashboard, DashboardVisibility } from "./entities/dashboard.entity";
import { DashboardWidget } from "./entities/dashboard-widget.entity";

describe("DashboardService", () => {
  let service: DashboardService;

  const mockDashboard: Dashboard = {
    id: "dash-uuid-1",
    name: "Production Overview",
    description: "High-level production health metrics",
    ownerId: "owner-uuid-1",
    visibility: DashboardVisibility.PRIVATE,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    widgets: [],
  };

  const mockDashboardRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  const mockWidgetRepository = {};

  const mockTransactionManager = {
    update: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: typeof mockTransactionManager) => Promise<void>) => {
          return cb(mockTransactionManager);
        },
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Dashboard),
          useValue: mockDashboardRepository,
        },
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: mockWidgetRepository,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a dashboard with ownerId and organizationId", async () => {
      const createDto = {
        name: "Production Overview",
        description: "High-level production health metrics",
        visibility: DashboardVisibility.PRIVATE,
      };
      const ownerId = "owner-uuid-1";
      const organizationId = "org-uuid-1";

      mockDashboardRepository.create.mockReturnValue({
        ...createDto,
        ownerId,
        organizationId,
      });
      mockDashboardRepository.save.mockResolvedValue({
        id: "dash-uuid-1",
        ...createDto,
        ownerId,
        organizationId,
      });
      mockDashboardRepository.findOne.mockResolvedValue({
        ...mockDashboard,
        widgets: [],
      });

      const result = await service.create(createDto, ownerId, organizationId);

      expect(mockDashboardRepository.create).toHaveBeenCalledWith({
        ...createDto,
        ownerId,
        organizationId,
      });
      expect(mockDashboardRepository.save).toHaveBeenCalled();
      expect(result.id).toBe("dash-uuid-1");
      expect(result.ownerId).toBe(ownerId);
      expect(result.organizationId).toBe(organizationId);
    });
  });

  describe("findAll", () => {
    it("should findAll with no filters (returns paginated with widgets)", async () => {
      const dashboards = [{ ...mockDashboard, widgets: [] }];
      mockDashboardRepository.findAndCount.mockResolvedValue([dashboards, 1]);

      const result = await service.findAll({ skip: 0, take: 20 });

      expect(result).toEqual([dashboards, 1]);
      expect(mockDashboardRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: { widgets: true },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with ownerId filter", async () => {
      const dashboards = [{ ...mockDashboard, widgets: [] }];
      mockDashboardRepository.findAndCount.mockResolvedValue([dashboards, 1]);

      const result = await service.findAll({
        ownerId: "owner-uuid-1",
        skip: 0,
        take: 20,
      });

      expect(result).toEqual([dashboards, 1]);
      expect(mockDashboardRepository.findAndCount).toHaveBeenCalledWith({
        where: { ownerId: "owner-uuid-1" },
        relations: { widgets: true },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with visibility filter", async () => {
      const dashboards = [{ ...mockDashboard, widgets: [] }];
      mockDashboardRepository.findAndCount.mockResolvedValue([dashboards, 1]);

      const result = await service.findAll({
        visibility: DashboardVisibility.WORKSPACE,
        skip: 0,
        take: 20,
      });

      expect(result).toEqual([dashboards, 1]);
      expect(mockDashboardRepository.findAndCount).toHaveBeenCalledWith({
        where: { visibility: DashboardVisibility.WORKSPACE },
        relations: { widgets: true },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should findOne with widgets relation", async () => {
      mockDashboardRepository.findOne.mockResolvedValue({
        ...mockDashboard,
        widgets: [],
      });

      const result = await service.findOne("dash-uuid-1");

      expect(result.id).toBe("dash-uuid-1");
      expect(result.widgets).toEqual([]);
      expect(mockDashboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: "dash-uuid-1" },
        relations: { widgets: true },
      });
    });

    it("should throw NotFoundException when dashboard not found", async () => {
      mockDashboardRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        'Dashboard with ID "nonexistent-id" not found',
      );
    });
  });

  describe("update", () => {
    it("should update a dashboard", async () => {
      const updateDto = { name: "Updated Dashboard" };
      const existingDashboard = { ...mockDashboard, widgets: [] };
      const mergedDashboard = {
        ...existingDashboard,
        name: "Updated Dashboard",
      };

      // First findOne call (inside update -> this.findOne)
      mockDashboardRepository.findOne.mockResolvedValueOnce(existingDashboard);
      mockDashboardRepository.merge.mockReturnValue(mergedDashboard);
      mockDashboardRepository.save.mockResolvedValue(mergedDashboard);
      // Second findOne call (return updated entity)
      mockDashboardRepository.findOne.mockResolvedValueOnce({
        ...mergedDashboard,
      });

      const result = await service.update("dash-uuid-1", updateDto);

      expect(mockDashboardRepository.merge).toHaveBeenCalledWith(
        existingDashboard,
        updateDto,
      );
      expect(mockDashboardRepository.save).toHaveBeenCalledWith(
        mergedDashboard,
      );
      expect(result.name).toBe("Updated Dashboard");
    });
  });

  describe("updateLayout", () => {
    it("should updateLayout (bulk update widget positions)", async () => {
      const widgetId = "widget-uuid-1";
      const dashboardWithWidgets = {
        ...mockDashboard,
        widgets: [
          {
            id: widgetId,
            dashboardId: "dash-uuid-1",
            title: "Test Widget",
            gridX: 0,
            gridY: 0,
            gridW: 4,
            gridH: 3,
          },
        ],
      };

      const layoutDto = {
        widgets: [{ widgetId, x: 2, y: 3, w: 6, h: 4 }],
      };

      // First findOne call (validate dashboard exists)
      mockDashboardRepository.findOne.mockResolvedValueOnce(
        dashboardWithWidgets,
      );
      // Second findOne call (return updated dashboard)
      mockDashboardRepository.findOne.mockResolvedValueOnce({
        ...dashboardWithWidgets,
        widgets: [
          {
            ...dashboardWithWidgets.widgets[0],
            gridX: 2,
            gridY: 3,
            gridW: 6,
            gridH: 4,
          },
        ],
      });

      const result = await service.updateLayout("dash-uuid-1", layoutDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.update).toHaveBeenCalledWith(
        DashboardWidget,
        widgetId,
        { gridX: 2, gridY: 3, gridW: 6, gridH: 4 },
      );
      expect(result.widgets[0].gridX).toBe(2);
      expect(result.widgets[0].gridY).toBe(3);
    });

    it("should throw NotFoundException in updateLayout when dashboard not found", async () => {
      mockDashboardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateLayout("nonexistent-id", { widgets: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when widget ID does not belong to dashboard", async () => {
      const dashboardWithWidgets = {
        ...mockDashboard,
        widgets: [{ id: "widget-uuid-1" }],
      };
      mockDashboardRepository.findOne.mockResolvedValueOnce(
        dashboardWithWidgets,
      );

      const layoutDto = {
        widgets: [{ widgetId: "invalid-widget-id", x: 0, y: 0, w: 4, h: 3 }],
      };

      await expect(
        service.updateLayout("dash-uuid-1", layoutDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should remove a dashboard", async () => {
      const existingDashboard = { ...mockDashboard, widgets: [] };
      mockDashboardRepository.findOne.mockResolvedValue(existingDashboard);
      mockDashboardRepository.remove.mockResolvedValue(existingDashboard);

      await service.remove("dash-uuid-1");

      expect(mockDashboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: "dash-uuid-1" },
        relations: { widgets: true },
      });
      expect(mockDashboardRepository.remove).toHaveBeenCalledWith(
        existingDashboard,
      );
    });
  });
});
