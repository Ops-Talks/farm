import { Test, TestingModule } from "@nestjs/testing";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";

describe("ObservabilityController", () => {
  let controller: ObservabilityController;

  const mockSummary = {
    uptime: 3600,
    memory: {
      heapUsed: 52428800,
      heapTotal: 104857600,
      rss: 157286400,
      external: 5242880,
    },
    totalRequests: 1500,
    requestsByStatus: { "2xx": 1400, "4xx": 80, "5xx": 20, other: 0 },
    latencyPercentiles: { p50: 0.005, p90: 0.025, p95: 0.1, p99: 0.5 },
    grafanaUrl: "http://localhost:3001",
  };

  const mockService = {
    getSummary: jest.fn().mockResolvedValue(mockSummary),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [
        {
          provide: ObservabilityService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ObservabilityController>(ObservabilityController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return observability summary", async () => {
      const result = await controller.getSummary();

      expect(result.uptime).toBe(3600);
      expect(result.totalRequests).toBe(1500);
      expect(result.grafanaUrl).toBe("http://localhost:3001");
      expect(mockService.getSummary).toHaveBeenCalled();
    });
  });
});
