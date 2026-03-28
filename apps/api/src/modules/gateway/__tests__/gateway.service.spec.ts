import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GatewayService } from "../gateway.service";
import { GatewayRoute } from "../entities/gateway-route.entity";
import { ApiHealthCheck } from "../entities/api-health-check.entity";
import { GATEWAY_ADAPTERS } from "../gateway.constants";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";
import { EventsGateway } from "../../../common/events/events.gateway";
import {
  GatewayRouteDto,
  GatewayHealthDto,
} from "../interfaces/gateway-adapter.interface";

const mockRoute: GatewayRoute = {
  id: "route-uuid-1",
  externalId: "ext-1",
  name: "Test Route",
  paths: ["/api/test"],
  methods: ["GET"],
  tags: [],
  gatewayType: GatewayType.KONG,
  componentId: null,
  component: null,
  syncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHealthCheck: ApiHealthCheck = {
  id: "health-uuid-1",
  url: "http://example.com",
  status: HealthStatus.UP,
  latencyMs: 42,
  apiSpecId: null,
  apiSpec: null,
  checkedAt: new Date(),
  createdAt: new Date(),
};

const mockRouteRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockHealthCheckRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockRouteDtos: GatewayRouteDto[] = [
  {
    externalId: "ext-1",
    name: "Test Route",
    paths: ["/api/test"],
    methods: ["GET"],
    tags: [],
    gatewayType: GatewayType.KONG,
  },
];

const mockHealthDtos: GatewayHealthDto[] = [
  {
    url: "http://example.com",
    status: HealthStatus.UP,
    latencyMs: 42,
  },
];

const mockAdapter = {
  type: GatewayType.KONG,
  getRoutes: jest.fn().mockResolvedValue(mockRouteDtos),
  getHealth: jest.fn().mockResolvedValue(mockHealthDtos),
};

const mockEventsGateway = {
  server: { emit: jest.fn() },
};

describe("GatewayService", () => {
  let service: GatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: getRepositoryToken(GatewayRoute),
          useValue: mockRouteRepo,
        },
        {
          provide: getRepositoryToken(ApiHealthCheck),
          useValue: mockHealthCheckRepo,
        },
        {
          provide: GATEWAY_ADAPTERS,
          useValue: [mockAdapter],
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("syncRoutes()", () => {
    it("should call adapter.getRoutes() for each adapter", async () => {
      mockRouteRepo.findOne.mockResolvedValue(null);
      mockRouteRepo.create.mockReturnValue({ ...mockRoute });
      mockRouteRepo.save.mockResolvedValue({ ...mockRoute });

      await service.syncRoutes();

      expect(mockAdapter.getRoutes).toHaveBeenCalledTimes(1);
    });

    it("should create new route when externalId does not exist", async () => {
      mockRouteRepo.findOne.mockResolvedValue(null);
      const created = { ...mockRoute };
      mockRouteRepo.create.mockReturnValue(created);
      mockRouteRepo.save.mockResolvedValue(created);

      await service.syncRoutes();

      expect(mockRouteRepo.create).toHaveBeenCalledWith({
        externalId: "ext-1",
        gatewayType: GatewayType.KONG,
      });
      expect(mockRouteRepo.save).toHaveBeenCalled();
    });

    it("should update existing route when externalId already exists", async () => {
      const existing = { ...mockRoute };
      mockRouteRepo.findOne.mockResolvedValue(existing);
      mockRouteRepo.save.mockResolvedValue(existing);

      await service.syncRoutes();

      expect(mockRouteRepo.create).not.toHaveBeenCalled();
      expect(mockRouteRepo.save).toHaveBeenCalled();
    });

    it("should emit GATEWAY_ROUTE_SYNCED event after sync", async () => {
      mockRouteRepo.findOne.mockResolvedValue(null);
      mockRouteRepo.create.mockReturnValue({ ...mockRoute });
      mockRouteRepo.save.mockResolvedValue({ ...mockRoute });

      await service.syncRoutes();

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "gateway.route.synced",
        expect.objectContaining({ gatewayType: GatewayType.KONG }),
      );
    });

    it("should not throw when adapter.getRoutes() rejects", async () => {
      mockAdapter.getRoutes.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.syncRoutes()).resolves.not.toThrow();
    });
  });

  describe("triggerHealthCheck()", () => {
    it("should call adapter.getHealth() for each adapter", async () => {
      mockHealthCheckRepo.findOne.mockResolvedValue(null);
      mockHealthCheckRepo.create.mockReturnValue({ ...mockHealthCheck });
      mockHealthCheckRepo.save.mockResolvedValue({ ...mockHealthCheck });

      await service.triggerHealthCheck();

      expect(mockAdapter.getHealth).toHaveBeenCalledTimes(1);
    });

    it("should save a new health check record for each result", async () => {
      mockHealthCheckRepo.findOne.mockResolvedValue(null);
      mockHealthCheckRepo.create.mockReturnValue({ ...mockHealthCheck });
      mockHealthCheckRepo.save.mockResolvedValue({ ...mockHealthCheck });

      await service.triggerHealthCheck();

      expect(mockHealthCheckRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should emit API_HEALTH_CHANGED when status changes", async () => {
      const previous = { ...mockHealthCheck, status: HealthStatus.DOWN };
      mockHealthCheckRepo.findOne.mockResolvedValue(previous);
      mockHealthCheckRepo.create.mockReturnValue({ ...mockHealthCheck });
      mockHealthCheckRepo.save.mockResolvedValue({ ...mockHealthCheck });

      await service.triggerHealthCheck();

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "api.health.changed",
        expect.objectContaining({
          url: "http://example.com",
          previousStatus: HealthStatus.DOWN,
          currentStatus: HealthStatus.UP,
        }),
      );
    });

    it("should emit API_HEALTH_CHANGED on first check (no previous record)", async () => {
      mockHealthCheckRepo.findOne.mockResolvedValue(null);
      mockHealthCheckRepo.create.mockReturnValue({ ...mockHealthCheck });
      mockHealthCheckRepo.save.mockResolvedValue({ ...mockHealthCheck });

      await service.triggerHealthCheck();

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "api.health.changed",
        expect.objectContaining({ previousStatus: null }),
      );
    });

    it("should not throw when adapter.getHealth() rejects", async () => {
      mockAdapter.getHealth.mockRejectedValueOnce(new Error("Timeout"));

      await expect(service.triggerHealthCheck()).resolves.not.toThrow();
    });
  });

  describe("findAllRoutes()", () => {
    it("should return all routes when no componentId filter is given", async () => {
      mockRouteRepo.find.mockResolvedValue([mockRoute]);

      const result = await service.findAllRoutes();

      expect(mockRouteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: "DESC" } }),
      );
      expect(result).toEqual([mockRoute]);
    });

    it("should filter by componentId when provided", async () => {
      mockRouteRepo.find.mockResolvedValue([]);

      const result = await service.findAllRoutes("comp-uuid-1");

      expect(mockRouteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { componentId: "comp-uuid-1" },
        }),
      );
      expect(result).toEqual([]);
    });
  });

  describe("findOneRoute()", () => {
    it("should return the route when found", async () => {
      mockRouteRepo.findOneBy.mockResolvedValue(mockRoute);

      const result = await service.findOneRoute("route-uuid-1");

      expect(result).toEqual(mockRoute);
    });

    it("should throw NotFoundException when route does not exist", async () => {
      mockRouteRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOneRoute("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAllHealthChecks()", () => {
    it("should return all health checks when no apiSpecId filter is given", async () => {
      mockHealthCheckRepo.find.mockResolvedValue([mockHealthCheck]);

      const result = await service.findAllHealthChecks();

      expect(mockHealthCheckRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { checkedAt: "DESC" } }),
      );
      expect(result).toEqual([mockHealthCheck]);
    });

    it("should filter by apiSpecId when provided", async () => {
      mockHealthCheckRepo.find.mockResolvedValue([]);

      const result = await service.findAllHealthChecks("spec-uuid-1");

      expect(mockHealthCheckRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { apiSpecId: "spec-uuid-1" },
        }),
      );
      expect(result).toEqual([]);
    });
  });
});
