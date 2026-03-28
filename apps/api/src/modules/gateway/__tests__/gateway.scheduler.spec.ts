import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GatewayScheduler } from "../gateway.scheduler";
import { GatewayService } from "../gateway.service";
import { GATEWAY_ADAPTERS } from "../gateway.constants";

const mockGatewayService = {
  syncRoutes: jest.fn().mockResolvedValue(undefined),
  triggerHealthCheck: jest.fn().mockResolvedValue(undefined),
};

async function buildScheduler(adapters: unknown[]): Promise<GatewayScheduler> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GatewayScheduler,
      { provide: GatewayService, useValue: mockGatewayService },
      { provide: ConfigService, useValue: { get: jest.fn() } },
      { provide: GATEWAY_ADAPTERS, useValue: adapters },
    ],
  }).compile();
  return module.get<GatewayScheduler>(GatewayScheduler);
}

describe("GatewayScheduler", () => {
  afterEach(() => jest.clearAllMocks());

  it("should be defined", async () => {
    const scheduler = await buildScheduler([]);
    expect(scheduler).toBeDefined();
  });

  describe("handleRoutesSync()", () => {
    it("should skip syncRoutes() when no adapters are configured", async () => {
      const scheduler = await buildScheduler([]);
      await scheduler.handleRoutesSync();
      expect(mockGatewayService.syncRoutes).not.toHaveBeenCalled();
    });

    it("should call syncRoutes() when at least one adapter is configured", async () => {
      const scheduler = await buildScheduler([{ type: "KONG" }]);
      await scheduler.handleRoutesSync();
      expect(mockGatewayService.syncRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleHealthCheck()", () => {
    it("should skip triggerHealthCheck() when no adapters are configured", async () => {
      const scheduler = await buildScheduler([]);
      await scheduler.handleHealthCheck();
      expect(mockGatewayService.triggerHealthCheck).not.toHaveBeenCalled();
    });

    it("should call triggerHealthCheck() when at least one adapter is configured", async () => {
      const scheduler = await buildScheduler([{ type: "AWS" }]);
      await scheduler.handleHealthCheck();
      expect(mockGatewayService.triggerHealthCheck).toHaveBeenCalledTimes(1);
    });

    it("should call both sync and health check when adapters are present", async () => {
      const scheduler = await buildScheduler([
        { type: "KONG" },
        { type: "AWS" },
      ]);
      await scheduler.handleRoutesSync();
      await scheduler.handleHealthCheck();
      expect(mockGatewayService.syncRoutes).toHaveBeenCalledTimes(1);
      expect(mockGatewayService.triggerHealthCheck).toHaveBeenCalledTimes(1);
    });
  });
});
