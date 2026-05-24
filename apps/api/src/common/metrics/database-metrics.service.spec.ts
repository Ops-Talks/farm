import { Test } from "@nestjs/testing";
import { DatabaseMetricsService } from "./database-metrics.service";
import { getDataSourceToken } from "@nestjs/typeorm";

// @InjectMetric("db_pool_size") resolves to "PROM_METRIC_DB_POOL_SIZE"
const DB_POOL_SIZE_TOKEN = "PROM_METRIC_DB_POOL_SIZE";
// @InjectMetric("db_pool_waiting") resolves to "PROM_METRIC_DB_POOL_WAITING"
const DB_POOL_WAITING_TOKEN = "PROM_METRIC_DB_POOL_WAITING";

describe("DatabaseMetricsService", () => {
  let service: DatabaseMetricsService;
  let mockPoolSizeGauge: { set: jest.Mock };
  let mockPoolWaitingGauge: { set: jest.Mock };

  async function buildModule(driver: Record<string, unknown>) {
    mockPoolSizeGauge = { set: jest.fn() };
    mockPoolWaitingGauge = { set: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DatabaseMetricsService,
        {
          provide: getDataSourceToken(),
          useValue: { driver },
        },
        {
          provide: DB_POOL_SIZE_TOKEN,
          useValue: mockPoolSizeGauge,
        },
        {
          provide: DB_POOL_WAITING_TOKEN,
          useValue: mockPoolWaitingGauge,
        },
      ],
    }).compile();

    return module.get<DatabaseMetricsService>(DatabaseMetricsService);
  }

  it("is defined", async () => {
    service = await buildModule({});
    expect(service).toBeDefined();
  });

  describe("collectPoolMetrics()", () => {
    it("sets active and waiting gauges from pool stats", async () => {
      service = await buildModule({
        master: { totalCount: 10, idleCount: 6, waitingCount: 2 },
      });

      service.collectPoolMetrics();

      // active = totalCount - idleCount = 4
      expect(mockPoolSizeGauge.set).toHaveBeenCalledWith(4);
      expect(mockPoolWaitingGauge.set).toHaveBeenCalledWith(2);
    });

    it("does nothing when driver.master is not present (SQLite)", async () => {
      service = await buildModule({});

      expect(() => service.collectPoolMetrics()).not.toThrow();
      expect(mockPoolSizeGauge.set).not.toHaveBeenCalled();
      expect(mockPoolWaitingGauge.set).not.toHaveBeenCalled();
    });

    it("treats missing pool counts as zero", async () => {
      service = await buildModule({ master: {} });

      service.collectPoolMetrics();

      expect(mockPoolSizeGauge.set).toHaveBeenCalledWith(0);
      expect(mockPoolWaitingGauge.set).toHaveBeenCalledWith(0);
    });
  });

  describe("onApplicationBootstrap()", () => {
    it("calls collectPoolMetrics on startup", async () => {
      service = await buildModule({
        master: { totalCount: 5, idleCount: 3, waitingCount: 0 },
      });
      const spy = jest.spyOn(service, "collectPoolMetrics");

      service.onApplicationBootstrap();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
