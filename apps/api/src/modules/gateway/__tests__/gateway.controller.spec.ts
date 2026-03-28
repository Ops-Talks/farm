import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { GatewayController } from "../gateway.controller";
import { GatewayService } from "../gateway.service";
import { GatewayRoute } from "../entities/gateway-route.entity";
import { ApiHealthCheck } from "../entities/api-health-check.entity";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";

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

const mockGatewayService = {
  findAllRoutes: jest.fn(),
  findOneRoute: jest.fn(),
  syncRoutes: jest.fn(),
  findAllHealthChecks: jest.fn(),
  triggerHealthCheck: jest.fn(),
};

describe("GatewayController", () => {
  let controller: GatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [{ provide: GatewayService, useValue: mockGatewayService }],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /gateway/routes", () => {
    it("should return all routes without filter", async () => {
      mockGatewayService.findAllRoutes.mockResolvedValue([mockRoute]);

      const result = await controller.findAllRoutes(undefined);

      expect(mockGatewayService.findAllRoutes).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockRoute]);
    });

    it("should pass componentId filter to service", async () => {
      mockGatewayService.findAllRoutes.mockResolvedValue([]);

      const result = await controller.findAllRoutes("comp-uuid-1");

      expect(mockGatewayService.findAllRoutes).toHaveBeenCalledWith(
        "comp-uuid-1",
      );
      expect(result).toEqual([]);
    });
  });

  describe("GET /gateway/routes/:id", () => {
    it("should return a single route by id", async () => {
      mockGatewayService.findOneRoute.mockResolvedValue(mockRoute);

      const result = await controller.findOneRoute("route-uuid-1");

      expect(mockGatewayService.findOneRoute).toHaveBeenCalledWith(
        "route-uuid-1",
      );
      expect(result).toEqual(mockRoute);
    });

    it("should propagate NotFoundException from service", async () => {
      mockGatewayService.findOneRoute.mockRejectedValue(
        new NotFoundException("Gateway route nonexistent not found"),
      );

      await expect(controller.findOneRoute("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("POST /gateway/sync", () => {
    it("should trigger sync and return success message", async () => {
      mockGatewayService.syncRoutes.mockResolvedValue(undefined);

      const result = await controller.syncRoutes();

      expect(mockGatewayService.syncRoutes).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: "Sync triggered" });
    });

    it("should propagate errors from service", async () => {
      mockGatewayService.syncRoutes.mockRejectedValue(
        new Error("Adapter unavailable"),
      );

      await expect(controller.syncRoutes()).rejects.toThrow(
        "Adapter unavailable",
      );
    });
  });

  describe("GET /gateway/health", () => {
    it("should return all health checks without filter", async () => {
      mockGatewayService.findAllHealthChecks.mockResolvedValue([
        mockHealthCheck,
      ]);

      const result = await controller.findAllHealthChecks(undefined);

      expect(mockGatewayService.findAllHealthChecks).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toEqual([mockHealthCheck]);
    });

    it("should pass apiSpecId filter to service", async () => {
      mockGatewayService.findAllHealthChecks.mockResolvedValue([]);

      const result = await controller.findAllHealthChecks("spec-uuid-1");

      expect(mockGatewayService.findAllHealthChecks).toHaveBeenCalledWith(
        "spec-uuid-1",
      );
      expect(result).toEqual([]);
    });
  });

  describe("POST /gateway/health/check", () => {
    it("should trigger health check and return success message", async () => {
      mockGatewayService.triggerHealthCheck.mockResolvedValue(undefined);

      const result = await controller.triggerHealthCheck();

      expect(mockGatewayService.triggerHealthCheck).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: "Health check triggered" });
    });

    it("should propagate errors from service", async () => {
      mockGatewayService.triggerHealthCheck.mockRejectedValue(
        new Error("Check failed"),
      );

      await expect(controller.triggerHealthCheck()).rejects.toThrow(
        "Check failed",
      );
    });
  });
});
